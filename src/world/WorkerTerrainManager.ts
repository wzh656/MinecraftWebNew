import { CHUNK_SIZE } from "../utils/Constants";
import { Chunk } from "./Chunk";

interface PendingChunk {
  cx: number;
  cz: number;
  priority: number;
  chunk: Chunk;
  resolve: () => void;
  reject: (error: Error) => void;
}

interface WorkerResponse {
  type: "CHUNK_READY" | "ERROR";
  cx: number;
  cz: number;
  data?: Uint8Array;
  error?: string;
}

export class WorkerTerrainManager {
  private worker: Worker | null = null;
  private pendingChunks = new Map<string, PendingChunk>();
  private generationQueue: PendingChunk[] = [];
  private isProcessingQueue = false;
  private maxConcurrentGenerations = 4;
  private activeGenerations = 0;
  private workerSupported: boolean;
  private playerPosition = { x: 0, z: 0 };
  private playerDirection = { x: 0, z: 0 };

  constructor() {
    this.workerSupported = typeof Worker !== "undefined";
    if (this.workerSupported) {
      this.initWorker();
    }
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(
        new URL("./terrain.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(e.data);
      };
      this.worker.onerror = (err) => {
        console.error("Terrain worker error:", err);
        this.fallbackToMainThread();
      };
    } catch (err) {
      console.warn("Failed to initialize terrain worker:", err);
      this.workerSupported = false;
    }
  }

  private handleWorkerMessage(response: WorkerResponse): void {
    const key = `${response.cx},${response.cz}`;
    const pending = this.pendingChunks.get(key);

    if (!pending) return;

    this.activeGenerations--;

    if (response.type === "CHUNK_READY" && response.data) {
      const data = new Uint8Array(response.data);
      pending.chunk.data.set(data);
      pending.chunk.needsUpdate = true;
      pending.resolve();
    } else if (response.type === "ERROR") {
      pending.reject(new Error(response.error || "Unknown worker error"));
    }

    this.pendingChunks.delete(key);
    this.processQueue();
  }

  private fallbackToMainThread(): void {
    console.warn("Falling back to main thread terrain generation");
    this.workerSupported = false;
    this.worker?.terminate();
    this.worker = null;

    for (const [, pending] of this.pendingChunks) {
      pending.reject(new Error("Worker failed, fallback not yet implemented"));
    }
    this.pendingChunks.clear();
  }

  updatePlayerContext(
    position: { x: number; z: number },
    direction: { x: number; z: number },
  ): void {
    this.playerPosition = position;
    this.playerDirection = direction;
    this.resortQueue();
  }

  private calculatePriority(cx: number, cz: number): number {
    const dx = cx * CHUNK_SIZE + CHUNK_SIZE / 2 - this.playerPosition.x;
    const dz = cz * CHUNK_SIZE + CHUNK_SIZE / 2 - this.playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const dirLength = Math.sqrt(
      this.playerDirection.x * this.playerDirection.x +
        this.playerDirection.z * this.playerDirection.z,
    );

    let directionBonus = 0;
    if (dirLength > 0.001) {
      const dot =
        (dx * this.playerDirection.x + dz * this.playerDirection.z) /
        (distance * dirLength);
      directionBonus = dot * 32;
    }

    return distance - directionBonus;
  }

  generateChunk(cx: number, cz: number, placeholder: Chunk): Promise<void> {
    const key = `${cx},${cz}`;

    if (this.pendingChunks.has(key)) {
      const existing = this.pendingChunks.get(key)!;
      return new Promise((resolve, reject) => {
        existing.resolve = () => {
          resolve();
          placeholder.data.set(existing.chunk.data);
          placeholder.needsUpdate = true;
        };
        existing.reject = reject;
      });
    }

    return new Promise((resolve, reject) => {
      const priority = this.calculatePriority(cx, cz);
      const pending: PendingChunk = {
        cx,
        cz,
        priority,
        chunk: placeholder,
        resolve,
        reject,
      };

      this.pendingChunks.set(key, pending);
      this.generationQueue.push(pending);
      this.resortQueue();
      this.processQueue();
    });
  }

  private resortQueue(): void {
    for (const pending of this.generationQueue) {
      pending.priority = this.calculatePriority(pending.cx, pending.cz);
    }
    this.generationQueue.sort((a, b) => a.priority - b.priority);
  }

  private processQueue(): void {
    if (!this.workerSupported || !this.worker) {
      void this.processFallback();
      return;
    }

    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (
      this.activeGenerations < this.maxConcurrentGenerations &&
      this.generationQueue.length > 0
    ) {
      const pending = this.generationQueue.shift();
      if (!pending) continue;

      const key = `${pending.cx},${pending.cz}`;
      if (!this.pendingChunks.has(key)) continue;

      this.activeGenerations++;
      this.worker.postMessage({
        type: "GENERATE_CHUNK",
        cx: pending.cx,
        cz: pending.cz,
        priority: pending.priority,
      });
    }

    this.isProcessingQueue = false;
  }

  private async processFallback(): Promise<void> {
    const { TerrainGenerator } = await import("./TerrainGenerator");
    const generator = new TerrainGenerator();

    while (this.generationQueue.length > 0) {
      const pending = this.generationQueue.shift();
      if (!pending) continue;

      try {
        const generated = generator.generateChunk(pending.cx, pending.cz);
        pending.chunk.data.set(generated.data);
        pending.chunk.needsUpdate = true;
        pending.resolve();
      } catch (err) {
        pending.reject(err instanceof Error ? err : new Error(String(err)));
      }

      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    for (const pending of this.generationQueue) {
      pending.reject(new Error("Worker terminated"));
    }

    for (const [, pending] of this.pendingChunks) {
      pending.reject(new Error("Worker terminated"));
    }

    this.generationQueue = [];
    this.pendingChunks.clear();
    this.activeGenerations = 0;
  }

  isWorkerSupported(): boolean {
    return this.workerSupported;
  }

  getQueueLength(): number {
    return this.generationQueue.length;
  }

  getPendingCount(): number {
    return this.pendingChunks.size;
  }
}
