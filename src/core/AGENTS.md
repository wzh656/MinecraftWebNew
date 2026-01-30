# src/core - Game Engine

Core orchestration layer. Main game loop, Three.js integration, world coordination.

## Where To Look

| Task           | File              | Notes                                           |
| -------------- | ----------------- | ----------------------------------------------- |
| Game loop      | `Game.ts:244-302` | update() + render(), delta capped 0.1s          |
| Initialization | `Game.ts:89-177`  | Creates all systems, loads initial chunks       |
| Pause state    | `Game.ts:554-597` | Menu visibility, pointer lock handling          |
| Block break    | `Game.ts:456-461` | Raycast, cooldown check, remove block           |
| Block place    | `Game.ts:463-490` | Adjacent position, collision check, place block |
| Hotbar input   | `Game.ts:431-454` | Number keys 1-9, mouse wheel delta              |
| Movement input | `Game.ts:308-401` | WASD, space/shift, flight/sprint toggles        |
| Auto-save      | `Game.ts:273-277` | Player pos every 30s, chunks 5s delay           |
| Camera setup   | `Renderer.ts`     | Scene, camera, renderer init                    |
| Fog settings   | `World.ts`        | Fog color, density, chunk coordination          |

## Key Classes

### Game (main.ts)

- Orchestrates all subsystems
- Owns: renderer, world, player, input, ui, physics, saveManager, blockIconRenderer
- Game loop: `loop()` → `update()` → `render()`
- Handles: pause menu, block interaction, hotbar, auto-save

### Renderer

- Three.js wrapper
- Creates: scene, perspective camera, WebGL renderer
- Calculates: forward/right vectors from camera rotation
- Updates: camera position from player

### World

- Owns ChunkManager
- Fog configuration (color, near, far)
- Delegates setBlock to ChunkManager

### Camera

- Camera utilities
- Helper functions for view calculations

## Conventions

- One class owns all subsystems (Game)
- Update order: input → player physics → world chunks → interaction → render
- Cooldowns checked in `handleBlockInteraction()` before calling `breakBlock()`/`placeBlock()`
- Pause menu stops pointer lock but keeps game state

## Anti-Patterns

- NEVER call `setBlock` directly on World/Chunk - always use ChunkManager
- NEVER bypass cooldown checks (will cause ghost blocks)
- NEVER create multiple Game instances (singleton pattern)
- NEVER forget to dispose on exit (saves player position)
