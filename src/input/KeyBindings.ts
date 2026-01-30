export interface KeyBindings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  jump: string;
  run: string;
  crouch: string;
  inventory: string;
  pause: string;
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: "KeyW",
  backward: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  run: "ShiftLeft",
  crouch: "ControlLeft",
  inventory: "KeyE",
  pause: "Escape",
};
