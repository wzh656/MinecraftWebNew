import type { FractalNoise3D } from "../noise/FractalNoise3D";
import type { FractalNoiseConfig } from "../noise/FractalNoise2D";
import { SplineInterpolator } from "../spline/SplineInterpolator";
import { CAVE_HEIGHT_ATTENUATION_TABLE } from "../spline/TerrainSplines";

// Cheese cave threshold
const CAVE_CHEESE_THRESHOLD = -0.65;

export class CheeseCaveGenerator {
  private noise: FractalNoise3D;
  private config: FractalNoiseConfig;
  private heightAttenuationSpline: SplineInterpolator;

  constructor(noise: FractalNoise3D, config: FractalNoiseConfig) {
    this.noise = noise;
    this.config = config;
    this.heightAttenuationSpline = new SplineInterpolator(
      CAVE_HEIGHT_ATTENUATION_TABLE,
    );
  }

  /**
   * Check if position is inside a cheese cave (bubble-type caves)
   */
  isCave(worldX: number, worldY: number, worldZ: number): boolean {
    const cheeseNoise = this.noise.generate(worldX, worldY, worldZ, this.config);

    // Height attenuation: higher elevations have higher thresholds
    const heightAttenuation = this.heightAttenuationSpline.interpolate(worldY);
    const threshold = CAVE_CHEESE_THRESHOLD + heightAttenuation;

    return cheeseNoise < threshold;
  }
}
