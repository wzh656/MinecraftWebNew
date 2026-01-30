import { Renderer } from '../core/Renderer';
import { ChunkManager } from '../world/ChunkManager';
import {
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  GRAVITY,
  PLAYER_JUMP_SPEED,
  PLAYER_WIDTH,
  PLAYER_DEPTH,
  WORLD_MIN_Y,
} from '../utils/Constants';

export class Player {
  private renderer: Renderer;
  private chunkManager: ChunkManager;

  private position = { x: 0, y: 10, z: 0 };
  private velocity = { x: 0, y: 0, z: 0 };
  private onGround = false;

  private height = PLAYER_HEIGHT;
  private speed = PLAYER_SPEED;
  private jumpSpeed = PLAYER_JUMP_SPEED;

  private width = PLAYER_WIDTH;
  private depth = PLAYER_DEPTH;

  constructor(renderer: Renderer, chunkManager: ChunkManager) {
    this.renderer = renderer;
    this.chunkManager = chunkManager;
  }

  update(delta: number): void {
    this.applyGravity(delta);
    this.applyMovement(delta);
    this.updateCamera();
  }

  moveForward(amount: number): void {
    const forward = this.renderer.getHorizontalForwardVector();
    this.velocity.x = forward.x * amount * this.speed;
    this.velocity.z = forward.z * amount * this.speed;
  }

  moveRight(amount: number): void {
    const right = this.renderer.getRightVector();
    this.velocity.x = right.x * amount * this.speed;
    this.velocity.z = right.z * amount * this.speed;
  }

  jump(): void {
    if (this.onGround) {
      this.velocity.y = this.jumpSpeed;
      this.onGround = false;
    }
  }

  setPosition(x: number, y: number, z: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;

    // Check if the new position would place player inside solid blocks
    // This can happen when loading a saved position where a block was placed
    // or due to floating point precision issues
    if (this.checkCollision(x, y, z)) {
      // First, try small epsilon adjustments for floating point precision issues
      // If player is just slightly inside the ground (y=4.99999 instead of y=5.0)
      for (let epsilon = 0.01; epsilon <= 0.2; epsilon += 0.01) {
        if (!this.checkCollision(x, y + epsilon, z)) {
          this.position.y = y + epsilon;
          this.updateCamera();
          return;
        }
      }

      // If small adjustments don't work, search for a valid position above
      // This handles the case where player is buried under blocks
      let adjustedY = Math.ceil(y); // Start from the next integer Y
      const maxSearchHeight = adjustedY + 10; // Search up to 10 blocks up
      while (adjustedY < maxSearchHeight && this.checkCollision(x, adjustedY, z)) {
        adjustedY += 1.0; // Move up by 1 block until not colliding
      }
      this.position.y = adjustedY;
    }

    this.updateCamera();
  }

  getPosition(): { x: number; y: number; z: number } {
    return { ...this.position };
  }

  getEyePosition(): { x: number; y: number; z: number } {
    return {
      x: this.position.x,
      y: this.position.y + this.height,
      z: this.position.z,
    };
  }

  private applyGravity(delta: number): void {
    this.velocity.y += GRAVITY * delta;
  }

  private applyMovement(delta: number): void {
    const newX = this.position.x + this.velocity.x * delta;
    const newY = this.position.y + this.velocity.y * delta;
    const newZ = this.position.z + this.velocity.z * delta;

    if (!this.checkCollision(newX, this.position.y, this.position.z)) {
      this.position.x = newX;
    } else {
      this.velocity.x = 0;
    }

    if (!this.checkCollision(this.position.x, newY, this.position.z)) {
      this.position.y = newY;
    } else {
      if (this.velocity.y < 0) {
        this.onGround = true;
      }
      this.velocity.y = 0;
    }

    if (!this.checkCollision(this.position.x, this.position.y, newZ)) {
      this.position.z = newZ;
    } else {
      this.velocity.z = 0;
    }

    this.velocity.x *= 0.9;
    this.velocity.z *= 0.9;

    if (this.position.y < WORLD_MIN_Y) {
      this.position.y = 50;
      this.velocity.y = 0;
    }
  }

  private checkCollision(x: number, y: number, z: number): boolean {
    const minX = Math.floor(x - this.width / 2);
    const maxX = Math.floor(x + this.width / 2);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + this.height);
    const minZ = Math.floor(z - this.depth / 2);
    const maxZ = Math.floor(z + this.depth / 2);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          if (this.chunkManager.isSolid(bx, by, bz)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private updateCamera(): void {
    const eyePos = this.getEyePosition();
    this.renderer.setCameraPosition(eyePos.x, eyePos.y, eyePos.z);
  }
}
