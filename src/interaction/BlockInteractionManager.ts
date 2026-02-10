import { BlockType } from "../world/BlockType";
import { World } from "../core/World";
import { Physics } from "../player/Physics";
import { Player } from "../player/Player";
import { Renderer } from "../core/Renderer";
import {
  BLOCK_BREAK_COOLDOWN,
  BLOCK_PLACE_COOLDOWN,
  RAYCAST_MAX_DISTANCE,
  FACE_OFFSETS,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_DEPTH,
} from "../utils/Constants";

export interface RaycastHit {
  x: number;
  y: number;
  z: number;
  face: number;
}

export class BlockInteractionManager {
  private world: World;
  private physics: Physics;
  private player: Player;
  private renderer: Renderer;

  private lastBreakTime = 0;
  private lastPlaceTime = 0;
  private readonly breakCooldown = BLOCK_BREAK_COOLDOWN;
  private readonly placeCooldown = BLOCK_PLACE_COOLDOWN;

  constructor(world: World, physics: Physics, player: Player, renderer: Renderer) {
    this.world = world;
    this.physics = physics;
    this.player = player;
    this.renderer = renderer;
  }

  canInteract(isPaused: boolean): boolean {
    return !isPaused;
  }

  tryBreakBlock(): boolean {
    const now = performance.now();
    if (now - this.lastBreakTime <= this.breakCooldown) {
      return false;
    }

    const hit = this.raycast();
    if (hit) {
      this.world.setBlock(hit.x, hit.y, hit.z, BlockType.AIR);
      this.lastBreakTime = now;
      return true;
    }
    return false;
  }

  tryPlaceBlock(blockType: BlockType): boolean {
    const now = performance.now();
    if (now - this.lastPlaceTime <= this.placeCooldown) {
      return false;
    }

    const hit = this.raycast();
    if (hit) {
      const pos = this.getAdjacentPosition(hit.x, hit.y, hit.z, hit.face);
      if (!this.isPlayerInBlock(pos.x, pos.y, pos.z)) {
        this.world.setBlock(pos.x, pos.y, pos.z, blockType);
        this.lastPlaceTime = now;
        return true;
      }
    }
    return false;
  }

  raycast(): RaycastHit | null {
    const pos = this.renderer.getCameraPosition();
    const forward = this.renderer.getForwardVector();

    return this.physics.raycast(
      pos.x,
      pos.y,
      pos.z,
      forward.x,
      forward.y,
      forward.z,
      RAYCAST_MAX_DISTANCE
    );
  }

  private getAdjacentPosition(
    x: number,
    y: number,
    z: number,
    face: number
  ): { x: number; y: number; z: number } {
    const offset = FACE_OFFSETS[face];
    return { x: x + offset[0], y: y + offset[1], z: z + offset[2] };
  }

  private isPlayerInBlock(x: number, y: number, z: number): boolean {
    const pos = this.player.getPosition();

    // Player AABB
    const playerMinX = pos.x - PLAYER_WIDTH / 2;
    const playerMaxX = pos.x + PLAYER_WIDTH / 2;
    const playerMinY = pos.y;
    const playerMaxY = pos.y + PLAYER_HEIGHT;
    const playerMinZ = pos.z - PLAYER_DEPTH / 2;
    const playerMaxZ = pos.z + PLAYER_DEPTH / 2;

    // Block AABB
    const blockMinX = x;
    const blockMaxX = x + 1;
    const blockMinY = y;
    const blockMaxY = y + 1;
    const blockMinZ = z;
    const blockMaxZ = z + 1;

    // Check AABB intersection
    return (
      blockMinX < playerMaxX &&
      blockMaxX > playerMinX &&
      blockMinY < playerMaxY &&
      blockMaxY > playerMinY &&
      blockMinZ < playerMaxZ &&
      blockMaxZ > playerMinZ
    );
  }
}
