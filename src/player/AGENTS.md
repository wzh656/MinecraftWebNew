# src/player - Player & Physics

Player entity, movement physics, and raycasting for block interaction.

## Where To Look

| Task           | File                | Notes                                    |
| -------------- | ------------------- | ---------------------------------------- |
| Player state   | `Player.ts:15-35`   | Position, velocity, onGround, fly/sprint |
| Movement       | `Player.ts:115-130` | Forward/right vectors from camera        |
| Flight mode    | `Player.ts:50-113`  | Toggle, ascend/descend/hover             |
| Sprint mode    | `Player.ts:74-84`   | Active while holding forward             |
| Collision      | `Player.ts:225-244` | AABB check against chunk blocks          |
| Gravity        | `Player.ts:186-223` | Per-axis collision resolution            |
| Raycast (DDA)  | `Physics.ts:19-157` | Digital Differential Analyzer algorithm  |
| Face detection | `Physics.ts:62-74`  | Determines which block face was hit      |

## Key Classes

### Player

Player entity with physics and state:

- **Position**: x, y, z in world coordinates
- **Velocity**: x, y, z components, damped by 0.9 each frame
- **Dimensions**: width=0.6, height=1.8, depth=0.6 (from Constants)
- **Movement Speeds**:
  - Normal: 4.3 blocks/sec
  - Sprint: 6.5 blocks/sec (1.5x)
  - Flight: 8.0 blocks/sec
  - Jump: 7.5 vertical velocity
- **Modes**:
  - Flying: No gravity, vertical control with Space/Shift
  - Sprinting: 1.5x speed, only while holding forward
- **Collision**: Per-axis AABB checks, slides along walls

### Physics

Raycasting for block interaction:

- **DDA Algorithm**: Steps through voxel grid along ray
- **Max Distance**: 5 blocks (`RAYCAST_MAX_DISTANCE`)
- **Face Detection**: Returns which face was hit (0-5) for placement
- **Edge Cases**: Handles camera inside block, diagonal faces

## Conventions

- Position is feet position (y=0 is ground level)
- Eye position = position.y + height (1.8)
- Collision uses `Math.floor()` for block coordinates
- Raycast returns `{x, y, z, face}` or null

## Anti-Patterns

- NEVER modify position directly - use `setPosition()` with collision check
- NEVER forget to reset velocity on collision
- NEVER raycast without max distance limit
- NEVER bypass Player for camera position updates

## Critical Notes

### AABB Collision Resolution

```typescript
// Try X movement first
if (!checkCollision(newX, currentY, currentZ)) {
  position.x = newX;
} else {
  velocity.x = 0; // Stop on wall
}
// Repeat for Y, Z independently
```

This allows sliding along walls while maintaining other axis movement.

### DDA Raycast Parameters

```typescript
// tMax: distance to next voxel boundary
// tDelta: distance between voxel boundaries
// Step: -1 or 1 depending on ray direction
```

Algorithm prioritizes dominant direction to avoid side-face artifacts.

### Spawn Collision Recovery

When `setPosition()` detects collision:

1. Try small epsilon adjustments (0.01-0.2) for floating point issues
2. If still colliding, search upward up to 10 blocks for valid position
3. Prevents player being stuck inside terrain on load
