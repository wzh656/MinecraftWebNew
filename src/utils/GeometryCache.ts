import { BoxGeometry } from "three";

export class GeometryCache {
  private static instance: GeometryCache;
  private blockGeometry: BoxGeometry;

  private constructor() {
    this.blockGeometry = new BoxGeometry(1, 1, 1);
  }

  static getInstance(): GeometryCache {
    if (!GeometryCache.instance) {
      GeometryCache.instance = new GeometryCache();
    }
    return GeometryCache.instance;
  }

  getBlockGeometry(): BoxGeometry {
    return this.blockGeometry;
  }
}
