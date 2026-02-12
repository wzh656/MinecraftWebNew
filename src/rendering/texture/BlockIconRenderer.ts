import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  Mesh,
  BufferGeometry,
  BufferAttribute,
  MeshBasicMaterial,
  FrontSide,
} from "three";
import { BlockType } from "../../world/BlockType";
import { TextureLoader } from "./TextureLoader";
import { getBlockTextureProperties, FACE_VERTICES } from "../../utils/BlockUtils";

export class BlockIconRenderer {
  private canvas: HTMLCanvasElement;
  private scene: Scene;
  private camera: OrthographicCamera;
  private renderer: WebGLRenderer;
  private textureLoader: TextureLoader;
  private material: MeshBasicMaterial | null = null;

  constructor(textureLoader: TextureLoader) {
    this.textureLoader = textureLoader;

    this.canvas = document.createElement("canvas");
    this.canvas.width = 48;
    this.canvas.height = 48;

    this.scene = new Scene();

    const frustumSize = 1.5;
    this.camera = new OrthographicCamera(
      -frustumSize / 2,
      frustumSize / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100,
    );
    this.camera.position.set(1.8, 1.8, 1.8);
    this.camera.lookAt(0, 0, 0);

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
        side: FrontSide,
        transparent: false,
        alphaTest: 0.5,
      });
    }
  }

  renderBlockIcon(blockType: BlockType): string {
    if (blockType === BlockType.AIR || !this.material) {
      return "";
    }

    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    const geometry = this.createBlockGeometry(blockType);
    const mesh = new Mesh(geometry, this.material);
    mesh.position.set(-0.5, -0.5, -0.5);
    this.scene.add(mesh);

    this.renderer.render(this.scene, this.camera);

    return this.canvas.toDataURL("image/png");
  }

  private createBlockGeometry(blockType: BlockType): BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const props = getBlockTextureProperties(blockType);
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
        vertexCount + 2,
      );

      vertexCount += 4;
    };

    addFace(0, props.textureTop);
    addFace(1, props.textureBottom);
    addFace(2, props.textureSide);
    addFace(3, props.textureSide);
    addFace(4, props.textureSide);
    addFace(5, props.textureSide);

    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    );
    geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  dispose(): void {
    this.renderer.dispose();
    this.material?.dispose();
  }
}
