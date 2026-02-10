import type { DebugInfo } from "../../types";

export class DebugInfoDisplay {
  private element: HTMLElement | null = null;

  create(parent: HTMLElement): void {
    this.element = document.createElement("div");
    this.element.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      color: white;
      font-family: 'Minecraft', monospace;
      font-size: 12px;
      pointer-events: none;
      background: rgba(0, 0, 0, 0.5);
      padding: 8px;
      z-index: 10;
      border-radius: 0;
    `;
    this.element.style.display = "none";
    parent.appendChild(this.element);
  }

  update(info: DebugInfo): void {
    if (!this.element) return;

    const yaw = ((info.rotation.y * 180) / Math.PI) % 360;
    const pitch = (info.rotation.x * 180) / Math.PI;
    const targetStr = info.target
      ? `${info.target.x}, ${info.target.y}, ${info.target.z} (face: ${info.target.face})`
      : "none";

    const statusStr = [];
    if (info.flying) statusStr.push("Flying");
    if (info.sprinting) statusStr.push("Sprinting");
    const statusText =
      statusStr.length > 0 ? ` [${statusStr.join(", ")}]` : "";

    this.element.innerHTML = `
      <div>FPS: ${info.fps}${statusText}</div>
      <div>Pos: ${info.position.x.toFixed(2)}, ${info.position.y.toFixed(2)}, ${info.position.z.toFixed(2)}</div>
      <div>Yaw: ${yaw.toFixed(1)}°, Pitch: ${pitch.toFixed(1)}°</div>
      <div>Target: ${targetStr}</div>
    `;
  }

  show(): void {
    if (this.element) this.element.style.display = "block";
  }

  hide(): void {
    if (this.element) this.element.style.display = "none";
  }

  dispose(): void {
    this.element?.remove();
    this.element = null;
  }
}
