import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  WebGLRendererParameters,
  Color,
} from 'three';

export class Renderer {
  private renderer: WebGLRenderer;
  private scene: Scene;
  private camera: PerspectiveCamera;

  constructor(container: HTMLElement) {
    const params: WebGLRendererParameters = {
      antialias: false,
      powerPreference: 'high-performance',
    };

    this.renderer = new WebGLRenderer(params);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(new Color(0x87ceeb));
    this.renderer.shadowMap.enabled = false;

    this.scene = new Scene();
    this.scene.background = new Color(0x87ceeb);

    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getScene(): Scene {
    return this.scene;
  }

  getCamera(): PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): WebGLRenderer {
    return this.renderer;
  }

  clear(): void {
    this.renderer.clear();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  setCameraPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  setCameraRotation(x: number, y: number, z: number): void {
    this.camera.rotation.set(x, y, z);
  }

  rotateCamera(yawDelta: number, pitchDelta: number): void {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y += yawDelta;
    this.camera.rotation.x += pitchDelta;
    this.camera.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.camera.rotation.x)
    );
  }

  getForwardVector(): { x: number; y: number; z: number } {
    const rotation = this.camera.rotation;
    const cosPitch = Math.cos(rotation.x);
    return {
      x: -Math.sin(rotation.y) * cosPitch,
      y: Math.sin(rotation.x),
      z: -Math.cos(rotation.y) * cosPitch,
    };
  }

  getHorizontalForwardVector(): { x: number; z: number } {
    const rotation = this.camera.rotation;
    return {
      x: -Math.sin(rotation.y),
      z: -Math.cos(rotation.y),
    };
  }

  getRightVector(): { x: number; z: number } {
    const rotation = this.camera.rotation;
    return {
      x: -Math.sin(rotation.y - Math.PI / 2),
      z: -Math.cos(rotation.y - Math.PI / 2),
    };
  }

  getCameraPosition(): { x: number; y: number; z: number } {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };
  }

  dispose(): void {
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
