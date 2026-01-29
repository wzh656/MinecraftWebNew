import { Renderer } from '../core/Renderer';
import { ChunkManager } from '../world/ChunkManager';
import {
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  GRAVITY,
  PLAYER_JUMP_SPEED,
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

  private width = 0.6;
  private depth = 0.6;

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

    if (this.position.y < -50) {
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
