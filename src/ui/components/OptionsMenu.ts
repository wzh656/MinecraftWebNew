import { MenuBase } from "./MenuBase";
import { settings, GameSettings } from "../../utils/Settings";
import type { UICallbacks } from "../types";

export class OptionsMenu extends MenuBase {
  private callbacks: UICallbacks;
  private onGoBack?: () => void;
  private cacheDistanceRow: HTMLElement | null = null;

  constructor(
    uiLayer: HTMLElement,
    callbacks: UICallbacks,
    onGoBack: () => void
  ) {
    super(uiLayer);
    this.callbacks = callbacks;
    this.onGoBack = onGoBack;
    this.create();
  }

  setCallbacks(callbacks: UICallbacks): void {
    this.callbacks = callbacks;
  }

  private create(): void {
    this.container = document.createElement("div");
    this.container.className = "mc-menu-overlay mc-background";
    this.container.style.display = "none";

    const content = document.createElement("div");
    content.className = "mc-panel";
    content.style.width = "500px";
    content.style.maxHeight = "80vh";
    content.style.overflow = "auto";

    const title = document.createElement("h1");
    title.className = "mc-title";
    title.style.fontSize = "24px";
    title.style.marginBottom = "20px";
    title.textContent = "选项";

    const settingsContainer = document.createElement("div");

    // Render distance
    const renderRow = this.createSliderSetting(
      "渲染距离",
      "renderDistance",
      2,
      16,
      1,
      (v) => `${v} 区块`,
      (v) => this.updateCacheDistanceMin(v),
    );

    // Cache distance
    const cacheRow = this.createSliderSetting(
      "缓存距离",
      "cacheDistance",
      2,
      20,
      1,
      (v) => `${v} 区块`,
    );
    this.cacheDistanceRow = cacheRow;
    this.updateCacheDistanceMin(settings.values.renderDistance);

    // FOV
    const fovRow = this.createSliderSetting(
      "视野",
      "fov",
      30,
      110,
      1,
      (v) => `${v}°`,
    );

    // Mouse sensitivity
    const sensRow = this.createSliderSetting(
      "鼠标灵敏度",
      "mouseSensitivity",
      0.001,
      0.01,
      0.001,
      (v) => `${(v * 1000).toFixed(1)}x`,
    );

    // Volume
    const volRow = this.createSliderSetting(
      "主音量",
      "volume",
      0,
      100,
      5,
      (v) => `${v}%`,
    );

    // Player speed
    const speedRow = this.createSliderSetting(
      "玩家速度",
      "playerSpeed",
      1,
      10,
      0.5,
      (v) => `${v.toFixed(1)}`,
    );

    settingsContainer.appendChild(renderRow);
    settingsContainer.appendChild(cacheRow);
    settingsContainer.appendChild(fovRow);
    settingsContainer.appendChild(sensRow);
    settingsContainer.appendChild(volRow);
    settingsContainer.appendChild(speedRow);

    // Button row
    const buttonRow = document.createElement("div");
    buttonRow.className = "mc-button-row";

    const resetBtn = this.createMenuButton(
      "重置为默认",
      () => {
        settings.resetToDefaults();
        this.refreshSettingsUI();
      },
      "mc-button-small",
    );

    const doneBtn = this.createMenuButton(
      "完成",
      () => {
        this.onGoBack?.();
      },
      "mc-button-small",
    );

    buttonRow.appendChild(resetBtn);
    buttonRow.appendChild(doneBtn);

    content.appendChild(title);
    content.appendChild(settingsContainer);
    content.appendChild(buttonRow);
    this.container.appendChild(content);
    this.uiLayer.appendChild(this.container);
  }

  private createSliderSetting(
    label: string,
    key: keyof GameSettings,
    min: number,
    max: number,
    step: number,
    valueFormatter: (v: number) => string,
    onChange?: (val: number) => void,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "mc-setting-row";

    const labelEl = document.createElement("span");
    labelEl.className = "mc-setting-label";
    labelEl.textContent = label;

    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "mc-slider";
    slider.dataset.setting = key;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = (settings.values[key] as number).toString();

    const valueEl = document.createElement("span");
    valueEl.className = "mc-setting-value";
    valueEl.id = `setting-value-${key}`;
    valueEl.textContent = valueFormatter(settings.values[key] as number);
    valueEl.style.minWidth = "100px";

    slider.addEventListener("input", () => {
      const val = parseFloat(slider.value);
      settings.updateSetting(key, val as never);
      valueEl.textContent = valueFormatter(val);
      onChange?.(val);
      this.callbacks.onSettingsChange?.(settings.values);
    });

    row.appendChild(labelEl);
    row.appendChild(slider);
    row.appendChild(valueEl);

    return row;
  }

  private updateCacheDistanceMin(renderDist: number): void {
    if (!this.cacheDistanceRow) return;
    const slider = this.cacheDistanceRow.querySelector(
      'input[data-setting="cacheDistance"]',
    ) as HTMLInputElement;
    if (slider) {
      slider.min = renderDist.toString();
      const currentVal = parseFloat(slider.value);
      if (currentVal < renderDist) {
        slider.value = renderDist.toString();
        settings.updateSetting("cacheDistance", renderDist);
        const valueEl = document.getElementById("setting-value-cacheDistance");
        if (valueEl) valueEl.textContent = `${renderDist} 区块`;
      }
    }
  }

  refreshSettingsUI(): void {
    const s = settings.values;
    const setSlider = (key: keyof GameSettings, val: number) => {
      const slider = this.container?.querySelector(
        `input[data-setting="${key}"]`,
      ) as HTMLInputElement;
      if (slider) {
        slider.value = val.toString();
        const valueEl = document.getElementById(`setting-value-${key}`);
        if (valueEl) {
          const formatter = this.getValueFormatter(key);
          valueEl.textContent = formatter(val);
        }
      }
    };
    setSlider("renderDistance", s.renderDistance);
    setSlider("cacheDistance", s.cacheDistance);
    setSlider("fov", s.fov);
    setSlider("mouseSensitivity", s.mouseSensitivity);
    setSlider("volume", s.volume);
    setSlider("playerSpeed", s.playerSpeed);

    this.updateCacheDistanceMin(s.renderDistance);

    this.callbacks.onSettingsChange?.(s);
  }

  private getValueFormatter(key: keyof GameSettings): (v: number) => string {
    const formatters: Record<string, (v: number) => string> = {
      renderDistance: (v) => `${v} 区块`,
      cacheDistance: (v) => `${v} 区块`,
      fov: (v) => `${v}°`,
      mouseSensitivity: (v) => `${(v * 1000).toFixed(1)}x`,
      volume: (v) => `${v}%`,
      playerSpeed: (v) => v.toFixed(1),
      playerJumpSpeed: (v) => v.toFixed(1),
      gravity: (v) => v.toFixed(1),
    };
    return formatters[key] || ((v) => v.toString());
  }

  show(): void {
    if (this.container) {
      this.container.style.display = "flex";
      this.visible = true;
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = "none";
      this.visible = false;
    }
  }
}
