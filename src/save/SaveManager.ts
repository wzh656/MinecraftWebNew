const DB_NAME = "MinecraftWebDB";
const DB_VERSION = 1;
const CHUNK_STORE = "chunks";
const META_STORE = "metadata";

interface ChunkData {
  cx: number;
  cz: number;
  data: ArrayBuffer;
  timestamp: number;
}

interface WorldMetadata {
  name: string;
  createdAt: number;
  lastPlayed: number;
  playerPosition?: { x: number; y: number; z: number };
  playerRotation?: { x: number; y: number };
}

export class SaveManager {
  private db: IDBDatabase | null = null;
  private currentWorld: string = "default";

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create chunks store with world+chunk key
        if (!db.objectStoreNames.contains(CHUNK_STORE)) {
          const chunkStore = db.createObjectStore(CHUNK_STORE, {
            keyPath: "key",
          });
          chunkStore.createIndex("world", "worldName", { unique: false });
        }

        // Create metadata store for world info
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "name" });
        }
      };
    });
  }

  setCurrentWorld(worldName: string): void {
    this.currentWorld = worldName;
  }

  getCurrentWorld(): string {
    return this.currentWorld;
  }

  private getChunkKey(cx: number, cz: number): string {
    return `${this.currentWorld}:${cx},${cz}`;
  }

  async saveChunk(cx: number, cz: number, data: Uint8Array): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const chunkData: ChunkData & { key: string; worldName: string } = {
      key: this.getChunkKey(cx, cz),
      worldName: this.currentWorld,
      cx,
      cz,
      data: data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      ) as ArrayBuffer,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNK_STORE], "readwrite");
      const store = transaction.objectStore(CHUNK_STORE);
      const request = store.put(chunkData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadChunk(cx: number, cz: number): Promise<Uint8Array | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNK_STORE], "readonly");
      const store = transaction.objectStore(CHUNK_STORE);
      const request = store.get(this.getChunkKey(cx, cz));

      request.onsuccess = () => {
        const result = request.result as ChunkData | undefined;
        if (result) {
          resolve(new Uint8Array(result.data));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteChunk(cx: number, cz: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNK_STORE], "readwrite");
      const store = transaction.objectStore(CHUNK_STORE);
      const request = store.delete(this.getChunkKey(cx, cz));

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async savePlayerPosition(
    position: { x: number; y: number; z: number },
    rotation?: { x: number; y: number },
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const metadata: WorldMetadata = {
      name: this.currentWorld,
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      playerPosition: position,
      playerRotation: rotation,
    };

    // Get existing metadata first to preserve createdAt
    const existing = await this.getWorldMetadata(this.currentWorld);
    if (existing) {
      metadata.createdAt = existing.createdAt;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([META_STORE], "readwrite");
      const store = transaction.objectStore(META_STORE);
      const request = store.put(metadata);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadPlayerPosition(): Promise<{
    x: number;
    y: number;
    z: number;
  } | null> {
    const metadata = await this.getWorldMetadata(this.currentWorld);
    return metadata?.playerPosition ?? null;
  }

  async loadWorldMetadata(worldName?: string): Promise<WorldMetadata | null> {
    const name = worldName ?? this.currentWorld;
    return this.getWorldMetadata(name);
  }

  private async getWorldMetadata(
    worldName: string,
  ): Promise<WorldMetadata | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([META_STORE], "readonly");
      const store = transaction.objectStore(META_STORE);
      const request = store.get(worldName);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async listWorlds(): Promise<
    Array<{ name: string; createdAt: number; lastPlayed: number }>
  > {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([META_STORE], "readonly");
      const store = transaction.objectStore(META_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as WorldMetadata[];
        resolve(
          results.map((r) => ({
            name: r.name,
            createdAt: r.createdAt,
            lastPlayed: r.lastPlayed,
          })),
        );
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWorld(worldName: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const chunks = await this.getAllChunksForWorld(worldName);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [CHUNK_STORE, META_STORE],
        "readwrite",
      );

      const chunkStore = transaction.objectStore(CHUNK_STORE);
      for (const chunk of chunks) {
        chunkStore.delete(`${worldName}:${chunk.cx},${chunk.cz}`);
      }

      const metaStore = transaction.objectStore(META_STORE);
      metaStore.delete(worldName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async renameWorld(oldName: string, newName: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const metadata = await this.getWorldMetadata(oldName);
    if (!metadata) throw new Error(`World "${oldName}" not found`);

    const chunks = await this.getAllChunksForWorld(oldName);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [CHUNK_STORE, META_STORE],
        "readwrite",
      );

      const chunkStore = transaction.objectStore(CHUNK_STORE);
      for (const chunk of chunks) {
        const oldKey = `${oldName}:${chunk.cx},${chunk.cz}`;
        const newKey = `${newName}:${chunk.cx},${chunk.cz}`;
        const getRequest = chunkStore.get(oldKey);
        getRequest.onsuccess = () => {
          const data = getRequest.result;
          if (data) {
            data.key = newKey;
            data.worldName = newName;
            chunkStore.put(data);
            chunkStore.delete(oldKey);
          }
        };
      }

      const metaStore = transaction.objectStore(META_STORE);
      metaStore.delete(oldName);
      metadata.name = newName;
      metaStore.put(metadata);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async getAllChunksForWorld(
    worldName: string,
  ): Promise<Array<{ cx: number; cz: number }>> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNK_STORE], "readonly");
      const store = transaction.objectStore(CHUNK_STORE);
      const index = store.index("world");
      const request = index.getAll(worldName);

      request.onsuccess = () => {
        const results = request.result as Array<{ cx: number; cz: number }>;
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}
