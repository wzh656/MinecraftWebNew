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

  generateChunk(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    data.fill(BlockType.AIR);

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

        if (groundHeight < CHUNK_HEIGHT - 5) {
          const treeNoiseValue = this.treeNoise(worldX * 0.1, worldZ * 0.1);
          if (treeNoiseValue > 0.75) {
            this.addTree(data, x, groundHeight + 1, z);
          }
        }
      }
    }

    return data;
  }

  private getTerrainHeight(worldX: number, worldZ: number): number {
    const scale1 = 0.05;
    const scale2 = 0.1;
    const height1 = Math.sin(worldX * scale1) * Math.cos(worldZ * scale1) * 8;
    const height2 =
      Math.sin(worldX * scale2 + 1.5) * Math.cos(worldZ * scale2 + 2.3) * 4;

    return Math.floor(60 + height1 + height2);
  }

  private addTree(data: Uint8Array, x: number, y: number, z: number): void {
    const trunkHeight = 4;

    for (let i = 0; i < trunkHeight && y + i < CHUNK_HEIGHT; i++) {
      const index = (y + i) * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
      if (x >= 0 && x < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE) {
        data[index] = BlockType.WOOD;
      }
    }

    const leafStart = y + trunkHeight - 1;
    const leafRadius = 2;
    for (let ly = leafStart; ly <= leafStart + 2 && ly < CHUNK_HEIGHT; ly++) {
      for (let lx = x - leafRadius; lx <= x + leafRadius; lx++) {
        for (let lz = z - leafRadius; lz <= z + leafRadius; lz++) {
          if (
            Math.abs(lx - x) === leafRadius &&
            Math.abs(lz - z) === leafRadius
          )
            continue;
          if (lx === x && lz === z && ly < leafStart + 2) continue;

          if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
            const index = ly * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx;
            data[index] = BlockType.LEAVES;
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
