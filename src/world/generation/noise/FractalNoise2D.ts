import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import { createSeededRandomWithOffset } from "./SeededRandom";

export interface FractalNoiseConfig {
  octaves: number;
  lacunarity: number; // Frequency multiplier, typically 2
  persistence: number; // Amplitude multiplier, typically 0.5
  scale: number; // Base frequency scale
}

export class FractalNoise2D {
  private noise: NoiseFunction2D;

  constructor(seed: string, offset: number) {
    const rng = createSeededRandomWithOffset(seed, offset);
    this.noise = createNoise2D(rng);
  }

  generate(x: number, y: number, config: FractalNoiseConfig): number {
    let total = 0;
    let amplitude = 1;
    let frequency = config.scale;
    let maxValue = 0;

    for (let i = 0; i < config.octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= config.persistence;
      frequency *= config.lacunarity;
    }

    return total / maxValue; // Normalize to [-1, 1]
  }
}
