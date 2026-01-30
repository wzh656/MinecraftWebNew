import {
  Scene,
  Mesh,
  BufferGeometry,
  BufferAttribute,
  MeshBasicMaterial,
  DoubleSide,
} from 'three';
import { Chunk } from './Chunk';
import { ChunkManager } from './ChunkManager';
import { TextureLoader } from '../utils/TextureLoader';
import { BlockType } from './BlockType';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '../utils/Constants';

export class MeshBuilder {
  private chunkMeshes = new Map<string, Mesh>();
  private textureLoader: TextureLoader;
  private material: MeshBasicMaterial | undefined;

  constructor(textureLoader: TextureLoader) {
    this.textureLoader = textureLoader;
  }

  initialize(): void {
    const texture = this.textureLoader.getTexture();
    if (texture) {
      this.material = new MeshBasicMaterial({
        map: texture,
        side: DoubleSide,
        transparent: true,
        alphaTest: 0.1,
      });
    }
  }

  getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  updateChunkMesh(chunk: Chunk, scene: Scene, chunkManager: ChunkManager): void {
    const key = this.getChunkKey(chunk.x, chunk.z);

    const oldMesh = this.chunkMeshes.get(key);
    if (oldMesh) {
      scene.remove(oldMesh);
      oldMesh.geometry.dispose();
      this.chunkMeshes.delete(key);
    }

    const geometry = this.buildChunkGeometry(chunk, chunkManager);
    if (!geometry) return;

    if (!this.material) return;
    const mesh = new Mesh(geometry, this.material);
    mesh.position.set(
      chunk.x * CHUNK_SIZE,
      0,
      chunk.z * CHUNK_SIZE
    );

    scene.add(mesh);
    this.chunkMeshes.set(key, mesh);
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
    }
    this.chunkMeshes.clear();
    this.material?.dispose();
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
  // Top (y+)
  [0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  // Bottom (y-)
  [0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0],
  // Front (z+)
  [0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
  // Back (z-)
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0],
  // Left (x-)
  [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0],
  // Right (x+)
  [1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1],
];
