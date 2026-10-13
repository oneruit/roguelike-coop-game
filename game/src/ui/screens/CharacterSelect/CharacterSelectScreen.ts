import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { CharacterType } from '../../../entities/Player';
import { ProgressionManager } from '../../../core/ProgressionManager';
import { DEFAULT_BALANCE } from '../../../balance/defaultBalance';
import { getHeroName, getWeaponIconUrl } from '../../modules/HeroUIHelpers';
import { CharacterPreviewRenderer } from './CharacterPreviewRenderer';

export interface CharacterSelectScreenOptions {
  container?: HTMLElement | null;
  modal?: HTMLElement | null;
  onSelectHero: (
    charType: CharacterType,
    seedInput?: string,
    isTrainingMode?: boolean,
    timeOfDay?: 'random' | 'day' | 'night'
  ) => void;
  onBack: () => void;
  onShowUnlockQuests?: (hero: CharacterType) => void;
}

/**
 * Modular Character Selection Screen (Rift ARPG UI).
 * Manages carousel track, inspector panel stats, character unlocks, and run launch.
 */
export class CharacterSelectScreen extends Screen {
  private onSelectHero: CharacterSelectScreenOptions['onSelectHero'];
  private onBack: CharacterSelectScreenOptions['onBack'];
  private onShowUnlockQuests?: CharacterSelectScreenOptions['onShowUnlockQuests'];

  private selectedHero: CharacterType = 'ronin';
  private previewRenderer: CharacterPreviewRenderer | null = null;

  constructor(options: CharacterSelectScreenOptions) {
    const existingModal = options.container || options.modal || SafeDOM.getElementById('character-select-modal');
    super('character-select', existingModal);

    this.onSelectHero = options.onSelectHero;
    this.onBack = options.onBack;
    this.onShowUnlockQuests = options.onShowUnlockQuests;

    this.bindElements();
    this.bindEvents();
    this.updateLockStates();
    this.selectHero('ronin');
  }

  protected getTemplate(): string {
    // If mounted via existing DOM, template is already populated
    return '';
  }

  protected bindElements(): void {
    const canvas = SafeDOM.query<HTMLCanvasElement>(this.container, '#char-hero-preview-canvas');
    this.previewRenderer = new CharacterPreviewRenderer(canvas);
  }

  protected bindEvents(): void {
    // Carousel navigation buttons
    const prevBtn = SafeDOM.query(this.container, '#char-carousel-prev');
    const nextBtn = SafeDOM.query(this.container, '#char-carousel-next');
    const track = SafeDOM.query(this.container, '#char-carousel-track');

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
      const wheelEv = e as WheelEvent;
      if (Math.abs(wheelEv.deltaY) > 0) {
        wheelEv.preventDefault();
        track.scrollBy({ left: wheelEv.deltaY, behavior: 'smooth' });
      }
    }, { passive: false });

    // Character cards interaction
    const cards = SafeDOM.queryAll(this.container, '.character-card[data-hero]');
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
    const backBtn = SafeDOM.query(this.container, '#btn-char-select-back');
    backBtn?.addEventListener('click', () => {
      this.onBack();
    });

    // Play / Enter Rift button
    const playBtn = SafeDOM.query(this.container, '#btn-char-select-play');
    playBtn?.addEventListener('click', () => {
      this.attemptLaunch();
    });
  }

  protected onShow(): void {
    this.updateLockStates();
    this.selectHero(this.selectedHero);
    this.startAnimation();
  }

  protected onHide(): void {
    this.stopAnimation();
  }

  public startAnimation(): void {
    this.previewRenderer?.startAnimation();
  }

  public stopAnimation(): void {
    this.previewRenderer?.stopAnimation();
  }

  public selectHero(hero: CharacterType): void {
    this.selectedHero = hero;
    this.updateLockStates();

    // Update active state in carousel
    const cards = SafeDOM.queryAll(this.container, '.character-card[data-hero]');
    cards.forEach((card) => {
      const cardHero = card.getAttribute('data-hero');
      if (cardHero === hero) {
        card.classList.add('card-selected');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        card.classList.remove('card-selected');
      }
    });

    // Update right inspector panel
    this.updateInspectorPanel(hero);

    // Update canvas hero preview
    this.previewRenderer?.loadHero(hero);
  }

  public updateLockStates(): void {
    const prog = ProgressionManager.getInstance();
    const cards = SafeDOM.queryAll(this.container, '.character-card[data-hero]');
    cards.forEach((card) => {
      const hero = (card.getAttribute('data-hero') || 'ronin') as CharacterType;
      const isUnlocked = prog.isHeroUnlocked(hero);
      let badge = card.querySelector<HTMLElement>('.card-lock-badge');

      if (isUnlocked) {
        card.classList.remove('card-locked');
        if (badge) badge.remove();
      } else {
        card.classList.add('card-locked');
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'card-lock-badge';
          badge.innerHTML = '🔒';
          card.appendChild(badge);
        }
      }
    });
  }

  private updateInspectorPanel(hero: CharacterType): void {
    const heroData = DEFAULT_BALANCE.heroes[hero];
    if (!heroData) return;

    const nameEl = SafeDOM.query(this.container, '#inspect-hero-name');
    const roleEl = SafeDOM.query(this.container, '#inspect-hero-role');
    const weaponIcon = SafeDOM.query<HTMLImageElement>(this.container, '#inspect-weapon-icon');
    const weaponName = SafeDOM.query(this.container, '#inspect-weapon-name');
    const weaponStats = SafeDOM.query(this.container, '#inspect-weapon-stats');

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

    // Dynamic stat normalization
    const { maxHp, maxSpeed, maxDamage } = this.getStatCeilings();

    const hpBar = SafeDOM.query(this.container, '#inspect-stat-hp-bar');
    const hpVal = SafeDOM.query(this.container, '#inspect-stat-hp-val');
    if (hpBar) hpBar.style.width = `${Math.min(100, Math.round((heroData.maxHp / maxHp) * 100))}%`;
    if (hpVal) hpVal.textContent = `${heroData.maxHp} HP`;

    const spdBar = SafeDOM.query(this.container, '#inspect-stat-spd-bar');
    const spdVal = SafeDOM.query(this.container, '#inspect-stat-spd-val');
    if (spdBar) spdBar.style.width = `${Math.min(100, Math.round((heroData.baseSpeed / maxSpeed) * 100))}%`;
    if (spdVal) spdVal.textContent = `${heroData.baseSpeed}`;

    const dmgBar = SafeDOM.query(this.container, '#inspect-stat-dmg-bar');
    const dmgVal = SafeDOM.query(this.container, '#inspect-stat-dmg-val');
    if (dmgBar) dmgBar.style.width = `${Math.min(100, Math.round((heroData.damageMultiplier / maxDamage) * 100))}%`;
    if (dmgVal) dmgVal.textContent = `x${heroData.damageMultiplier.toFixed(2)}`;

    // Update Play Button state (locked or ready)
    const isUnlocked = ProgressionManager.getInstance().isHeroUnlocked(hero);
    const playBtn = SafeDOM.query(this.container, '#btn-char-select-play');
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

  private getStatCeilings(): { maxHp: number; maxSpeed: number; maxDamage: number } {
    const heroes = Object.values(DEFAULT_BALANCE.heroes);
    const maxHp = Math.max(...heroes.map((h) => h.maxHp), 100);
    const maxSpeed = Math.max(...heroes.map((h) => h.baseSpeed), 10);
    const maxDamage = Math.max(...heroes.map((h) => h.damageMultiplier), 1.5);
    return { maxHp, maxSpeed, maxDamage };
  }

  public attemptLaunch(): void {
    const isUnlocked = ProgressionManager.getInstance().isHeroUnlocked(this.selectedHero);
    if (!isUnlocked) {
      if (this.onShowUnlockQuests) {
        this.onShowUnlockQuests(this.selectedHero);
      }
      return;
    }

    const trainingCheckbox = SafeDOM.query<HTMLInputElement>(this.container, '#training-mode-toggle');
    const isTraining = Boolean(trainingCheckbox?.checked);

    const timeOfDaySelect = SafeDOM.query<HTMLSelectElement>(this.container, '#select-time-of-day');
    const timeOfDay = (timeOfDaySelect?.value as 'random' | 'day' | 'night') || 'random';

    this.onSelectHero(this.selectedHero, undefined, isTraining, timeOfDay);
  }

  public getSelectedHero(): CharacterType {
    return this.selectedHero;
  }
}
