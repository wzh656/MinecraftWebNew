import type { BiomeType } from "./BiomeType";
import { BIOME_DEFINITIONS, type BiomeDefinition } from "./BiomeDefinition";
import { SEA_LEVEL } from "../../../utils/WorldConstants";

// Configuration constants
const DESERT_TEMP_THRESHOLD = 0.4;
const DESERT_HUMID_THRESHOLD = -0.1;
const SNOW_TEMP_THRESHOLD = -0.2;
const OCEAN_MAX_HEIGHT = SEA_LEVEL - 5;
const LOWLAND_MAX_HEIGHT = 85;
const HIGHLAND_MAX_HEIGHT = 130;

export interface TerrainParameters {
  c: number; // continentalness
  e: number; // erosion
  pv: number; // peaks/valleys
  temp: number; // temperature
  humid: number; // humidity
  targetHeight: number;
  squashFactor: number;
}

export class BiomeSelector {
  /**
   * Select biome based on terrain parameters and height
   */
  selectBiome(params: TerrainParameters): BiomeDefinition {
    const { c, e, pv, temp, humid, targetHeight } = params;

    // Altitude-adjusted temperature (colder at higher elevations)
    const altitudeTempFactor = Math.max(0, (targetHeight - 80) / 150);
    const adjustedTemp = temp - altitudeTempFactor * 0.5;

    // Deep ocean/ocean: below sea level
    if (targetHeight < OCEAN_MAX_HEIGHT) {
      if (c < -0.6) {
        return this.getBiomeByType(1); // DEEP_OCEAN
      }
      return this.getBiomeByType(0); // OCEAN
    }

    // Beach/coast: near sea level
    if (targetHeight < SEA_LEVEL + 3) {
      // Hot dry areas become desert beaches
      if (
        adjustedTemp > DESERT_TEMP_THRESHOLD &&
        humid < DESERT_HUMID_THRESHOLD
      ) {
        return this.getBiomeByType(4); // DESERT
      }
      return this.getBiomeByType(0); // OCEAN (sand)
    }

    // Lowland: above sea level but not too high
    if (targetHeight < LOWLAND_MAX_HEIGHT) {
      // Hot dry areas become desert
      if (
        adjustedTemp > DESERT_TEMP_THRESHOLD &&
        humid < DESERT_HUMID_THRESHOLD
      ) {
        return this.getBiomeByType(4); // DESERT
      }

      const biomePool = [
        this.getBiomeByType(2), // PLAINS
        this.getBiomeByType(3), // FOREST
        this.getBiomeByType(7), // HILLS
      ];

      return this.selectFromPool(biomePool, c, e, pv, adjustedTemp, humid);
    }

    // Highland
    if (targetHeight < HIGHLAND_MAX_HEIGHT) {
      const biomePool = [
        this.getBiomeByType(7), // HILLS
        this.getBiomeByType(3), // FOREST
      ];

      if (e > 0.3) {
        biomePool.push(this.getBiomeByType(2)); // PLAINS
      }

      return this.selectFromPool(biomePool, c, e, pv, adjustedTemp, humid);
    }

    // High mountain area
    if (adjustedTemp < SNOW_TEMP_THRESHOLD) {
      return this.getBiomeByType(6); // SNOWY_MOUNTAINS
    }

    const biomePool = [
      this.getBiomeByType(5), // MOUNTAINS
      this.getBiomeByType(7), // HILLS
    ];

    return this.selectFromPool(biomePool, c, e, pv, adjustedTemp, humid);
  }

  private selectFromPool(
    pool: BiomeDefinition[],
    c: number,
    e: number,
    pv: number,
    temp: number,
    humid: number,
  ): BiomeDefinition {
    const v: [number, number, number, number, number] = [c, e, pv, temp, humid];

    let nearestBiome = pool[0];
    let minDistance = Infinity;

    for (const biome of pool) {
      const distance = this.calculateBiomeDistance(v, biome.center);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBiome = biome;
      }
    }

    return nearestBiome;
  }

  private getBiomeByType(type: BiomeType): BiomeDefinition {
    const biome = BIOME_DEFINITIONS.find((b) => b.type === type);
    if (!biome) throw new Error(`Unknown biome type: ${type}`);
    return biome;
  }

  /**
   * Calculate weighted Euclidean distance for biome selection
   */
  private calculateBiomeDistance(
    v: [number, number, number, number, number],
    center: [number, number, number, number, number],
  ): number {
    // Weights: C and E have the most impact on terrain
    const weights = [1.5, 1.2, 1.0, 0.8, 0.8];

    let sum = 0;
    for (let i = 0; i < 5; i++) {
      const diff = v[i] - center[i];
      sum += weights[i] * diff * diff;
    }

    return Math.sqrt(sum);
  }
}
