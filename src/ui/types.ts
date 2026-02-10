export type MenuType =
  | "main"
  | "worldList"
  | "createWorld"
  | "options"
  | "pause"
  | "game";

export interface WorldInfo {
  name: string;
  createdAt: number;
  lastPlayed: number;
}

export interface DebugInfo {
  fps: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  target: { x: number; y: number; z: number; face: number } | null;
  flying?: boolean;
  sprinting?: boolean;
}

export interface UICallbacks {
  onResume?: () => void;
  onReturnToMain?: () => void;
  onWorldSelect?: (worldName: string) => void;
  onWorldCreate?: (worldName: string, seed: string) => void;
  onWorldDelete?: (worldName: string) => void;
  onWorldEdit?: (worldName: string, newName: string) => void;
  onSinglePlayer?: () => void;
  onOptions?: () => void;
  onExit?: () => void;
  onTeleport?: (x: number, y: number, z: number) => void;
  onSettingsChange?: (settings: import("../utils/Settings").GameSettings) => void;
}

export interface IMenu {
  show(): void;
  hide(): void;
  isVisible(): boolean;
}
