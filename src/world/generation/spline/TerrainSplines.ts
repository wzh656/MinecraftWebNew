import type { ControlPoint } from "./SplineInterpolator";

// Continentalness to base height mapping (determines ocean/land distribution)
export const CONTINENTALNESS_HEIGHT_TABLE: ControlPoint[] = [
  { input: -1.0, output: 30 }, // Deep ocean
  { input: -0.7, output: 45 }, // Deep to shallow ocean transition
  { input: -0.4, output: 50 }, // Shallow ocean
  { input: -0.15, output: 55 }, // Coast/beach
  { input: 0.0, output: 68 }, // Coastal flat
  { input: 0.15, output: 75 }, // Lowland
  { input: 0.3, output: 95 }, // Starting to rise
  { input: 0.4, output: 140 }, // [Steep cliff] Small change causes large height increase
  { input: 0.5, output: 160 }, // High mountain
  { input: 0.7, output: 180 }, // Higher
  { input: 1.0, output: 200 }, // Highest peak
];

// Erosion to amplitude mapping (higher erosion = flatter terrain)
export const EROSION_AMPLITUDE_TABLE: ControlPoint[] = [
  { input: -1.0, output: 25 }, // Low erosion = high amplitude = rugged terrain
  { input: -0.5, output: 18 },
  { input: 0.0, output: 10 },
  { input: 0.5, output: 4 },
  { input: 1.0, output: 1.5 }, // High erosion = low amplitude = flat terrain
];

// PeaksValleys mapping (maps PV noise to -1 to 1 detail factor)
export const PV_SHAPE_TABLE: ControlPoint[] = [
  { input: -1.0, output: -1.0 }, // Deep valley
  { input: -0.3, output: -0.3 },
  { input: 0.0, output: 0.0 },
  { input: 0.3, output: 0.3 },
  { input: 1.0, output: 1.0 }, // High peak
];

// Continentalness to Squash factor mapping
export const CONTINENTALNESS_SQUASH_TABLE: ControlPoint[] = [
  { input: -1.0, output: 30 }, // Ocean is flat
  { input: -0.2, output: 25 },
  { input: 0.2, output: 15 },
  { input: 0.35, output: 3 }, // Cliff is steep
  { input: 1.0, output: 8 }, // Mountain peak is steep
];

// Erosion to Squash factor mapping (high erosion needs large Squash to flatten terrain)
export const EROSION_SQUASH_TABLE: ControlPoint[] = [
  { input: -1.0, output: 80 }, // High erosion = large Squash = very flat
  { input: -0.5, output: 40 },
  { input: 0.0, output: 15 },
  { input: 1.0, output: 5 }, // Low erosion = small Squash = steep
];

// Cave height attenuation table (y -> threshold offset)
// Higher elevations have higher thresholds (harder to form caves)
export const CAVE_HEIGHT_ATTENUATION_TABLE: ControlPoint[] = [
  // { input: 0, output: -0.2 }, // y=0, threshold lowered (easier to form caves)
  { input: 0, output: 0 }, // y=40, standard threshold
  { input: 40, output: 0 }, // y=80, threshold raised
  { input: 60, output: 0.65 }, // y=80, threshold raised
  { input: 80, output: 0.8 }, // y=120, hard to form caves
  { input: 200, output: 2.0 }, // y=200, almost impossible to have caves
];
