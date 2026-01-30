# src/utils - Utilities

Shared resources, constants, shaders, rendering helpers. Cross-cutting concerns.

## Where To Look

| Task            | File                     | Notes                                        |
| --------------- | ------------------------ | -------------------------------------------- |
| All constants   | `Constants.ts`           | CHUNK_SIZE, RENDER_DISTANCE, PLAYER_SPEED... |
| Block faces     | `Constants.ts:45-61`     | TOP/BOTTOM/FRONT/BACK/LEFT/RIGHT indices     |
| Texture loading | `TextureLoader.ts`       | Load atlas, UV mapping per face              |
| Geometry reuse  | `GeometryCache.ts`       | Shared BoxGeometry, PlaneGeometry            |
| Hotbar icons    | `BlockIconRenderer.ts`   | 48×48 canvas render, isometric camera        |
| Settings I/O    | `Settings.ts`            | localStorage load/save                       |
| Audio playback  | `AudioManager.ts`        | Background music, autoplay policy            |
| Fog shader      | `ChunkShaderMaterial.ts` | Custom GLSL, fade-in animation               |

## Key Files

### Constants.ts

Single source of truth for all game constants:

- World: `CHUNK_SIZE=16`, `CHUNK_HEIGHT=256`, `BLOCK_SIZE=1`
- Render: `RENDER_DISTANCE=8`, `CACHE_DISTANCE=12`
- Physics: `GRAVITY=-18`, `PLAYER_HEIGHT=1.8`, `PLAYER_SPEED=4.3`
- Timings: `BLOCK_BREAK_COOLDOWN=200`, `SAVE_DELAY_CHUNK=5000`
- Player: `PLAYER_SPRINT_SPEED=6.5`, `PLAYER_FLIGHT_SPEED=8.0`
- Faces: `BLOCK_FACES.TOP=0`, `FACE_OFFSETS[6]`

### TextureLoader.ts

- Loads `images/textures.png` atlas
- Calculates UV coordinates per block face
- Texture layout: 3×8 grid, 16×16 per texture
- Provides UVs to MeshBuilder

### GeometryCache.ts

- Shared Three.js geometries (singleton pattern)
- Prevents duplicate geometry creation
- BoxGeometry for blocks, PlaneGeometry for faces

### BlockIconRenderer.ts

- Renders 3D block icons for hotbar
- Offscreen canvas: 48×48 pixels
- Isometric camera angle (2,2,2 looking at origin)
- Returns PNG data URLs

### Settings.ts

- localStorage persistence
- Settings: render distance, cache distance, FOV, sensitivity, volume, speed
- Auto-saves on change

### AudioManager.ts

- Background music loop
- Handles browser autoplay policy (waits for user interaction)
- Volume control

### ChunkShaderMaterial.ts

- Custom GLSL shader material
- Features:
  - Distance-based linear fog
  - Chunk fade-in animation (~200ms)
  - Per-chunk opacity uniform
- Extends ShaderMaterial (not standard MeshBasicMaterial)

## Conventions

- Import Constants from everywhere (centralized values)
- Use GeometryCache for all geometry creation
- BlockIconRenderer caches icons by BlockType
- Settings auto-persist to localStorage

## Anti-Patterns

- NEVER hardcode constants - always import from Constants.ts
- NEVER create new geometries directly - use GeometryCache
- NEVER forget to update Constants.ts when changing gameplay values
- NEVER bypass AudioManager (browser autoplay restrictions)
- NEVER modify ChunkShaderMaterial uniforms directly - use API

## Critical Notes

### Shader Uniforms

ChunkShaderMaterial expects:

```typescript
{
  opacity: number,      // 0-1 for fade-in
  fogColor: Color,      // World fog color
  fogNear: number,      // Fog start distance
  fogFar: number        // Fog end distance
}
```

### Icon Rendering

BlockIconRenderer creates temporary Three.js scene:

- Orthographic camera at (2,2,2) looking at (0,0,0)
- Single mesh with standard material
- Renders to offscreen canvas
- Returns `canvas.toDataURL()`

### Texture UVs

Atlas is 128×48 (3 rows × 8 cols of 16×16):

```typescript
// index 0-23 to UV coordinates
const col = index % 8;
const row = Math.floor(index / 8);
const u1 = (col * 16) / 128;
const v1 = 1 - ((row + 1) * 16) / 48;
```
