import { CharacterType } from '../../../entities/Player';
import { AssetResolver } from '../../../utils/AssetResolver';
import { DEFAULT_BALANCE } from '../../../balance/defaultBalance';

/**
 * Renders an animated 2.5D chibi hero preview on the character selection dais.
 */
export class CharacterPreviewRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private currentIdleImage: HTMLImageElement | null = null;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private lastFrameTime: number = 0;
  private currentFrameIndex: number = 0;

  constructor(canvas: HTMLCanvasElement | null) {
    this.canvas = canvas;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    this.preloadHeroIdleImages();
  }

  public setCanvas(canvas: HTMLCanvasElement | null) {
    this.stopAnimation();
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
  }

  public preloadHeroIdleImages() {
    const heroIds = Object.keys(DEFAULT_BALANCE.heroes) as CharacterType[];
    heroIds.forEach((id) => {
      const img = new Image();
      img.src = AssetResolver.getHeroTexture(id, 'idle');
      this.imageCache.set(id, img);
    });
  }

  public loadHero(hero: CharacterType) {
    let img = this.imageCache.get(hero);
    if (!img) {
      img = new Image();
      img.src = AssetResolver.getHeroTexture(hero, 'idle');
      this.imageCache.set(hero, img);
    }
    this.currentIdleImage = img;
    this.currentFrameIndex = 0;
    if (!img.complete) {
      img.onload = () => {
        if (this.currentIdleImage === img) {
          this.renderCanvasFrame();
        }
      };
    } else {
      this.renderCanvasFrame();
    }
  }

  private getFrameDimensions(img: HTMLImageElement | null): { frameW: number; frameH: number; totalCols: number } {
    if (!img || !img.complete || img.naturalHeight === 0) {
      return { frameW: 96, frameH: 96, totalCols: 6 };
    }
    const totalRows = 4;
    const frameH = img.naturalHeight / totalRows;
    const frameW = frameH; // Spritesheet cells are strictly square
    const totalCols = Math.max(1, Math.round(img.naturalWidth / frameW));
    return { frameW, frameH, totalCols };
  }

  public startAnimation() {
    if (this.animFrameId !== null) return;
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      this.animFrameId = requestAnimationFrame(loop);
      const delta = now - this.lastFrameTime;
      // 8 FPS = 125ms per frame
      if (delta >= 125) {
        this.lastFrameTime = now;
        const { totalCols } = this.getFrameDimensions(this.currentIdleImage);
        this.currentFrameIndex = (this.currentFrameIndex + 1) % totalCols;
        this.renderCanvasFrame();
      }
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stopAnimation() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private renderCanvasFrame() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const img = this.currentIdleImage;
    if (!img || !img.complete || img.naturalWidth === 0) {
      return;
    }

    const { frameW, frameH, totalCols } = this.getFrameDimensions(img);
    const validFrameIndex = this.currentFrameIndex % totalCols;

    const srcX = validFrameIndex * frameW;
    const srcY = 0; // Front row

    // Draw hero centered and grounded on stone dais with enlarged normalized height
    const targetH = 280;
    const drawScale = targetH / frameH;
    const drawW = frameW * drawScale;
    const drawH = targetH;
    const drawX = (w - drawW) / 2;
    const drawY = h - drawH - 20;

    // Contact drop shadow at feet
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 24, Math.min(drawW * 0.35, 72), 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fill();
    ctx.restore();

    // Draw sprite frame
    ctx.drawImage(img, srcX, srcY, frameW, frameH, drawX, drawY, drawW, drawH);
  }

  public dispose() {
    this.stopAnimation();
    this.imageCache.clear();
    this.currentIdleImage = null;
    this.canvas = null;
    this.ctx = null;
  }
}
