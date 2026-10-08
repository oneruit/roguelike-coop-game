import { BalanceState } from '../state/balanceState';
import { ProgressionChartState } from '../types';
import { SvgChartRenderer, ChartSeries } from '../chartUtils';
import { WEAPON_COLORS, MONSTER_COLORS } from '../constants';

export class ProgressionView {
  private state: BalanceState;
  public chartState: ProgressionChartState = {
    view: 'weapons',
    weaponMetric: 'damage',
    selectedWeapons: new Set(['fireball', 'bow', 'greatsword', 'lightning_strike', 'katana_slash']),
    monsterCategory: 'monsters',
    monsterMetric: 'hp',
    selectedMonsters: new Set(['coyote', 'crawler', 'scorpion', 'brute', 'bison']),
    selectedBosses: new Set(['boss', 'hydra'])
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
              ? 'Прогрессия урона оружия от Уровня 1 до Уровня 20'
              : 'Прогрессия боевого DPS оружия от Уровня 1 до Уровня 20';
        }

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

    const levels = Array.from({ length: 20 }, (_, i) => i + 1);
    const xLabels = levels.map((lvl) => `L${lvl}`);
    const isDps = this.chartState.weaponMetric === 'dps';

    const seriesList: ChartSeries[] = [];
    for (const wid of this.chartState.selectedWeapons) {
      const w = this.state.draftBalance.weapons[wid];
      if (!w) continue;

      const values = levels.map((lvl) => {
        const dmg = w.damage + (lvl - 1) * w.damagePerLevel;
        if (isDps) {
          const cd = w.cooldown > 0 ? w.cooldown : 1 / 60;
          return Number((dmg / cd).toFixed(1));
        }
        return dmg;
      });

      seriesList.push({
        id: wid,
        name: w.name,
        color: WEAPON_COLORS[wid] || '#2563eb',
        values,
        unit: isDps ? 'DPS' : 'урон'
      });
    }

    SvgChartRenderer.renderLineChart(chartContainer, seriesList, {
      xLabels,
      fillArea: false
    });
  }

  private renderWeaponsProgressionChips(): void {
    const container = document.getElementById('prog-weapons-chips');
    if (!container) return;
    container.innerHTML = '';

    const weapons = Object.values(this.state.draftBalance.weapons);
    for (const w of weapons) {
      const isSelected = this.chartState.selectedWeapons.has(w.id);
      const color = WEAPON_COLORS[w.id] || '#2563eb';

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

    const minutes = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
    const xLabels = minutes.map((m) => `${m} мин`);

    const isBosses = this.chartState.monsterCategory === 'bosses';
    const entities = isBosses
      ? Object.values(this.state.draftBalance.bosses)
      : Object.values(this.state.draftBalance.monsters);
    const selectedSet = isBosses ? this.chartState.selectedBosses : this.chartState.selectedMonsters;
    const metric = this.chartState.monsterMetric;

    const seriesList: ChartSeries[] = [];
    for (const ent of entities) {
      if (!selectedSet.has(ent.id)) continue;

      const values = minutes.map((m) => {
        const hpMult = 1 + (m * 0.28 + Math.pow(m / 4.5, 1.7) * 0.4) * 1.5;
        const dmgMult = 1 + (m * 0.12 + Math.pow(m / 8, 1.4) * 0.25) * 1.5;
        const spdMult = Math.min(1.45, 1 + m * 0.012 * 1.5);

        if (metric === 'hp') {
          return Math.round(ent.hp * hpMult);
        } else if (metric === 'damage') {
          return Math.round(ent.damage * dmgMult);
        } else {
          return Number((ent.speed * spdMult).toFixed(2));
        }
      });

      const unit = metric === 'hp' ? 'HP' : metric === 'damage' ? 'урон' : 'м/с';
      seriesList.push({
        id: ent.id,
        name: ent.name,
        color: MONSTER_COLORS[ent.id] || '#64748b',
        values,
        unit
      });
    }

    SvgChartRenderer.renderLineChart(chartContainer, seriesList, {
      xLabels,
      fillArea: false
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
      const color = MONSTER_COLORS[ent.id] || '#64748b';

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
