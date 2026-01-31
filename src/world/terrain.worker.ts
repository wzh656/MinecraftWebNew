import { createNoise2D } from "simplex-noise";

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 256;

const BlockType = {
  AIR: 0,
  STONE: 1,
  DIRT: 2,
  GRASS: 3,
  WOOD: 8,
  LEAVES: 9,
} as const;

interface GenerateChunkMessage {
  type: "GENERATE_CHUNK";
  cx: number;
  cz: number;
  priority: number;
}

interface ChunkReadyMessage {
  type: "CHUNK_READY";
  cx: number;
  cz: number;
  data: Uint8Array;
}

interface ErrorMessage {
  type: "ERROR";
  cx: number;
  cz: number;
  error: string;
}

type WorkerMessage = GenerateChunkMessage;

class WorkerTerrainGenerator {
  private treeNoise = createNoise2D();
  // Cache tree presence to avoid recalculating noise for the same positions
  // Maps "worldX,worldZ" -> boolean (whether there's a tree at this position)
  private treePresenceCache = new Map<string, boolean>();
  private readonly MAX_CACHE_SIZE = 50000;

  private hasTreeAt(worldX: number, worldZ: number): boolean {
    const key = `${worldX},${worldZ}`;

    if (this.treePresenceCache.has(key)) {
      return this.treePresenceCache.get(key)!;
    }

    const groundHeight = this.getTerrainHeight(worldX, worldZ);
    let hasTree = false;

    if (groundHeight < CHUNK_HEIGHT - 5) {
      const treeNoiseValue = this.treeNoise(worldX * 0.05, worldZ * 0.05);
      const positionHash = this.hashPosition(worldX, worldZ);
      hasTree = treeNoiseValue > 0.6 && positionHash > 0.92;
    }

    this.treePresenceCache.set(key, hasTree);

    if (this.treePresenceCache.size > this.MAX_CACHE_SIZE) {
      const firstKey = this.treePresenceCache.keys().next().value;
      if (firstKey !== undefined) {
        this.treePresenceCache.delete(firstKey);
      }
    }

    return hasTree;
  }

  generateChunk(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    data.fill(BlockType.AIR);

    // Step 1: Generate terrain and trees within this chunk
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = cx * CHUNK_SIZE + x;
        const worldZ = cz * CHUNK_SIZE + z;
        const groundHeight = this.getTerrainHeight(worldX, worldZ);

        for (let y = 0; y <= groundHeight && y < CHUNK_HEIGHT; y++) {
          let blockType: number;

          if (y === groundHeight) {
            blockType = BlockType.GRASS;
          } else if (y >= groundHeight - 2) {
            blockType = BlockType.DIRT;
          } else {
            blockType = BlockType.STONE;
          }

          const index = y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
          data[index] = blockType;
        }

        if (this.hasTreeAt(worldX, worldZ)) {
          this.addTree(data, x, groundHeight + 1, z);
        }
      }
    }

    // Step 2: Check adjacent chunks for trees whose leaves extend into this chunk
    // We need to check a 2-block border around the chunk (max leaf radius)
    this.addLeavesFromAdjacentChunks(data, cx, cz);

    return data;
  }

  private hashPosition(x: number, z: number): number {
    let hash = x * 374761393 + z * 668265263;
    hash = (hash ^ (hash >> 13)) * 1274126177;
    hash = hash ^ (hash >> 16);
    return (Math.abs(hash) % 1000) / 1000;
  }

  private getTerrainHeight(worldX: number, worldZ: number): number {
    const scale1 = 0.05;
    const scale2 = 0.1;
    const height1 = Math.sin(worldX * scale1) * Math.cos(worldZ * scale1) * 8;
    const height2 =
      Math.sin(worldX * scale2 + 1.5) * Math.cos(worldZ * scale2 + 2.3) * 4;

    return Math.floor(60 + height1 + height2);
  }

  private addTree(
    data: Uint8Array,
    localX: number,
    y: number,
    localZ: number,
  ): void {
    const trunkHeight = 4;

    for (let i = 0; i < trunkHeight && y + i < CHUNK_HEIGHT; i++) {
      const index =
        (y + i) * CHUNK_SIZE * CHUNK_SIZE + localZ * CHUNK_SIZE + localX;
      if (
        localX >= 0 &&
        localX < CHUNK_SIZE &&
        localZ >= 0 &&
        localZ < CHUNK_SIZE
      ) {
        data[index] = BlockType.WOOD;
      }
    }

    const leafStart = y + trunkHeight - 1;
    const leafRadius = 2;
    for (let ly = leafStart; ly <= leafStart + 2 && ly < CHUNK_HEIGHT; ly++) {
      for (let lx = localX - leafRadius; lx <= localX + leafRadius; lx++) {
        for (let lz = localZ - leafRadius; lz <= localZ + leafRadius; lz++) {
          if (
            Math.abs(lx - localX) === leafRadius &&
            Math.abs(lz - localZ) === leafRadius
          )
            continue;
          if (lx === localX && lz === localZ && ly < leafStart + 2) continue;

          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
            const index = ly * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx;
            if (data[index] === BlockType.AIR) {
              data[index] = BlockType.LEAVES;
            }
          }
        }
      }
    }
  }

  private addLeavesFromAdjacentChunks(
    data: Uint8Array,
    chunkX: number,
    chunkZ: number,
  ): void {
    const maxLeafRadius = 2;

    for (let dx = -maxLeafRadius; dx < CHUNK_SIZE + maxLeafRadius; dx++) {
      for (let dz = -maxLeafRadius; dz < CHUNK_SIZE + maxLeafRadius; dz++) {
        if (dx >= 0 && dx < CHUNK_SIZE && dz >= 0 && dz < CHUNK_SIZE) {
          continue;
        }

        const worldX = chunkX * CHUNK_SIZE + dx;
        const worldZ = chunkZ * CHUNK_SIZE + dz;

        if (this.hasTreeAt(worldX, worldZ)) {
          const groundHeight = this.getTerrainHeight(worldX, worldZ);
          this.addLeavesFromTree(data, dx, dz, groundHeight + 1);
        }
      }
    }
  }

  private addLeavesFromTree(
    data: Uint8Array,
    treeLocalX: number,
    treeLocalZ: number,
    treeY: number,
  ): void {
    const leafStart = treeY + 4 - 1;
    const leafRadius = 2;

    for (let ly = leafStart; ly <= leafStart + 2 && ly < CHUNK_HEIGHT; ly++) {
      for (
        let lx = treeLocalX - leafRadius;
        lx <= treeLocalX + leafRadius;
        lx++
      ) {
        for (
          let lz = treeLocalZ - leafRadius;
          lz <= treeLocalZ + leafRadius;
          lz++
        ) {
          // Skip corners
          if (
            Math.abs(lx - treeLocalX) === leafRadius &&
            Math.abs(lz - treeLocalZ) === leafRadius
          )
            continue;
          // Skip trunk position for lower levels
          if (lx === treeLocalX && lz === treeLocalZ && ly < leafStart + 2)
            continue;

          // Only place leaves if this position is within the current chunk
          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
            const index = ly * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx;
            if (data[index] === BlockType.AIR) {
              data[index] = BlockType.LEAVES;
            }
          }
        }
      }
    }
  }
}

const generator = new WorkerTerrainGenerator();

self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  const message = e.data;

  if (message.type === "GENERATE_CHUNK") {
    try {
      const { cx, cz } = message;
      const data = generator.generateChunk(cx, cz);

      const response: ChunkReadyMessage = {
        type: "CHUNK_READY",
        cx,
        cz,
        data,
      };

      self.postMessage(response, { transfer: [data.buffer] });
    } catch (err) {
      const errorMessage: ErrorMessage = {
        type: "ERROR",
        cx: message.cx,
        cz: message.cz,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(errorMessage);
    }
  }
};

export {};
