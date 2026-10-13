import { CharacterType } from '../../entities/Player';
import { ProgressionManager } from '../../core/ProgressionManager';
import { DEFAULT_BALANCE } from '../../balance/defaultBalance';
import { getHeroName, getWeaponIconUrl } from './HeroUIHelpers';
import { AssetResolver } from '../../utils/AssetResolver';
import { SafeDOM } from '../core/SafeDOM';

export interface CharacterSelectUIOptions {
  modal: HTMLElement;
  onSelectHero: (
    charType: CharacterType,
    seedInput?: string,
    isTrainingMode?: boolean,
    timeOfDay?: 'random' | 'day' | 'night'
  ) => void;
  onBack: () => void;
  onShowUnlockQuests?: (hero: CharacterType) => void;
}

export class CharacterSelectUI {
  private modal: HTMLElement;
  private onSelectHero: CharacterSelectUIOptions['onSelectHero'];
  private onBack: CharacterSelectUIOptions['onBack'];
  private onShowUnlockQuests?: CharacterSelectUIOptions['onShowUnlockQuests'];

  private selectedHero: CharacterType = 'ronin';
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private currentIdleImage: HTMLImageElement | null = null;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private lastFrameTime: number = 0;
  private currentFrameIndex: number = 0;

  constructor(options: CharacterSelectUIOptions) {
    this.modal = options.modal;
    this.onSelectHero = options.onSelectHero;
    this.onBack = options.onBack;
    this.onShowUnlockQuests = options.onShowUnlockQuests;

    this.init();
  }

  private init() {
    this.canvas = SafeDOM.getElementById<HTMLCanvasElement>('char-hero-preview-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }

    this.bindEvents();
    this.preloadHeroIdleImages();
    this.selectHero('ronin');
  }

  private preloadHeroIdleImages() {
    const heroIds: CharacterType[] = [
      'ronin', 'valkyrie', 'sorceress', 'archer', 'necromancer',
      'invoker', 'flail', 'chakram', 'rocket', 'amazon'
    ];
    heroIds.forEach((id) => {
      const img = new Image();
      img.src = AssetResolver.getHeroTexture(id, 'idle');
      this.imageCache.set(id, img);
    });
  }

  private bindEvents() {
    // Carousel navigation buttons
    const prevBtn = SafeDOM.getElementById('char-carousel-prev');
    const nextBtn = SafeDOM.getElementById('char-carousel-next');
    const track = SafeDOM.getElementById('char-carousel-track');

    prevBtn?.addEventListener('click', () => {
      if (track) {
        track.scrollBy({ left: -220, behavior: 'smooth' });
      }
    });

    nextBtn?.addEventListener('click', () => {
      if (track) {
        track.scrollBy({ left: 220, behavior: 'smooth' });
      }
    });

    // Horizontal wheel scrolling on track
    track?.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        track.scrollBy({ left: e.deltaY, behavior: 'smooth' });
      }
    }, { passive: false });

    // Character cards interaction
    const cards = this.modal.querySelectorAll<HTMLElement>('.character-card[data-hero]');
    cards.forEach((card) => {
      const hero = (card.getAttribute('data-hero') || 'ronin') as CharacterType;

      card.addEventListener('click', () => {
        this.selectHero(hero);
      });

      card.addEventListener('dblclick', () => {
        this.selectHero(hero);
        this.attemptLaunch();
      });
    });

    // Back button
    const backBtn = SafeDOM.getElementById('btn-char-select-back');
    backBtn?.addEventListener('click', () => {
      this.onBack();
    });

    // Enter Rift / Play button
    const playBtn = SafeDOM.getElementById('btn-char-select-play');
    playBtn?.addEventListener('click', () => {
      this.attemptLaunch();
    });
  }

  public selectHero(hero: CharacterType) {
    this.selectedHero = hero;

    // Update active state in carousel
    const cards = this.modal.querySelectorAll<HTMLElement>('.character-card[data-hero]');
    cards.forEach((card) => {
      const cardHero = card.getAttribute('data-hero');
      if (cardHero === hero) {
        card.classList.add('card-selected');
        // Smoothly scroll active card into view
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        card.classList.remove('card-selected');
      }
    });

    // Update right inspector panel
    this.updateInspectorPanel(hero);

    // Update canvas hero preview
    this.loadHeroAnimation(hero);
  }

  private updateInspectorPanel(hero: CharacterType) {
    const heroData = DEFAULT_BALANCE.heroes[hero];
    if (!heroData) return;

    const nameEl = document.getElementById('inspect-hero-name');
    const roleEl = document.getElementById('inspect-hero-role');
    const weaponIcon = document.getElementById('inspect-weapon-icon') as HTMLImageElement | null;
    const weaponName = document.getElementById('inspect-weapon-name');
    const weaponStats = document.getElementById('inspect-weapon-stats');

    if (nameEl) nameEl.textContent = getHeroName(hero);
    if (roleEl) roleEl.textContent = heroData.role || 'Боец';

    const weaponData = DEFAULT_BALANCE.weapons[heroData.startingWeapon];
    if (weaponIcon) {
      weaponIcon.src = getWeaponIconUrl(heroData.startingWeapon);
    }
    if (weaponName) {
      weaponName.textContent = weaponData?.name || heroData.startingWeapon;
    }
    if (weaponStats && weaponData) {
      weaponStats.textContent = `Базовый урон: ${weaponData.damage} • Кулдаун: ${weaponData.cooldown}с`;
    }

    // Update stat bars
    const hpBar = document.getElementById('inspect-stat-hp-bar');
    const hpVal = document.getElementById('inspect-stat-hp-val');
    if (hpBar) hpBar.style.width = `${Math.min(100, Math.round((heroData.maxHp / 150) * 100))}%`;
    if (hpVal) hpVal.textContent = `${heroData.maxHp} HP`;

    const spdBar = document.getElementById('inspect-stat-spd-bar');
    const spdVal = document.getElementById('inspect-stat-spd-val');
    if (spdBar) spdBar.style.width = `${Math.min(100, Math.round((heroData.baseSpeed / 10) * 100))}%`;
    if (spdVal) spdVal.textContent = `${heroData.baseSpeed}`;

    const dmgBar = document.getElementById('inspect-stat-dmg-bar');
    const dmgVal = document.getElementById('inspect-stat-dmg-val');
    if (dmgBar) dmgBar.style.width = `${Math.min(100, Math.round((heroData.damageMultiplier / 2) * 100))}%`;
    if (dmgVal) dmgVal.textContent = `x${heroData.damageMultiplier.toFixed(2)}`;

    // Update Play Button state (locked or ready)
    const isUnlocked = ProgressionManager.getInstance().isHeroUnlocked(hero);
    const playBtn = document.getElementById('btn-char-select-play');
    if (playBtn) {
      if (isUnlocked) {
        playBtn.classList.remove('btn-locked');
        playBtn.innerHTML = '<span class="btn-primary-text">В БОЙ</span>';
      } else {
        playBtn.classList.add('btn-locked');
        playBtn.innerHTML = '<span class="btn-primary-text">🔒 РАЗБЛОКИРОВАТЬ В КВЕСТАХ</span>';
      }
    }
  }

  private loadHeroAnimation(hero: CharacterType) {
    let img = this.imageCache.get(hero);
    if (!img) {
      img = new Image();
      img.src = AssetResolver.getHeroTexture(hero, 'idle');
      this.imageCache.set(hero, img);
    }
    this.currentIdleImage = img;
    this.currentFrameIndex = 0;
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
        this.currentFrameIndex = (this.currentFrameIndex + 1) % 6;
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

    // Each row has 6 frames, row 0 is front-facing
    const totalCols = 6;
    const totalRows = img.naturalHeight >= 512 ? 4 : 4;
    const frameW = img.naturalWidth / totalCols;
    const frameH = img.naturalHeight / totalRows;

    const srcX = this.currentFrameIndex * frameW;
    const srcY = 0; // Front row

    // Draw hero centered and grounded on dais
    const drawScale = 2.4;
    const drawW = frameW * drawScale;
    const drawH = frameH * drawScale;
    const drawX = (w - drawW) / 2;
    const drawY = h - drawH - 12;

    // Soft drop shadow at feet
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 18, drawW * 0.28, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    ctx.restore();

    // Draw sprite frame
    ctx.drawImage(img, srcX, srcY, frameW, frameH, drawX, drawY, drawW, drawH);
  }

  public attemptLaunch() {
    const isUnlocked = ProgressionManager.getInstance().isHeroUnlocked(this.selectedHero);
    if (!isUnlocked) {
      if (this.onShowUnlockQuests) {
        this.onShowUnlockQuests(this.selectedHero);
      }
      return;
    }

    const trainingCheckbox = document.getElementById('training-mode-toggle') as HTMLInputElement | null;
    const isTraining = Boolean(trainingCheckbox?.checked);

    const timeOfDaySelect = document.getElementById('select-time-of-day') as HTMLSelectElement | null;
    const timeOfDay = (timeOfDaySelect?.value as 'random' | 'day' | 'night') || 'random';

    this.stopAnimation();
    this.onSelectHero(this.selectedHero, undefined, isTraining, timeOfDay);
  }
}
