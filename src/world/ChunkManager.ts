import { Chunk } from './Chunk';
import { TerrainGenerator } from './TerrainGenerator';
import { SaveManager } from '../save/SaveManager';
import { CHUNK_SIZE, RENDER_DISTANCE } from '../utils/Constants';

export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private generator = new TerrainGenerator();
  private visibleChunks = new Set<string>();
  private saveManager: SaveManager | null = null;
  private pendingSaves = new Set<string>();
  private saveTimeout: number | null = null;

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
      chunk = this.generator.generateChunk(cx, cz);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  setBlock(x: number, y: number, z: number, type: number): void {
    if (y < 0 || y >= 16) return;

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
    if (y >= 16) return 0;

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

  updateVisibleChunks(playerX: number, playerZ: number): void {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);

    this.visibleChunks.clear();

    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
      for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
        const cx = pcx + x;
        const cz = pcz + z;
        const dist = Math.sqrt(x * x + z * z);
        if (dist <= RENDER_DISTANCE) {
          this.ensureChunk(cx, cz);
          this.visibleChunks.add(this.getChunkKey(cx, cz));
        }
      }
    }
  }

  getVisibleChunks(): IterableIterator<Chunk> {
    const visible: Chunk[] = [];
    for (const key of this.visibleChunks) {
      const chunk = this.chunks.get(key);
      if (chunk) visible.push(chunk);
    }
    return visible[Symbol.iterator]();
  }

  getAllChunks(): IterableIterator<Chunk> {
    return this.chunks.values();
  }

  setSaveManager(saveManager: SaveManager): void {
    this.saveManager = saveManager;
  }

  private async loadChunkFromSave(cx: number, cz: number): Promise<Chunk | undefined> {
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
      console.error('Failed to load chunk:', cx, cz, e);
    }
    return undefined;
  }

  async ensureChunkAsync(cx: number, cz: number): Promise<Chunk> {
    const key = this.getChunkKey(cx, cz);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      // Try to load from save first
      chunk = await this.loadChunkFromSave(cx, cz);

      if (!chunk) {
        // Generate new chunk if not saved
        chunk = this.generator.generateChunk(cx, cz);
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
          this.saveManager.saveChunk(chunk.x, chunk.z, chunk.data).catch((e) => {
            console.error('Failed to save chunk:', chunk.x, chunk.z, e);
          })
        );
      }
    }

    this.pendingSaves.clear();
    await Promise.all(promises);
  }

  async saveAll(): Promise<void> {
    await this.flushPendingSaves();
  }

  async loadPlayerPosition(): Promise<{ x: number; y: number; z: number } | null> {
    if (!this.saveManager) return null;
    return this.saveManager.loadPlayerPosition();
  }

  async savePlayerPosition(position: { x: number; y: number; z: number }): Promise<void> {
    if (!this.saveManager) return;
    await this.saveManager.savePlayerPosition(position);
  }
}
