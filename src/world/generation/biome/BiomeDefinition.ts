import { BlockType } from "../../BlockType";
import type { BiomeType } from "./BiomeType";

export interface BiomeDefinition {
  type: BiomeType;
  name: string;
  center: [number, number, number, number, number]; // [C, E, PV, T, H]
  surfaceBlock: number;
  subSurfaceBlock: number;
  stoneDepth: number;
  treeDensity: number;
  snowHeight: number; // -1 means no snow
}

export const BIOME_DEFINITIONS: BiomeDefinition[] = [
  {
    type: 1, // DEEP_OCEAN
    name: "deep_ocean",
    center: [-0.8, 0.5, 0.0, 0.5, 0.5],
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    stoneDepth: 3,
    treeDensity: 0,
    snowHeight: -1,
  },
  {
    type: 0, // OCEAN
    name: "ocean",
    center: [-0.5, 0.3, 0.0, 0.5, 0.6],
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    stoneDepth: 3,
    treeDensity: 0,
    snowHeight: -1,
  },
  {
    type: 2, // PLAINS
    name: "plains",
    center: [0.0, 0.6, 0.0, 0.7, 0.5],
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    stoneDepth: 3,
    treeDensity: 0.02,
    snowHeight: -1,
  },
  {
    type: 3, // FOREST
    name: "forest",
    center: [0.1, 0.4, 0.2, 0.6, 0.7],
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    stoneDepth: 3,
    treeDensity: 0.25,
    snowHeight: -1,
  },
  {
    type: 4, // DESERT
    name: "desert",
    center: [0.0, 0.3, 0.0, 0.9, 0.1],
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    stoneDepth: 5,
    treeDensity: 0,
    snowHeight: -1,
  },
  {
    type: 7, // HILLS
    name: "hills",
    center: [0.2, 0.2, 0.3, 0.6, 0.5],
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    stoneDepth: 3,
    treeDensity: 0.08,
    snowHeight: -1,
  },
  {
    type: 5, // MOUNTAINS
    name: "mountains",
    center: [0.5, -0.3, 0.6, 0.4, 0.4],
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    stoneDepth: 2,
    treeDensity: 0.02,
    snowHeight: 140,
  },
  {
    type: 6, // SNOWY_MOUNTAINS
    name: "snowy_mountains",
    center: [0.5, -0.2, 0.7, 0.1, 0.3],
    surfaceBlock: BlockType.SNOW,
    subSurfaceBlock: BlockType.DIRT,
    stoneDepth: 2,
    treeDensity: 0,
    snowHeight: 100,
  },
];
