import type { FractalNoise3D } from "../noise/FractalNoise3D";
import type { FractalNoiseConfig } from "../noise/FractalNoise2D";
import { SplineInterpolator } from "../spline/SplineInterpolator";
import { CAVE_HEIGHT_ATTENUATION_TABLE } from "../spline/TerrainSplines";

// Spaghetti cave radius
const CAVE_SPAGHETTI_RADIUS = 0.1;

export class SpaghettiCaveGenerator {
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
   * Check if position is inside a spaghetti cave (tunnel-type caves)
   */
  isCave(worldX: number, worldY: number, worldZ: number): boolean {
    const spaghettiNoise = this.noise.generate(
      worldX,
      worldY,
      worldZ,
      this.config,
    );

    // Height attenuation: higher elevations have smaller radius
    const heightAttenuation = this.heightAttenuationSpline.interpolate(worldY);
    const radius = Math.max(
      0.01,
      CAVE_SPAGHETTI_RADIUS - heightAttenuation * 0.1,
    );

    return Math.abs(spaghettiNoise) < radius;
  }
}
