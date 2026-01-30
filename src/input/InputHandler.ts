export class InputHandler {
  private keys = new Map<string, boolean>();
  private mouse = { x: 0, y: 0, dx: 0, dy: 0, leftDown: false, rightDown: false };
  private locked = false;
  private wheelDelta = 0;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
    });

    document.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    document.addEventListener('mousemove', (e) => {
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
    }, { passive: false });

    // Use capture phase to intercept events before they reach other handlers
    document.addEventListener('mousedown', (e) => {
      console.log('Mouse down event:', e.button);
      if (e.button === 0) this.mouse.leftDown = true;
      if (e.button === 2) this.mouse.rightDown = true;
      // Only prevent default when pointer is locked (in game), not for UI interactions
      if (this.locked) {
        e.preventDefault();
        return false;
      }
    }, { passive: false });

    document.addEventListener('mouseup', (e) => {
      console.log('Mouse up event:', e.button);
      if (e.button === 0) this.mouse.leftDown = false;
      if (e.button === 2) this.mouse.rightDown = false;
      return false;
    }, false);

    document.addEventListener('contextmenu', (e) => {
      console.log('Context menu event');
      e.preventDefault();
      return false;
    }, { passive: false });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === document.body;
      console.log('Pointer lock change', this.locked);
      // Reset mouse state when pointer lock is lost
      if (!this.locked) {
        this.mouse.leftDown = false;
        this.mouse.rightDown = false;
      }
    });

    document.addEventListener('wheel', (e) => {
      this.wheelDelta += Math.sign(e.deltaY);
    }, { passive: true });
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

  isMouseDown(button: 'left' | 'right'): boolean {
    return button === 'left' ? this.mouse.leftDown : this.mouse.rightDown;
  }

  lockPointer(): void {
    document.body.requestPointerLock().catch((err) => {
      console.log('Pointer lock request failed:', err);
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
}
