import { createNoise3D, type NoiseFunction3D } from "simplex-noise";
import { createSeededRandomWithOffset } from "./SeededRandom";
import type { FractalNoiseConfig } from "./FractalNoise2D";

export class FractalNoise3D {
  private noise: NoiseFunction3D;

  constructor(seed: string, offset: number) {
    const rng = createSeededRandomWithOffset(seed, offset);
    this.noise = createNoise3D(rng);
  }

  generate(
    x: number,
    y: number,
    z: number,
    config: FractalNoiseConfig,
  ): number {
    let total = 0;
    let amplitude = 1;
    let frequency = config.scale;
    let maxValue = 0;

    for (let i = 0; i < config.octaves; i++) {
      total +=
        this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= config.persistence;
      frequency *= config.lacunarity;
    }

    return total / maxValue; // Normalize to [-1, 1]
  }
}
