import { ChunkManager } from '../world/ChunkManager';

export interface AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export class Physics {
  constructor(private chunkManager: ChunkManager) {}

  /**
   * DDA (Digital Differential Analyzer) raycast algorithm
   * Accurately finds the first solid block intersected by the ray
   */
  raycast(
    originX: number,
    originY: number,
    originZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    maxDistance: number
  ): { x: number; y: number; z: number; face: number } | null {
    if (dirX === 0 && dirY === 0 && dirZ === 0) return null;

    // Normalize direction
    const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    const ndx = dirX / len;
    const ndy = dirY / len;
    const ndz = dirZ / len;

    // Current block coordinates
    let bx = Math.floor(originX);
    let by = Math.floor(originY);
    let bz = Math.floor(originZ);

    // Step direction (-1 or 1)
    const stepX = ndx > 0 ? 1 : -1;
    const stepY = ndy > 0 ? 1 : -1;
    const stepZ = ndz > 0 ? 1 : -1;

    // Distance to next voxel boundary
    const nextBoundaryX = ndx > 0 ? bx + 1 : bx;
    const nextBoundaryY = ndy > 0 ? by + 1 : by;
    const nextBoundaryZ = ndz > 0 ? bz + 1 : bz;

    // tMax: distance along ray to next boundary
    let tMaxX = ndx !== 0 ? (nextBoundaryX - originX) / ndx : Infinity;
    let tMaxY = ndy !== 0 ? (nextBoundaryY - originY) / ndy : Infinity;
    let tMaxZ = ndz !== 0 ? (nextBoundaryZ - originZ) / ndz : Infinity;

    // tDelta: distance between voxel boundaries
    const tDeltaX = ndx !== 0 ? Math.abs(1 / ndx) : Infinity;
    const tDeltaY = ndy !== 0 ? Math.abs(1 / ndy) : Infinity;
    const tDeltaZ = ndz !== 0 ? Math.abs(1 / ndz) : Infinity;

    // First check: is the starting position inside a solid block?
    // If so, return that block immediately (player is stuck)
    if (this.chunkManager.isSolid(bx, by, bz)) {
      // Determine which face the ray is exiting from
      // This is approximate - we use the direction as hint
      let face = 0;
      const absX = Math.abs(ndx);
      const absY = Math.abs(ndy);
      const absZ = Math.abs(ndz);
      if (absX >= absY && absX >= absZ) {
        face = ndx > 0 ? 4 : 5; // Exiting from -X or +X face
      } else if (absY >= absX && absY >= absZ) {
        face = ndy > 0 ? 1 : 0; // Exiting from -Y or +Y face
      } else {
        face = ndz > 0 ? 3 : 2; // Exiting from -Z or +Z face
      }
      return { x: bx, y: by, z: bz, face };
    }

    // DDA traversal
    let t = 0;
    let prevBx = bx;
    let prevBy = by;
    let prevBz = bz;

    while (t < maxDistance) {
      // Move to next voxel
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        t = tMaxX;
        tMaxX += tDeltaX;
        prevBx = bx;
        bx += stepX;
      } else if (tMaxY < tMaxZ) {
        t = tMaxY;
        tMaxY += tDeltaY;
        prevBy = by;
        by += stepY;
      } else {
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        prevBz = bz;
        bz += stepZ;
      }

      // Check if new position is solid
      if (this.chunkManager.isSolid(bx, by, bz)) {
        // Determine which face we hit based on direction we came from
        let face = 0;
        if (bx !== prevBx) {
          face = bx > prevBx ? 4 : 5; // Hit from -X or +X
        } else if (by !== prevBy) {
          face = by > prevBy ? 1 : 0; // Hit from -Y or +Y
        } else if (bz !== prevBz) {
          face = bz > prevBz ? 3 : 2; // Hit from -Z or +Z
        }
        return { x: bx, y: by, z: bz, face };
      }
    }

    return null;
  }
}
