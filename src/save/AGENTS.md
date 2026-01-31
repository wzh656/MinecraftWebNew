# src/save - Persistence

IndexedDB storage for worlds, chunks, and player data. Multi-world support.

## Where To Look

| Task            | File                     | Notes                                |
| --------------- | ------------------------ | ------------------------------------ |
| Database init   | `SaveManager.ts:20-45`   | Open IndexedDB, create object stores |
| Chunk save      | `SaveManager.ts:80-105`  | Key: `${world}:${cx},${cz}`          |
| Chunk load      | `SaveManager.ts:107-130` | Returns Uint8Array or undefined      |
| Player position | `SaveManager.ts:132-155` | Saved every 30s + on exit            |
| Player rotation | `SaveManager.ts:157-175` | Pitch/yaw angles                     |
| World metadata  | `SaveManager.ts:177-210` | CreatedAt, lastPlayed, seed, name    |
| World list      | `SaveManager.ts:212-235` | All worlds for main menu list        |
| Delete world    | `SaveManager.ts:237-257` | Removes all chunks + metadata        |

## Key Classes

### SaveManager

IndexedDB wrapper for game persistence:

- **Database**: `MinecraftWebDB` (version 1)
- **Object Stores**:
  - `chunks`: Chunk data by `${worldName}:${cx},${cz}`
  - `metadata`: World info + player state by world name
- **Chunk Format**: Uint8Array 4096 bytes (16×16×16 blocks)
- **Compression**: None (raw uint8 block IDs)

### Storage Keys

```typescript
// Chunks
`${worldName}:${chunkX},${chunkZ}`; // e.g., "MyWorld:3,-2"

// Metadata (per world)
worldName = "MyWorld"; // Contains: createdAt, lastPlayed, seed, playerPosition, playerRotation
```

## Conventions

- Always `await init()` before any operations
- Use `setCurrentWorld()` to switch contexts
- Check for undefined returns (new chunks/worlds)
- Update `lastPlayed` timestamp on save

## Anti-Patterns

- NEVER use localStorage for chunk data (too large)
- NEVER forget to handle IndexedDB errors
- NEVER store derived data (always compute from chunks)
- NEVER bypass SaveManager for DB operations

## Critical Notes

### Database Schema

```typescript
// Chunks store
keyPath: none  // Manual keys
value: Uint8Array(4096)  // Raw block data

// Metadata store
keyPath: "name"  // World name
value: {
  name: string,
  createdAt: number,
  lastPlayed: number,
  seed: string,
  playerPosition?: {x, y, z},
  playerRotation?: {x, y}  // pitch, yaw
}
```

### Chunk Save Strategy

ChunkManager uses debounced saves:

```typescript
scheduleSave(cx, cz) {
  pendingSaves.add(key);
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(flushPendingSaves, 5000);  // 5s debounce
}
```

This batches rapid block changes (mining/building) into single write.

### Player Position Recovery

On world load:

1. Try to load saved position from metadata
2. If position collides with blocks, search upward up to 10 blocks
3. If no valid position found, spawn at default (8, 255, 8)

### Error Handling

All async methods catch and log errors:

```typescript
} catch (e) {
  console.error("Failed to load chunk:", cx, cz, e);
  return undefined;  // Graceful fallback
}
```

World generation proceeds even if save/load fails.

### Multi-World Support

- Each world isolated by name prefix in keys
- World list shows all metadata entries
- Delete world removes all matching chunk keys
- Switching worlds: save current → clear chunks → load new
