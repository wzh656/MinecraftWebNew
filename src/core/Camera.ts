import { PerspectiveCamera } from 'three';

export class CameraController {
  private camera: PerspectiveCamera;
  private yaw = 0;
  private pitch = 0;

  constructor() {
    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
  }

  getCamera(): PerspectiveCamera {
    return this.camera;
  }

  setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  getPosition(): { x: number; y: number; z: number } {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };
  }

  setRotation(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = pitch;
    this.updateRotation();
  }

  getRotation(): { yaw: number; pitch: number } {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  rotate(deltaYaw: number, deltaPitch: number): void {
    this.yaw += deltaYaw;
    this.pitch += deltaPitch;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    this.updateRotation();
  }

  private updateRotation(): void {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  getForwardVector(): { x: number; y: number; z: number } {
    const cosPitch = Math.cos(this.pitch);
    return {
      x: Math.sin(this.yaw) * cosPitch,
      y: Math.sin(this.pitch),
      z: Math.cos(this.yaw) * cosPitch,
    };
  }

  getRightVector(): { x: number; z: number } {
    return {
      x: Math.sin(this.yaw - Math.PI / 2),
      z: Math.cos(this.yaw - Math.PI / 2),
    };
  }

  handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
