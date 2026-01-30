import { settings } from "./Settings";

export class AudioManager {
  private static instance: AudioManager;
  private bgm: HTMLAudioElement | null = null;
  private currentTrack = 0;
  private tracks = ["audio/1.m4a", "audio/2.m4a"];
  private isPlaying = false;

  private constructor() {
    this.setupBGM();
    this.listenToSettings();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private setupBGM(): void {
    this.bgm = new Audio();
    this.bgm.loop = false;
    this.bgm.volume = settings.volume / 100;

    this.bgm.addEventListener("ended", () => {
      this.playNextTrack();
    });

    this.bgm.addEventListener("error", (e) => {
      console.error("BGM error:", e);
      this.playNextTrack();
    });
  }

  private listenToSettings(): void {
    settings.onChange((s) => {
      if (this.bgm) {
        this.bgm.volume = s.volume / 100;
      }
    });
  }

  private playNextTrack(): void {
    this.currentTrack = (this.currentTrack + 1) % this.tracks.length;
    this.playTrack(this.currentTrack);
  }

  private playTrack(index: number): void {
    if (!this.bgm) return;

    this.currentTrack = index;
    this.bgm.src = this.tracks[index];
    this.bgm
      .play()
      .then(() => {
        this.isPlaying = true;
      })
      .catch((e) => {
        console.error("Failed to play BGM:", e);
        this.isPlaying = false;
      });
  }

  start(): void {
    if (!this.isPlaying && this.bgm) {
      this.playTrack(this.currentTrack);
    }
  }

  stop(): void {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
      this.isPlaying = false;
    }
  }

  pause(): void {
    if (this.bgm) {
      this.bgm.pause();
      this.isPlaying = false;
    }
  }

  resume(): void {
    if (this.bgm && !this.isPlaying) {
      this.bgm
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch((e) => {
          console.error("Failed to resume BGM:", e);
        });
    }
  }

  setVolume(volume: number): void {
    if (this.bgm) {
      this.bgm.volume = Math.max(0, Math.min(100, volume)) / 100;
    }
  }

  isBGMPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioManager = AudioManager.getInstance();
