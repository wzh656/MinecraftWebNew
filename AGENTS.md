# Minecraft Web Edition - AGENTS Knowledge Base

**Stack**: TypeScript 5.3, Three.js 0.160, Vite 5.0, pnpm

## Overview

Browser-based Minecraft clone with procedural terrain, IndexedDB persistence, and custom fog shaders. AI-built via iterative development.

## Structure

```
src/
├── core/          # Engine: Game loop, renderer, world orchestration
├── world/         # Terrain: Chunks, generation, mesh building
├── player/        # Physics: Player entity, collision, raycasting
├── input/         # Controls: Keyboard, mouse, pointer lock
├── ui/            # Interface: Menus, HUD, hotbar
├── save/          # Storage: IndexedDB, multi-world support
└── utils/         # Shared: Constants, textures, shaders, icons
```

## Where To Look

| Task                | Location                           | Notes                                  |
| ------------------- | ---------------------------------- | -------------------------------------- |
| Game loop/lifecycle | `src/core/Game.ts`                 | Main orchestrator, update/render cycle |
| Block break/place   | `src/core/Game.ts:407-490`         | 200ms cooldown, raycast interaction    |
| Hotbar rendering    | `src/ui/UIManager.ts`              | 3D block icons, slot selection         |
| Chunk storage       | `src/world/Chunk.ts`               | Uint8Array 4096 bytes per chunk        |
| Terrain generation  | `src/world/TerrainGenerator.ts`    | Simplex Noise, biomes, trees           |
| Mesh rebuild        | `src/world/MeshBuilder.ts`         | Face culling, custom shader            |
| Cross-chunk edges   | `src/world/ChunkManager.ts:250+`   | Adjacent chunk updates on edge blocks  |
| Save/load           | `src/save/SaveManager.ts`          | IndexedDB, 5s chunk delay, 30s player  |
| Custom fog shader   | `src/utils/ChunkShaderMaterial.ts` | Distance fog, chunk fade-in            |
| Block icons         | `src/utils/BlockIconRenderer.ts`   | 48x48 canvas render for hotbar         |
| Block utilities     | `src/utils/BlockUtils.ts`          | Shared block texture/color functions   |
| All constants       | `src/utils/Constants.ts`           | Single source of truth                 |
| Input state         | `src/input/InputHandler.ts`        | Pointer lock, wheel delta              |
| Raycasting          | `src/player/Physics.ts`            | DDA algorithm, 5 block max             |

## Code Map

| Symbol              | Type  | File                         | Role                                  |
| ------------------- | ----- | ---------------------------- | ------------------------------------- |
| Game                | class | core/Game.ts                 | Main controller, initialization, loop |
| Renderer            | class | core/Renderer.ts             | Three.js scene/camera wrapper         |
| World               | class | core/World.ts                | World state, fog, chunk coordination  |
| ChunkManager        | class | world/ChunkManager.ts        | Chunk lifecycle, loading, saving      |
| TerrainGenerator    | class | world/TerrainGenerator.ts    | Procedural generation                 |
| MeshBuilder         | class | world/MeshBuilder.ts         | Geometry with custom shader           |
| Player              | class | player/Player.ts             | Entity, movement, collision           |
| Physics             | class | player/Physics.ts            | Raycasting for interaction            |
| InputHandler        | class | input/InputHandler.ts        | Input abstraction                     |
| UIManager           | class | ui/UIManager.ts              | Menu system, HUD                      |
| SaveManager         | class | save/SaveManager.ts          | IndexedDB persistence                 |
| BlockIconRenderer   | class | utils/BlockIconRenderer.ts   | 3D icon generation                    |
| BlockUtils          | utils | utils/BlockUtils.ts          | Block texture/color helpers           |
| ChunkShaderMaterial | class | utils/ChunkShaderMaterial.ts | Fog + fade shader                     |

## Conventions

### Path Aliases (tsconfig.json)

- `@core/*` → `src/core/*`
- `@world/*` → `src/world/*`
- `@player/*` → `src/player/*`
- `@input/*` → `src/input/*`
- `@ui/*` → `src/ui/*`
- `@save/*` → `src/save/*`
- `@utils/*` → `src/utils/*`
- `@inventory/*` → `src/inventory/*` (planned)

### Module Pattern

- NO index.ts files - direct imports only
- One class per file (mostly)
- Strict TypeScript: `noUnusedLocals`, `noUnusedParameters`

### Block IDs

- Stored as uint8 in Uint8Array
- 0-255 range (BlockType enum)
- AIR=0, STONE=1, DIRT=2, GRASS=3...

### Coordinates

- World: absolute block positions (x, y, z)
- Chunk local: 0-15 within chunk
- Chunk index: `(y*16 + z)*16 + x`

## Anti-Patterns

- NEVER use `as any` or `@ts-ignore` (strict mode enforced)
- NEVER suppress type errors
- NEVER modify `node_modules`
- NEVER bypass cooldowns (break/place 200ms)
- NEVER call `setBlock` directly - use `ChunkManager.setBlock()`
- NEVER forget cross-chunk updates on edge blocks
- NEVER store derived state - always compute from chunks

## Commands

```bash
# Development
pnpm dev              # Port 3000, auto-open
pnpm build            # TypeScript + Vite build
pnpm preview          # Preview production build

# Code quality
pnpm lint             # ESLint src/**/*.ts
pnpm format           # Prettier src/**/*.ts
```

## Critical Notes

### Cooldown System

- Block break: 200ms (`BLOCK_BREAK_COOLDOWN`)
- Block place: 200ms (`BLOCK_PLACE_COOLDOWN`)
- Checked via `lastBreakTime`, `lastPlaceTime` timestamps

### Cross-Chunk Updates

When `setBlock` called on chunk edge (localX/Z is 0 or 15):

- Must mark adjacent chunk `needsUpdate = true`
- Ensures visible faces regenerate on neighbor

### Save Strategy

- Player position: every 30 seconds + on dispose
- Modified chunks: 5-second debounce (`scheduleSave()`)
- IndexedDB key: `${worldName}:${cx},${cz}`

### Shader Material

`ChunkShaderMaterial.ts` uses custom GLSL:

- Distance-based fog
- Chunk fade-in animation (~200ms)
- NOT standard Three.js material

### Texture Atlas

- Source: `images/textures.png`
- Layout: 3 rows × 8 columns, 16×16 per texture
- BlockType defines `textureIndices[6]` for each face

### Raycast Edge Cases

- Camera inside block: can still mine target
- Diagonal faces: handled by DDA algorithm
- Max distance: 5 blocks (`RAYCAST_MAX_DISTANCE`)

### Memory Layout

- Chunk: Uint8Array 4096 bytes (16×16×16)
- CHUNK_HEIGHT = 256 (not 16!)
- CHUNK_SIZE = 16 (horizontal)
