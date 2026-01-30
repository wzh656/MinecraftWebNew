import { ChunkManager } from "../world/ChunkManager";

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
    maxDistance: number,
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
    if (this.chunkManager.isSolid(bx, by, bz)) {
      let face = 0;
      const absX = Math.abs(ndx);
      const absY = Math.abs(ndy);
      const absZ = Math.abs(ndz);
      if (absX >= absY && absX >= absZ) {
        face = ndx > 0 ? 4 : 5;
      } else if (absY >= absX && absY >= absZ) {
        face = ndy > 0 ? 1 : 0;
      } else {
        face = ndz > 0 ? 3 : 2;
      }
      return { x: bx, y: by, z: bz, face };
    }

    // DDA traversal
    let t = 0;

    while (t < maxDistance) {
      // Store previous position before stepping
      const prevBx = bx;
      const prevBy = by;
      const prevBz = bz;

      // Move to next voxel
      // When ray is pointing primarily downward (|ndy| > |ndx| and |ndy| > |ndz|),
      // we MUST prioritize Y steps to avoid detecting side faces when looking at top face
      const absNdx = Math.abs(ndx);
      const absNdy = Math.abs(ndy);
      const absNdz = Math.abs(ndz);

      if (absNdy >= absNdx && absNdy >= absNdz) {
        // Y is dominant direction - prioritize Y steps
        if (tMaxY <= tMaxX && tMaxY <= tMaxZ) {
          t = tMaxY;
          tMaxY += tDeltaY;
          by += stepY;
        } else if (tMaxX <= tMaxZ) {
          t = tMaxX;
          tMaxX += tDeltaX;
          bx += stepX;
        } else {
          t = tMaxZ;
          tMaxZ += tDeltaZ;
          bz += stepZ;
        }
      } else if (absNdx >= absNdy && absNdx >= absNdz) {
        // X is dominant direction
        if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
          t = tMaxX;
          tMaxX += tDeltaX;
          bx += stepX;
        } else if (tMaxY <= tMaxZ) {
          t = tMaxY;
          tMaxY += tDeltaY;
          by += stepY;
        } else {
          t = tMaxZ;
          tMaxZ += tDeltaZ;
          bz += stepZ;
        }
      } else {
        // Z is dominant direction
        if (tMaxZ <= tMaxX && tMaxZ <= tMaxY) {
          t = tMaxZ;
          tMaxZ += tDeltaZ;
          bz += stepZ;
        } else if (tMaxX <= tMaxY) {
          t = tMaxX;
          tMaxX += tDeltaX;
          bx += stepX;
        } else {
          t = tMaxY;
          tMaxY += tDeltaY;
          by += stepY;
        }
      }

      // Check if new position is solid
      if (this.chunkManager.isSolid(bx, by, bz)) {
        // Determine face based on which coordinate changed
        let face = 0;
        if (bx !== prevBx) {
          face = bx > prevBx ? 4 : 5;
        } else if (by !== prevBy) {
          face = by > prevBy ? 1 : 0;
        } else if (bz !== prevBz) {
          face = bz > prevBz ? 3 : 2;
        }

        return { x: bx, y: by, z: bz, face };
      }
    }

    return null;
  }
}
