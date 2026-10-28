import { Screen } from '../../core/Screen';
import { SoundManager } from '../../../core/SoundManager';
import { LuckyTestManager } from '../../../mechanics/lucky-test/LuckyTestManager';
import {
  WeaponDraftChoice,
  WeaponUpgradeResult,
  LuckyPassiveChoice,
  LuckyTestBuildState
} from '../../../mechanics/lucky-test/LuckyTestTypes';
import { CharacterType } from '../../../shared/types/entities';
import { BalanceManager } from '../../../balance/BalanceManager';

export class LuckyTestDraftScreen extends Screen {
  private manager: LuckyTestManager = LuckyTestManager.getInstance();

  private rolledHero!: { type: CharacterType; name: string };
  private startingWeaponId!: string;
  private draftedWeaponIds: string[] = [];
  private currentWeaponChoices: [WeaponDraftChoice, WeaponDraftChoice] | null = null;
  private appliedUpgrades: WeaponUpgradeResult[] = [];
  private chosenPassives: LuckyPassiveChoice[] = [];
  private currentPassiveChoices: LuckyPassiveChoice[] = [];

  public onDraftCompleted?: (build: LuckyTestBuildState) => void;

  constructor() {
    super('lucky-test-draft');
  }

  protected bindElements(): void {}
  protected bindEvents(): void {}

  protected getTemplate(): string {
    return `
      <div class="lucky-test-overlay">
        <div class="lucky-test-container">
          <div class="lucky-test-header">
            <h2 class="lucky-test-title">LUCKY TEST • АРЕНА ГЛАДИАТОРОВ</h2>
            <div id="lucky-test-step-badge" class="lucky-test-step-badge">ШАГ 1: ВЫБОР ГЕРОЯ</div>
          </div>
          <div id="lucky-test-content" class="lucky-test-content">
            <!-- Dynamic step contents rendered here -->
          </div>
        </div>
      </div>
    `;
  }

  public startDraft(): void {
    this.draftedWeaponIds = [];
    this.appliedUpgrades = [];
    this.chosenPassives = [];

    // 1. Roll Random Hero
    this.rolledHero = this.manager.rollRandomHero();
    const heroCfg = BalanceManager.getHeroConfig(this.rolledHero.type);
    this.startingWeaponId = heroCfg.startingWeapon || 'katana_slash';

    this.show();
    this.renderHeroReveal();
    SoundManager.playLevelUp?.();
  }

  private setStepBadge(text: string): void {
    const badge = this.container.querySelector('#lucky-test-step-badge');
    if (badge) badge.textContent = text;
  }

  private renderHeroReveal(): void {
    this.setStepBadge('ЭТАП 1: ВАШ ГЛАДИАТОР');
    const content = this.container.querySelector('#lucky-test-content');
    if (!content) return;

    const startingWeaponChoice = this.manager.getWeaponDraftChoice(this.startingWeaponId);

    content.innerHTML = `
      <div class="lucky-hero-card">
        <div class="lucky-hero-avatar">🎭</div>
        <div class="lucky-hero-name">${this.rolledHero.name}</div>
        <div class="lucky-hero-subtitle">Случайный гладиатор Арены</div>
        <div class="lucky-hero-innate-weapon">
          <div class="lucky-weapon-tag">РОДНОЕ ОРУЖИЕ</div>
          <div class="lucky-weapon-row">
            <span class="lucky-weapon-icon">${startingWeaponChoice.icon}</span>
            <span class="lucky-weapon-name">${startingWeaponChoice.name}</span>
          </div>
        </div>
        <button id="btn-lucky-hero-next" class="lucky-btn-primary">
          ПЕРЕЙТИ К ДРАФТУ ОРУЖИЯ (1/3) ➔
        </button>
      </div>
    `;

    const btn = content.querySelector('#btn-lucky-hero-next');
    btn?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      this.renderWeaponDraft(1);
    });
  }

  private renderWeaponDraft(round: number): void {
    this.setStepBadge(`ЭТАП 2: ДРАФТ ОРУЖИЯ (${round}/3)`);
    const content = this.container.querySelector('#lucky-test-content');
    if (!content) return;

    const excluded = [this.startingWeaponId, ...this.draftedWeaponIds];
    this.currentWeaponChoices = this.manager.generateWeaponDraft(excluded);

    content.innerHTML = `
      <div class="lucky-prompt">Выберите 1 оружие из двух предложенных:</div>
      <div class="lucky-cards-row">
        ${this.currentWeaponChoices
          .map(
            (w, idx) => `
          <div class="lucky-draft-card lucky-weapon-card" data-index="${idx}">
            <div class="lucky-card-icon">${w.icon}</div>
            <div class="lucky-card-title">${w.name}</div>
            <div class="lucky-card-desc">${w.description}</div>
            <button class="lucky-btn-select">ВЫБРАТЬ</button>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    const cards = content.querySelectorAll('.lucky-weapon-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-index') || '0', 10);
        if (!this.currentWeaponChoices) return;
        const chosen = this.currentWeaponChoices[idx];
        this.draftedWeaponIds.push(chosen.id);
        SoundManager.playButtonClick?.();

        if (round < 3) {
          this.renderWeaponDraft(round + 1);
        } else {
          this.renderUpgradesReveal();
        }
      });
    });
  }

  private renderUpgradesReveal(): void {
    this.setStepBadge('ЭТАП 3: 12 СЛУЧАЙНЫХ УЛУЧШЕНИЙ (CAP LV. 4)');
    const content = this.container.querySelector('#lucky-test-content');
    if (!content) return;

    const all4Weapons = [this.startingWeaponId, ...this.draftedWeaponIds];
    this.appliedUpgrades = this.manager.generate12Upgrades(all4Weapons);

    content.innerHTML = `
      <div class="lucky-prompt">Система распределила 12 случайных улучшений с редкостью (макс. 4 ур. на оружие):</div>
      <div class="lucky-upgrades-grid">
        ${this.appliedUpgrades
          .map(
            (up, i) => `
          <div class="lucky-upgrade-pill grade-${up.grade}">
            <span class="lucky-upgrade-num">#${i + 1}</span>
            <span class="lucky-upgrade-target">${up.weaponName}</span>
            <span class="lucky-upgrade-lvl">Ур. ${up.newLevel}</span>
            <span class="lucky-upgrade-rarity" style="color: ${up.gradeColor}">${up.gradeName}</span>
          </div>
        `
          )
          .join('')}
      </div>
      <button id="btn-lucky-upgrades-next" class="lucky-btn-primary" style="margin-top: 24px;">
        ПЕРЕЙТИ К ВЫБОРУ ПАССИВНЫХ УМЕНИЙ (1/4) ➔
      </button>
    `;

    const btn = content.querySelector('#btn-lucky-upgrades-next');
    btn?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      this.renderPassiveDraft(1);
    });
  }

  private renderPassiveDraft(round: number): void {
    this.setStepBadge(`ЭТАП 4: ВЫБОР ПАССИВНЫХ УМЕНИЙ (${round}/4)`);
    const content = this.container.querySelector('#lucky-test-content');
    if (!content) return;

    this.currentPassiveChoices = this.manager.generatePassiveChoices(3);

    content.innerHTML = `
      <div class="lucky-prompt">Выберите 1 пассивный талант со случайным значением:</div>
      <div class="lucky-cards-row">
        ${this.currentPassiveChoices
          .map(
            (p, idx) => `
          <div class="lucky-draft-card lucky-passive-card quality-${p.quality}" data-index="${idx}">
            <div class="lucky-quality-badge quality-${p.quality}">${p.quality.toUpperCase()}</div>
            <div class="lucky-card-icon">${p.icon}</div>
            <div class="lucky-card-title">${p.title}</div>
            <div class="lucky-card-desc">${p.description}</div>
            <button class="lucky-btn-select">ВЫБРАТЬ</button>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    const cards = content.querySelectorAll('.lucky-passive-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-index') || '0', 10);
        const chosen = this.currentPassiveChoices[idx];
        this.chosenPassives.push(chosen);
        SoundManager.playLevelUp?.();

        if (round < 4) {
          this.renderPassiveDraft(round + 1);
        } else {
          this.renderFinalSummary();
        }
      });
    });
  }

  private renderFinalSummary(): void {
    this.setStepBadge('ЭТАП 5: ГОТОВНОСТЬ К БОЮ');
    const content = this.container.querySelector('#lucky-test-content');
    if (!content) return;

    content.innerHTML = `
      <div class="lucky-summary-container">
        <h3 class="lucky-summary-hero">Гладиатор: ${this.rolledHero.name} (1500 HP • Стойкость 40%)</h3>
        <div class="lucky-summary-section-title">Арсенал из 4 видов оружия (макс. 4 ур.):</div>
        <div class="lucky-summary-weapons">
          ${[this.startingWeaponId, ...this.draftedWeaponIds]
            .map(wId => {
              const choice = this.manager.getWeaponDraftChoice(wId);
              return `<span class="lucky-summary-tag">${choice.icon} ${choice.name} (Ур. 4)</span>`;
            })
            .join('')}
        </div>
        <div class="lucky-summary-section-title" style="margin-top: 16px;">Выбранные пассивные таланты:</div>
        <div class="lucky-summary-passives">
          ${this.chosenPassives
            .map(p => `<div class="lucky-summary-passive-item">${p.icon} <strong>${p.title}</strong>: ${p.description}</div>`)
            .join('')}
        </div>
        <div class="lucky-summary-controls">
          <button id="btn-lucky-enter-arena" class="lucky-btn-primary lucky-btn-large">
            ВСТАТЬ НА КРУГ ГОТОВНОСТИ ➔
          </button>
        </div>
      </div>
    `;

    const btn = content.querySelector('#btn-lucky-enter-arena');
    btn?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      this.hide();

      const finalBuild: LuckyTestBuildState = {
        hero: this.rolledHero.type,
        heroName: this.rolledHero.name,
        startingWeaponId: this.startingWeaponId,
        draftedWeaponIds: this.draftedWeaponIds,
        appliedUpgrades: this.appliedUpgrades,
        chosenPassives: this.chosenPassives,
        isReady: true
      };

      this.onDraftCompleted?.(finalBuild);
    });
  }
}
