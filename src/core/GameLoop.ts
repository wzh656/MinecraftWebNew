import { MS_PER_SECOND, MAX_DELTA_TIME } from "../utils/Constants";

export interface GameLoopCallbacks {
  onUpdate: (delta: number) => void;
  onRender: () => void;
}

export class GameLoop {
  private running = false;
  private lastTime = 0;
  private callbacks: GameLoopCallbacks;

  // FPS calculation
  private fpsFrameCount = 0;
  private fpsLastTime = performance.now();
  private currentFps = 0;

  constructor(callbacks: GameLoopCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  private loop(currentTime: number): void {
    if (!this.running) return;

    const delta = Math.min(
      (currentTime - this.lastTime) / MS_PER_SECOND,
      MAX_DELTA_TIME
    );
    this.lastTime = currentTime;

    this.callbacks.onUpdate(delta);
    this.callbacks.onRender();

    // Update FPS counter
    this.fpsFrameCount++;
    if (currentTime - this.fpsLastTime >= 1000) {
      this.currentFps = this.fpsFrameCount;
      this.fpsFrameCount = 0;
      this.fpsLastTime = currentTime;
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  getFps(): number {
    return this.currentFps;
  }
}
