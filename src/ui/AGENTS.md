# src/ui - User Interface

Minecraft-style pixel-art UI system. All DOM-based with CSS styling.

## Where To Look

| Task                | File                   | Notes                                  |
| ------------------- | ---------------------- | -------------------------------------- |
| Menu system         | `UIManager.ts:18-75`   | Main, world list, options, pause menus |
| Main menu           | `UIManager.ts:83-119`  | Title, single player, options, exit    |
| World list          | `UIManager.ts:122-215` | Select, create, edit, delete worlds    |
| Create world dialog | `UIManager.ts:218-320` | Name input, seed input, create/cancel  |
| Options menu        | `UIManager.ts:373-490` | Sliders for render distance, FOV, etc. |
| Pause menu          | `UIManager.ts:608-644` | Resume, options, save & quit           |
| Crosshair           | `UIManager.ts:817-837` | Center screen SVG cross                |
| Hotbar              | `UIManager.ts:840-923` | 9 slots with block icons               |
| Debug info          | `UIManager.ts:926-942` | FPS, position, rotation, target block  |
| World list UI       | `UIManager.ts:734-797` | Renders world cards with dates         |
| Settings UI         | `UIManager.ts:511-605` | Slider creation, value formatters      |

## Key Classes

### UIManager

Central UI controller for all game screens:

- **Menu Types**: main, worldList, createWorld, options, pause, game
- **Callbacks**: Set by Game.ts for menu actions (resume, world select, etc.)
- **State**: selectedWorld, currentMenu, previousMenu for navigation
- **DOM Structure**: Single ui-layer container with all menu elements

### Menu Creation

All menus created programmatically with DOM APIs:

```typescript
// Pattern: create container → add content → append to ui-layer
const menu = document.createElement("div");
menu.className = "mc-menu-overlay mc-background";
// ... add buttons, inputs, etc.
this.uiLayer.appendChild(menu);
```

### Hotbar System

- 9 slots with 48×48 pixel icons
- Uses `getBlockColor()` from BlockUtils for fallback colors
- Block icons loaded asynchronously from BlockIconRenderer
- Selection border highlight (white vs gray)

## Conventions

- CSS classes prefixed with `mc-` (Minecraft style)
- All menus use `display: none/flex` for visibility
- Buttons created via `createMenuButton()` helper
- Settings use `createSliderSetting()` with value formatters

## Anti-Patterns

- NEVER manipulate DOM outside UIManager
- NEVER forget to hide previous menu before showing new one
- NEVER hardcode menu transitions - use `showMenu()`
- NEVER bypass callback system for menu actions

## Critical Notes

### Menu Navigation Stack

```typescript
// Options remembers where it came from
if (menu === "options" && currentMenu !== "options") {
  previousMenu = currentMenu;  // Store for "Done" button
}
// Go back returns to previous menu
goBackFromOptions() {
  showMenu(previousMenu);  // pause or main
}
```

### World List Selection

World items are DOM elements with click handlers:

- Click selects world (adds "selected" class)
- Enables play/edit/delete buttons
- Double-click or select + play to load

### Settings Slider Format

```typescript
// Formatters convert raw value to display string
renderDistance: (v) => `${v} 区块`,
fov: (v) => `${v}°`,
mouseSensitivity: (v) => `${(v * 1000).toFixed(1)}x`,
```

### CSS Architecture

Styles in `src/ui/styles/minecraft-ui.css`:

- `.mc-menu-overlay`: Full screen semi-transparent
- `.mc-background`: Dirt background texture
- `.mc-button`: Pixel-art styled buttons
- `.mc-slider`: Range input styling
- `.hotbar-slot`: Inventory slot appearance

## Styling

Minecraft pixel-art aesthetic:

- Font: 'Minecraft' custom font
- Colors: Earth tones, high contrast
- Borders: 3D bevel effect via box-shadow
- Background: Dirt texture pattern
