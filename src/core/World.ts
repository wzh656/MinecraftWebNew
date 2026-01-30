import { Scene, Color } from "three";
import { ChunkManager } from "../world/ChunkManager";
import { MeshBuilder } from "../world/MeshBuilder";
import { TextureLoader } from "../utils/TextureLoader";
import { RENDER_DISTANCE, CHUNK_SIZE } from "../utils/Constants";

export class World {
  private chunkManager: ChunkManager;
  private meshBuilder: MeshBuilder;
  private textureLoader: TextureLoader;
  private scene: Scene;
  private fogColor: Color;

  constructor(scene: Scene) {
    this.scene = scene;
    this.chunkManager = new ChunkManager();
    this.textureLoader = new TextureLoader();
    this.meshBuilder = new MeshBuilder(this.textureLoader);
    this.fogColor = new Color(0x87ceeb); // 默认天空蓝
  }

  async initialize(): Promise<void> {
    await this.textureLoader.load("images/textures.png");
    this.meshBuilder.initialize();

    // 设置雾效参数
    // fogNear: 60% 渲染距离
    // fogFar: 110% 渲染距离（稍微超出渲染距离以实现自然遮挡）
    const renderDistanceBlocks = RENDER_DISTANCE * CHUNK_SIZE;
    const fogNear = renderDistanceBlocks * 0.6;
    const fogFar = renderDistanceBlocks * 1.1;

    this.meshBuilder.setFogColor(0x87ceeb);
    this.meshBuilder.setFogDistance(fogNear, fogFar);

    // 同步Three.js场景的雾（用于背景色统一）
    this.scene.background = this.fogColor;
  }

  /**
   * 设置雾颜色
   */
  setFogColor(color: Color | number): void {
    if (typeof color === "number") {
      this.fogColor.setHex(color);
    } else {
      this.fogColor.copy(color);
    }
    this.meshBuilder.setFogColor(this.fogColor.getHex());
    this.scene.background = this.fogColor;
  }

  /**
   * 设置雾距离
   */
  setFogDistance(near: number, far: number): void {
    this.meshBuilder.setFogDistance(near, far);
  }

  update(playerX: number, playerZ: number): void {
    const { unloaded, cached, uncached } =
      this.chunkManager.updateVisibleChunks(playerX, playerZ);

    // Remove meshes for unloaded chunks (completely removed from memory)
    for (const key of unloaded) {
      this.meshBuilder.removeChunkMesh(key, this.scene);
      // 停止该区块的淡入动画
      this.meshBuilder.getFadeManager().stopFade(key);
    }

    // Remove meshes for cached chunks (data kept but mesh removed)
    for (const key of cached) {
      this.meshBuilder.removeChunkMesh(key, this.scene);
    }

    // Mark uncached chunks (moving from cache to visible) as needing update
    for (const key of uncached) {
      const chunk = this.chunkManager.getChunk(
        parseInt(key.split(",")[0]),
        parseInt(key.split(",")[1]),
      );
      if (chunk) {
        chunk.needsUpdate = true;
      }
    }

    // Update meshes for visible chunks (these will have fade-in animation)
    for (const chunk of this.chunkManager.getVisibleChunks()) {
      if (chunk.needsUpdate) {
        this.meshBuilder.updateChunkMesh(chunk, this.scene, this.chunkManager);
        chunk.markUpdated();
      }
    }

    // 更新进行中的淡入动画
    this.meshBuilder.updateFadeAnimations();
  }

  /**
   * 设置渲染距离并更新相关系统
   */
  setRenderDistance(distance: number): void {
    this.chunkManager.setRenderDistance(distance);
    this.updateFogSettings();
  }

  /**
   * 根据当前渲染距离更新雾效参数
   * 当玩家改变渲染距离设置时调用
   */
  updateFogSettings(): void {
    const currentRenderDistance = this.chunkManager.getRenderDistance();
    const renderDistanceBlocks = currentRenderDistance * CHUNK_SIZE;
    const fogNear = renderDistanceBlocks * 0.6;
    const fogFar = renderDistanceBlocks * 1.1;

    this.meshBuilder.updateAllFogDistance(fogNear, fogFar);
  }

  /**
   * 获取淡入管理器中活跃淡入的数量
   */
  getActiveFadeCount(): number {
    return this.meshBuilder.getFadeManager().getActiveCount();
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
