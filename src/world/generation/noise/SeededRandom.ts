/**
 * Deterministic random number generator (Mulberry32)
 * Based on string seed for reproducible terrain generation
 */

// Use cyrb128 hash algorithm to convert string to 32-bit number
function cyrb128Hash(str: string): number {
  let hash = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash;
}

/**
 * Create a seeded random number generator from a string seed
 * Uses Mulberry32 algorithm for fast, high-quality random numbers
 */
export function createSeededRandom(seed: string): () => number {
  let hash = cyrb128Hash(seed);

  // Mulberry32 algorithm
  return function () {
    hash |= 0;
    hash = (hash + 0x6d2b79f5) | 0;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded random number generator with an offset
 * Used to ensure different noise instances use different state sequences
 */
export function createSeededRandomWithOffset(
  seed: string,
  offset: number,
): () => number {
  const rng = createSeededRandom(seed);
  // Skip offset * 100 random numbers
  for (let i = 0; i < offset * 100; i++) rng();
  return rng;
}
