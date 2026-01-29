import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Mesh,
  BufferGeometry,
  BufferAttribute,
  MeshBasicMaterial,
  DoubleSide,
} from 'three';
import { BlockType } from '../world/BlockType';
import { TextureLoader } from './TextureLoader';

export class BlockIconRenderer {
  private canvas: HTMLCanvasElement;
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private textureLoader: TextureLoader;
  private material: MeshBasicMaterial | null = null;

  constructor(textureLoader: TextureLoader) {
    this.textureLoader = textureLoader;

    // Create canvas for rendering
    this.canvas = document.createElement('canvas');
    this.canvas.width = 48;
    this.canvas.height = 48;

    // Setup scene
    this.scene = new Scene();

    // Setup camera with isometric-like angle
    this.camera = new PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(2, 2, 2);
    this.camera.lookAt(0, 0, 0);

    // Setup renderer with transparent background
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
    });
    this.renderer.setSize(48, 48);
    this.renderer.setClearColor(0x000000, 0);
  }

  initialize(): void {
    const texture = this.textureLoader.getTexture();
    if (texture) {
      this.material = new MeshBasicMaterial({
        map: texture,
        side: DoubleSide,
        transparent: true,
      });
    }
  }

  renderBlockIcon(blockType: BlockType): string {
    if (blockType === BlockType.AIR || !this.material) {
      return '';
    }

    // Clear scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    // Create block mesh
    const geometry = this.createBlockGeometry(blockType);
    const mesh = new Mesh(geometry, this.material);
    mesh.position.set(-0.5, -0.5, -0.5);
    this.scene.add(mesh);

    // Render
    this.renderer.render(this.scene, this.camera);

    // Return data URL
    return this.canvas.toDataURL('image/png');
  }

  private createBlockGeometry(blockType: BlockType): BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const props = this.getBlockProperties(blockType);
    let vertexCount = 0;

    const addFace = (face: number, textureIndex: number): void => {
      const { u1, v1, u2, v2 } = this.textureLoader.getUVs(textureIndex);
      const verts = FACE_VERTICES[face];

      for (let i = 0; i < 4; i++) {
        positions.push(verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]);
      }

      uvs.push(u1, v1, u2, v1, u2, v2, u1, v2);

      indices.push(
        vertexCount,
        vertexCount + 2,
        vertexCount + 1,
        vertexCount,
        vertexCount + 3,
        vertexCount + 2
      );

      vertexCount += 4;
    };

    // Add all 6 faces
    addFace(0, props.textureTop);
    addFace(1, props.textureBottom);
    addFace(2, props.textureSide);
    addFace(3, props.textureSide);
    addFace(4, props.textureSide);
    addFace(5, props.textureSide);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  private getBlockProperties(blockType: BlockType): {
    textureTop: number;
    textureBottom: number;
    textureSide: number;
  } {
    switch (blockType) {
      case BlockType.STONE:
        return { textureTop: 7, textureBottom: 7, textureSide: 7 };
      case BlockType.DIRT:
        return { textureTop: 5, textureBottom: 5, textureSide: 5 };
      case BlockType.GRASS:
        return { textureTop: 3, textureBottom: 5, textureSide: 4 };
      case BlockType.COBBLESTONE:
        return { textureTop: 6, textureBottom: 6, textureSide: 6 };
      case BlockType.PLANKS:
        return { textureTop: 12, textureBottom: 12, textureSide: 12 };
      case BlockType.BRICKS:
        return { textureTop: 13, textureBottom: 13, textureSide: 13 };
      case BlockType.SAND:
        return { textureTop: 8, textureBottom: 8, textureSide: 8 };
      case BlockType.WOOD:
        return { textureTop: 9, textureBottom: 9, textureSide: 10 };
      case BlockType.LEAVES:
        return { textureTop: 11, textureBottom: 11, textureSide: 11 };
      case BlockType.CACTUS:
        return { textureTop: 14, textureBottom: 16, textureSide: 15 };
      case BlockType.COMMAND_BLOCK:
        return { textureTop: 0, textureBottom: 2, textureSide: 1 };
      default:
        return { textureTop: 5, textureBottom: 5, textureSide: 5 };
    }
  }

  dispose(): void {
    this.renderer.dispose();
    this.material?.dispose();
  }
}

const FACE_VERTICES = [
  // Top (y+)
  [0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  // Bottom (y-)
  [0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0],
  // Front (z+)
  [0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
  // Back (z-)
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0],
  // Left (x-)
  [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0],
  // Right (x+)
  [1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1],
];
