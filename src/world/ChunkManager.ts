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
  private visibleChunks = new Set<string>();
  private cachedChunks = new Set<string>();
  private saveManager: SaveManager | null = null;
  private pendingSaves = new Set<string>();
  private saveTimeout: number | null = null;
  private renderDistance = RENDER_DISTANCE;
  private cacheDistance = CACHE_DISTANCE;
  private playerPosition = { x: 0, z: 0 };
  private playerDirection = { x: 0, z: 1 };

  getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.getChunkKey(cx, cz));
  }

  ensureChunk(cx: number, cz: number): Chunk {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      // Create a placeholder chunk and trigger async load
      chunk = new Chunk(cx, cz);
      this.chunks.set(key, chunk);
      this.loadChunkAsync(cx, cz, chunk);
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

  setBlock(x: number, y: number, z: number, type: number): void {
    if (y < 0 || y >= CHUNK_HEIGHT) return;

    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const localX = x - cx * CHUNK_SIZE;
    const localZ = z - cz * CHUNK_SIZE;

    const chunk = this.getChunk(cx, cz);
    if (chunk) {
      chunk.setBlock(localX, y, localZ, type);
      this.scheduleSave(cx, cz);
    }

    // Mark adjacent chunks for update if block is on chunk edge
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

  getBlock(x: number, y: number, z: number): number {
    if (y < 0) return 1;
    if (y >= CHUNK_HEIGHT) return 0;

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

  updateVisibleChunks(
    playerX: number,
    playerZ: number,
    playerYaw?: number,
  ): {
    unloaded: string[];
    cached: string[];
    uncached: string[];
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

    const newVisibleChunks = new Set<string>();
    const newCachedChunks = new Set<string>();
    const unloadedChunks: string[] = [];
    const cachedChunks: string[] = [];
    const uncachedChunks: string[] = [];

    // First pass: determine which chunks should be visible or cached
    for (let x = -this.cacheDistance; x <= this.cacheDistance; x++) {
      for (let z = -this.cacheDistance; z <= this.cacheDistance; z++) {
        const cx = pcx + x;
        const cz = pcz + z;
        const dist = Math.sqrt(x * x + z * z);
        const key = this.getChunkKey(cx, cz);

        if (dist <= this.renderDistance) {
          // Render distance: fully loaded and visible
          this.ensureChunk(cx, cz);
          newVisibleChunks.add(key);
        } else if (dist <= this.cacheDistance) {
          // Cache distance: data kept in memory but not rendered
          this.ensureChunk(cx, cz);
          newCachedChunks.add(key);
        }
      }
    }

    // Find chunks that are no longer visible or cached
    for (const key of this.visibleChunks) {
      if (!newVisibleChunks.has(key)) {
        if (newCachedChunks.has(key)) {
          // Moving from visible to cached - remove mesh but keep data
          cachedChunks.push(key);
        } else {
          // Moving from visible to unloaded
          this.unloadChunk(key);
          unloadedChunks.push(key);
        }
      }
    }

    // Find chunks that are no longer cached
    for (const key of this.cachedChunks) {
      if (!newVisibleChunks.has(key) && !newCachedChunks.has(key)) {
        this.unloadChunk(key);
        unloadedChunks.push(key);
      } else if (newVisibleChunks.has(key)) {
        // Moving from cached back to visible
        uncachedChunks.push(key);
      }
    }

    this.visibleChunks = newVisibleChunks;
    this.cachedChunks = newCachedChunks;

    return {
      unloaded: unloadedChunks,
      cached: cachedChunks,
      uncached: uncachedChunks,
    };
  }

  private unloadChunk(key: string): void {
    // Save chunk before unloading if it has pending changes
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
    // Remove chunk from memory
    this.chunks.delete(key);
  }

  getVisibleChunks(): IterableIterator<Chunk> {
    const visible: Chunk[] = [];
    for (const key of this.visibleChunks) {
      const chunk = this.chunks.get(key);
      if (chunk) visible.push(chunk);
    }
    return visible[Symbol.iterator]();
  }

  getCachedChunks(): IterableIterator<Chunk> {
    const cached: Chunk[] = [];
    for (const key of this.cachedChunks) {
      const chunk = this.chunks.get(key);
      if (chunk) cached.push(chunk);
    }
    return cached[Symbol.iterator]();
  }

  getAllChunks(): IterableIterator<Chunk> {
    return this.chunks.values();
  }

  setSaveManager(saveManager: SaveManager): void {
    this.saveManager = saveManager;
  }

  private async loadChunkFromSave(
    cx: number,
    cz: number,
  ): Promise<Chunk | undefined> {
    if (!this.saveManager) return undefined;

    try {
      const data = await this.saveManager.loadChunk(cx, cz);
      if (data) {
        const chunk = new Chunk(cx, cz);
        chunk.data.set(data);
        chunk.needsUpdate = true;
        return chunk;
      }
    } catch (e) {
      console.error("Failed to load chunk:", cx, cz, e);
    }
    return undefined;
  }

  async ensureChunkAsync(cx: number, cz: number): Promise<Chunk> {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      chunk = await this.loadChunkFromSave(cx, cz);

      if (!chunk) {
        chunk = new Chunk(cx, cz);
        await this.workerManager.generateChunk(cx, cz, chunk);
      }

      this.chunks.set(key, chunk);
    }

    return chunk;
  }

  private scheduleSave(cx: number, cz: number): void {
    if (!this.saveManager) return;

    this.pendingSaves.add(this.getChunkKey(cx, cz));

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = window.setTimeout(() => {
      this.flushPendingSaves();
    }, 5000); // Auto-save after 5 seconds of inactivity
  }

  private async flushPendingSaves(): Promise<void> {
    if (!this.saveManager) return;

    const promises: Promise<void>[] = [];

    for (const key of this.pendingSaves) {
      const chunk = this.chunks.get(key);
      if (chunk) {
        promises.push(
          this.saveManager
            .saveChunk(chunk.x, chunk.z, chunk.data)
            .catch((e) => {
              console.error("Failed to save chunk:", chunk.x, chunk.z, e);
            }),
        );
      }
    }

    this.pendingSaves.clear();
    await Promise.all(promises);
  }

  async saveAll(): Promise<void> {
    await this.flushPendingSaves();
  }

  clear(): void {
    this.chunks.clear();
    this.visibleChunks.clear();
    this.cachedChunks.clear();
    this.workerManager.terminate();
  }

  dispose(): void {
    this.clear();
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  async loadPlayerPosition(): Promise<{
    x: number;
    y: number;
    z: number;
  } | null> {
    if (!this.saveManager) return null;
    return this.saveManager.loadPlayerPosition();
  }

  async loadPlayerRotation(): Promise<{ x: number; y: number } | null> {
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

  setRenderDistance(distance: number): void {
    this.renderDistance = Math.max(1, distance);
    this.cacheDistance = this.renderDistance + 2;
  }

  getRenderDistance(): number {
    return this.renderDistance;
  }
}
