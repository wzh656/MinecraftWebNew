import { Chunk } from './Chunk';
import { BlockType } from './BlockType';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '../utils/Constants';

export class TerrainGenerator {
  generateChunk(cx: number, cz: number): Chunk {
    const chunk = new Chunk(cx, cz);

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        // Generate varied terrain height using simple noise-like pattern
        const worldX = cx * CHUNK_SIZE + x;
        const worldZ = cz * CHUNK_SIZE + z;
        const groundHeight = this.getTerrainHeight(worldX, worldZ);

        for (let y = 0; y <= groundHeight && y < CHUNK_HEIGHT; y++) {
          let blockType: BlockType;

          if (y === groundHeight) {
            blockType = BlockType.GRASS;
          } else if (y >= groundHeight - 2) {
            blockType = BlockType.DIRT;
          } else {
            blockType = BlockType.STONE;
          }

          chunk.setBlock(x, y, z, blockType);
        }

        // Occasionally add a tree or feature
        if (groundHeight < CHUNK_HEIGHT - 5 && x % 7 === 3 && z % 7 === 3) {
          this.addTree(chunk, x, groundHeight + 1, z);
        }
      }
    }

    return chunk;
  }

  private getTerrainHeight(worldX: number, worldZ: number): number {
    // Simple pseudo-random height generation
    // Use sine waves to create rolling hills
    const scale1 = 0.05;
    const scale2 = 0.1;
    const height1 = Math.sin(worldX * scale1) * Math.cos(worldZ * scale1) * 8;
    const height2 = Math.sin(worldX * scale2 + 1.5) * Math.cos(worldZ * scale2 + 2.3) * 4;

    // Base height around 60, with variation from 50 to 80
    return Math.floor(60 + height1 + height2);
  }

  private addTree(chunk: Chunk, x: number, y: number, z: number): void {
    // Tree trunk
    const trunkHeight = 4;
    for (let i = 0; i < trunkHeight && y + i < CHUNK_HEIGHT; i++) {
      chunk.setBlock(x, y + i, z, BlockType.WOOD);
    }

    // Tree leaves
    const leafStart = y + trunkHeight - 1;
    const leafRadius = 2;
    for (let ly = leafStart; ly <= leafStart + 2 && ly < CHUNK_HEIGHT; ly++) {
      for (let lx = x - leafRadius; lx <= x + leafRadius; lx++) {
        for (let lz = z - leafRadius; lz <= z + leafRadius; lz++) {
          // Skip corners for rounder look
          if (Math.abs(lx - x) === leafRadius && Math.abs(lz - z) === leafRadius) continue;
          // Skip trunk position
          if (lx === x && lz === z && ly < leafStart + 2) continue;

          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
            chunk.setBlock(lx, ly, lz, BlockType.LEAVES);
          }
        }
      }
    }
  }
}
