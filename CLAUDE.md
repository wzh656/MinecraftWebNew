# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minecraft Web Edition - A browser-based Minecraft-like game built with TypeScript, Three.js, and Vite.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (port 3000)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Lint TypeScript files
pnpm lint

# Format code with Prettier
pnpm format
```

## Architecture

### Plan

`PLAN.md` provides a detailed plan for the project.

### Entry Point
`src/main.ts` - Initializes the Game class and handles the loading lifecycle.

### Core Module Structure

The codebase uses path aliases defined in `tsconfig.json` and `vite.config.ts`:

- `@core/*` - Core game engine (`Game.ts`, `Renderer.ts`, `World.ts`, `Camera.ts`)
- `@world/*` - World generation (`Chunk.ts`, `ChunkManager.ts`, `TerrainGenerator.ts`, `BlockType.ts`, `MeshBuilder.ts`)
- `@player/*` - Player system (`Player.ts`, `Physics.ts`, `PlayerController.ts`)
- `@input/*` - Input handling (`InputHandler.ts`, `KeyBindings.ts`)
- `@ui/*` - User interface (`UIManager.ts`)
- `@utils/*` - Utilities (`Constants.ts`, `TextureLoader.ts`, `GeometryCache.ts`, `BlockIconRenderer.ts`)
- `@save/*` - Save/load system (`SaveManager.ts`)
- `@inventory/*` - Inventory system (planned)

### Key Classes and Relationships

**Game** (`src/core/Game.ts`) - Main orchestrator that:
- Initializes Renderer, World, Player, InputHandler, UIManager, Physics, SaveManager, BlockIconRenderer
- Runs the game loop (update/render cycle)
- Handles block interaction (break/place with 200ms cooldown)
- Manages hotbar selection (1-9 keys, mouse wheel)
- Auto-saves player position every 30 seconds

**Renderer** (`src/core/Renderer.ts`) - Three.js wrapper managing:
- Scene, camera, and renderer setup
- Camera rotation and position
- Forward/right vector calculations for movement

**World** (`src/core/World.ts`) - World state manager:
- Owns ChunkManager for block data
- Coordinates terrain generation
- Handles setBlock operations
- Provides access to TextureLoader for icon rendering

**Chunk** (`src/world/Chunk.ts`) - 16x16x16 block storage:
- Uses Uint8Array for block IDs (4096 bytes per chunk)
- BlockType values stored as uint8
- `needsUpdate` flag triggers mesh rebuild

**ChunkManager** (`src/world/ChunkManager.ts`) - Chunk lifecycle:
- Manages loaded chunks around player
- Generates terrain via TerrainGenerator (fallback if no saved data)
- Loads chunks from IndexedDB via SaveManager if available
- Builds meshes via MeshBuilder
- Auto-saves modified chunks after 5-second delay
- Marks adjacent chunks for update when blocks change on chunk edges

**Player** (`src/player/Player.ts`) - Player entity:
- Position, velocity, on-ground state
- AABB collision detection against blocks
- Applies gravity and movement
- Updates camera position based on eye level

**Physics** (`src/player/Physics.ts`) - Raycasting:
- Block raycast for interaction (max 5 block distance)
- Used for breaking/placing blocks

**InputHandler** (`src/input/InputHandler.ts`) - Input abstraction:
- Keyboard state tracking (isKeyDown)
- Mouse delta for camera rotation
- Pointer lock management
- Mouse button state
- Mouse wheel delta tracking (getWheelDelta)

**UIManager** (`src/ui/UIManager.ts`) - HUD rendering:
- Debug info display (FPS, position)
- Hotbar rendering with 3D block icons
- Block type icons with fallback colors

**SaveManager** (`src/save/SaveManager.ts`) - IndexedDB persistence:
- Database: `MinecraftWebDB` with stores `chunks` and `metadata`
- Chunk key format: `${worldName}:${cx},${cz}`
- Saves/loads chunk Uint8Array data
- Saves/loads player position in world metadata
- Supports multiple worlds with listing and deletion

**BlockIconRenderer** (`src/utils/BlockIconRenderer.ts`) - 3D icon generation:
- Renders individual blocks to canvas using Three.js
- Generates 48x48 PNG data URLs for hotbar icons
- Uses isometric camera angle (2,2,2 looking at origin)

### Important Constants

Defined in `src/utils/Constants.ts`:
- `CHUNK_SIZE = 16`, `CHUNK_HEIGHT = 16`
- `RENDER_DISTANCE = 8` (chunks)
- `PLAYER_HEIGHT = 1.8`, `PLAYER_SPEED = 4.3`, `PLAYER_JUMP_SPEED = 8.5`
- `GRAVITY = -9.8`

### Block Types

Defined in `src/world/BlockType.ts` as enum values 0-255:
- AIR=0, STONE=1, DIRT=2, GRASS=3, etc.
- Textures mapped from `images/textures.png` (128x48, 3 rows x 8 columns, 16x16 per texture)

### Game Loop Flow

1. `Game.loop()` calculates delta time (capped at 0.1s)
2. `handleInput()` processes movement keys, mouse, and wheel
3. `player.update()` applies physics and collision
4. `world.update()` loads/unloads chunks based on player position
5. `handleBlockInteraction()` processes left/right click for break/place
6. `handleHotbarSelection()` processes number keys and mouse wheel
7. Auto-saves player position if 30 seconds elapsed
8. `render()` clears and renders the scene

### Texture System

- Source: `images/textures.png`
- Layout: 3 rows × 8 columns of 16×16 textures
- UV mapping calculated per block type and face
- BlockType defines which texture indices to use for each face

### Save/Persistence System

- **Chunk loading**: ChunkManager first attempts to load from IndexedDB, falls back to TerrainGenerator if not found
- **Chunk saving**: Modifications trigger 5-second delayed save via `scheduleSave()`
- **Player position**: Saved every 30 seconds and on game dispose
- **World metadata**: Stores createdAt, lastPlayed, playerPosition
- **Multi-world**: SaveManager supports multiple worlds via `setCurrentWorld()`

### Cross-Chunk Updates

When `ChunkManager.setBlock()` is called on a chunk edge (localX/localZ is 0 or CHUNK_SIZE-1), the adjacent chunk is marked with `needsUpdate = true` to ensure mesh regeneration for visible faces.
