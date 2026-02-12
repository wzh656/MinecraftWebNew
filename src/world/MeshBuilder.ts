import {
  Scene,
  Mesh,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  DoubleSide,
} from "three";
import { Chunk } from "./Chunk";
import { ChunkManager } from "./ChunkManager";
import { TextureLoader } from "../rendering/texture/TextureLoader";
import {
  ChunkShaderMaterial,
  ChunkFadeManager,
} from "../rendering/material/ChunkShaderMaterial";
import { BlockType, isTransparent } from "./BlockType";
import { FACE_OFFSETS } from "../utils/Constants";
import { CHUNK_SIZE, CHUNK_HEIGHT } from "../utils/WorldConstants";
import { getBlockTextureProperties, FACE_VERTICES } from "../utils/BlockUtils";
import { getChunkKey } from "../utils/ChunkUtils";

export class MeshBuilder {
  private chunkMeshes = new Map<string, Mesh>();
  private waterMeshes = new Map<string, Mesh>();
  private textureLoader: TextureLoader;
  private shaderMaterial: ChunkShaderMaterial | null = null;
  private waterMaterial: ShaderMaterial | null = null;
  private fadeManager: ChunkFadeManager;

  constructor(textureLoader: TextureLoader) {
    this.textureLoader = textureLoader;
    this.fadeManager = new ChunkFadeManager();
  }

  initialize(): void {
    const texture = this.textureLoader.getTexture();
    if (texture) {
      this.shaderMaterial = new ChunkShaderMaterial(texture);
      // 创建水材质：不写入深度缓冲
      const waterMat = this.shaderMaterial.getMaterial().clone();
      waterMat.depthWrite = false;
      waterMat.side = DoubleSide;
      this.waterMaterial = waterMat;
    }
  }

  getFadeManager(): ChunkFadeManager {
    return this.fadeManager;
  }

  setFogDistance(near: number, far: number): void {
    if (this.shaderMaterial) {
      this.shaderMaterial.setFogDistance(near, far);
    }
  }

  setFogColor(color: number): void {
    if (this.shaderMaterial) {
      this.shaderMaterial.setFogColor(color);
    }
  }

  hasChunkMesh(cx: number, cz: number): boolean {
    const key = getChunkKey(cx, cz);
    return this.chunkMeshes.has(key);
  }

  updateChunkMesh(
    chunk: Chunk,
    scene: Scene,
    chunkManager: ChunkManager,
  ): Mesh | null {
    const key = getChunkKey(chunk.x, chunk.z);

    // 移除旧的固体方块mesh
    const oldMesh = this.chunkMeshes.get(key);
    if (oldMesh) {
      scene.remove(oldMesh);
      oldMesh.geometry.dispose();
      this.chunkMeshes.delete(key);
    }

    // 移除旧的水mesh
    const oldWaterMesh = this.waterMeshes.get(key);
    if (oldWaterMesh) {
      scene.remove(oldWaterMesh);
      oldWaterMesh.geometry.dispose();
      this.waterMeshes.delete(key);
    }

    const { solidGeometry, waterGeometry } = this.buildChunkGeometry(chunk, chunkManager);

    if (!this.shaderMaterial) return null;

    const isNewChunk =
      !this.fadeManager.hasCompleted(key) && !this.fadeManager.isFading(key);
    if (isNewChunk) {
      this.fadeManager.startFadeIn(key, 0);
    }

    const opacity = this.fadeManager.getOpacity(key);

    // 创建固体方块mesh
    let solidMesh: Mesh | null = null;
    if (solidGeometry) {
      const solidMaterial = this.shaderMaterial.getMaterial().clone();
      solidMaterial.uniforms.chunkOpacity.value = opacity;
      solidMesh = new Mesh(solidGeometry, solidMaterial);
      solidMesh.position.set(chunk.x * CHUNK_SIZE, 0, chunk.z * CHUNK_SIZE);
      solidMesh.renderOrder = 0; // 固体先渲染
      scene.add(solidMesh);
      this.chunkMeshes.set(key, solidMesh);
    }

    // 创建水mesh（不写入深度缓冲）
    if (waterGeometry && this.waterMaterial) {
      const waterMat = this.waterMaterial.clone();
      waterMat.uniforms.chunkOpacity.value = opacity;
      const waterMesh = new Mesh(waterGeometry, waterMat);
      waterMesh.position.set(chunk.x * CHUNK_SIZE, 0, chunk.z * CHUNK_SIZE);
      waterMesh.renderOrder = 1; // 水后渲染，确保透明效果正确
      scene.add(waterMesh);
      this.waterMeshes.set(key, waterMesh);
    }

    return solidMesh;
  }

  updateFadeAnimations(): string[] {
    const completed = this.fadeManager.update();

    for (const key of this.chunkMeshes.keys()) {
      if (!this.fadeManager.isFading(key)) continue;

      const opacity = this.fadeManager.getOpacity(key);

      const solidMesh = this.chunkMeshes.get(key);
      if (solidMesh && !Array.isArray(solidMesh.material)) {
        const shaderMat = solidMesh.material as ShaderMaterial;
        if (shaderMat.uniforms) {
          shaderMat.uniforms.chunkOpacity.value = opacity;
        }
      }

      const waterMesh = this.waterMeshes.get(key);
      if (waterMesh && !Array.isArray(waterMesh.material)) {
        const shaderMat = waterMesh.material as ShaderMaterial;
        if (shaderMat.uniforms) {
          shaderMat.uniforms.chunkOpacity.value = opacity;
        }
      }
    }

    return completed;
  }

  getMesh(key: string): Mesh | undefined {
    return this.chunkMeshes.get(key);
  }

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
    chunkManager: ChunkManager,
  ): { solidGeometry: BufferGeometry | null; waterGeometry: BufferGeometry | null } {
    const solidPositions: number[] = [];
    const solidUvs: number[] = [];
    const solidIndices: number[] = [];

    const waterPositions: number[] = [];
    const waterUvs: number[] = [];
    const waterIndices: number[] = [];

    let solidVertexCount = 0;
    let waterVertexCount = 0;

    // 微小偏移量，用于避免相邻方块面的z-fighting
    // const FACE_EPSILON = 0.001;
    // const SOLID_SHIFTS = [
    //   [0, FACE_EPSILON, 0], // 0: 顶面 (y+)
    //   [0, -FACE_EPSILON, 0], // 1: 底面 (y-)
    //   [0, 0, FACE_EPSILON], // 2: 前面 (z+)
    //   [0, 0, -FACE_EPSILON], // 3: 后面 (z-)
    //   [-FACE_EPSILON, 0, 0], // 4: 左面 (x-)
    //   [FACE_EPSILON, 0, 0], // 5: 右面 (x+)
    // ] as const;

    const addSolidFace = (
      x: number,
      y: number,
      z: number,
      face: number,
      textureIndex: number,
    ): void => {
      const { u1, v1, u2, v2 } = this.textureLoader.getUVs(textureIndex);
      const verts = FACE_VERTICES[face];

      for (let i = 0; i < 4; i++) {
        solidPositions.push(
          x + verts[i * 3],
          y + verts[i * 3 + 1],
          z + verts[i * 3 + 2],
        );
      }

      solidUvs.push(u1, v1, u2, v1, u2, v2, u1, v2);
      solidIndices.push(
        solidVertexCount,
        solidVertexCount + 2,
        solidVertexCount + 1,
        solidVertexCount,
        solidVertexCount + 3,
        solidVertexCount + 2,
      );
      solidVertexCount += 4;
    };

    const addWaterFace = (
      x: number,
      y: number,
      z: number,
      face: number,
      textureIndex: number,
    ): void => {
      const { u1, v1, u2, v2 } = this.textureLoader.getUVs(textureIndex);
      const verts = FACE_VERTICES[face];

      for (let i = 0; i < 4; i++) {
        waterPositions.push(
          x + verts[i * 3],
          y + verts[i * 3 + 1],
          z + verts[i * 3 + 2],
        );
      }

      waterUvs.push(u1, v1, u2, v1, u2, v2, u1, v2);
      waterIndices.push(
        waterVertexCount,
        waterVertexCount + 2,
        waterVertexCount + 1,
        waterVertexCount,
        waterVertexCount + 3,
        waterVertexCount + 2,
      );
      waterVertexCount += 4;
    };

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const blockType = chunk.getBlock(x, y, z);
          if (blockType === BlockType.AIR) continue;

          const props = getBlockTextureProperties(blockType);
          const worldX = chunk.x * CHUNK_SIZE + x;
          const worldZ = chunk.z * CHUNK_SIZE + z;

          const isWater = blockType === BlockType.WATER;
          const addFace = isWater ? addWaterFace : addSolidFace;

          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 0, blockType)) {
            addFace(x, y, z, 0, props.textureTop);
          }
          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 1, blockType)) {
            addFace(x, y, z, 1, props.textureBottom);
          }
          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 2, blockType)) {
            addFace(x, y, z, 2, props.textureSide);
          }
          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 3, blockType)) {
            addFace(x, y, z, 3, props.textureSide);
          }
          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 4, blockType)) {
            addFace(x, y, z, 4, props.textureSide);
          }
          if (!this.isFaceOccluded(chunkManager, worldX, y, worldZ, 5, blockType)) {
            addFace(x, y, z, 5, props.textureSide);
          }
        }
      }
    }

    const solidGeometry = solidPositions.length > 0
      ? this.createGeometry(solidPositions, solidUvs, solidIndices)
      : null;
    const waterGeometry = waterPositions.length > 0
      ? this.createGeometry(waterPositions, waterUvs, waterIndices)
      : null;

    return { solidGeometry, waterGeometry };
  }

  private createGeometry(
    positions: number[],
    uvs: number[],
    indices: number[],
  ): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    );
    geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  removeChunkMesh(key: string, scene: Scene): void {
    // 移除固体方块 mesh
    const mesh = this.chunkMeshes.get(key);
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      this.chunkMeshes.delete(key);
    }
    // 移除水 mesh
    const waterMesh = this.waterMeshes.get(key);
    if (waterMesh) {
      scene.remove(waterMesh);
      waterMesh.geometry.dispose();
      this.waterMeshes.delete(key);
    }
  }

  dispose(): void {
    // 清理固体方块 meshes
    for (const mesh of this.chunkMeshes.values()) {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    this.chunkMeshes.clear();
    // 清理水 meshes
    for (const mesh of this.waterMeshes.values()) {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    this.waterMeshes.clear();
    this.shaderMaterial?.dispose();
    this.waterMaterial?.dispose();
  }

  private isFaceOccluded(
    chunkManager: ChunkManager,
    x: number,
    y: number,
    z: number,
    face: number,
    currentBlockType: BlockType,
  ): boolean {
    const offset = FACE_OFFSETS[face];
    const nx = x + offset[0];
    const ny = y + offset[1];
    const nz = z + offset[2];

    if (ny < 0 || ny >= CHUNK_HEIGHT) return false;

    const neighborBlock = chunkManager.getBlock(nx, ny, nz);
    if (neighborBlock === 0) return false;

    if (currentBlockType === BlockType.WATER) {
      // 水方块：相邻的也是水方块 或 非透明方块时剔除
      return neighborBlock === BlockType.WATER || !isTransparent(neighborBlock);
    }else{
      // 非水方块：相邻的非透明方块时不剔除
      return !isTransparent(neighborBlock);
    }
  }
}
