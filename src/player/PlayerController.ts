import { Camera } from 'three';

export class PlayerController {
  private keys = new Map<string, boolean>();
  private mouseSensitivity = 0.002;
  private movementSpeed = 4.3;
  private velocity = { x: 0, y: 0, z: 0 };
  private onGround = false;

  private camera: Camera;
  private yaw = 0;
  private pitch = 0;

  constructor(camera: Camera) {
    this.camera = camera;
    this.setupInputs();
  }

  private setupInputs(): void {
    document.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
    });

    document.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === document.body) {
        this.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
        this.updateCameraRotation();
      }
    });

    document.addEventListener('click', () => {
      document.body.requestPointerLock();
    });
  }

  private updateCameraRotation(): void {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  update(delta: number): void {
    const forward = this.getForwardDirection();
    const right = this.getRightDirection();

    let moveX = 0;
    let moveZ = 0;

    if (this.keys.get('KeyW')) {
      moveX += forward.x;
      moveZ += forward.z;
    }
    if (this.keys.get('KeyS')) {
      moveX -= forward.x;
      moveZ -= forward.z;
    }
    if (this.keys.get('KeyA')) {
      moveX += right.x;
      moveZ += right.z;
    }
    if (this.keys.get('KeyD')) {
      moveX -= right.x;
      moveZ -= right.z;
    }

    if (moveX !== 0 || moveZ !== 0) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= length;
      moveZ /= length;
    }

    this.velocity.x = moveX * this.movementSpeed;
    this.velocity.z = moveZ * this.movementSpeed;

    if (this.keys.get('Space') && this.onGround) {
      this.velocity.y = 8.5;
      this.onGround = false;
    }

    this.velocity.y -= 9.8 * delta;

    this.camera.position.x += this.velocity.x * delta;
    this.camera.position.y += this.velocity.y * delta;
    this.camera.position.z += this.velocity.z * delta;

    if (this.camera.position.y < -50) {
      this.camera.position.y = 50;
      this.velocity.y = 0;
    }
  }

  private getForwardDirection(): { x: number; z: number } {
    return {
      x: Math.sin(this.yaw),
      z: Math.cos(this.yaw),
    };
  }

  private getRightDirection(): { x: number; z: number } {
    return {
      x: Math.sin(this.yaw - Math.PI / 2),
      z: Math.cos(this.yaw - Math.PI / 2),
    };
  }

  getPosition(): { x: number; y: number; z: number } {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };
  }
}
