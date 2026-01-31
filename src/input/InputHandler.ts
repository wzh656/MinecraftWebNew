import { DOUBLE_TAP_WINDOW } from "../utils/Constants";

export class InputHandler {
  private keys = new Map<string, boolean>();
  private mouse = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    leftDown: false,
    rightDown: false,
  };
  private locked = false;
  private wheelDelta = 0;

  // Double-tap detection
  private lastSpaceTapTime = 0;
  private lastWTapTime = 0;
  private doubleSpaceDetected = false;
  private doubleWDetected = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener("keydown", (e) => {
      this.keys.set(e.code, true);

      // Ignore keyboard auto-repeat events for double-tap detection
      if (e.repeat) {
        return;
      }

      // Double-tap detection for Space (flight toggle)
      if (e.code === "Space") {
        const now = performance.now();
        if (now - this.lastSpaceTapTime < DOUBLE_TAP_WINDOW) {
          this.doubleSpaceDetected = true;
        }
        this.lastSpaceTapTime = now;
      }

      // Double-tap detection for W (sprint toggle)
      if (e.code === "KeyW") {
        const now = performance.now();
        if (now - this.lastWTapTime < DOUBLE_TAP_WINDOW) {
          this.doubleWDetected = true;
        }
        this.lastWTapTime = now;
      }
    });

    document.addEventListener("keyup", (e) => {
      this.keys.set(e.code, false);
    });

    document.addEventListener(
      "mousemove",
      (e) => {
        if (this.locked) {
          this.mouse.dx += e.movementX;
          this.mouse.dy += e.movementY;
        }
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        // Prevent default when locked to avoid browser gestures
        // if (this.locked && e.buttons === 2) {
        //   e.preventDefault();
        // }
      },
      { passive: false },
    );

    // Use capture phase to intercept events before they reach other handlers
    document.addEventListener(
      "mousedown",
      (e) => {
        if (e.button === 0) this.mouse.leftDown = true;
        if (e.button === 2) this.mouse.rightDown = true;
        // Only prevent default when pointer is locked (in game), not for UI interactions
        if (this.locked) {
          e.preventDefault();
          return false;
        }
      },
      { passive: false },
    );

    document.addEventListener(
      "mouseup",
      (e) => {
        if (e.button === 0) this.mouse.leftDown = false;
        if (e.button === 2) this.mouse.rightDown = false;
        return false;
      },
      false,
    );

    document.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
        return false;
      },
      { passive: false },
    );

    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === document.body;
      // Reset mouse state when pointer lock is lost
      if (!this.locked) {
        this.mouse.leftDown = false;
        this.mouse.rightDown = false;
      }
    });

    document.addEventListener(
      "wheel",
      (e) => {
        this.wheelDelta += Math.sign(e.deltaY);
      },
      { passive: true },
    );
  }

  isKeyDown(code: string): boolean {
    return this.keys.get(code) ?? false;
  }

  wasKeyPressed(code: string): boolean {
    const down = this.isKeyDown(code);
    this.keys.set(`_${code}`, down);
    return down && !this.keys.get(`_${code}`);
  }

  getMouseDelta(): { dx: number; dy: number } {
    const delta = { dx: this.mouse.dx, dy: this.mouse.dy };
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    return delta;
  }

  isMouseDown(button: "left" | "right"): boolean {
    return button === "left" ? this.mouse.leftDown : this.mouse.rightDown;
  }

  lockPointer(): void {
    document.body.requestPointerLock().catch(() => {
      // Silently fail if pointer lock is not supported or blocked
    });
  }

  unlockPointer(): void {
    document.exitPointerLock();
  }

  isLocked(): boolean {
    return this.locked;
  }

  getWheelDelta(): number {
    const delta = this.wheelDelta;
    this.wheelDelta = 0;
    return delta;
  }

  // Double-tap detection methods
  isDoubleSpaceTap(): boolean {
    if (this.doubleSpaceDetected) {
      this.doubleSpaceDetected = false;
      return true;
    }
    return false;
  }

  isDoubleWTap(): boolean {
    if (this.doubleWDetected) {
      this.doubleWDetected = false;
      return true;
    }
    return false;
  }

  // Clear all key states - called when pausing
  clearAllKeys(): void {
    this.keys.clear();
    this.mouse.leftDown = false;
    this.mouse.rightDown = false;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.wheelDelta = 0;
    this.doubleSpaceDetected = false;
    this.doubleWDetected = false;
  }
}
