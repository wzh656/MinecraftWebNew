# Minecraft Web Edition - AGENTS Knowledge Base

**Stack**: TypeScript 5.3, Three.js 0.160, Vite 5.0, pnpm

## Overview

Browser-based Minecraft clone with procedural terrain, IndexedDB persistence, and custom fog shaders. AI-built via iterative development.

---

## Project Structure

```
src/
├── core/                      # Game engine core
│   ├── Game.ts               # Main controller (~450 lines)
│   ├── GameLoop.ts           # requestAnimationFrame loop, FPS counter
│   ├── Renderer.ts           # Three.js scene/camera wrapper
│   ├── Camera.ts             # Camera position/rotation management
│   └── World.ts              # World state, fog, chunk coordination
│
├── world/                     # Terrain system
│   ├── Chunk.ts              # Chunk data storage (Uint8Array)
│   ├── ChunkManager.ts       # Chunk lifecycle, loading, saving
│   ├── MeshBuilder.ts        # Face culling, custom shader mesh
│   ├── WorkerTerrainManager.ts  # Web Worker pool for terrain gen
│   ├── terrain.worker.ts     # Web Worker entry (~375 lines)
│   ├── Block.ts              # Block type definitions
│   ├── BlockType.ts          # BlockType enum
│   └── generation/           # Terrain generation modules
│       ├── noise/            # Procedural noise
│       │   ├── SeededRandom.ts       # Mulberry32 PRNG
│       │   ├── FractalNoise2D.ts     # 2D fractal noise
│       │   ├── FractalNoise3D.ts     # 3D fractal noise
│       │   └── index.ts              # Barrel exports
│       ├── spline/           # Spline interpolation
│       │   ├── SplineInterpolator.ts # Catmull-Rom splines
│       │   ├── TerrainSplines.ts     # Terrain parameter tables
│       │   └── index.ts
│       ├── biome/            # Biome system
│       │   ├── BiomeType.ts          # Biome enum
│       │   ├── BiomeDefinition.ts    # Biome data structures
│       │   ├── BiomeSelector.ts      # 5D feature space selection
│       │   └── index.ts
│       ├── cave/             # Cave generation
│       │   ├── CheeseCaveGenerator.ts    # Bubble caves
│       │   ├── SpaghettiCaveGenerator.ts # Tunnel caves
│       │   └── index.ts
│       └── tree/             # Tree generation
│           ├── TreeGenerator.ts
│           └── index.ts
│
├── player/                    # Player system
│   ├── Player.ts             # Player entity, movement, collision
│   └── Physics.ts            # Raycasting (DDA algorithm)
│
├── input/                     # Input system
│   ├── InputHandler.ts       # Keyboard, mouse, pointer lock
│   └── KeyBindings.ts        # Key binding definitions
│
├── interaction/               # Block interaction (NEW)
│   └── BlockInteractionManager.ts  # Break/place logic, cooldowns
│
├── ui/                        # User interface
│   ├── UIManager.ts          # UI coordinator (~250 lines)
│   ├── types.ts              # UI type definitions
│   └── components/           # UI components
│       ├── MenuBase.ts       # Abstract menu base class
│       ├── MainMenu.ts       # Main menu (singleplayer/multiplayer)
│       ├── WorldListMenu.ts  # World selection screen
│       ├── CreateWorldDialog.ts  # Create world modal
│       ├── OptionsMenu.ts    # Settings menu
│       ├── PauseMenu.ts      # In-game pause menu
│       ├── DialogHelpers.ts  # Delete/edit world dialogs
│       └── hud/              # HUD components
│           ├── Crosshair.ts
│           ├── Hotbar.ts
│           └── DebugInfo.ts
│
├── save/                      # Persistence
│   └── SaveManager.ts        # IndexedDB wrapper, multi-world
│
├── rendering/                 # Rendering (NEW)
│   ├── material/
│   │   └── ChunkShaderMaterial.ts  # Custom GLSL fog shader
│   └── texture/
│       ├── TextureLoader.ts        # Texture atlas loading
│       └── BlockIconRenderer.ts    # 3D block icons for hotbar
│
├── utils/                     # Utilities
│   ├── Constants.ts          # Game constants (FOV, speeds, etc.)
│   ├── WorldConstants.ts     # World constants (CHUNK_SIZE, etc.)
│   ├── ChunkUtils.ts         # Chunk coordinate helpers
│   ├── BlockUtils.ts         # Block texture/color helpers
│   ├── Settings.ts           # Game settings management
│   ├── AudioManager.ts       # Sound effects
│   └── GeometryCache.ts      # Geometry caching
│
└── main.ts                   # Entry point, loading screen
```

---

## Where To Look

| Task | Location | Notes |
|------|----------|-------|
| Game loop/lifecycle | `src/core/Game.ts` | Main orchestrator, delegates to GameLoop |
| Block break/place | `src/interaction/BlockInteractionManager.ts` | 200ms cooldown, raycast |
| Hotbar rendering | `src/ui/components/hud/Hotbar.ts` | 3D block icons, slot selection |
| Chunk storage | `src/world/Chunk.ts` | Uint8Array 4096 bytes |
| Terrain generation | `src/world/generation/` | Noise, biomes, caves, trees |
| Mesh rebuild | `src/world/MeshBuilder.ts` | Face culling, custom shader |
| Cross-chunk edges | `src/world/ChunkManager.ts` | Adjacent chunk updates |
| Save/load | `src/save/SaveManager.ts` | IndexedDB, 30s player save |
| Custom fog shader | `src/rendering/material/ChunkShaderMaterial.ts` | GLSL fog + fade-in |
| Block icons | `src/rendering/texture/BlockIconRenderer.ts` | 48x48 canvas render |
| Raycasting | `src/player/Physics.ts` | DDA algorithm, 5 block max |
| Input handling | `src/input/InputHandler.ts` | Pointer lock, key states |
| Menu system | `src/ui/components/` | Split into separate files |

---

## Code Map

### Core Classes

| Symbol | Type | File | Role |
|--------|------|------|------|
| Game | class | core/Game.ts | Main controller, initialization |
| GameLoop | class | core/GameLoop.ts | RAF loop, delta time, FPS |
| Renderer | class | core/Renderer.ts | Three.js scene/camera |
| World | class | core/World.ts | World state, fog, chunk coord |

### World System

| Symbol | Type | File | Role |
|--------|------|------|------|
| ChunkManager | class | world/ChunkManager.ts | Chunk lifecycle, loading |
| MeshBuilder | class | world/MeshBuilder.ts | Geometry generation |
| Chunk | class | world/Chunk.ts | Block data storage |
| WorkerTerrainManager | class | world/WorkerTerrainManager.ts | Worker pool management |

### Generation System

| Symbol | Type | File | Role |
|--------|------|------|------|
| BiomeSelector | class | generation/biome/BiomeSelector.ts | 5D biome selection |
| FractalNoise2D | class | generation/noise/FractalNoise2D.ts | 2D terrain noise |
| FractalNoise3D | class | generation/noise/FractalNoise3D.ts | 3D cave noise |
| CheeseCaveGenerator | class | generation/cave/CheeseCaveGenerator.ts | Bubble caves |
| SpaghettiCaveGenerator | class | generation/cave/SpaghettiCaveGenerator.ts | Tunnel caves |
| TreeGenerator | class | generation/tree/TreeGenerator.ts | Tree placement |
| SplineInterpolator | class | generation/spline/SplineInterpolator.ts | Terrain curves |

### Player & Input

| Symbol | Type | File | Role |
|--------|------|------|------|
| Player | class | player/Player.ts | Entity, movement, collision |
| Physics | class | player/Physics.ts | Raycasting |
| InputHandler | class | input/InputHandler.ts | Input abstraction |
| BlockInteractionManager | class | interaction/BlockInteractionManager.ts | Block break/place |

### UI System

| Symbol | Type | File | Role |
|--------|------|------|------|
| UIManager | class | ui/UIManager.ts | UI coordinator |
| MenuBase | abstract | ui/components/MenuBase.ts | Menu base class |
| MainMenu | class | ui/components/MainMenu.ts | Main screen |
| WorldListMenu | class | ui/components/WorldListMenu.ts | World selection |
| CreateWorldDialog | class | ui/components/CreateWorldDialog.ts | Create modal |
| OptionsMenu | class | ui/components/OptionsMenu.ts | Settings |
| PauseMenu | class | ui/components/PauseMenu.ts | Pause screen |
| Hotbar | class | ui/components/hud/Hotbar.ts | Block hotbar |
| Crosshair | class | ui/components/hud/Crosshair.ts | Center crosshair |
| DebugInfo | class | ui/components/hud/DebugInfo.ts | Debug overlay |

### Rendering

| Symbol | Type | File | Role |
|--------|------|------|------|
| ChunkShaderMaterial | class | rendering/material/ChunkShaderMaterial.ts | GLSL shader |
| TextureLoader | class | rendering/texture/TextureLoader.ts | Atlas loading |
| BlockIconRenderer | class | rendering/texture/BlockIconRenderer.ts | Icon generation |

### Utilities

| Symbol | Type | File | Role |
|--------|------|------|------|
| SaveManager | class | save/SaveManager.ts | IndexedDB persistence |
| BlockUtils | utils | utils/BlockUtils.ts | Block helpers |
| ChunkUtils | utils | utils/ChunkUtils.ts | Chunk coord helpers |
| Constants | const | utils/Constants.ts | Game constants |
| WorldConstants | const | utils/WorldConstants.ts | World dimensions |
| Settings | class | utils/Settings.ts | Settings management |

---

## Conventions

### Path Aliases (tsconfig.json)

```
@core/*       → src/core/*
@world/*      → src/world/*
@player/*     → src/player/*
@input/*      → src/input/*
@interaction/* → src/interaction/*
@ui/*         → src/ui/*
@save/*       → src/save/*
@rendering/*  → src/rendering/*
@utils/*      → src/utils/*
```

### Module Pattern

- Barrel exports (`index.ts`) used within generation submodules
- Direct imports between top-level modules
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
- Chunk key: `"${cx},${cz}"`

---

## Anti-Patterns

- NEVER use `as any` or `@ts-ignore` (strict mode enforced)
- NEVER suppress type errors
- NEVER modify `node_modules`
- NEVER bypass cooldowns (break/place 200ms)
- NEVER call `setBlock` directly - use `ChunkManager.setBlock()`
- NEVER forget cross-chunk updates on edge blocks
- NEVER store derived state - always compute from chunks

---

## Git Branch Naming Conventions

```
main                      # Production branch
refactor/structure        # Refactoring
refactor/player-physics   # Refactoring specific
docs/api-reference        # Documentation
```

| Prefix | Purpose |
|--------|---------|
| `main` | Production branch |
| `feat/` | New feature |
| `refactor/` | Code refactoring |
| `fix/` | Bug fixes |
| `docs/` | Documentation |

---

## Commands

```bash
pnpm dev              # Port 3000, auto-open
pnpm build            # TypeScript + Vite build
pnpm preview          # Preview production build
pnpm lint             # ESLint
pnpm format           # Prettier
```

---

## Critical Notes

### Cooldown System

- Block break: 200ms (`BLOCK_BREAK_COOLDOWN`)
- Block place: 200ms (`BLOCK_PLACE_COOLDOWN`)
- Managed by `BlockInteractionManager`

### Cross-Chunk Updates

When `setBlock` called on chunk edge (localX/Z is 0 or 15):
- Must mark adjacent chunk `needsUpdate = true`
- Ensures visible faces regenerate on neighbor

### Save Strategy

- Player position: every 30 seconds + on dispose
- Modified chunks: 5-second debounce
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

### Raycast

- DDA algorithm in `Physics.ts`
- Max distance: 5 blocks (`RAYCAST_MAX_DISTANCE`)
- Camera inside block: can still mine target

### Memory Layout

- Chunk: Uint8Array 65536 bytes (16×256×16)
- CHUNK_SIZE = 16 (horizontal)
- CHUNK_HEIGHT = 256 (vertical)
- SEA_LEVEL = 63

### Terrain Generation

5D biome feature space:
- C: Continentalness (ocean←→inland)
- E: Erosion (erosion level)
- PV: Peaks & Valleys (terrain relief)
- T: Temperature
- H: Humidity

Noise octaves configured in `terrain.worker.ts`:
- Continentalness: 4 octaves, scale 0.0008
- Erosion: 4 octaves, scale 0.0012
- PV: 3 octaves, scale 0.002
- Temperature/Humidity: 3 octaves, scale 0.001
