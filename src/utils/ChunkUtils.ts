import { CHUNK_SIZE } from "./WorldConstants";

/**
 * Get a unique key string for a chunk coordinate
 */
export function getChunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/**
 * Convert world coordinates to chunk coordinates
 */
export function worldToChunk(
  worldX: number,
  worldZ: number,
): { cx: number; cz: number } {
  return {
    cx: Math.floor(worldX / CHUNK_SIZE),
    cz: Math.floor(worldZ / CHUNK_SIZE),
  };
}

/**
 * Convert world coordinates to local chunk coordinates (0-15)
 */
export function worldToLocal(
  worldX: number,
  worldY: number,
  worldZ: number,
): { x: number; y: number; z: number } {
  const { cx, cz } = worldToChunk(worldX, worldZ);
  return {
    x: worldX - cx * CHUNK_SIZE,
    y: worldY,
    z: worldZ - cz * CHUNK_SIZE,
  };
}

/**
 * Convert local chunk coordinates to world coordinates
 */
export function localToWorld(
  cx: number,
  cz: number,
  localX: number,
  localY: number,
  localZ: number,
): { x: number; y: number; z: number } {
  return {
    x: cx * CHUNK_SIZE + localX,
    y: localY,
    z: cz * CHUNK_SIZE + localZ,
  };
}

/**
 * Get the index into a chunk's data array for local coordinates
 */
export function getChunkIndex(x: number, y: number, z: number): number {
  return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
}

/**
 * Check if local coordinates are within chunk bounds
 */
export function isInChunkBounds(x: number, z: number): boolean {
  return x >= 0 && x < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE;
}
