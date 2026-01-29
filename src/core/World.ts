import { Scene } from 'three';
import { ChunkManager } from '../world/ChunkManager';
import { MeshBuilder } from '../world/MeshBuilder';
import { TextureLoader } from '../utils/TextureLoader';

export class World {
  private chunkManager: ChunkManager;
  private meshBuilder: MeshBuilder;
  private textureLoader: TextureLoader;
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    this.chunkManager = new ChunkManager();
    this.textureLoader = new TextureLoader();
    this.meshBuilder = new MeshBuilder(this.textureLoader);
  }

  async initialize(): Promise<void> {
    await this.textureLoader.load('images/textures.png');
    this.meshBuilder.initialize();
  }

  update(playerX: number, playerZ: number): void {
    this.chunkManager.updateVisibleChunks(playerX, playerZ);

    for (const chunk of this.chunkManager.getVisibleChunks()) {
      if (chunk.needsUpdate) {
        this.meshBuilder.updateChunkMesh(chunk, this.scene, this.chunkManager);
        chunk.markUpdated();
      }
    }
  }

  getChunkManager(): ChunkManager {
    return this.chunkManager;
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
  }
}
