import { Scene, Color } from "three";
import { ChunkManager } from "../world/ChunkManager";
import { MeshBuilder } from "../world/MeshBuilder";
import { TextureLoader } from "../rendering/texture/TextureLoader";
import { RENDER_DISTANCE, CHUNK_SIZE } from "../utils/Constants";
import { Chunk } from "../world/Chunk";

interface QueuedChunk {
  chunk: Chunk;
  priority: number;
}

export class World {
  private chunkManager: ChunkManager;
  private meshBuilder: MeshBuilder;
  private textureLoader: TextureLoader;
  private scene: Scene;
  private fogColor: Color;
  private meshUpdateQueue: QueuedChunk[] = [];
  private playerPosition = { x: 0, z: 0 };

  constructor(scene: Scene) {
    this.scene = scene;
    this.chunkManager = new ChunkManager();
    this.textureLoader = new TextureLoader();
    this.meshBuilder = new MeshBuilder(this.textureLoader);
    this.fogColor = new Color(0x87ceeb);
  }

  async initialize(seed: string): Promise<void> {
    await this.textureLoader.load("images/textures.png");
    this.meshBuilder.initialize();

    // Initialize terrain generator with seed
    await this.chunkManager.initializeTerrain(seed);

    const renderDistanceBlocks = RENDER_DISTANCE * CHUNK_SIZE;
    const fogNear = renderDistanceBlocks * 0.6;
    const fogFar = renderDistanceBlocks * 1.1;

    this.meshBuilder.setFogColor(0x87ceeb);
    this.meshBuilder.setFogDistance(fogNear, fogFar);

    this.scene.background = this.fogColor;
  }

  setFogColor(color: Color | number): void {
    if (typeof color === "number") {
      this.fogColor.setHex(color);
    } else {
      this.fogColor.copy(color);
    }
    this.meshBuilder.setFogColor(this.fogColor.getHex());
    this.scene.background = this.fogColor;
  }

  setFogDistance(near: number, far: number): void {
    this.meshBuilder.setFogDistance(near, far);
  }

  private calculateChunkDistance(chunk: Chunk): number {
    const chunkCenterX = chunk.x * CHUNK_SIZE + CHUNK_SIZE / 2;
    const chunkCenterZ = chunk.z * CHUNK_SIZE + CHUNK_SIZE / 2;
    const dx = chunkCenterX - this.playerPosition.x;
    const dz = chunkCenterZ - this.playerPosition.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private queueChunksForUpdate(): void {
    for (const chunk of this.chunkManager.getVisibleChunks()) {
      if (chunk.needsUpdate) {
        const distance = this.calculateChunkDistance(chunk);
        this.meshUpdateQueue.push({ chunk, priority: distance });
      }
    }

    this.meshUpdateQueue.sort((a, b) => a.priority - b.priority);
  }

  update(playerX: number, playerZ: number, playerYaw?: number): void {
    this.playerPosition.x = playerX;
    this.playerPosition.z = playerZ;

    const { startRendering, stopRendering } = this.chunkManager.updateChunks(
      playerX,
      playerZ,
      playerYaw,
    );

    // Stop rendering chunks that moved out of render distance + buffer
    for (const key of stopRendering) {
      this.meshBuilder.removeChunkMesh(key, this.scene);
      this.meshBuilder.getFadeManager().stopFade(key);

      const [cx, cz] = key.split(",").map(Number);
      this.meshUpdateQueue = this.meshUpdateQueue.filter(
        (q) => q.chunk.x !== cx || q.chunk.z !== cz,
      );
    }

    // Mark new visible chunks for rendering
    for (const key of startRendering) {
      const chunk = this.chunkManager.getChunk(
        parseInt(key.split(",")[0]),
        parseInt(key.split(",")[1]),
      );
      if (chunk) {
        chunk.needsUpdate = true;
      }
    }

    this.queueChunksForUpdate();

    const maxUpdatesPerFrame = 2;
    let updatedCount = 0;

    while (
      this.meshUpdateQueue.length > 0 &&
      updatedCount < maxUpdatesPerFrame
    ) {
      const queued = this.meshUpdateQueue.shift();
      if (!queued) continue;

      const { chunk } = queued;
      if (chunk.needsUpdate) {
        this.meshBuilder.updateChunkMesh(chunk, this.scene, this.chunkManager);
        chunk.markUpdated();
        updatedCount++;
      }
    }

    this.meshBuilder.updateFadeAnimations();
  }

  setRenderDistance(distance: number): void {
    this.chunkManager.setRenderDistance(distance);
    this.updateFogSettings();
  }

  updateFogSettings(): void {
    const currentRenderDistance = this.chunkManager.getRenderDistance();
    const renderDistanceBlocks = currentRenderDistance * CHUNK_SIZE;
    const fogNear = renderDistanceBlocks * 0.6;
    const fogFar = renderDistanceBlocks * 1.1;

    this.meshBuilder.updateAllFogDistance(fogNear, fogFar);
  }

  getActiveFadeCount(): number {
    return this.meshBuilder.getFadeManager().getActiveCount();
  }

  getChunkManager(): ChunkManager {
    return this.chunkManager;
  }

  isChunkRendered(cx: number, cz: number): boolean {
    return this.meshBuilder.hasChunkMesh(cx, cz);
  }

  getTextureLoader(): TextureLoader {
    return this.textureLoader;
  }

  isSolid(x: number, y: number, z: number): boolean {
    return this.chunkManager.isSolid(x, y, z);
  }

  setBlock(x: number, y: number, z: number, type: number): void {
    this.chunkManager.setBlock(x, y, z, type);
  }

  getBlock(x: number, y: number, z: number): number {
    return this.chunkManager.getBlock(x, y, z);
  }

  dispose(): void {
    this.meshBuilder.dispose();
    this.chunkManager.dispose();
  }
}
