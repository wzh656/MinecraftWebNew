import { Chunk } from "./Chunk";
import { WorkerTerrainManager } from "./WorkerTerrainManager";
import { SaveManager } from "../save/SaveManager";
import {
  CHUNK_SIZE,
  CHUNK_HEIGHT,
  RENDER_DISTANCE,
  CACHE_DISTANCE,
} from "../utils/Constants";

export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private workerManager = new WorkerTerrainManager();
  private saveManager: SaveManager | null = null;
  private pendingSaves = new Set<string>();
  private saveTimeout: number | null = null;

  // Current state tracking
  private renderedChunks = new Set<string>(); // Actually being rendered (has mesh) - includes buffer zone
  private cachedChunks = new Set<string>(); // Data in memory (may or may not be rendered)

  // Distance settings
  private renderDistance = RENDER_DISTANCE;
  private cacheDistance = CACHE_DISTANCE;
  private renderBuffer = 2; // Buffer for stopping render

  private playerPosition = { x: 0, z: 0 };
  private playerDirection = { x: 0, z: 1 };

  getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  setSaveManager(saveManager: SaveManager): void {
    this.saveManager = saveManager;
  }

  private async loadChunkFromSave(
    cx: number,
    cz: number,
  ): Promise<Chunk | null> {
    if (!this.saveManager) return null;
    try {
      const data = await this.saveManager.loadChunk(cx, cz);
      if (data) {
        const chunk = new Chunk(cx, cz);
        chunk.data.set(data);
        return chunk;
      }
    } catch (e) {
      console.error("Failed to load chunk from save:", cx, cz, e);
    }
    return null;
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.getChunkKey(cx, cz));
  }

  private ensureChunk(cx: number, cz: number): Chunk {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz);
      this.chunks.set(key, chunk);
      void this.loadChunkAsync(cx, cz, chunk);
    }
    return chunk;
  }

  private async loadChunkAsync(
    cx: number,
    cz: number,
    placeholder: Chunk,
  ): Promise<void> {
    const saved = await this.loadChunkFromSave(cx, cz);
    if (saved) {
      const copyLength = Math.min(saved.data.length, placeholder.data.length);
      placeholder.data.set(saved.data.subarray(0, copyLength));
      if (saved.data.length < placeholder.data.length) {
        placeholder.data.fill(0, saved.data.length);
      }
      placeholder.needsUpdate = true;
    } else {
      await this.workerManager.generateChunk(cx, cz, placeholder);
    }
  }

  /**
   * Core chunk management logic:
   *
   * Definitions:
   * - Render: Chunk has mesh and is in scene (may be in buffer zone, not necessarily visible due to fog)
   * - Unload: Remove mesh from scene (stop rendering), but data stays in memory
   * - Cache: Chunk data is in memory (Uint8Array), regardless of rendering state
   * - Release: Delete chunk data from memory (save to disk first if modified)
   *
   * Distance tiers:
   * - Render Distance: Chunks within this distance SHOULD be rendered
   * - Cache Distance: Chunks within this distance SHOULD have data in memory
   * - Render Buffer: Extra distance beyond Render Distance before unloading
   *                  (prevents flickering when player moves at chunk boundaries)
   *
   * State tracking:
   * - renderedChunks: Chunks that actually have meshes (includes buffer zone)
   * - cachedChunks: Chunks with data in memory (includes rendered chunks)
   *
   * Operations per update:
   * 1. Start rendering: Chunks entering Render Distance (need new mesh)
   * 2. Stop rendering: Rendered chunks beyond Render Distance + Buffer
   * 3. Start caching: Chunks entering Cache Distance (load data, no mesh)
   * 4. Release memory: Cached chunks beyond Cache Distance (save then delete)
   */
  updateChunks(
    playerX: number,
    playerZ: number,
    playerYaw?: number,
  ): {
    startRendering: string[]; // Chunks entering Render Distance (need new mesh + fade in)
    stopRendering: string[]; // Chunks beyond Render Distance + Buffer (remove mesh)
    startCaching: string[]; // Chunks entering Cache Distance (load data, no mesh)
    releaseMemory: string[]; // Chunks beyond Cache Distance (save then delete)
  } {
    this.playerPosition.x = playerX;
    this.playerPosition.z = playerZ;

    if (playerYaw !== undefined) {
      const yaw = (playerYaw * Math.PI) / 180;
      this.playerDirection.x = -Math.sin(yaw);
      this.playerDirection.z = -Math.cos(yaw);
    }

    this.workerManager.updatePlayerContext(
      this.playerPosition,
      this.playerDirection,
    );

    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);

    const startRendering: string[] = [];
    const stopRendering: string[] = [];
    const startCaching: string[] = [];
    const releaseMemory: string[] = [];

    const bufferedRenderDistance = this.renderDistance + this.renderBuffer;

    // Step 1: Calculate which chunks should be in each tier
    const shouldRender = new Set<string>(); // In Render Distance
    const shouldCache = new Set<string>(); // In Cache Distance

    for (let x = -this.cacheDistance; x <= this.cacheDistance; x++) {
      for (let z = -this.cacheDistance; z <= this.cacheDistance; z++) {
        const cx = pcx + x;
        const cz = pcz + z;
        const dist = Math.sqrt(x * x + z * z);
        const key = this.getChunkKey(cx, cz);

        if (dist <= this.renderDistance) {
          shouldRender.add(key);
          shouldCache.add(key);
        } else if (dist <= this.cacheDistance) {
          shouldCache.add(key);
        }
      }
    }

    // Step 2: Handle currently rendered chunks (including those in buffer zone)
    for (const key of this.renderedChunks) {
      const [cx, cz] = key.split(",").map(Number);
      const dist = this.getDistanceFromPlayer(cx, cz, pcx, pcz);

      // Stop rendering if beyond Render Distance + Buffer
      if (dist > bufferedRenderDistance) {
        stopRendering.push(key);
      }
      // If within buffer (Render Distance < dist <= Render Distance + Buffer),
      // keep rendering but don't add to startRendering (no fade in needed)
    }

    // Step 3: Handle currently cached chunks
    for (const key of this.cachedChunks) {
      if (!shouldCache.has(key)) {
        // Beyond Cache Distance - release memory
        releaseMemory.push(key);
        this.unloadChunkData(key);
      }
    }

    // Step 4: Determine new chunks to render (should render but not currently rendered)
    for (const key of shouldRender) {
      if (!this.renderedChunks.has(key)) {
        const [cx, cz] = key.split(",").map(Number);
        this.ensureChunk(cx, cz); // Ensure data is loaded
        startRendering.push(key);
        this.renderedChunks.add(key); // Add to rendered set immediately
      }
    }

    // Step 5: Determine new cached chunks (should cache but not currently cached and not rendered)
    for (const key of shouldCache) {
      if (!this.cachedChunks.has(key) && !this.renderedChunks.has(key)) {
        const [cx, cz] = key.split(",").map(Number);
        this.ensureChunk(cx, cz); // Ensure data is loaded
        startCaching.push(key);
      }
    }

    // Step 6: Remove from rendered set after processing stopRendering
    for (const key of stopRendering) {
      this.renderedChunks.delete(key);
    }

    // Update state
    this.cachedChunks = shouldCache;

    return {
      startRendering,
      stopRendering,
      startCaching,
      releaseMemory,
    };
  }

  private getDistanceFromPlayer(
    cx: number,
    cz: number,
    pcx: number,
    pcz: number,
  ): number {
    const dx = cx - pcx;
    const dz = cz - pcz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private unloadChunkData(key: string): void {
    // Save chunk before releasing if it has pending changes
    if (this.pendingSaves.has(key)) {
      const chunk = this.chunks.get(key);
      if (chunk && this.saveManager) {
        this.saveManager.saveChunk(chunk.x, chunk.z, chunk.data).catch((e) => {
          console.error(
            "Failed to save chunk before unload:",
            chunk.x,
            chunk.z,
            e,
          );
        });
      }
      this.pendingSaves.delete(key);
    }
    // Remove from memory
    this.chunks.delete(key);
  }

  setBlock(x: number, y: number, z: number, type: number): void {
    if (y < 0 || y >= CHUNK_HEIGHT) return;

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const localX = x - cx * CHUNK_SIZE;
    const localZ = z - cz * CHUNK_SIZE;

    const chunk = this.getChunk(cx, cz);
    if (!chunk) return;

    chunk.setBlock(localX, y, localZ, type);
    this.scheduleSave(cx, cz);

    // Mark adjacent chunks for update if on edge
    if (localX === 0) {
      const neighbor = this.getChunk(cx - 1, cz);
      if (neighbor) neighbor.needsUpdate = true;
    }
    if (localX === CHUNK_SIZE - 1) {
      const neighbor = this.getChunk(cx + 1, cz);
      if (neighbor) neighbor.needsUpdate = true;
    }
    if (localZ === 0) {
      const neighbor = this.getChunk(cx, cz - 1);
      if (neighbor) neighbor.needsUpdate = true;
    }
    if (localZ === CHUNK_SIZE - 1) {
      const neighbor = this.getChunk(cx, cz + 1);
      if (neighbor) neighbor.needsUpdate = true;
    }
  }

  private scheduleSave(cx: number, cz: number): void {
    const key = this.getChunkKey(cx, cz);
    this.pendingSaves.add(key);

    if (this.saveTimeout !== null) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = window.setTimeout(() => {
      void this.flushPendingSaves();
    }, 5000);
  }

  private async flushPendingSaves(): Promise<void> {
    if (!this.saveManager) return;

    const saves: Promise<void>[] = [];
    for (const key of this.pendingSaves) {
      const chunk = this.chunks.get(key);
      if (chunk) {
        saves.push(
          this.saveManager
            .saveChunk(chunk.x, chunk.z, chunk.data)
            .catch((e) => {
              console.error("Failed to save chunk:", chunk.x, chunk.z, e);
            }),
        );
      }
    }
    this.pendingSaves.clear();
    await Promise.all(saves);
  }

  async saveAll(): Promise<void> {
    await this.flushPendingSaves();
  }

  getBlock(x: number, y: number, z: number): number {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const localX = x - cx * CHUNK_SIZE;
    const localZ = z - cz * CHUNK_SIZE;

    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0;
    return chunk.getBlock(localX, y, localZ);
  }

  isSolid(x: number, y: number, z: number): boolean {
    const block = this.getBlock(x, y, z);
    return block !== 0;
  }

  hasPendingChunks(): boolean {
    return this.workerManager.getPendingCount() > 0;
  }

  getVisibleChunks(): Iterable<Chunk> {
    const result: Chunk[] = [];
    for (const key of this.renderedChunks) {
      const chunk = this.chunks.get(key);
      if (chunk) result.push(chunk);
    }
    return result;
  }

  getRenderDistance(): number {
    return this.renderDistance;
  }

  setRenderDistance(distance: number): void {
    this.renderDistance = Math.max(1, distance);
    // Cache distance should always be >= render distance
    this.cacheDistance = Math.max(this.cacheDistance, this.renderDistance + 2);
  }

  setCacheDistance(distance: number): void {
    this.cacheDistance = Math.max(this.renderDistance + 2, distance);
  }

  clear(): void {
    this.chunks.clear();
    this.renderedChunks.clear();
    this.cachedChunks.clear();
    this.pendingSaves.clear();
    if (this.saveTimeout !== null) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  dispose(): void {
    void this.saveAll();
    this.clear();
    this.workerManager.terminate();
  }

  async loadPlayerPosition(): Promise<{
    x: number;
    y: number;
    z: number;
  } | null> {
    if (!this.saveManager) return null;
    return this.saveManager.loadPlayerPosition();
  }

  async loadPlayerRotation(): Promise<{
    x: number;
    y: number;
  } | null> {
    if (!this.saveManager) return null;
    const metadata = await this.saveManager.loadWorldMetadata();
    return metadata?.playerRotation ?? null;
  }

  async savePlayerPosition(
    position: { x: number; y: number; z: number },
    rotation?: { x: number; y: number },
  ): Promise<void> {
    if (!this.saveManager) return;
    await this.saveManager.savePlayerPosition(position, rotation);
  }
}
