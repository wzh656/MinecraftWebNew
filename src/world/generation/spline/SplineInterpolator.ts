export interface ControlPoint {
  input: number;
  output: number;
}

export class SplineInterpolator {
  private points: ControlPoint[];

  constructor(points: ControlPoint[]) {
    // Sort by input
    this.points = [...points].sort((a, b) => a.input - b.input);
  }

  // Linear interpolation
  interpolate(t: number): number {
    // Boundary handling
    if (t <= this.points[0].input) return this.points[0].output;
    if (t >= this.points[this.points.length - 1].input)
      return this.points[this.points.length - 1].output;

    // Binary search to find interval
    let low = 0;
    let high = this.points.length - 1;

    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2);
      if (this.points[mid].input <= t) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const pLow = this.points[low];
    const pHigh = this.points[high];

    // Normalize
    const alpha = (t - pLow.input) / (pHigh.input - pLow.input);

    // Linear interpolation
    return pLow.output + alpha * (pHigh.output - pLow.output);
  }

  // Smooth interpolation (Smoothstep)
  interpolateSmooth(t: number): number {
    // Boundary handling
    if (t <= this.points[0].input) return this.points[0].output;
    if (t >= this.points[this.points.length - 1].input)
      return this.points[this.points.length - 1].output;

    // Binary search
    let low = 0;
    let high = this.points.length - 1;

    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2);
      if (this.points[mid].input <= t) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const pLow = this.points[low];
    const pHigh = this.points[high];

    // Normalize
    let alpha = (t - pLow.input) / (pHigh.input - pLow.input);

    // Smoothstep: 3t^2 - 2t^3
    alpha = alpha * alpha * (3 - 2 * alpha);

    return pLow.output + alpha * (pHigh.output - pLow.output);
  }
}
