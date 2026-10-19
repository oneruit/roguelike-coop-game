import { BalanceState } from '../state/balanceState';
import { SimulationState } from '../types';
import { DEFAULT_BALANCE } from '../../../game/src/balance/defaultBalance';
import { SvgChartRenderer, ChartSeries } from '../chartUtils';
import { getEntityTexture, getWeaponColor } from '../constants';
import { showToast } from '../ui/toast';

export class SimulationView {
  private state: BalanceState;
  public sim: SimulationState = {
    slots: [
      { enabled: true, weaponId: 'fireball', level: 10, tier: 1 },
      { enabled: true, weaponId: 'bow', level: 8, tier: 1 },
      { enabled: true, weaponId: 'lightning_strike', level: 6, tier: 1 },
      { enabled: false, weaponId: 'whirlwind_slash', level: 5, tier: 2 },
      { enabled: false, weaponId: 'fire_ring', level: 5, tier: 3 }
    ],
    hero: 'valkyrie',
    amplifierStacks: 0,
    mightElixirStacks: 0,
    watchStacks: 0,
    injectorStacks: 0,
    critVisorStacks: 0,
    critDamageStacks: 0,
    critChanceStacks: 0,
    bioInjectorStacks: 0,
    cleaveTargets: 3,
    damageRuneActive: false,
    bossTarget: false
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

    bindSyncInput('sim-slider-amplifier', 'sim-num-amplifier', (val) => {
      this.sim.amplifierStacks = val;
      const badge = document.getElementById('sim-val-amplifier');
      if (badge) badge.innerText = `${val} стаков (+${val * 2}%)`;
    });

    bindSyncInput('sim-slider-mightelixir', 'sim-num-mightelixir', (val) => {
      this.sim.mightElixirStacks = val;
      const badge = document.getElementById('sim-val-mightelixir');
      if (badge) badge.innerText = `${val} стаков (+${val * 1}%)`;
    });

    bindSyncInput('sim-slider-watch', 'sim-num-watch', (val) => {
      this.sim.watchStacks = val;
      const reduction = Math.min(0.50, 0.50 * (Math.log(val + 1) / Math.log(201)));
      const badge = document.getElementById('sim-val-watch');
      if (badge) badge.innerText = `${val} ур. (-${Math.round(reduction * 100)}%)`;
    });

    bindSyncInput('sim-slider-injector', 'sim-num-injector', (val) => {
      this.sim.injectorStacks = val;
      const badge = document.getElementById('sim-val-injector');
      if (badge) badge.innerText = `${val} стаков`;
    });

    bindSyncInput('sim-slider-critvisor', 'sim-num-critvisor', (val) => {
      this.sim.critVisorStacks = val;
      const badge = document.getElementById('sim-val-critvisor');
      const pct = Math.round((0.05 + val * 0.03) * 100);
      if (badge) badge.innerText = `${val} стаков (${pct}%)`;
    });

    bindSyncInput('sim-slider-critdamage', 'sim-num-critdamage', (val) => {
      this.sim.critDamageStacks = val;
      const badge = document.getElementById('sim-val-critdamage');
      if (badge) badge.innerText = `${val} стаков (+${val}%)`;
    });

    bindSyncInput('sim-slider-critchance', 'sim-num-critchance', (val) => {
      this.sim.critChanceStacks = val;
      const badge = document.getElementById('sim-val-critchance');
      if (badge) badge.innerText = `${val} стаков (+${(val * 0.05).toFixed(2)}%)`;
    });

    bindSyncInput('sim-slider-bioinjector', 'sim-num-bioinjector', (val) => {
      this.sim.bioInjectorStacks = val;
      const heroCfg = this.state.draftBalance.heroes[this.sim.hero] || { maxHp: 100 };
      const regen = (val * (2.5 + heroCfg.maxHp * 0.005)).toFixed(1);
      const badge = document.getElementById('sim-val-bioinjector');
      if (badge) badge.innerText = `${val} стаков (+${regen} HP/с)`;
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

    const bossCheck = document.getElementById('sim-check-bosstarget') as HTMLInputElement;
    bossCheck?.addEventListener('change', (e) => {
      this.sim.bossTarget = (e.target as HTMLInputElement).checked;
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
        } else if (target.classList.contains('sim-slot-tier')) {
          const idx = parseInt((target as HTMLSelectElement).dataset.slot || '0');
          if (this.sim.slots[idx]) {
            this.sim.slots[idx].tier = parseInt((target as HTMLSelectElement).value) || 3;
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
            const val = Math.max(1, Math.min(12, parseInt((target as HTMLInputElement).value) || 1));
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
        { enabled: true, weaponId: 'bow', level: 12, tier: 1 },
        { enabled: true, weaponId: 'chakram', level: 12, tier: 1 },
        { enabled: true, weaponId: 'ice_spike', level: 10, tier: 2 },
        { enabled: false, weaponId: 'astral_staff', level: 8, tier: 3 },
        { enabled: false, weaponId: 'fireball', level: 10, tier: 2 }
      ];
      this.sim.amplifierStacks = 15;
      this.sim.mightElixirStacks = 2;
      this.sim.watchStacks = 80;
      this.sim.injectorStacks = 0;
      this.sim.critVisorStacks = 6;
      this.sim.critDamageStacks = 40;
      this.sim.critChanceStacks = 100;
      this.sim.bioInjectorStacks = 2;
      this.sim.cleaveTargets = 2;
      this.sim.damageRuneActive = false;
      this.sim.bossTarget = false;
      showToast('Пресет «Снайпер дальнего боя» (Тир 1) активирован.', 'info');
    } else if (preset === 'melee') {
      this.sim.hero = 'ronin';
      this.sim.slots = [
        { enabled: true, weaponId: 'katana_slash', level: 12, tier: 1 },
        { enabled: true, weaponId: 'whirlwind_slash', level: 12, tier: 1 },
        { enabled: true, weaponId: 'greatsword', level: 12, tier: 1 },
        { enabled: true, weaponId: 'reaper_scythe', level: 10, tier: 2 },
        { enabled: false, weaponId: 'flail', level: 8, tier: 3 }
      ];
      this.sim.amplifierStacks = 20;
      this.sim.mightElixirStacks = 3;
      this.sim.watchStacks = 100;
      this.sim.injectorStacks = 1;
      this.sim.critVisorStacks = 4;
      this.sim.critDamageStacks = 50;
      this.sim.critChanceStacks = 80;
      this.sim.bioInjectorStacks = 4;
      this.sim.cleaveTargets = 6;
      this.sim.damageRuneActive = true;
      this.sim.bossTarget = false;
      showToast('Пресет «Вихревой милишник» (Тир 1) активирован.', 'info');
    } else if (preset === 'elemental') {
      this.sim.hero = 'sorceress';
      this.sim.slots = [
        { enabled: true, weaponId: 'fireball', level: 12, tier: 1 },
        { enabled: true, weaponId: 'lightning_strike', level: 12, tier: 1 },
        { enabled: true, weaponId: 'fire_ring', level: 12, tier: 1 },
        { enabled: true, weaponId: 'ice_spike', level: 12, tier: 1 },
        { enabled: false, weaponId: 'astral_staff', level: 10, tier: 2 }
      ];
      this.sim.amplifierStacks = 25;
      this.sim.mightElixirStacks = 4;
      this.sim.watchStacks = 120;
      this.sim.injectorStacks = 3;
      this.sim.critVisorStacks = 3;
      this.sim.critDamageStacks = 35;
      this.sim.critChanceStacks = 60;
      this.sim.bioInjectorStacks = 3;
      this.sim.cleaveTargets = 5;
      this.sim.damageRuneActive = true;
      this.sim.bossTarget = false;
      showToast('Пресет «Стихийный маг» (Тир 1) активирован.', 'info');
    } else if (preset === 'crit') {
      this.sim.hero = 'archer';
      this.sim.slots = [
        { enabled: true, weaponId: 'bow', level: 12, tier: 1 },
        { enabled: true, weaponId: 'chakram', level: 12, tier: 1 },
        { enabled: true, weaponId: 'katana_slash', level: 12, tier: 1 },
        { enabled: true, weaponId: 'kukri', level: 12, tier: 1 },
        { enabled: false, weaponId: 'fireball', level: 10, tier: 2 }
      ];
      this.sim.amplifierStacks = 15;
      this.sim.mightElixirStacks = 2;
      this.sim.watchStacks = 70;
      this.sim.injectorStacks = 0;
      this.sim.critVisorStacks = 8;
      this.sim.critDamageStacks = 80;
      this.sim.critChanceStacks = 200;
      this.sim.bioInjectorStacks = 1;
      this.sim.cleaveTargets = 3;
      this.sim.damageRuneActive = false;
      this.sim.bossTarget = false;
      showToast('Пресет «Крит-мастер» (Тир 1) активирован.', 'info');
    } else if (preset === 'rocket') {
      this.sim.hero = 'rocket';
      this.sim.slots = [
        { enabled: true, weaponId: 'assault_rifle', level: 12, tier: 1 },
        { enabled: true, weaponId: 'bow', level: 12, tier: 1 },
        { enabled: true, weaponId: 'kukri', level: 12, tier: 1 },
        { enabled: true, weaponId: 'lightning_strike', level: 10, tier: 2 },
        { enabled: true, weaponId: 'fireball', level: 8, tier: 3 }
      ];
      this.sim.amplifierStacks = 20;
      this.sim.mightElixirStacks = 3;
      this.sim.watchStacks = 90;
      this.sim.injectorStacks = 2;
      this.sim.critVisorStacks = 4;
      this.sim.critDamageStacks = 45;
      this.sim.critChanceStacks = 100;
      this.sim.bioInjectorStacks = 2;
      this.sim.cleaveTargets = 4;
      this.sim.damageRuneActive = true;
      this.sim.bossTarget = false;
      showToast('Пресет «Штурмовик (Ракета)» (Тир 1) активирован.', 'info');
    } else if (preset === 'invoker') {
      this.sim.hero = 'invoker';
      this.sim.slots = [
        { enabled: true, weaponId: 'invoker_invoke', level: 12, tier: 1 },
        { enabled: true, weaponId: 'invoker_chaos_meteor', level: 12, tier: 1 },
        { enabled: true, weaponId: 'invoker_sun_strike', level: 12, tier: 1 },
        { enabled: true, weaponId: 'invoker_emp', level: 12, tier: 1 },
        { enabled: true, weaponId: 'invoker_ice_wall', level: 10, tier: 2 }
      ];
      this.sim.amplifierStacks = 25;
      this.sim.mightElixirStacks = 5;
      this.sim.watchStacks = 140;
      this.sim.injectorStacks = 2;
      this.sim.critVisorStacks = 4;
      this.sim.critDamageStacks = 60;
      this.sim.critChanceStacks = 120;
      this.sim.bioInjectorStacks = 3;
      this.sim.cleaveTargets = 5;
      this.sim.damageRuneActive = true;
      this.sim.bossTarget = false;
      showToast('Пресет «Архимаг (Инвокер)» (Тир 1) активирован.', 'info');
    } else if (preset === 'starter') {
      this.sim.hero = 'valkyrie';
      this.sim.slots = [
        { enabled: true, weaponId: 'bow', level: 1, tier: 3 },
        { enabled: true, weaponId: 'fireball', level: 1, tier: 3 },
        { enabled: false, weaponId: 'kukri', level: 1, tier: 3 },
        { enabled: false, weaponId: 'flail', level: 1, tier: 3 },
        { enabled: false, weaponId: 'fire_ring', level: 1, tier: 3 }
      ];
      this.sim.amplifierStacks = 0;
      this.sim.mightElixirStacks = 0;
      this.sim.watchStacks = 0;
      this.sim.injectorStacks = 0;
      this.sim.critVisorStacks = 0;
      this.sim.critDamageStacks = 0;
      this.sim.critChanceStacks = 0;
      this.sim.bioInjectorStacks = 0;
      this.sim.cleaveTargets = 3;
      this.sim.damageRuneActive = false;
      this.sim.bossTarget = false;
      showToast('Пресет «Стартовый набор» (Тир 3) активирован.', 'info');
    } else if (preset === 'reset') {
      this.sim.hero = 'valkyrie';
      this.sim.slots = [
        { enabled: true, weaponId: 'fireball', level: 1, tier: 3 },
        { enabled: false, weaponId: 'bow', level: 1, tier: 3 },
        { enabled: false, weaponId: 'kukri', level: 1, tier: 3 },
        { enabled: false, weaponId: 'flail', level: 1, tier: 3 },
        { enabled: false, weaponId: 'fire_ring', level: 1, tier: 3 }
      ];
      this.sim.amplifierStacks = 0;
      this.sim.mightElixirStacks = 0;
      this.sim.watchStacks = 0;
      this.sim.injectorStacks = 0;
      this.sim.critVisorStacks = 0;
      this.sim.critDamageStacks = 0;
      this.sim.critChanceStacks = 0;
      this.sim.bioInjectorStacks = 0;
      this.sim.cleaveTargets = 3;
      this.sim.damageRuneActive = false;
      this.sim.bossTarget = false;
      showToast('Параметры симулятора сброшены.', 'info');
    }

    this.updatePassiveUIValues();
    this.render();
  }

  public renderHeroDropdown(): void {
    const heroSelect = document.getElementById('sim-hero-select') as HTMLSelectElement;
    if (!heroSelect) return;
    const heroes = Object.values(this.state.draftBalance.heroes);
    if (heroes.length > 0 && !heroes.some((h) => h.id === this.sim.hero)) {
      this.sim.hero = heroes[0].id;
    }
    const currentVal = this.sim.hero;
    heroSelect.innerHTML = heroes
      .map(
        (h) =>
          `<option value="${h.id}" ${h.id === currentVal ? 'selected' : ''}>${h.name} (${h.damageMultiplier.toFixed(2)}x урона)</option>`
      )
      .join('');
  }

  public updatePassiveUIValues(): void {
    this.renderHeroDropdown();
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

    const ampVal = this.sim.amplifierStacks ?? 0;
    setInputPair(
      'sim-slider-amplifier',
      'sim-num-amplifier',
      'sim-val-amplifier',
      ampVal,
      `${ampVal} стаков (+${ampVal * 2}%)`
    );
    setInputPair(
      'sim-slider-mightelixir',
      'sim-num-mightelixir',
      'sim-val-mightelixir',
      this.sim.mightElixirStacks ?? 0,
      `${this.sim.mightElixirStacks ?? 0} стаков (+${(this.sim.mightElixirStacks ?? 0) * 1}%)`
    );
    const watchReduction = Math.min(0.50, 0.50 * (Math.log((this.sim.watchStacks || 0) + 1) / Math.log(201)));
    setInputPair(
      'sim-slider-watch',
      'sim-num-watch',
      'sim-val-watch',
      this.sim.watchStacks || 0,
      `${this.sim.watchStacks || 0} ур. (-${Math.round(watchReduction * 100)}%)`
    );
    setInputPair(
      'sim-slider-injector',
      'sim-num-injector',
      'sim-val-injector',
      this.sim.injectorStacks || 0,
      `${this.sim.injectorStacks || 0} стаков`
    );
    const baseCritChance = this.state.draftBalance.global.baseCritChance ?? 0.05;
    const critVisorChance = (this.sim.critVisorStacks || 0) * 0.03;
    const critDropChance = (this.sim.critChanceStacks || 0) * 0.0005;
    const totalCritChance = Math.min(1.0, baseCritChance + critVisorChance + critDropChance);
    setInputPair(
      'sim-slider-critvisor',
      'sim-num-critvisor',
      'sim-val-critvisor',
      this.sim.critVisorStacks || 0,
      `${this.sim.critVisorStacks || 0} стаков (${Math.round(totalCritChance * 100)}%)`
    );
    setInputPair(
      'sim-slider-critdamage',
      'sim-num-critdamage',
      'sim-val-critdamage',
      this.sim.critDamageStacks || 0,
      `${this.sim.critDamageStacks || 0} стаков (+${this.sim.critDamageStacks || 0}%)`
    );
    setInputPair(
      'sim-slider-critchance',
      'sim-num-critchance',
      'sim-val-critchance',
      this.sim.critChanceStacks || 0,
      `${this.sim.critChanceStacks || 0} стаков (+${((this.sim.critChanceStacks || 0) * 0.05).toFixed(2)}%)`
    );
    const bioVal = this.sim.bioInjectorStacks || 0;
    const heroCfg = this.state.draftBalance.heroes[this.sim.hero] || { maxHp: 100 };
    const bioRegen = (bioVal * (2.5 + heroCfg.maxHp * 0.005)).toFixed(1);
    setInputPair(
      'sim-slider-bioinjector',
      'sim-num-bioinjector',
      'sim-val-bioinjector',
      bioVal,
      `${bioVal} стаков (+${bioRegen} HP/с)`
    );
    setInputPair(
      'sim-slider-targets',
      'sim-num-targets',
      'sim-val-targets',
      this.sim.cleaveTargets,
      `${this.sim.cleaveTargets} целей`
    );

    const runeCheck = document.getElementById('sim-check-damagerune') as HTMLInputElement;
    if (runeCheck) runeCheck.checked = Boolean(this.sim.damageRuneActive);

    const bossCheck = document.getElementById('sim-check-bosstarget') as HTMLInputElement;
    if (bossCheck) bossCheck.checked = Boolean(this.sim.bossTarget);
  }

  public calculateSlotStats(slot: { weaponId: string; level: number; tier?: number }): {
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
      DEFAULT_BALANCE.heroes[this.sim.hero] || { damageMultiplier: 1.0, startingWeapon: '' };
    const isStarting = slot.weaponId === heroCfg.startingWeapon || (heroCfg.id === 'invoker' && slot.weaponId.startsWith('invoker_'));
    const heroMult = isStarting ? (heroCfg.damageMultiplier || 1.0) : 1.0;
    const ampStacks = this.sim.amplifierStacks ?? 0;
    const elixirStacks = this.sim.mightElixirStacks ?? 0;
    const damagePassiveMult = 1 + ampStacks * 0.02 + elixirStacks * 0.01;
    const runeMult = this.sim.damageRuneActive ? 1.3 : 1.0;

    const baseCritChance = this.state.draftBalance.global.baseCritChance ?? 0.05;
    const baseCritMult = this.state.draftBalance.global.baseCritDamageMult ?? 2.0;
    const critChancePassive = (this.sim.critChanceStacks || 0) * 0.0005;
    const critDamagePassive = (this.sim.critDamageStacks || 0) * 0.01;
    const effectiveCritChance = Math.min(1.0, baseCritChance + this.sim.critVisorStacks * 0.03 + critChancePassive);
    const effectiveCritMult = baseCritMult + critDamagePassive;
    const expectedCritMult = 1 + effectiveCritChance * (effectiveCritMult - 1);

    const globalDmgMult = heroMult * damagePassiveMult * runeMult * expectedCritMult;

    // Weapon Tier scaling: Tier 3 = x1.0, Tier 2 = x2.0, Tier 1 = x3.0
    const tier = slot.tier || 3;
    const tierMultiplier = tier === 1 ? 3.0 : tier === 2 ? 2.0 : 1.0;
    const baseLvlDmg = w.damage + (slot.level - 1) * w.damagePerLevel * tierMultiplier;
    const hitDamage = baseLvlDmg * globalDmgMult;

    // Pocket Watch: 50% max CDR at level 200 via logarithmic curve
    const watchReduction = Math.max(0.50, 1 - Math.min(0.50, 0.50 * (Math.log((this.sim.watchStacks || 0) + 1) / Math.log(201))));
    const injectorReduction = Math.pow(0.90, this.sim.injectorStacks);
    const cdMult = Math.max(0.08, watchReduction * injectorReduction);

    const baseCd = w.cooldown > 0 ? w.cooldown : 1 / 60;
    const effectiveCooldown = Math.max(0.04, baseCd * cdMult);
    const count = w.count && w.count > 0 ? w.count : 1;

    // Late-game boss resistance: ~55% average damage resistance against late-game bosses
    const targetDamageMult = this.sim.bossTarget ? 0.45 : 1.0;
    const singleTargetDps = ((hitDamage * count) / effectiveCooldown) * targetDamageMult;

    let cleaveFactor = 1;
    if (w.explosionRadius || w.splashRadius) {
      const radius = w.explosionRadius || w.splashRadius || 2.5;
      cleaveFactor = 1 + Math.min(this.sim.cleaveTargets - 1, Math.round(radius * 1.2));
    } else if (w.pierce) {
      cleaveFactor = Math.min(this.sim.cleaveTargets, w.pierce + 1);
    } else if (
      w.id === 'fire_ring' ||
      w.id === 'reaper_scythe' ||
      w.id === 'whirlwind_slash' ||
      w.id === 'greatsword' ||
      w.id === 'flail' ||
      w.id === 'katana_slash' ||
      w.id.startsWith('invoker_')
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
      weaponColor: getWeaponColor(w.id)
    };
  }

  public render(): void {
    this.renderHeroDropdown();
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
    const critChancePassive = (this.sim.critChanceStacks || 0) * 0.0005;
    const critDamagePassive = (this.sim.critDamageStacks || 0) * 0.01;
    const effectiveCritChance = Math.min(1.0, baseCritChance + this.sim.critVisorStacks * 0.03 + critChancePassive);
    const effectiveCritMult = baseCritMult + critDamagePassive;
    const expectedCritMult = 1 + effectiveCritChance * (effectiveCritMult - 1);

    if (kpiCrit) {
      kpiCrit.innerText = `${Math.round(effectiveCritChance * 100)}% / ${effectiveCritMult.toFixed(2)}x`;
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
        const tier = slot.tier || 3;
        const tierLabel = tier === 1 ? '[T1]' : tier === 2 ? '[T2]' : '[T3]';
        seriesList.push({
          id: slot.weaponId,
          name: `${tierLabel} ${stats.weaponName}`,
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
      const levels = Array.from({ length: 12 }, (_, i) => i + 1);
      const xLabels = levels.map((l) => `L${l}`);

      const seriesList: ChartSeries[] = [];
      activeSlots.forEach((slot) => {
        const w = this.state.draftBalance.weapons[slot.weaponId];
        const color = getWeaponColor(slot.weaponId);
        const tier = slot.tier || 3;
        const tierLabel = tier === 1 ? '[T1]' : tier === 2 ? '[T2]' : '[T3]';
        const values = levels.map((lvl) => {
          const stats = this.calculateSlotStats({ weaponId: slot.weaponId, level: lvl, tier });
          return Math.round(stats.totalDps);
        });
        seriesList.push({
          id: slot.weaponId,
          name: `${tierLabel} ${w?.name || slot.weaponId}`,
          color,
          values,
          unit: 'DPS'
        });
      });

      if (activeSlots.length > 0) {
        const totalBuildValues = levels.map((lvl) => {
          let sum = 0;
          activeSlots.forEach((slot) => {
            const stats = this.calculateSlotStats({ weaponId: slot.weaponId, level: lvl, tier: slot.tier });
            sum += stats.totalDps;
          });
          return Math.round(sum);
        });

        seriesList.push({
          id: 'total-build-level',
          name: 'Суммарный DPS билда (L1-L12)',
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
          <select class="form-input sim-slot-tier" data-slot="${idx}" ${slot.enabled ? '' : 'disabled'} style="font-weight:600; font-size:12px;">
            <option value="3" ${(slot.tier || 3) === 3 ? 'selected' : ''}>Тир 3 (1x)</option>
            <option value="2" ${(slot.tier || 3) === 2 ? 'selected' : ''}>Тир 2 (2x)</option>
            <option value="1" ${(slot.tier || 3) === 1 ? 'selected' : ''}>Тир 1 (3x)</option>
          </select>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:12px; font-weight:600; color:var(--text-muted); white-space:nowrap;">Ур.</span>
            <input type="range" class="stat-slider sim-slot-level-slider" data-slot="${idx}" min="1" max="12" step="1" value="${slot.level}" ${slot.enabled ? '' : 'disabled'}>
            <input type="number" class="stat-input sim-slot-level-input" data-slot="${idx}" min="1" max="12" step="1" value="${slot.level}" style="width:48px;" ${slot.enabled ? '' : 'disabled'}>
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
