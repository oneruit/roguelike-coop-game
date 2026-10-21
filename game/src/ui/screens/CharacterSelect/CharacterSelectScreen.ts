import { Screen } from '../../core/Screen';
import { SafeDOM } from '../../core/SafeDOM';
import { CharacterType } from '../../../entities/Player';
import { ProgressionManager } from '../../../core/ProgressionManager';
import { DEFAULT_BALANCE } from '../../../balance/defaultBalance';
import { getHeroDetails, getWeaponIconUrl } from '../../modules/HeroUIHelpers';
import { CharacterPreviewRenderer } from './CharacterPreviewRenderer';

export const HERO_ORDER: CharacterType[] = [
  'ronin',
  'valkyrie',
  'sorceress',
  'archer',
  'necromancer',
  'invoker',
  'flail',
  'chakram',
  'rocket',
  'amazon',
  'vampire'
];

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
    // Carousel navigation buttons - select previous / next hero
    const prevBtn = SafeDOM.query(this.container, '#char-carousel-prev');
    const nextBtn = SafeDOM.query(this.container, '#char-carousel-next');
    const track = SafeDOM.query(this.container, '#char-carousel-track');
    const carouselZone = SafeDOM.query(this.container, '.char-roster-carousel-zone') ||
                         SafeDOM.query(this.container, '#char-roster-viewport') ||
                         track;

    prevBtn?.addEventListener('click', () => {
      this.selectPreviousHero();
    });

    nextBtn?.addEventListener('click', () => {
      this.selectNextHero();
    });

    // Horizontal wheel scrolling on entire portraits carousel area
    carouselZone?.addEventListener('wheel', (e) => {
      const wheelEv = e as WheelEvent;
      if (Math.abs(wheelEv.deltaY) > 0 || Math.abs(wheelEv.deltaX) > 0) {
        wheelEv.preventDefault();
        const delta = Math.abs(wheelEv.deltaX) > Math.abs(wheelEv.deltaY) ? wheelEv.deltaX : wheelEv.deltaY;
        track?.scrollBy({ left: delta, behavior: 'auto' });
      }
    }, { passive: false });

    // Keyboard arrow navigation
    window.addEventListener('keydown', (e) => {
      if (!this.isVisible()) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.selectPreviousHero();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.selectNextHero();
      }
    });

    // Character cards interaction (single-click selection, no double-click auto launch)
    const cards = SafeDOM.queryAll(this.container, '.character-card[data-hero]');
    cards.forEach((card) => {
      const hero = (card.getAttribute('data-hero') || 'ronin') as CharacterType;

      card.addEventListener('click', () => {
        this.selectHero(hero);
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

  public selectPreviousHero(): void {
    const currIdx = HERO_ORDER.indexOf(this.selectedHero);
    const prevIdx = currIdx <= 0 ? HERO_ORDER.length - 1 : currIdx - 1;
    this.selectHero(HERO_ORDER[prevIdx]);
  }

  public selectNextHero(): void {
    const currIdx = HERO_ORDER.indexOf(this.selectedHero);
    const nextIdx = (currIdx + 1) % HERO_ORDER.length;
    this.selectHero(HERO_ORDER[nextIdx]);
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

    const details = getHeroDetails(hero);

    const nameEl = SafeDOM.query(this.container, '#inspect-hero-name');
    const roleEl = SafeDOM.query(this.container, '#inspect-hero-role');

    if (nameEl) nameEl.textContent = details.title;
    if (roleEl) roleEl.textContent = details.role;

    // Weapon (Оружие вместо PASSIVE TRAIT)
    const weaponId = heroData.startingWeapon;
    const weaponDef = DEFAULT_BALANCE.weapons[weaponId];
    const weaponNameEl = SafeDOM.query(this.container, '#inspect-weapon-name');
    if (weaponNameEl) {
      weaponNameEl.textContent = weaponDef?.name || 'Основное Оружие';
    }

    const weaponIconEl = SafeDOM.query<HTMLImageElement>(this.container, '#inspect-weapon-icon');
    if (weaponIconEl) {
      weaponIconEl.src = getWeaponIconUrl(weaponId);
      weaponIconEl.alt = weaponDef?.name || 'Оружие';
    }

    // Dynamic stat normalization
    const { maxHp, maxSpeed, maxDamage } = this.getStatCeilings();

    const hpBar = SafeDOM.query(this.container, '#inspect-stat-hp-bar');
    if (hpBar) hpBar.style.width = `${Math.min(100, Math.round((heroData.maxHp / maxHp) * 100))}%`;

    const dmgBar = SafeDOM.query(this.container, '#inspect-stat-dmg-bar');
    if (dmgBar) dmgBar.style.width = `${Math.min(100, Math.round((heroData.damageMultiplier / maxDamage) * 100))}%`;

    const spdBar = SafeDOM.query(this.container, '#inspect-stat-spd-bar');
    if (spdBar) spdBar.style.width = `${Math.min(100, Math.round((heroData.baseSpeed / maxSpeed) * 100))}%`;

    const diffBar = SafeDOM.query(this.container, '#inspect-stat-diff-bar');
    const diffVal = SafeDOM.query(this.container, '#inspect-stat-diff-val');
    if (diffBar) diffBar.style.width = `${details.difficultyPercent}%`;
    if (diffVal) diffVal.textContent = details.difficulty;

    // Update Play Button state (locked or ready)
    const isUnlocked = ProgressionManager.getInstance().isHeroUnlocked(hero);
    const playBtn = SafeDOM.query(this.container, '#btn-char-select-play');
    if (playBtn) {
      if (isUnlocked) {
        playBtn.classList.remove('btn-locked');
        playBtn.innerHTML = '<span class="btn-primary-text">ENTER RIFT</span>';
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
