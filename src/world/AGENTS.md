# src/world - World Generation

Chunk storage, terrain generation, mesh building. Core world data layer.

## Where To Look

| Task             | File                          | Notes                                 |
| ---------------- | ----------------------------- | ------------------------------------- |
| Block storage    | `Chunk.ts:15-35`              | Uint8Array 4096 bytes, index formula  |
| Set block        | `Chunk.ts:37-55`              | Update array, mark needsUpdate        |
| Get block        | `Chunk.ts:57-75`              | Read from array                       |
| Chunk loading    | `ChunkManager.ts:80-120`      | IndexedDB → TerrainGenerator fallback |
| Chunk unloading  | `ChunkManager.ts:180-220`     | Save to DB, remove from memory        |
| Mesh rebuild     | `ChunkManager.ts:280-320`     | Build geometry if needsUpdate         |
| Cross-chunk edge | `ChunkManager.ts:250-278`     | Check bounds, update neighbors        |
| Terrain gen      | `TerrainGenerator.ts:40-100`  | Simplex Noise heightmap               |
| Biomes           | `TerrainGenerator.ts:120-160` | Grass/dirt/stone/sand layers          |
| Trees            | `TerrainGenerator.ts:180-250` | Random placement, wood+leaves         |
| Mesh builder     | `MeshBuilder.ts:40-150`       | Face culling, custom shader material  |
| Block types      | `BlockType.ts:1-15`           | Enum 0-255, 12 block types            |
| Block props      | `BlockType.ts:23-96`          | solid, transparent, textureIndices[6] |

## Key Classes

### Chunk

- 16×16×16 block storage
- Data: Uint8Array 4096 bytes
- Index: `(y*16 + z)*16 + x` (y is vertical)
- Flag: `needsUpdate` triggers mesh rebuild
- CHUNK_HEIGHT = 256 (world height), CHUNK_SIZE = 16 (horizontal)

### ChunkManager

- Manages loaded chunks around player

**Core Concepts:**

- **Render**: Chunk is visible in scene (has mesh)
- **Unload**: Remove from scene (no longer visible), but data may stay in memory
- **Cache**: Data is in memory (Uint8Array), but not necessarily visible
- **Release**: Delete data from memory

**Distance Tiers:**

- **Render Distance**: Chunks that SHOULD be rendered (visible, meshed)
- **Cache Distance**: Chunks that SHOULD have data cached in memory
- **Render Buffer**: Extra buffer for deciding when to stop rendering
  - Chunks beyond `Render Distance + Buffer` are unloaded from view
  - This prevents flickering when player moves at chunk boundaries

**Operations:**

1. `startRendering`: Chunks in Render Distance but not currently visible
2. `stopRendering`: Chunks currently visible but beyond Render Distance + Buffer
3. `startCaching`: Chunks in Cache Distance but not currently cached
4. `releaseMemory`: Chunks currently cached but beyond Cache Distance

**Implementation:**

- Load: IndexedDB first, TerrainGenerator via Worker
- Save: 5-second debounce via `scheduleSave()`
- Cross-chunk: marks neighbors on edge block changes

### TerrainGenerator

- Simplex Noise for heightmaps
- Biomes: surface grass, dirt layer, stone below
- Features: trees (wood trunk + leaves)
- Deterministic: same seed = same terrain

### MeshBuilder

- Builds Three.js geometry per chunk
- Face culling: only render faces adjacent to air
- Uses custom ChunkShaderMaterial (fog + fade)
- Creates BufferGeometry with position/uv/color attributes
- Uses `getBlockTextureProperties()` and `FACE_VERTICES` from BlockUtils

### BlockType

- Enum: AIR=0, STONE=1, DIRT=2, GRASS=3...
- Properties: name, solid, transparent, textureIndices[6]
- Texture indices map to `images/textures.png` atlas

## Conventions

- Always use ChunkManager for setBlock (handles edges)
- Check `isSolid()`/`isTransparent()` for block properties
- Chunk mesh regeneration is expensive - batch changes
- World coordinates: convert to chunk+local via `Math.floor(x/16)`

## Anti-Patterns

- NEVER modify chunk.data directly - use `setBlock()`
- NEVER forget to mark `needsUpdate = true` after changes
- NEVER ignore edge blocks (triggers cross-chunk bug)
- NEVER rebuild mesh every frame - wait for flag
- NEVER use chunk indices directly (use helper methods)

## Critical Notes

### Cross-Chunk Edge Handling

When `setBlock(x, y, z)` on chunk boundary:

```typescript
// In ChunkManager.setBlock()
if (localX === 0) adjacentChunkXMinus.needsUpdate = true;
if (localX === 15) adjacentChunkXPlus.needsUpdate = true;
// Same for Z
```

This ensures neighbor chunk mesh regenerates to show/hide the shared face.

### Chunk Index Formula

```typescript
// (y * 16 + z) * 16 + x
// y: 0-255 (world height), x/z: 0-15 (chunk local)
const index = (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
```

### Texture Atlas

- `images/textures.png`: 128×48 pixels
- 3 rows × 8 columns = 24 textures
- Each texture: 16×16 pixels
- Index: `row * 8 + col` (0-23)
