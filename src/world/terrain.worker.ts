import { BlockType } from "./BlockType";
import { CHUNK_SIZE, CHUNK_HEIGHT, SEA_LEVEL } from "../utils/WorldConstants";
import { FractalNoise2D, FractalNoise3D } from "./generation/noise";
import { SplineInterpolator } from "./generation/spline/SplineInterpolator";
import {
  CONTINENTALNESS_HEIGHT_TABLE,
  EROSION_AMPLITUDE_TABLE,
  PV_SHAPE_TABLE,
  CONTINENTALNESS_SQUASH_TABLE,
  EROSION_SQUASH_TABLE,
} from "./generation/spline/TerrainSplines";
import { BiomeSelector, type TerrainParameters } from "./generation/biome";
import { CheeseCaveGenerator, SpaghettiCaveGenerator } from "./generation/cave";
import { TreeGenerator } from "./generation/tree";
import type { BiomeDefinition } from "./generation/biome/BiomeDefinition";

// Noise configurations
const NOISE_CONFIGS = {
  continentalness: { octaves: 4, lacunarity: 2, persistence: 0.5, scale: 0.0008 },
  erosion: { octaves: 4, lacunarity: 2, persistence: 0.5, scale: 0.0012 },
  pv: { octaves: 3, lacunarity: 2, persistence: 0.5, scale: 0.002 },
  temperature: { octaves: 3, lacunarity: 2, persistence: 0.5, scale: 0.001 },
  humidity: { octaves: 3, lacunarity: 2, persistence: 0.5, scale: 0.001 },
  detail3D: { octaves: 3, lacunarity: 2, persistence: 0.5, scale: 0.03 },
  cheeseCave: { octaves: 2, lacunarity: 2, persistence: 0.5, scale: 0.015 },
  spaghettiCave: { octaves: 2, lacunarity: 2, persistence: 0.5, scale: 0.02 },
} as const;

interface InitGeneratorMessage {
  type: "INIT_GENERATOR";
  seed: string;
}

interface GenerateChunkMessage {
  type: "GENERATE_CHUNK";
  cx: number;
  cz: number;
  priority: number;
}

interface ChunkReadyMessage {
  type: "CHUNK_READY";
  cx: number;
  cz: number;
  data: Uint8Array;
}

interface ErrorMessage {
  type: "ERROR";
  cx: number;
  cz: number;
  error: string;
}

type WorkerMessage = InitGeneratorMessage | GenerateChunkMessage;

class WorkerTerrainGenerator {
  // 2D noises (for terrain parameters)
  private continentalnessNoise!: FractalNoise2D;
  private erosionNoise!: FractalNoise2D;
  private pvNoise!: FractalNoise2D;
  private temperatureNoise!: FractalNoise2D;
  private humidityNoise!: FractalNoise2D;
  private treeNoise!: FractalNoise2D;

  // 3D noises (for terrain detail and caves)
  private detailNoise3D!: FractalNoise3D;
  private cheeseCaveNoise!: FractalNoise3D;
  private spaghettiCaveNoise!: FractalNoise3D;

  // Spline interpolators
  private continentalnessHeightSpline: SplineInterpolator;
  private erosionAmplitudeSpline: SplineInterpolator;
  private pvShapeSpline: SplineInterpolator;
  private continentalnessSquashSpline: SplineInterpolator;
  private erosionSquashSpline: SplineInterpolator;

  // Generators
  private biomeSelector: BiomeSelector;
  private cheeseCaveGenerator!: CheeseCaveGenerator;
  private spaghettiCaveGenerator!: SpaghettiCaveGenerator;
  private treeGenerator!: TreeGenerator;

  private initialized = false;

  constructor() {
    // Initialize splines (these don't need seed)
    this.continentalnessHeightSpline = new SplineInterpolator(
      CONTINENTALNESS_HEIGHT_TABLE,
    );
    this.erosionAmplitudeSpline = new SplineInterpolator(
      EROSION_AMPLITUDE_TABLE,
    );
    this.pvShapeSpline = new SplineInterpolator(PV_SHAPE_TABLE);
    this.continentalnessSquashSpline = new SplineInterpolator(
      CONTINENTALNESS_SQUASH_TABLE,
    );
    this.erosionSquashSpline = new SplineInterpolator(EROSION_SQUASH_TABLE);

    this.biomeSelector = new BiomeSelector();
  }

  initialize(seed: string): void {
    // Initialize 2D noises with different offsets
    this.continentalnessNoise = new FractalNoise2D(seed, 0);
    this.erosionNoise = new FractalNoise2D(seed, 1);
    this.pvNoise = new FractalNoise2D(seed, 2);
    this.temperatureNoise = new FractalNoise2D(seed, 3);
    this.humidityNoise = new FractalNoise2D(seed, 4);
    this.treeNoise = new FractalNoise2D(seed, 8);

    // Initialize 3D noises
    this.detailNoise3D = new FractalNoise3D(seed, 5);
    this.cheeseCaveNoise = new FractalNoise3D(seed, 6);
    this.spaghettiCaveNoise = new FractalNoise3D(seed, 7);

    // Initialize generators
    this.cheeseCaveGenerator = new CheeseCaveGenerator(
      this.cheeseCaveNoise,
      NOISE_CONFIGS.cheeseCave,
    );
    this.spaghettiCaveGenerator = new SpaghettiCaveGenerator(
      this.spaghettiCaveNoise,
      NOISE_CONFIGS.spaghettiCave,
    );
    this.treeGenerator = new TreeGenerator(this.treeNoise);

    this.initialized = true;
  }

  private getColumnTerrainData(worldX: number, worldZ: number): TerrainParameters {
    const c = this.continentalnessNoise.generate(
      worldX,
      worldZ,
      NOISE_CONFIGS.continentalness,
    );
    const e = this.erosionNoise.generate(
      worldX,
      worldZ,
      NOISE_CONFIGS.erosion,
    );
    const pv = this.pvNoise.generate(worldX, worldZ, NOISE_CONFIGS.pv);

    const targetHeight = this.calculateTargetHeight(c, e, pv);
    const squashFactor = this.calculateSquashFactor(c, e);

    const temp = this.temperatureNoise.generate(
      worldX,
      worldZ,
      NOISE_CONFIGS.temperature,
    );
    const humid = this.humidityNoise.generate(
      worldX,
      worldZ,
      NOISE_CONFIGS.humidity,
    );

    return {
      c,
      e,
      pv,
      temp,
      humid,
      targetHeight,
      squashFactor,
    };
  }

  private calculateTargetHeight(c: number, e: number, pv: number): number {
    const baseHeight = this.continentalnessHeightSpline.interpolateSmooth(c);
    const amplitude = this.erosionAmplitudeSpline.interpolateSmooth(e);
    const detailFactor = this.pvShapeSpline.interpolateSmooth(pv);
    return baseHeight + detailFactor * amplitude;
  }

  private calculateSquashFactor(c: number, e: number): number {
    const baseSquash = this.continentalnessSquashSpline.interpolateSmooth(c);
    const erosionFactor = this.erosionSquashSpline.interpolateSmooth(e);
    return Math.max(baseSquash, erosionFactor);
  }

  generateChunk(cx: number, cz: number): Uint8Array {
    if (!this.initialized) {
      throw new Error("Generator not initialized with seed");
    }

    const data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    data.fill(BlockType.AIR);

    // Precompute column terrain data
    const columnData: (TerrainParameters & { biome: BiomeDefinition })[][] = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      columnData[x] = [];
      const worldX = cx * CHUNK_SIZE + x;
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldZ = cz * CHUNK_SIZE + z;
        const params = this.getColumnTerrainData(worldX, worldZ);
        const biome = this.biomeSelector.selectBiome(params);
        columnData[x][z] = { ...params, biome };
      }
    }

    // Track surface heights
    const surfaceHeights: number[][] = Array(CHUNK_SIZE)
      .fill(null)
      .map(() => Array(CHUNK_SIZE).fill(-1));

    // First pass: generate base terrain
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = cx * CHUNK_SIZE + x;
        const worldZ = cz * CHUNK_SIZE + z;
        const colData = columnData[x][z];

        let surfaceY = -1;

        for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
          // Bedrock layer
          if (y === 0) {
            data[this.getIndex(x, y, z)] = BlockType.BEDROCK;
            if (surfaceY === -1) surfaceY = 0;
            continue;
          }

          // Calculate density
          const baseDensity =
            (colData.targetHeight - y) / colData.squashFactor;
          const detailNoise = this.detailNoise3D.generate(
            worldX,
            y,
            worldZ,
            NOISE_CONFIGS.detail3D,
          );
          const density = baseDensity + detailNoise * 0.5;

          let blockType: number | null = null;

          if (density > 0) {
            blockType = BlockType.STONE;
          }

          // Cave carving
          if (
            blockType !== null &&
            (this.cheeseCaveGenerator.isCave(worldX, y, worldZ) ||
              this.spaghettiCaveGenerator.isCave(worldX, y, worldZ))
          ) {
            blockType = null;
          }

          if (blockType !== null) {
            data[this.getIndex(x, y, z)] = blockType;
            if (surfaceY === -1) surfaceY = y;
          }
        }

        surfaceHeights[x][z] = surfaceY;
      }
    }

    // Second pass: fill water
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const surfaceY = surfaceHeights[x][z];
        if (surfaceY >= 0 && surfaceY < SEA_LEVEL) {
          for (let y = surfaceY + 1; y < SEA_LEVEL; y++) {
            const idx = this.getIndex(x, y, z);
            if (data[idx] === BlockType.AIR) {
              data[idx] = BlockType.WATER;
            }
          }
        }
      }
    }

    // Third pass: surface decoration
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const surfaceY = surfaceHeights[x][z];
        const colData = columnData[x][z];

        if (surfaceY >= 0) {
          this.applySurfaceDecoration(data, x, surfaceY, z, colData.biome);
        }
      }
    }

    // Fourth pass: generate trees
    const biomes: (BiomeDefinition | undefined)[][] = columnData.map((col) =>
      col.map((c) => c.biome),
    );
    this.treeGenerator.generateTrees(cx, cz, surfaceHeights, biomes, data);

    return data;
  }

  private applySurfaceDecoration(
    data: Uint8Array,
    x: number,
    surfaceY: number,
    z: number,
    biome: BiomeDefinition,
  ): void {
    const stoneDepth = biome.stoneDepth;

    for (let dy = 0; dy <= stoneDepth && surfaceY - dy >= 0; dy++) {
      const y = surfaceY - dy;
      const idx = this.getIndex(x, y, z);

      if (data[idx] === BlockType.STONE) {
        if (dy === 0) {
          // Surface layer
          if (biome.snowHeight > 0 && surfaceY > biome.snowHeight) {
            data[idx] = BlockType.SNOW;
          } else {
            data[idx] = biome.surfaceBlock;
          }
        } else {
          // Subsurface layer
          data[idx] = biome.subSurfaceBlock;
        }
      }
    }
  }

  private getIndex(x: number, y: number, z: number): number {
    return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
  }
}

// Worker message handling
const generator = new WorkerTerrainGenerator();

self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  const message = e.data;

  if (message.type === "INIT_GENERATOR") {
    try {
      generator.initialize(message.seed);
      self.postMessage({ type: "INIT_READY" });
    } catch (err) {
      const errorMessage: ErrorMessage = {
        type: "ERROR",
        cx: 0,
        cz: 0,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(errorMessage);
    }
  } else if (message.type === "GENERATE_CHUNK") {
    try {
      const { cx, cz } = message;
      const data = generator.generateChunk(cx, cz);

      const response: ChunkReadyMessage = {
        type: "CHUNK_READY",
        cx,
        cz,
        data,
      };

      self.postMessage(response, { transfer: [data.buffer] });
    } catch (err) {
      const errorMessage: ErrorMessage = {
        type: "ERROR",
        cx: message.cx,
        cz: message.cz,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(errorMessage);
    }
  }
};

export {};
