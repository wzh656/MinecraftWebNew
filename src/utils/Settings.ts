import {
  RENDER_DISTANCE,
  CACHE_DISTANCE,
  GRAVITY,
  PLAYER_SPEED,
  PLAYER_JUMP_SPEED,
} from "./Constants";

export interface GameSettings {
  renderDistance: number;
  cacheDistance: number;
  mouseSensitivity: number;
  playerSpeed: number;
  playerJumpSpeed: number;
  gravity: number;
  fov: number;
  volume: number;
}

const SETTINGS_KEY = "minecraft_web_settings";

export class Settings {
  private static instance: Settings;
  private _values: GameSettings;
  private listeners: Set<(settings: GameSettings) => void> = new Set();

  private defaultSettings: GameSettings = {
    renderDistance: RENDER_DISTANCE,
    cacheDistance: CACHE_DISTANCE,
    mouseSensitivity: 0.002,
    playerSpeed: PLAYER_SPEED,
    playerJumpSpeed: PLAYER_JUMP_SPEED,
    gravity: GRAVITY,
    fov: 70,
    volume: 100,
  };

  private constructor() {
    this._values = { ...this.defaultSettings };
    this.loadFromStorage();
  }

  static getInstance(): Settings {
    if (!Settings.instance) {
      Settings.instance = new Settings();
    }
    return Settings.instance;
  }

  get values(): GameSettings {
    return { ...this._values };
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this._values = { ...this.defaultSettings, ...parsed };
      }
    } catch {
      this._values = { ...this.defaultSettings };
    }
  }

  saveToStorage(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this._values));
    } catch {
      // Ignore storage errors
    }
  }

  updateSetting<K extends keyof GameSettings>(
    key: K,
    value: GameSettings[K],
  ): void {
    this._values[key] = value;
    this.saveToStorage();
    this.notifyListeners();
  }

  resetToDefaults(): void {
    this._values = { ...this.defaultSettings };
    this.saveToStorage();
    this.notifyListeners();
  }

  onChange(callback: (settings: GameSettings) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    const settings = this.values;
    this.listeners.forEach((cb) => cb(settings));
  }

  // Getters for commonly used values with fallbacks to constants
  get renderDistance(): number {
    return this._values.renderDistance ?? RENDER_DISTANCE;
  }

  get cacheDistance(): number {
    return this._values.cacheDistance ?? CACHE_DISTANCE;
  }

  get mouseSensitivity(): number {
    return this._values.mouseSensitivity ?? 0.002;
  }

  get playerSpeed(): number {
    return this._values.playerSpeed ?? PLAYER_SPEED;
  }

  get playerSprintSpeed(): number {
    return this.playerSpeed * 1.5;
  }

  get playerFlightSpeed(): number {
    return this.playerSpeed * 1.86;
  }

  get playerJumpSpeed(): number {
    return this._values.playerJumpSpeed ?? PLAYER_JUMP_SPEED;
  }

  get gravity(): number {
    return this._values.gravity ?? GRAVITY;
  }

  get fov(): number {
    return this._values.fov ?? 70;
  }

  get volume(): number {
    return this._values.volume ?? 100;
  }
}

// Export singleton instance
export const settings = Settings.getInstance();
