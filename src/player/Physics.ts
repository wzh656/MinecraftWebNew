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

  raycast(
    originX: number,
    originY: number,
    originZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    maxDistance: number
  ): { x: number; y: number; z: number; face: number } | null {
    // console.log('raycast origin:', originX, originY, originZ, 'dir:', dirX, dirY, dirZ);
    if (dirX === 0 && dirY === 0 && dirZ === 0) return null;

    // Normalize direction
    const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    const ndx = dirX / len;
    const ndy = dirY / len;
    const ndz = dirZ / len;

    // Small step size for precision
    const stepSize = 0.05;
    const steps = Math.ceil(maxDistance / stepSize);

    // Calculate starting block (the block containing the origin)
    let prevX = Math.floor(originX);
    let prevY = Math.floor(originY);
    let prevZ = Math.floor(originZ);

    // Skip the starting block - we shouldn't detect collision with the block we're inside
    // Start from a small offset along the ray direction
    let startOffset = stepSize;
    while (startOffset < maxDistance) {
      const t = startOffset;
      const x = originX + ndx * t;
      const y = originY + ndy * t;
      const z = originZ + ndz * t;

      const bx = Math.floor(x);
      const by = Math.floor(y);
      const bz = Math.floor(z);

      // If we've moved to a different block, that's where we start checking
      if (bx !== prevX || by !== prevY || bz !== prevZ) {
        prevX = bx;
        prevY = by;
        prevZ = bz;
        break;
      }

      startOffset += stepSize;
    }

    for (let i = Math.ceil(startOffset / stepSize); i < steps; i++) {
      const t = i * stepSize;
      const x = originX + ndx * t;
      const y = originY + ndy * t;
      const z = originZ + ndz * t;

      const bx = Math.floor(x);
      const by = Math.floor(y);
      const bz = Math.floor(z);

      // Check if we moved to a new block
      if (bx !== prevX || by !== prevY || bz !== prevZ) {
        // Check if the new block is solid
        const solid = this.chunkManager.isSolid(bx, by, bz);
        // console.log('Checking block', bx, by, bz, 'solid:', solid, 'from prev', prevX, prevY, prevZ);
        if (solid) {
          // Determine which face we hit by looking at the direction we came from
          let face = 0;
          if (bx > prevX) face = 4; // Left face (hit from -X)
          else if (bx < prevX) face = 5; // Right face (hit from +X)
          else if (by > prevY) face = 1; // Bottom face (hit from -Y)
          else if (by < prevY) face = 0; // Top face (hit from +Y)
          else if (bz > prevZ) face = 3; // Back face (hit from -Z)
          else if (bz < prevZ) face = 2; // Front face (hit from +Z)

          // console.log('Hit solid block at', bx, by, bz, 'face', face);
          return { x: bx, y: by, z: bz, face };
        }

        prevX = bx;
        prevY = by;
        prevZ = bz;
      }
    }

    return null;
  }
}
