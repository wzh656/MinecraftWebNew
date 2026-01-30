import {
  Scene,
  Mesh,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
} from 'three';
import { Chunk } from './Chunk';
import { ChunkManager } from './ChunkManager';
import { TextureLoader } from '../utils/TextureLoader';
import {
  ChunkShaderMaterial,
  ChunkFadeManager,
} from '../utils/ChunkShaderMaterial';
import { BlockType } from './BlockType';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '../utils/Constants';

export class MeshBuilder {
  private chunkMeshes = new Map<string, Mesh>();
  private textureLoader: TextureLoader;
  private shaderMaterial: ChunkShaderMaterial | null = null;
  private fadeManager: ChunkFadeManager;

  constructor(textureLoader: TextureLoader) {
    this.textureLoader = textureLoader;
    this.fadeManager = new ChunkFadeManager();
  }

  initialize(): void {
    const texture = this.textureLoader.getTexture();
    if (texture) {
      this.shaderMaterial = new ChunkShaderMaterial(texture);
    }
  }

  /**
   * 获取淡入动画管理器
   */
  getFadeManager(): ChunkFadeManager {
    return this.fadeManager;
  }

  /**
   * 设置雾距离参数
   */
  setFogDistance(near: number, far: number): void {
    if (this.shaderMaterial) {
      this.shaderMaterial.setFogDistance(near, far);
    }
  }

  /**
   * 设置雾颜色
   */
  setFogColor(color: number): void {
    if (this.shaderMaterial) {
      this.shaderMaterial.setFogColor(color);
    }
  }

  getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  updateChunkMesh(chunk: Chunk, scene: Scene, chunkManager: ChunkManager): Mesh | null {
    const key = this.getChunkKey(chunk.x, chunk.z);

    const oldMesh = this.chunkMeshes.get(key);
    if (oldMesh) {
      scene.remove(oldMesh);
      oldMesh.geometry.dispose();
      this.chunkMeshes.delete(key);
    }

    const geometry = this.buildChunkGeometry(chunk, chunkManager);
    if (!geometry) return null;

    if (!this.shaderMaterial) return null;
    // 每个区块使用独立的材质实例，以便控制淡入动画
    const material = this.shaderMaterial.getMaterial().clone();

    // 检查是否需要淡入动画
    const isNewChunk = !this.fadeManager.hasCompleted(key) && !this.fadeManager.isFading(key);
    if (isNewChunk) {
      this.fadeManager.startFadeIn(key, 0);
    }

    // 设置当前透明度
    const opacity = this.fadeManager.getOpacity(key);
    material.uniforms.chunkOpacity.value = opacity;

    const mesh = new Mesh(geometry, material);
    mesh.position.set(
      chunk.x * CHUNK_SIZE,
      0,
      chunk.z * CHUNK_SIZE
    );

    scene.add(mesh);
    this.chunkMeshes.set(key, mesh);
    return mesh;
  }

  /**
   * 更新所有进行中的淡入动画
   * 返回已完成淡入的区块keys
   */
  updateFadeAnimations(): string[] {
    const completed = this.fadeManager.update();

    // 更新所有进行淡入的mesh的透明度
    for (const key of this.chunkMeshes.keys()) {
      if (!this.fadeManager.isFading(key)) continue;

      const opacity = this.fadeManager.getOpacity(key);
      const mesh = this.chunkMeshes.get(key);
      if (mesh && !Array.isArray(mesh.material)) {
        const shaderMat = mesh.material as ShaderMaterial;
        if (shaderMat.uniforms) {
          shaderMat.uniforms.chunkOpacity.value = opacity;
        }
      }
    }

    return completed;
  }

  /**
   * 获取指定区块的Mesh
   */
  getMesh(key: string): Mesh | undefined {
    return this.chunkMeshes.get(key);
  }

  /**
   * 批量设置雾距离参数（更新所有已有mesh的uniforms）
   */
  updateAllFogDistance(near: number, far: number): void {
    this.setFogDistance(near, far);
    for (const mesh of this.chunkMeshes.values()) {
      if (!Array.isArray(mesh.material)) {
        const shaderMat = mesh.material as ShaderMaterial;
        if (shaderMat.uniforms) {
          shaderMat.uniforms.fogNear.value = near;
          shaderMat.uniforms.fogFar.value = far;
        }
      }
    }
  }

  private buildChunkGeometry(
    chunk: Chunk,
    chunkManager: ChunkManager
  ): BufferGeometry | null {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let vertexCount = 0;

    const addFace = (
      x: number,
      y: number,
      z: number,
      face: number,
      textureIndex: number
    ): void => {
      const { u1, v1, u2, v2 } = this.textureLoader.getUVs(textureIndex);

      const verts = FACE_VERTICES[face];

      for (let i = 0; i < 4; i++) {
        positions.push(
          x + verts[i * 3],
          y + verts[i * 3 + 1],
          z + verts[i * 3 + 2]
        );
      }

      uvs.push(u1, v1, u2, v1, u2, v2, u1, v2);

      indices.push(
        vertexCount,
        vertexCount + 2,
        vertexCount + 1,
        vertexCount,
        vertexCount + 3,
        vertexCount + 2
      );

      vertexCount += 4;
    };

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const blockType = chunk.getBlock(x, y, z);
          if (blockType === BlockType.AIR) continue;

          const props = this.getBlockProperties(blockType);

          const worldX = chunk.x * CHUNK_SIZE + x;
          const worldZ = chunk.z * CHUNK_SIZE + z;

          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 0)) {
            addFace(x, y, z, 0, props.textureTop);
          }
          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 1)) {
            addFace(x, y, z, 1, props.textureBottom);
          }
          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 2)) {
            addFace(x, y, z, 2, props.textureSide);
          }
          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 3)) {
            addFace(x, y, z, 3, props.textureSide);
          }
          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 4)) {
            addFace(x, y, z, 4, props.textureSide);
          }
          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 5)) {
            addFace(x, y, z, 5, props.textureSide);
          }
        }
      }
    }

    if (positions.length === 0) return null;

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  private getBlockProperties(blockType: BlockType): {
    textureTop: number;
    textureBottom: number;
    textureSide: number;
  } {
    switch (blockType) {
      case BlockType.STONE:
        return { textureTop: 7, textureBottom: 7, textureSide: 7 };
      case BlockType.DIRT:
        return { textureTop: 5, textureBottom: 5, textureSide: 5 };
      case BlockType.GRASS:
        return { textureTop: 3, textureBottom: 5, textureSide: 4 };
      case BlockType.COBBLESTONE:
        return { textureTop: 6, textureBottom: 6, textureSide: 6 };
      case BlockType.PLANKS:
        return { textureTop: 12, textureBottom: 12, textureSide: 12 };
      case BlockType.BRICKS:
        return { textureTop: 13, textureBottom: 13, textureSide: 13 };
      case BlockType.SAND:
        return { textureTop: 8, textureBottom: 8, textureSide: 8 };
      case BlockType.WOOD:
        return { textureTop: 9, textureBottom: 9, textureSide: 10 };
      case BlockType.LEAVES:
        return { textureTop: 11, textureBottom: 11, textureSide: 11 };
      case BlockType.CACTUS:
        return { textureTop: 14, textureBottom: 16, textureSide: 15 };
      case BlockType.COMMAND_BLOCK:
        return { textureTop: 0, textureBottom: 2, textureSide: 1 };
      default:
        return { textureTop: 5, textureBottom: 5, textureSide: 5 };
    }
  }

  removeChunkMesh(key: string, scene: Scene): void {
    const mesh = this.chunkMeshes.get(key);
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      this.chunkMeshes.delete(key);
    }
  }

  dispose(): void {
    for (const mesh of this.chunkMeshes.values()) {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    this.chunkMeshes.clear();
    this.shaderMaterial?.dispose();
  }

  private isFaceOccluded(
    chunkManager: ChunkManager,
    x: number,
    y: number,
    z: number,
    face: number
  ): boolean {
    const offsets = [
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
      [-1, 0, 0],
      [1, 0, 0],
    ];
    const offset = offsets[face];
    const nx = x + offset[0];
    const ny = y + offset[1];
    const nz = z + offset[2];

    if (ny < 0 || ny >= CHUNK_HEIGHT) return false;

    const neighborBlock = chunkManager.getBlock(nx, ny, nz);
    if (neighborBlock === 0) return false;

    const neighborTransparent = [
      BlockType.AIR,
      BlockType.LEAVES,
      BlockType.CACTUS,
    ].includes(neighborBlock);

    return !neighborTransparent;
  }
}

const FACE_VERTICES = [
  // Top (y+) - CCW when looking from above
  [0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  // Bottom (y-) - CCW when looking from below
  [0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0],
  // Front (z+) - CCW: 左下, 右下, 右上, 左上
  [1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1],
  // Back (z-) - CCW: 右下, 左下, 左上, 右上
  [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
  // Left (x-) - CCW: 前下, 后下, 后上, 前上
  [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1],
  // Right (x+) - CCW: 后下, 前下, 前上, 后上
  [1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0],
];
