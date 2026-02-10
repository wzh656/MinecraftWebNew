import type { FractalNoise2D } from "../noise/FractalNoise2D";
import type { FractalNoiseConfig } from "../noise/FractalNoise2D";
import type { BiomeDefinition } from "../biome/BiomeDefinition";
import { BiomeType } from "../biome/BiomeType";
import { BlockType } from "../../BlockType";
import { CHUNK_SIZE, CHUNK_HEIGHT, SEA_LEVEL } from "../../../utils/WorldConstants";

// Tree generation configuration
const TREE_MIN_DISTANCE = 4;
const TREE_EDGE_MARGIN = 4;
const TREE_TRUNK_HEIGHT = 4;
const TREE_LEAF_HEIGHT = 3;

export class TreeGenerator {
  private noise: FractalNoise2D;
  private treePositions: Set<string> = new Set();

  constructor(noise: FractalNoise2D) {
    this.noise = noise;
  }

  /**
   * Generate trees for a chunk
   * Returns array of tree positions {x, y, z, biome}
   */
  generateTrees(
    cx: number,
    cz: number,
    surfaceHeights: number[][],
    biomes: (BiomeDefinition | undefined)[][],
    data: Uint8Array,
  ): void {
    this.treePositions.clear();

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = cx * CHUNK_SIZE + x;
        const worldZ = cz * CHUNK_SIZE + z;
        const biome = biomes[x]?.[z];

        if (!biome || biome.treeDensity <= 0) continue;

        // Edge protection
        if (
          x < TREE_EDGE_MARGIN ||
          x >= CHUNK_SIZE - TREE_EDGE_MARGIN ||
          z < TREE_EDGE_MARGIN ||
          z >= CHUNK_SIZE - TREE_EDGE_MARGIN
        ) {
          continue;
        }

        if (this.isTooCloseToOtherTree(worldX, worldZ)) {
          continue;
        }

        if (this.shouldPlaceTree(worldX, worldZ, biome.treeDensity)) {
          const surfaceY = surfaceHeights[x]?.[z] ?? -1;
          if (surfaceY < 0) continue;

          const groundBlock = data[this.getIndex(x, surfaceY, z)];

          // Don't plant underwater
          if (surfaceY < SEA_LEVEL) continue;

          // Only plant on specific blocks
          const canPlantOn =
            groundBlock === BlockType.GRASS ||
            groundBlock === BlockType.DIRT ||
            groundBlock === BlockType.SAND;

          if (
            surfaceY > 0 &&
            surfaceY < CHUNK_HEIGHT - 8 &&
            canPlantOn &&
            this.isValidTreeLocation(data, x, surfaceY + 1, z)
          ) {
            this.placeTree(data, x, surfaceY + 1, z, biome);
            this.treePositions.add(`${worldX},${worldZ}`);
          }
        }
      }
    }
  }

  private isTooCloseToOtherTree(worldX: number, worldZ: number): boolean {
    for (const pos of this.treePositions) {
      const [tx, tz] = pos.split(",").map(Number);
      const dist = Math.sqrt(
        Math.pow(tx - worldX, 2) + Math.pow(tz - worldZ, 2),
      );
      if (dist < TREE_MIN_DISTANCE) {
        return true;
      }
    }
    return false;
  }

  private isValidTreeLocation(
    data: Uint8Array,
    x: number,
    y: number,
    z: number,
  ): boolean {
    const maxHeight = TREE_TRUNK_HEIGHT + TREE_LEAF_HEIGHT;

    for (let i = 0; i < maxHeight; i++) {
      if (y + i >= CHUNK_HEIGHT) return false;

      const block = data[this.getIndex(x, y + i, z)];

      // Trunk position must be air or water
      if (i < TREE_TRUNK_HEIGHT) {
        if (block !== BlockType.AIR && block !== BlockType.WATER) {
          return false;
        }
      }
    }
    return true;
  }

  private shouldPlaceTree(
    worldX: number,
    worldZ: number,
    treeDensity: number,
  ): boolean {
    const config: FractalNoiseConfig = {
      octaves: 1,
      lacunarity: 2,
      persistence: 0.5,
      scale: 0.1,
    };
    const treeNoise = this.noise.generate(worldX, worldZ, config);

    // Map noise from [-1, 1] to [0, 1]
    const normalizedNoise = (treeNoise + 1) * 0.5;

    return normalizedNoise < treeDensity;
  }

  private placeTree(
    data: Uint8Array,
    x: number,
    y: number,
    z: number,
    biome: BiomeDefinition,
  ): void {
    const trunkHeight =
      biome.type === BiomeType.MOUNTAINS
        ? TREE_TRUNK_HEIGHT - 1
        : TREE_TRUNK_HEIGHT;

    // Trunk - only replace air/water
    for (let i = 0; i < trunkHeight && y + i < CHUNK_HEIGHT; i++) {
      const idx = this.getIndex(x, y + i, z);
      const current = data[idx];
      if (current === BlockType.AIR || current === BlockType.WATER) {
        data[idx] = BlockType.WOOD;
      }
    }

    // Leaves - don't cover non-air blocks
    const leafStart = y + trunkHeight - 1;
    const leafRadius = biome.type === BiomeType.MOUNTAINS ? 1 : 2;

    for (
      let ly = leafStart;
      ly <= leafStart + 2 && ly < CHUNK_HEIGHT;
      ly++
    ) {
      for (let lx = x - leafRadius; lx <= x + leafRadius; lx++) {
        for (let lz = z - leafRadius; lz <= z + leafRadius; lz++) {
          // Skip corners
          if (
            Math.abs(lx - x) === leafRadius &&
            Math.abs(lz - z) === leafRadius
          )
            continue;

          // Skip top of trunk
          if (lx === x && lz === z && ly === leafStart) continue;

          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
            const idx = this.getIndex(lx, ly, lz);
            // Leaves only replace air
            if (data[idx] === BlockType.AIR) {
              data[idx] = BlockType.LEAVES;
            }
          }
        }
      }
    }
  }

  private getIndex(x: number, y: number, z: number): number {
    return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
  }
}
