import { BalanceState } from '../state/balanceState';
import { ProgressionChartState } from '../types';
import { SvgChartRenderer, ChartSeries } from '../chartUtils';
import { getWeaponColor, getMonsterColor } from '../constants';

export class ProgressionView {
  private state: BalanceState;
  public chartState: ProgressionChartState = {
    view: 'weapons',
    weaponMetric: 'damage',
    weaponGrade: 'common',
    weaponTier: 'tier1',
    selectedWeapons: new Set(['fireball', 'bow', 'greatsword', 'lightning_strike', 'katana_slash']),
    monsterCategory: 'monsters',
    monsterMetric: 'hp',
    selectedMonsters: new Set(['coyote', 'crawler', 'scorpion', 'brute', 'bison']),
    selectedBosses: new Set(['boss', 'hydra']),
    monsterTimeLimit: 120
  };

  constructor(state: BalanceState) {
    this.state = state;
    this.bindEvents();
  }

  public bindEvents(): void {
    const viewButtons = document.querySelectorAll('#progression-view-switcher .segmented-btn');
    viewButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetView = (e.currentTarget as HTMLElement).dataset.progView as
          | 'weapons'
          | 'monsters'
          | 'heroes'
          | undefined;
        if (!targetView) return;
        this.chartState.view = targetView;
        viewButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');

        const elW = document.getElementById('prog-view-weapons');
        const elM = document.getElementById('prog-view-monsters');
        const elH = document.getElementById('prog-view-heroes');
        if (elW) elW.style.display = targetView === 'weapons' ? 'block' : 'none';
        if (elM) elM.style.display = targetView === 'monsters' ? 'block' : 'none';
        if (elH) elH.style.display = targetView === 'heroes' ? 'block' : 'none';

        this.render();
      });
    });

    const metricButtons = document.querySelectorAll('#prog-weapon-metric-toggle .segmented-btn');
    metricButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const metric = (e.currentTarget as HTMLElement).dataset.metric as 'damage' | 'dps' | undefined;
        if (!metric) return;
        this.chartState.weaponMetric = metric;
        metricButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');

        const title = document.getElementById('prog-weapons-chart-title');
        if (title) {
          title.textContent =
            metric === 'damage'
              ? 'Прогрессия урона оружия от Уровня 1 до Уровня 12 (с учетом редкости)'
              : 'Прогрессия боевого DPS оружия от Уровня 1 до Уровня 12 (с учетом редкости)';
        }

        this.renderWeaponsProgression();
      });
    });

    const gradeButtons = document.querySelectorAll('#prog-weapon-grade-toggle .segmented-btn');
    gradeButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const grade = (e.currentTarget as HTMLElement).dataset.grade as
          | 'common'
          | 'uncommon'
          | 'rare'
          | 'legendary'
          | undefined;
        if (!grade) return;
        this.chartState.weaponGrade = grade;
        gradeButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');

        this.renderWeaponsProgression();
      });
    });

    const tierButtons = document.querySelectorAll('#prog-weapon-tier-toggle .segmented-btn');
    tierButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tier = (e.currentTarget as HTMLElement).dataset.tier as
          | 'tier3'
          | 'tier2'
          | 'tier1'
          | 'all'
          | undefined;
        if (!tier) return;
        this.chartState.weaponTier = tier;
        tierButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');

        this.renderWeaponsProgression();
      });
    });

    document.getElementById('btn-prog-weapons-select-all')?.addEventListener('click', () => {
      Object.keys(this.state.draftBalance.weapons).forEach((id) => this.chartState.selectedWeapons.add(id));
      this.renderWeaponsProgression();
    });

    document.getElementById('btn-prog-weapons-clear-all')?.addEventListener('click', () => {
      this.chartState.selectedWeapons.clear();
      const firstId = Object.keys(this.state.draftBalance.weapons)[0] || 'fireball';
      this.chartState.selectedWeapons.add(firstId);
      this.renderWeaponsProgression();
    });

    document.getElementById('btn-prog-monsters-select-all')?.addEventListener('click', () => {
      const isBosses = this.chartState.monsterCategory === 'bosses';
      if (isBosses) {
        Object.keys(this.state.draftBalance.bosses).forEach((id) => this.chartState.selectedBosses.add(id));
      } else {
        Object.keys(this.state.draftBalance.monsters).forEach((id) => this.chartState.selectedMonsters.add(id));
      }
      this.renderMonstersProgression();
    });

    document.getElementById('btn-prog-monsters-clear-all')?.addEventListener('click', () => {
      const isBosses = this.chartState.monsterCategory === 'bosses';
      if (isBosses) {
        this.chartState.selectedBosses.clear();
        const firstId = Object.keys(this.state.draftBalance.bosses)[0] || 'boss';
        this.chartState.selectedBosses.add(firstId);
      } else {
        this.chartState.selectedMonsters.clear();
        const firstId = Object.keys(this.state.draftBalance.monsters)[0] || 'coyote';
        this.chartState.selectedMonsters.add(firstId);
      }
      this.renderMonstersProgression();
    });

    const monsterCatButtons = document.querySelectorAll('#prog-monster-category-toggle .segmented-btn');
    monsterCatButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const cat = (e.currentTarget as HTMLElement).dataset.cat as 'monsters' | 'bosses' | undefined;
        if (!cat) return;
        this.chartState.monsterCategory = cat;
        monsterCatButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.renderMonstersProgression();
      });
    });

    const monsterMetricButtons = document.querySelectorAll(
      '#prog-monster-metric-toggle .segmented-btn'
    );
    monsterMetricButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const metric = (e.currentTarget as HTMLElement).dataset.metric as
          | 'hp'
          | 'damage'
          | 'speed'
          | undefined;
        if (!metric) return;
        this.chartState.monsterMetric = metric;
        monsterMetricButtons.forEach((b) => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.renderMonstersProgression();
      });
    });

    const timeSlider = document.getElementById('prog-monsters-time-slider') as HTMLInputElement | null;
    if (timeSlider) {
      timeSlider.addEventListener('input', () => {
        const val = parseInt(timeSlider.value, 10);
        this.chartState.monsterTimeLimit = val;
        this.updateTimeSliderUI(val);
        this.renderMonstersProgression();
      });
    }

    const presetBtns = document.querySelectorAll<HTMLButtonElement>('.prog-time-preset');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const timeVal = parseInt(btn.getAttribute('data-time') || '120', 10);
        this.chartState.monsterTimeLimit = timeVal;
        if (timeSlider) timeSlider.value = String(timeVal);
        this.updateTimeSliderUI(timeVal);
        this.renderMonstersProgression();
      });
    });
  }

  private updateTimeSliderUI(timeVal: number): void {
    const label = document.getElementById('prog-monsters-time-val');
    if (label) label.textContent = `${timeVal} мин`;

    const countEl = document.getElementById('prog-monsters-points-count');
    if (countEl) {
      const points = Math.floor(timeVal / 5) + 1;
      countEl.textContent = `(${points} точек)`;
    }

    const presetBtns = document.querySelectorAll<HTMLButtonElement>('.prog-time-preset');
    presetBtns.forEach((btn) => {
      const t = parseInt(btn.getAttribute('data-time') || '0', 10);
      btn.classList.toggle('active', t === timeVal);
    });
  }

  public render(): void {
    if (this.chartState.view === 'weapons') {
      this.renderWeaponsProgression();
    } else if (this.chartState.view === 'monsters') {
      this.renderMonstersProgression();
    } else if (this.chartState.view === 'heroes') {
      this.renderHeroesProgression();
    }
  }

  public renderWeaponsProgression(): void {
    this.renderWeaponsProgressionChips();

    const chartContainer = document.getElementById('chart-weapons-progression');
    if (!chartContainer) return;

    const tierKey = this.chartState.weaponTier || 'tier1';
    const isAll = tierKey === 'all';
    const tierMult = tierKey === 'tier1' ? 3.0 : tierKey === 'tier2' ? 2.0 : 1.0;

    let xLabels: string[];
    let stepCount: number;

    if (isAll) {
      stepCount = 36;
      xLabels = Array.from({ length: 36 }, (_, i) => {
        const tierNum = i < 12 ? 3 : i < 24 ? 2 : 1;
        const lvl = (i % 12) + 1;
        return `T${tierNum}-L${lvl}`;
      });
    } else {
      stepCount = 12;
      const tierPrefix = tierKey === 'tier1' ? 'T1' : tierKey === 'tier2' ? 'T2' : 'T3';
      xLabels = Array.from({ length: 12 }, (_, i) => `${tierPrefix}-L${i + 1}`);
    }

    const isDps = this.chartState.weaponMetric === 'dps';

    const gradeKey = this.chartState.weaponGrade || 'common';
    const gradeConfigs: Record<string, { damageMult: number; cdRed: number }> = {
      common: { damageMult: 1.0, cdRed: 0.0 },
      uncommon: { damageMult: 1.5, cdRed: 0.04 },
      rare: { damageMult: 2.2, cdRed: 0.08 },
      legendary: { damageMult: 3.5, cdRed: 0.15 }
    };
    const gradeCfg = gradeConfigs[gradeKey] || gradeConfigs.common;

    const title = document.getElementById('prog-weapons-chart-title');
    if (title) {
      const metricStr = isDps ? 'боевого DPS' : 'урона';
      const tierDesc = isAll
        ? 'Сквозная прогрессия до Тир 1 (36 уровней: L1-T3 → L12-T1)'
        : tierKey === 'tier1'
        ? 'Тир 1 (Абсолютный, множитель 3.0x, L1-L12)'
        : tierKey === 'tier2'
        ? 'Тир 2 (Пробужденный, множитель 2.0x, L1-L12)'
        : 'Тир 3 (Базовый, множитель 1.0x, L1-L12)';
      title.textContent = `Прогрессия ${metricStr} оружия: ${tierDesc}`;
    }

    const seriesList: ChartSeries[] = [];
    for (const wid of this.chartState.selectedWeapons) {
      const w = this.state.draftBalance.weapons[wid];
      if (!w) continue;

      const values = Array.from({ length: stepCount }, (_, i) => {
        let currentTierMult: number;
        let bonusSteps: number;
        if (isAll) {
          currentTierMult = i < 12 ? 1.0 : i < 24 ? 2.0 : 3.0;
          bonusSteps = i % 12;
        } else {
          currentTierMult = tierMult;
          bonusSteps = i;
        }

        const dmg = Math.round(w.damage + bonusSteps * w.damagePerLevel * currentTierMult * gradeCfg.damageMult);
        if (isDps) {
          const baseCd = w.cooldown > 0 ? w.cooldown : 1 / 60;
          const cd = Math.max(0.08, baseCd * Math.pow(1 - gradeCfg.cdRed, bonusSteps));
          const count = w.count && w.count > 0 ? w.count : 1;
          return Number(((dmg * count) / cd).toFixed(1));
        }
        return dmg;
      });

      seriesList.push({
        id: wid,
        name: w.name,
        color: getWeaponColor(wid),
        values,
        unit: isDps ? 'DPS' : 'урон'
      });
    }

    SvgChartRenderer.renderLineChart(chartContainer, seriesList, {
      xLabels,
      fillArea: false,
      minWidthPerPoint: isAll ? 28 : 38
    });
  }

  private renderWeaponsProgressionChips(): void {
    const container = document.getElementById('prog-weapons-chips');
    if (!container) return;
    container.innerHTML = '';

    const weapons = Object.values(this.state.draftBalance.weapons);
    for (const w of weapons) {
      const isSelected = this.chartState.selectedWeapons.has(w.id);
      const color = getWeaponColor(w.id);

      const chip = document.createElement('div');
      chip.className = `filter-chip ${isSelected ? 'active' : ''}`;
      chip.dataset.id = w.id;
      chip.innerHTML = `
        <span class="chip-dot" style="background:${color};"></span>
        <span>${w.name}</span>
      `;

      chip.addEventListener('click', () => {
        if (this.chartState.selectedWeapons.has(w.id)) {
          if (this.chartState.selectedWeapons.size > 1) {
            this.chartState.selectedWeapons.delete(w.id);
          }
        } else {
          this.chartState.selectedWeapons.add(w.id);
        }
        this.renderWeaponsProgression();
      });

      container.appendChild(chip);
    }
  }

  public renderMonstersProgression(): void {
    this.renderMonstersProgressionChips();

    const chartContainer = document.getElementById('chart-monsters-progression');
    if (!chartContainer) return;

    const maxMinutes = this.chartState.monsterTimeLimit || 120;
    const pointCount = Math.floor(maxMinutes / 5) + 1;
    const minutes = Array.from({ length: pointCount }, (_, i) => i * 5);
    const xLabels = minutes.map((m) => `${m} мин`);

    const isBosses = this.chartState.monsterCategory === 'bosses';
    const entities = isBosses
      ? Object.values(this.state.draftBalance.bosses)
      : Object.values(this.state.draftBalance.monsters);
    const selectedSet = isBosses ? this.chartState.selectedBosses : this.chartState.selectedMonsters;
    const metric = this.chartState.monsterMetric;

    // Dynamically update category button labels with active counts
    const monsterCount = Object.keys(this.state.draftBalance.monsters).length;
    const bossCount = Object.keys(this.state.draftBalance.bosses).length;
    const btnMonsters = document.querySelector('#prog-monster-category-toggle [data-cat="monsters"]');
    const btnBosses = document.querySelector('#prog-monster-category-toggle [data-cat="bosses"]');
    if (btnMonsters) btnMonsters.textContent = `Рядовые монстры (${monsterCount})`;
    if (btnBosses) btnBosses.textContent = `Эпические боссы (${bossCount})`;

    // Dynamically update card title and subtitle
    const title = document.getElementById('prog-monsters-chart-title');
    if (title) {
      const catLabel = isBosses ? 'боссов' : 'монстров';
      const metricLabel = metric === 'hp' ? 'здоровья (HP)' : metric === 'damage' ? 'контактного урона' : 'скорости бега';
      title.textContent = `Масштабирование ${metricLabel} ${catLabel} во времени (0-${maxMinutes} минут, интервал 5 мин)`;
    }

    const subtitle = document.querySelector('#prog-view-monsters .chart-card-subtitle');
    if (subtitle) {
      subtitle.textContent = isBosses
        ? `Формула боссов (EnemyManager): 5-минутные тиры, экспоненциальный штурм на 15+ мин (до ${maxMinutes} мин)`
        : `Формула монстров (EnemyManager): базовый рост + пост-15м экспоненциальный штурм (интервал 5 мин, до ${maxMinutes} мин)`;
    }

    const seriesList: ChartSeries[] = [];
    for (const ent of entities) {
      if (!selectedSet.has(ent.id)) continue;

      const values = minutes.map((m) => {
        if (isBosses) {
          // 5-minute tiered bosses scaling from EnemyManager.ts
          const tier = Math.max(1, Math.floor(m / 5));
          const tierPost = Math.max(0, tier - 3);

          if (metric === 'hp') {
            if (ent.id === 'hydra' && tier <= 2) {
              return Math.round(ent.hp);
            }
            let calculatedHp: number;
            if (tier < 3) {
              calculatedHp = ent.hp * (1 + (tier - 1) * 2.2);
            } else {
              calculatedHp = 350000 * Math.pow(2.2, tierPost) * (1 + tierPost * 0.35);
            }
            return Math.round(calculatedHp);
          } else if (metric === 'damage') {
            const baseTierDmg = ent.damage * (1 + ((tier - 1) * 0.6 + Math.pow(tier - 1, 1.3) * 0.2) * 1.5);
            const postDmgMult = 1 + Math.pow(tierPost / 2.0, 1.8) * 0.5;
            return Math.round(baseTierDmg * postDmgMult);
          } else {
            const tierSpd = Math.min(3.8, ent.speed + (tier - 1) * 0.18 * 1.5 + tierPost * 0.1);
            return Number(tierSpd.toFixed(2));
          }
        } else {
          // Continuous progressive scaling from EnemyManager & DifficultyDirector
          const hpBase = 1 + (m * 0.35 + Math.pow(m / 4.0, 1.8) * 0.45) * 1.5;
          const mPost = Math.max(0, m - 15);
          const hpPostSurge = Math.pow(mPost / 3.5, 2.3) * 3.5 * (1 + mPost * 0.15);
          const hpMult = hpBase + hpPostSurge;

          const dmgBase = 1 + (m * 0.15 + Math.pow(m / 6.0, 1.5) * 0.30) * 1.5;
          const dmgPostSurge = Math.pow(mPost / 4.0, 2.0) * 1.8 * (1 + mPost * 0.10);
          const dmgMult = dmgBase + dmgPostSurge;

          const spdMult = Math.min(1.65, 1 + m * 0.012 * 1.5 + mPost * 0.01);

          if (metric === 'hp') {
            return Math.round(ent.hp * hpMult);
          } else if (metric === 'damage') {
            return Math.round(ent.damage * dmgMult);
          } else {
            return Number((ent.speed * spdMult).toFixed(2));
          }
        }
      });

      const unit = metric === 'hp' ? 'HP' : metric === 'damage' ? 'урон' : 'м/с';
      seriesList.push({
        id: ent.id,
        name: ent.name,
        color: getMonsterColor(ent.id),
        values,
        unit
      });
    }

    SvgChartRenderer.renderLineChart(chartContainer, seriesList, {
      xLabels,
      fillArea: false,
      minWidthPerPoint: 42
    });
  }

  private renderMonstersProgressionChips(): void {
    const container = document.getElementById('prog-monsters-chips');
    if (!container) return;
    container.innerHTML = '';

    const isBosses = this.chartState.monsterCategory === 'bosses';
    const entities = isBosses
      ? Object.values(this.state.draftBalance.bosses)
      : Object.values(this.state.draftBalance.monsters);
    const selectedSet = isBosses ? this.chartState.selectedBosses : this.chartState.selectedMonsters;

    for (const ent of entities) {
      const isSelected = selectedSet.has(ent.id);
      const color = getMonsterColor(ent.id);

      const chip = document.createElement('div');
      chip.className = `filter-chip ${isSelected ? 'active' : ''}`;
      chip.dataset.id = ent.id;
      chip.innerHTML = `
        <span class="chip-dot" style="background:${color};"></span>
        <span>${ent.name}</span>
      `;

      chip.addEventListener('click', () => {
        if (selectedSet.has(ent.id)) {
          if (selectedSet.size > 1) {
            selectedSet.delete(ent.id);
          }
        } else {
          selectedSet.add(ent.id);
        }
        this.renderMonstersProgression();
      });

      container.appendChild(chip);
    }
  }

  public renderHeroesProgression(): void {
    const chartContainer = document.getElementById('chart-heroes-progression');
    if (!chartContainer) return;

    const heroes = Object.values(this.state.draftBalance.heroes);
    const title = document.getElementById('prog-heroes-chart-title');
    if (title) {
      title.innerText = `Сравнительный профиль ${heroes.length} героев`;
    }
    const xLabels = heroes.map((h) => h.name);

    const seriesList: ChartSeries[] = [
      {
        id: 'hero-hp',
        name: 'Базовое здоровье (HP)',
        color: '#ef4444',
        values: heroes.map((h) => h.maxHp),
        unit: 'HP'
      },
      {
        id: 'hero-speed',
        name: 'Скорость перемещения (×10)',
        color: '#10b981',
        values: heroes.map((h) => Number((h.baseSpeed * 10).toFixed(1))),
        unit: 'x0.1 м/с'
      },
      {
        id: 'hero-dmgmult',
        name: 'Множитель урона (%)',
        color: '#8b5cf6',
        values: heroes.map((h) => Math.round(h.damageMultiplier * 100)),
        unit: '%'
      }
    ];

    SvgChartRenderer.renderLineChart(chartContainer, seriesList, {
      xLabels,
      fillArea: true
    });
  }
}
