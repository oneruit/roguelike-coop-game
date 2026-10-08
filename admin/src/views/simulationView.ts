import { BalanceState } from '../state/balanceState';
import { SimulationState } from '../types';
import { DEFAULT_BALANCE } from '../../../game/src/balance/defaultBalance';
import { SvgChartRenderer, ChartSeries } from '../chartUtils';
import { WEAPON_COLORS, getEntityTexture } from '../constants';
import { showToast } from '../ui/toast';

export class SimulationView {
  private state: BalanceState;
  public sim: SimulationState = {
    slots: [
      { enabled: true, weaponId: 'fireball', level: 10 },
      { enabled: true, weaponId: 'bow', level: 8 },
      { enabled: true, weaponId: 'lightning_strike', level: 6 },
      { enabled: false, weaponId: 'whirlwind_slash', level: 5 },
      { enabled: false, weaponId: 'holy_aura', level: 5 }
    ],
    hero: 'valkyrie',
    sheriffStacks: 0,
    watchStacks: 0,
    injectorStacks: 0,
    critVisorStacks: 0,
    cleaveTargets: 3,
    damageRuneActive: false
  };

  constructor(state: BalanceState) {
    this.state = state;
    this.bindEvents();
  }

  public bindEvents(): void {
    document.querySelectorAll('.preset-chip-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const preset = (e.currentTarget as HTMLElement).dataset.preset;
        if (preset) {
          this.applyPreset(preset);
        }
      });
    });

    const heroSelect = document.getElementById('sim-hero-select') as HTMLSelectElement;
    heroSelect?.addEventListener('change', (e) => {
      this.sim.hero = (e.target as HTMLSelectElement).value;
      this.render();
    });

    const bindSyncInput = (
      sliderId: string,
      numId: string,
      onChange: (val: number) => void
    ) => {
      const slider = document.getElementById(sliderId) as HTMLInputElement;
      const num = document.getElementById(numId) as HTMLInputElement;
      if (!slider || !num) return;

      slider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value) || 0;
        num.value = String(val);
        onChange(val);
        this.render();
      });

      num.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value) || 0;
        slider.value = String(val);
        onChange(val);
        this.render();
      });
    };

    bindSyncInput('sim-slider-sheriff', 'sim-num-sheriff', (val) => {
      this.sim.sheriffStacks = val;
      const badge = document.getElementById('sim-val-sheriff');
      if (badge) badge.innerText = `${val} стаков (+${val * 2}%)`;
    });

    bindSyncInput('sim-slider-watch', 'sim-num-watch', (val) => {
      this.sim.watchStacks = val;
      const badge = document.getElementById('sim-val-watch');
      if (badge) badge.innerText = `${val} стаков (-${Math.min(70, val * 8)}%)`;
    });

    bindSyncInput('sim-slider-injector', 'sim-num-injector', (val) => {
      this.sim.injectorStacks = val;
      const badge = document.getElementById('sim-val-injector');
      if (badge) badge.innerText = `${val} стаков`;
    });

    bindSyncInput('sim-slider-critvisor', 'sim-num-critvisor', (val) => {
      this.sim.critVisorStacks = val;
      const badge = document.getElementById('sim-val-critvisor');
      const pct = Math.round((0.05 + val * 0.12) * 100);
      if (badge) badge.innerText = `${val} стаков (${pct}%)`;
    });

    bindSyncInput('sim-slider-targets', 'sim-num-targets', (val) => {
      this.sim.cleaveTargets = Math.max(1, Math.round(val));
      const badge = document.getElementById('sim-val-targets');
      if (badge) badge.innerText = `${this.sim.cleaveTargets} целей`;
    });

    const runeCheck = document.getElementById('sim-check-damagerune') as HTMLInputElement;
    runeCheck?.addEventListener('change', (e) => {
      this.sim.damageRuneActive = (e.target as HTMLInputElement).checked;
      this.render();
    });

    const slotsContainer = document.getElementById('sim-weapon-slots-container');
    if (slotsContainer) {
      slotsContainer.addEventListener('change', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('sim-slot-toggle')) {
          const idx = parseInt((target as HTMLInputElement).dataset.slot || '0');
          if (this.sim.slots[idx]) {
            this.sim.slots[idx].enabled = (target as HTMLInputElement).checked;
            this.render();
          }
        } else if (target.classList.contains('sim-slot-weapon')) {
          const idx = parseInt((target as HTMLSelectElement).dataset.slot || '0');
          if (this.sim.slots[idx]) {
            this.sim.slots[idx].weaponId = (target as HTMLSelectElement).value;
            this.render();
          }
        }
      });

      slotsContainer.addEventListener('input', (e) => {
        const target = e.target as HTMLElement;
        if (
          target.classList.contains('sim-slot-level-slider') ||
          target.classList.contains('sim-slot-level-input')
        ) {
          const idx = parseInt((target as HTMLInputElement).dataset.slot || '0');
          if (this.sim.slots[idx]) {
            const val = Math.max(1, Math.min(20, parseInt((target as HTMLInputElement).value) || 1));
            this.sim.slots[idx].level = val;
            const card = target.closest('.weapon-slot-card');
            const slider = card?.querySelector('.sim-slot-level-slider') as HTMLInputElement;
            const num = card?.querySelector('.sim-slot-level-input') as HTMLInputElement;
            if (slider && slider !== target) slider.value = String(val);
            if (num && num !== target) num.value = String(val);

            this.render();
          }
        }
      });
    }
  }

  public applyPreset(preset: string): void {
    if (preset === 'sniper') {
      this.sim.hero = 'archer';
      this.sim.slots = [
        { enabled: true, weaponId: 'bow', level: 15 },
        { enabled: true, weaponId: 'chakram', level: 12 },
        { enabled: true, weaponId: 'ice_spike', level: 10 },
        { enabled: false, weaponId: 'astral_staff', level: 8 },
        { enabled: false, weaponId: 'fireball', level: 10 }
      ];
      this.sim.sheriffStacks = 15;
      this.sim.watchStacks = 5;
      this.sim.injectorStacks = 0;
      this.sim.critVisorStacks = 4;
      this.sim.cleaveTargets = 2;
      this.sim.damageRuneActive = false;
      showToast('Пресет «Снайпер дальнего боя» активирован.', 'info');
    } else if (preset === 'melee') {
      this.sim.hero = 'ronin';
      this.sim.slots = [
        { enabled: true, weaponId: 'katana_slash', level: 18 },
        { enabled: true, weaponId: 'whirlwind_slash', level: 15 },
        { enabled: true, weaponId: 'greatsword', level: 12 },
        { enabled: true, weaponId: 'orbiting_barrier', level: 10 },
        { enabled: false, weaponId: 'flail', level: 8 }
      ];
      this.sim.sheriffStacks = 20;
      this.sim.watchStacks = 6;
      this.sim.injectorStacks = 1;
      this.sim.critVisorStacks = 2;
      this.sim.cleaveTargets = 6;
      this.sim.damageRuneActive = true;
      showToast('Пресет «Вихревой милишник» активирован.', 'info');
    } else if (preset === 'elemental') {
      this.sim.hero = 'sorceress';
      this.sim.slots = [
        { enabled: true, weaponId: 'fireball', level: 20 },
        { enabled: true, weaponId: 'lightning_strike', level: 16 },
        { enabled: true, weaponId: 'holy_aura', level: 14 },
        { enabled: true, weaponId: 'ice_spike', level: 12 },
        { enabled: false, weaponId: 'astral_staff', level: 10 }
      ];
      this.sim.sheriffStacks = 25;
      this.sim.watchStacks = 8;
      this.sim.injectorStacks = 3;
      this.sim.critVisorStacks = 1;
      this.sim.cleaveTargets = 5;
      this.sim.damageRuneActive = true;
      showToast('Пресет «Стихийный маг» активирован.', 'info');
    } else if (preset === 'crit') {
      this.sim.hero = 'archer';
      this.sim.slots = [
        { enabled: true, weaponId: 'bow', level: 18 },
        { enabled: true, weaponId: 'chakram', level: 16 },
        { enabled: true, weaponId: 'katana_slash', level: 14 },
        { enabled: true, weaponId: 'kukri', level: 12 },
        { enabled: false, weaponId: 'fireball', level: 10 }
      ];
      this.sim.sheriffStacks = 15;
      this.sim.watchStacks = 5;
      this.sim.injectorStacks = 0;
      this.sim.critVisorStacks = 8;
      this.sim.cleaveTargets = 3;
      this.sim.damageRuneActive = false;
      showToast('Пресет «Крит-мастер» активирован.', 'info');
    } else if (preset === 'starter') {
      this.sim.hero = 'valkyrie';
      this.sim.slots = [
        { enabled: true, weaponId: 'bow', level: 1 },
        { enabled: true, weaponId: 'fireball', level: 1 },
        { enabled: false, weaponId: 'kukri', level: 1 },
        { enabled: false, weaponId: 'flail', level: 1 },
        { enabled: false, weaponId: 'holy_aura', level: 1 }
      ];
      this.sim.sheriffStacks = 0;
      this.sim.watchStacks = 0;
      this.sim.injectorStacks = 0;
      this.sim.critVisorStacks = 0;
      this.sim.cleaveTargets = 3;
      this.sim.damageRuneActive = false;
      showToast('Пресет «Стартовый набор» активирован.', 'info');
    } else if (preset === 'reset') {
      this.sim.hero = 'valkyrie';
      this.sim.slots = [
        { enabled: true, weaponId: 'fireball', level: 1 },
        { enabled: false, weaponId: 'bow', level: 1 },
        { enabled: false, weaponId: 'kukri', level: 1 },
        { enabled: false, weaponId: 'flail', level: 1 },
        { enabled: false, weaponId: 'holy_aura', level: 1 }
      ];
      this.sim.sheriffStacks = 0;
      this.sim.watchStacks = 0;
      this.sim.injectorStacks = 0;
      this.sim.critVisorStacks = 0;
      this.sim.cleaveTargets = 3;
      this.sim.damageRuneActive = false;
      showToast('Параметры симулятора сброшены.', 'info');
    }

    this.updatePassiveUIValues();
    this.render();
  }

  public updatePassiveUIValues(): void {
    const elHero = document.getElementById('sim-hero-select') as HTMLSelectElement;
    if (elHero) elHero.value = this.sim.hero;

    const setInputPair = (
      sliderId: string,
      numId: string,
      badgeId: string,
      val: number,
      badgeText: string
    ) => {
      const sl = document.getElementById(sliderId) as HTMLInputElement;
      const nm = document.getElementById(numId) as HTMLInputElement;
      const bg = document.getElementById(badgeId);
      if (sl) sl.value = String(val);
      if (nm) nm.value = String(val);
      if (bg) bg.innerText = badgeText;
    };

    setInputPair(
      'sim-slider-sheriff',
      'sim-num-sheriff',
      'sim-val-sheriff',
      this.sim.sheriffStacks,
      `${this.sim.sheriffStacks} стаков (+${this.sim.sheriffStacks * 2}%)`
    );
    setInputPair(
      'sim-slider-watch',
      'sim-num-watch',
      'sim-val-watch',
      this.sim.watchStacks,
      `${this.sim.watchStacks} стаков (-${Math.min(70, this.sim.watchStacks * 8)}%)`
    );
    setInputPair(
      'sim-slider-injector',
      'sim-num-injector',
      'sim-val-injector',
      this.sim.injectorStacks,
      `${this.sim.injectorStacks} стаков`
    );
    const critPct = Math.round((0.05 + this.sim.critVisorStacks * 0.12) * 100);
    setInputPair(
      'sim-slider-critvisor',
      'sim-num-critvisor',
      'sim-val-critvisor',
      this.sim.critVisorStacks,
      `${this.sim.critVisorStacks} стаков (${critPct}%)`
    );
    setInputPair(
      'sim-slider-targets',
      'sim-num-targets',
      'sim-val-targets',
      this.sim.cleaveTargets,
      `${this.sim.cleaveTargets} целей`
    );

    const runeCheck = document.getElementById('sim-check-damagerune') as HTMLInputElement;
    if (runeCheck) runeCheck.checked = this.sim.damageRuneActive;
  }

  public calculateSlotStats(slot: { weaponId: string; level: number }): {
    singleTargetDps: number;
    totalDps: number;
    hitDamage: number;
    effectiveCooldown: number;
    weaponName: string;
    weaponColor: string;
  } {
    const w =
      this.state.draftBalance.weapons[slot.weaponId] ||
      DEFAULT_BALANCE.weapons[slot.weaponId] ||
      Object.values(this.state.draftBalance.weapons)[0];
    const heroCfg =
      this.state.draftBalance.heroes[this.sim.hero] ||
      DEFAULT_BALANCE.heroes[this.sim.hero] || { damageMultiplier: 1.0 };
    const heroMult = heroCfg.damageMultiplier || 1.0;
    const sheriffMult = 1 + this.sim.sheriffStacks * 0.02;
    const runeMult = this.sim.damageRuneActive ? 1.3 : 1.0;

    const baseCritChance = this.state.draftBalance.global.baseCritChance ?? 0.05;
    const baseCritMult = this.state.draftBalance.global.baseCritDamageMult ?? 2.0;
    const effectiveCritChance = Math.min(1.0, baseCritChance + this.sim.critVisorStacks * 0.12);
    const expectedCritMult = 1 + effectiveCritChance * (baseCritMult - 1);

    const globalDmgMult = heroMult * sheriffMult * runeMult * expectedCritMult;
    const baseLvlDmg = w.damage + (slot.level - 1) * w.damagePerLevel;
    const hitDamage = baseLvlDmg * globalDmgMult;

    const watchReduction = Math.max(0.3, 1 - this.sim.watchStacks * 0.08);
    const injectorReduction = Math.pow(0.85, this.sim.injectorStacks);
    const cdMult = Math.max(0.2, watchReduction * injectorReduction);

    const baseCd = w.cooldown > 0 ? w.cooldown : 1 / 60;
    const effectiveCooldown = Math.max(0.04, baseCd * cdMult);

    const singleTargetDps = hitDamage / effectiveCooldown;

    let cleaveFactor = 1;
    if (w.explosionRadius || w.splashRadius) {
      const radius = w.explosionRadius || w.splashRadius || 2.5;
      cleaveFactor = 1 + Math.min(this.sim.cleaveTargets - 1, Math.round(radius * 1.2));
    } else if (w.pierce) {
      cleaveFactor = Math.min(this.sim.cleaveTargets, w.pierce + 1);
    } else if (
      w.id === 'holy_aura' ||
      w.id === 'orbiting_barrier' ||
      w.id === 'whirlwind_slash' ||
      w.id === 'greatsword' ||
      w.id === 'flail'
    ) {
      cleaveFactor = Math.min(this.sim.cleaveTargets, 5);
    }

    const totalDps = singleTargetDps * cleaveFactor;

    return {
      singleTargetDps,
      totalDps,
      hitDamage,
      effectiveCooldown,
      weaponName: w.name,
      weaponColor: WEAPON_COLORS[w.id] || '#3b82f6'
    };
  }

  public render(): void {
    this.renderSimulationWeaponSlots();

    const activeSlots = this.sim.slots.filter((s) => s.enabled);
    let totalDps = 0;
    let singleTargetDps = 0;
    const slotStatsList: Array<{ name: string; value: number; color: string; pct: number }> = [];

    for (const slot of activeSlots) {
      const stats = this.calculateSlotStats(slot);
      totalDps += stats.totalDps;
      singleTargetDps += stats.singleTargetDps;
      slotStatsList.push({
        name: stats.weaponName,
        value: stats.totalDps,
        color: stats.weaponColor,
        pct: 0
      });
    }

    slotStatsList.forEach((s) => {
      s.pct = totalDps > 0 ? (s.value / totalDps) * 100 : 0;
    });

    const kpiTotal = document.getElementById('sim-kpi-total-dps');
    if (kpiTotal) kpiTotal.innerText = Math.round(totalDps).toLocaleString();

    const kpiSt = document.getElementById('sim-kpi-st-dps');
    if (kpiSt) kpiSt.innerText = Math.round(singleTargetDps).toLocaleString();

    const kpi60s = document.getElementById('sim-kpi-60s-dmg');
    if (kpi60s) kpi60s.innerText = Math.round(totalDps * 60).toLocaleString();

    const kpiCrit = document.getElementById('sim-kpi-crit');
    const kpiCritSub = document.getElementById('sim-kpi-crit-sub');
    const baseCritChance = this.state.draftBalance.global.baseCritChance ?? 0.05;
    const baseCritMult = this.state.draftBalance.global.baseCritDamageMult ?? 2.0;
    const effectiveCritChance = Math.min(1.0, baseCritChance + this.sim.critVisorStacks * 0.12);
    const expectedCritMult = 1 + effectiveCritChance * (baseCritMult - 1);

    if (kpiCrit) {
      kpiCrit.innerText = `${Math.round(effectiveCritChance * 100)}% / ${baseCritMult.toFixed(2)}x`;
    }
    if (kpiCritSub) {
      kpiCritSub.innerText = `средний множитель: ${expectedCritMult.toFixed(2)}x`;
    }

    const shareContainer = document.getElementById('sim-damage-share-container');
    if (shareContainer) {
      SvgChartRenderer.renderShareBars(shareContainer, slotStatsList);
    }

    const curveContainer = document.getElementById('sim-damage-curve-container');
    if (curveContainer) {
      const seconds = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
      const xLabels = seconds.map((s) => `${s}с`);

      const seriesList: ChartSeries[] = [];
      activeSlots.forEach((slot) => {
        const stats = this.calculateSlotStats(slot);
        seriesList.push({
          id: slot.weaponId,
          name: stats.weaponName,
          color: stats.weaponColor,
          values: seconds.map((s) => Math.round(stats.totalDps * s)),
          unit: 'урон'
        });
      });

      if (activeSlots.length > 1) {
        seriesList.push({
          id: 'total-build',
          name: 'Суммарный урон всего билда',
          color: '#2563eb',
          dashed: true,
          values: seconds.map((s) => Math.round(totalDps * s)),
          unit: 'урон'
        });
      }

      SvgChartRenderer.renderLineChart(curveContainer, seriesList, {
        xLabels,
        fillArea: true
      });
    }

    const levelCurveContainer = document.getElementById('sim-level-curve-container');
    if (levelCurveContainer) {
      const levels = Array.from({ length: 20 }, (_, i) => i + 1);
      const xLabels = levels.map((l) => `L${l}`);

      const seriesList: ChartSeries[] = [];
      activeSlots.forEach((slot) => {
        const w = this.state.draftBalance.weapons[slot.weaponId];
        const color = WEAPON_COLORS[slot.weaponId] || '#3b82f6';
        const values = levels.map((lvl) => {
          const stats = this.calculateSlotStats({ weaponId: slot.weaponId, level: lvl });
          return Math.round(stats.totalDps);
        });
        seriesList.push({
          id: slot.weaponId,
          name: w?.name || slot.weaponId,
          color,
          values,
          unit: 'DPS'
        });
      });

      if (activeSlots.length > 0) {
        const totalBuildValues = levels.map((lvl) => {
          let sum = 0;
          activeSlots.forEach((slot) => {
            const stats = this.calculateSlotStats({ weaponId: slot.weaponId, level: lvl });
            sum += stats.totalDps;
          });
          return Math.round(sum);
        });

        seriesList.push({
          id: 'total-build-level',
          name: 'Суммарный DPS билда (L1-L20)',
          color: '#1e293b',
          dashed: true,
          values: totalBuildValues,
          unit: 'DPS'
        });
      }

      SvgChartRenderer.renderLineChart(levelCurveContainer, seriesList, {
        xLabels,
        fillArea: false
      });
    }
  }

  private renderSimulationWeaponSlots(): void {
    const container = document.getElementById('sim-weapon-slots-container');
    if (!container) return;
    container.innerHTML = '';

    const weapons = Object.values(this.state.draftBalance.weapons);
    const activeCount = this.sim.slots.filter((s) => s.enabled).length;
    const countBadge = document.getElementById('sim-active-slots-count');
    if (countBadge) countBadge.innerText = `Активно: ${activeCount} из 5`;

    this.sim.slots.forEach((slot, idx) => {
      const w = this.state.draftBalance.weapons[slot.weaponId] || weapons[0];
      const stats = this.calculateSlotStats(slot);
      const texture = getEntityTexture('weapons', w.id);

      const card = document.createElement('div');
      card.className = `weapon-slot-card ${slot.enabled ? '' : 'disabled'}`;
      card.dataset.slotIndex = String(idx);

      const weaponOptions = weapons
        .map(
          (item) =>
            `<option value="${item.id}" ${item.id === slot.weaponId ? 'selected' : ''}>${item.icon || '⚔️'} ${item.name}</option>`
        )
        .join('');

      card.innerHTML = `
        <div class="slot-header">
          <label class="slot-toggle-label">
            <input type="checkbox" class="sim-slot-toggle" data-slot="${idx}" ${slot.enabled ? 'checked' : ''}>
            <span>Слот ${idx + 1}</span>
            <img src="${texture}" style="width:20px; height:20px; object-fit:contain; border-radius:4px; margin-left:4px;" alt="">
          </label>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; color:var(--text-muted);">${slot.enabled ? 'В бою' : 'Выключен'}</span>
            <span class="slot-stat-tag" style="font-weight:700; color:var(--accent-primary); font-size:13px;" id="sim-slot-dps-${idx}">
              ${slot.enabled ? `${Math.round(stats.totalDps).toLocaleString()} DPS` : '0 DPS'}
            </span>
          </div>
        </div>
        <div class="slot-controls-row">
          <select class="form-input sim-slot-weapon" data-slot="${idx}" ${slot.enabled ? '' : 'disabled'} style="font-weight:600;">
            ${weaponOptions}
          </select>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:12px; font-weight:600; color:var(--text-muted); white-space:nowrap;">Ур.</span>
            <input type="range" class="stat-slider sim-slot-level-slider" data-slot="${idx}" min="1" max="20" step="1" value="${slot.level}" ${slot.enabled ? '' : 'disabled'}>
            <input type="number" class="stat-input sim-slot-level-input" data-slot="${idx}" min="1" max="20" step="1" value="${slot.level}" style="width:48px;" ${slot.enabled ? '' : 'disabled'}>
          </div>
        </div>
        <div class="slot-stats-preview">
          <span>Залп: <strong id="sim-slot-dmg-${idx}">${Math.round(stats.hitDamage)}</strong></span>
          <span>Кулдаун: <strong id="sim-slot-cd-${idx}">${stats.effectiveCooldown.toFixed(2)}с</strong></span>
          <span>Фокус DPS: <strong>${Math.round(stats.singleTargetDps)}</strong></span>
        </div>
      `;

      container.appendChild(card);
    });
  }
}
