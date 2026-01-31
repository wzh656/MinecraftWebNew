# src/input - Input Handling

Keyboard, mouse, and pointer lock management. All input sources abstracted for game use.

## Where To Look

| Task                 | File                      | Notes                                        |
| -------------------- | ------------------------- | -------------------------------------------- |
| Key state tracking   | `InputHandler.ts:4-12`    | Map of key codes to boolean                  |
| Mouse delta          | `InputHandler.ts:5-11`    | Accumulated movementX/Y while locked         |
| Pointer lock         | `InputHandler.ts:13`      | Locked state syncs with document.pointerLock |
| Double-tap detection | `InputHandler.ts:16-20`   | Space (flight) and W (sprint)                |
| Key down events      | `InputHandler.ts:27-51`   | Sets key state, double-tap timing            |
| Mouse move           | `InputHandler.ts:58-73`   | Accumulates delta only when locked           |
| Mouse buttons        | `InputHandler.ts:76-99`   | Left/right down state                        |
| Wheel delta          | `InputHandler.ts:122-128` | Accumulated scroll direction                 |
| Clear on pause       | `InputHandler.ts:189-199` | Resets all input states                      |

## Key Classes

### InputHandler

Central input abstraction:

- **Key Tracking**: Map<string, boolean> for all key states
- **Mouse Tracking**:
  - x, y: Screen coordinates
  - dx, dy: Delta since last poll (resets to 0)
  - leftDown, rightDown: Button states
  - wheelDelta: Accumulated scroll (resets to 0)
- **Pointer Lock**: Syncs with `document.pointerLockElement`
- **Double-Tap**: 300ms window (`DOUBLE_TAP_WINDOW`) for flight/sprint toggle

## Conventions

- Always check `isLocked()` before using mouse deltas
- Poll `getMouseDelta()` and `getWheelDelta()` once per frame (resets values)
- Use `isKeyDown(code)` for current state, `wasKeyPressed()` for edge detection
- Call `clearAllKeys()` when pausing to prevent stuck inputs

## Anti-Patterns

- NEVER use raw `e.movementX` outside the handler - use `getMouseDelta()`
- NEVER check key states without handling pointer lock state
- NEVER forget to clear input on pause/menu open
- NEVER bypass double-tap detection for rapid key events

## Critical Notes

### Double-Tap Timing

```typescript
if (now - lastTapTime < DOUBLE_TAP_WINDOW) {
  doubleTapDetected = true;
}
lastTapTime = now;
```

Ignored on key auto-repeat (`e.repeat`) to prevent false positives.

### Pointer Lock State Management

```typescript
// Pointer lock lost (user pressed ESC)
if (!locked) {
  mouse.leftDown = false; // Prevent stuck click
  mouse.rightDown = false;
}
```

Game must handle pause state when pointer lock is lost.

### Mouse Button Handling

```typescript
// button 0 = left, 2 = right
mousedown: set state + preventDefault if locked
mouseup: clear state
contextmenu: always preventDefault
```

Right-click context menu is always suppressed for game feel.

## Key Bindings

Default controls mapped to `e.code` (not `e.key` for layout independence):

| Action         | Code      |
| -------------- | --------- |
| Forward        | KeyW      |
| Backward       | KeyS      |
| Left           | KeyA      |
| Right          | KeyD      |
| Jump/Fly Up    | Space     |
| Sneak/Fly Down | ShiftLeft |
| Sprint (hold)  | KeyW      |
| Inventory 1-9  | Digit1-9  |
| Pause          | Escape    |

Flight toggle: Double Space
Sprint toggle: Double W (while holding forward)
