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
  private weaponLevels: Record<string, number> = {};
  private currentUpgradeChoices: WeaponUpgradeResult[] = [];
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
    this.weaponLevels = {};

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
          // Initialize levels for all 4 weapons
          const all4 = [this.startingWeaponId, ...this.draftedWeaponIds];
          for (const wId of all4) {
            this.weaponLevels[wId] = 1;
          }
          this.renderUpgradeDraft(1);
        }
      });
    });
  }

  private renderUpgradeDraft(round: number): void {
    this.setStepBadge(`ЭТАП 3: ВЫБОР УЛУЧШЕНИЙ (${round}/12) • CAP LV. 4`);
    const content = this.container.querySelector('#lucky-test-content');
    if (!content) return;

    const all4 = [this.startingWeaponId, ...this.draftedWeaponIds];
    this.currentUpgradeChoices = this.manager.generateUpgradeChoices(all4, this.weaponLevels, 3);

    // If no more weapons can be upgraded (all lv. 4), proceed to passives
    if (this.currentUpgradeChoices.length === 0) {
      this.renderPassiveDraft(1);
      return;
    }

    content.innerHTML = `
      <div class="lucky-prompt">Выберите 1 улучшение оружия (${round} из 12 выборов):</div>
      <div class="lucky-cards-row">
        ${this.currentUpgradeChoices
          .map(
            (up, idx) => `
          <div class="lucky-draft-card lucky-upgrade-card grade-${up.grade}" data-index="${idx}">
            <div class="lucky-quality-badge" style="color: ${up.gradeColor}; border-color: ${up.gradeColor}">
              ${up.gradeName.toUpperCase()}
            </div>
            <div class="lucky-card-icon">⚔️</div>
            <div class="lucky-card-title">${up.weaponName}</div>
            <div class="lucky-card-desc">Повышение до <strong>Уровня ${up.newLevel}</strong> (макс. 4)</div>
            <button class="lucky-btn-select">ВЫБРАТЬ</button>
          </div>
        `
          )
          .join('')}
      </div>
      <div class="lucky-arsenal-status" style="margin-top: 20px; font-size: 13px; color: #94a3b8; text-align: center;">
        Текущие уровни оружия: ${all4.map(id => `${id}: Ур. ${this.weaponLevels[id] || 1}/4`).join(' • ')}
      </div>
    `;

    const cards = content.querySelectorAll('.lucky-upgrade-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-index') || '0', 10);
        const chosen = this.currentUpgradeChoices[idx];
        if (!chosen) return;

        this.appliedUpgrades.push(chosen);
        this.weaponLevels[chosen.weaponId] = chosen.newLevel;
        SoundManager.playButtonClick?.();

        if (round < 12) {
          this.renderUpgradeDraft(round + 1);
        } else {
          this.renderPassiveDraft(1);
        }
      });
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
        SoundManager.playButtonClick?.();

        if (round < 4) {
          this.renderPassiveDraft(round + 1);
        } else {
          this.renderDraftSummary();
        }
      });
    });
  }

  private renderDraftSummary(): void {
    this.setStepBadge('ИТОГ ДРАФТА: ВАШ БИЛД ГОТОВ');
    const content = this.container.querySelector('#lucky-test-content');
    if (!content) return;

    const allWeapons = [this.startingWeaponId, ...this.draftedWeaponIds];

    content.innerHTML = `
      <div class="lucky-summary-container">
        <div class="lucky-summary-section">
          <h3>ГЛАДИАТОР: ${this.rolledHero.name}</h3>
          <p style="color: #64748b; font-size: 13px;">1500 HP • 40% Resilience PvP Баланс</p>
        </div>

        <div class="lucky-summary-section">
          <h4>АРСЕНАЛ ОРУЖИЯ (4 вида):</h4>
          <div class="lucky-summary-weapons">
            ${allWeapons
              .map(id => {
                const upList = this.appliedUpgrades.filter(u => u.weaponId === id);
                const highestGrade = upList.length > 0 ? upList[upList.length - 1].gradeName : 'Обычное';
                const lvl = this.weaponLevels[id] || 1;
                return `
                <div class="lucky-summary-pill">
                  <strong>${id}</strong> (Ур. ${lvl}/4) — ${highestGrade}
                </div>
              `;
              })
              .join('')}
          </div>
        </div>

        <div class="lucky-summary-section">
          <h4>ПАССИВНЫЕ НАВЫКИ (4 шт):</h4>
          <div class="lucky-summary-passives">
            ${this.chosenPassives
              .map(
                p => `
              <div class="lucky-summary-passive-item quality-${p.quality}">
                <span>${p.icon} <strong>${p.title}:</strong> ${p.description}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <button id="btn-lucky-final-ready" class="lucky-btn-primary" style="margin-top: 24px; font-size: 18px; padding: 16px 36px;">
          ВЫЙТИ НА АРЕНУ ГЛАДИАТОРОВ ⚔️
        </button>
      </div>
    `;

    const btnReady = content.querySelector('#btn-lucky-final-ready');
    btnReady?.addEventListener('click', () => {
      SoundManager.playButtonClick?.();
      this.hide();
      this.onDraftCompleted?.({
        hero: this.rolledHero.type,
        heroName: this.rolledHero.name,
        startingWeaponId: this.startingWeaponId,
        draftedWeaponIds: this.draftedWeaponIds,
        appliedUpgrades: this.appliedUpgrades,
        chosenPassives: this.chosenPassives,
        isReady: true
      });
    });
  }
}
