import { CharacterType } from '../../shared/types/entities';
import { WeaponGrade, WEAPON_GRADES } from '../../combat/WeaponGrades';
import { BalanceManager } from '../../balance/BalanceManager';
import { createWeaponInstanceById } from '../../combat/WeaponFactory';
import { Player } from '../../entities/Player';
import {
  WeaponDraftChoice,
  WeaponUpgradeResult,
  LuckyPassiveChoice,
  LuckyPassiveType,
  LuckyTestBuildState
} from './LuckyTestTypes';
import { getWeaponIconUrl } from '../../ui/screens/LevelUp/LevelUpScreen';

export const LUCKY_TEST_HERO_POOL: { type: CharacterType; name: string }[] = [
  { type: 'ronin', name: 'Ронин' },
  { type: 'valkyrie', name: 'Валькирия' },
  { type: 'flail', name: 'Храмовник с цепом' },
  { type: 'sorceress', name: 'Чародейка' },
  { type: 'chakram', name: 'Мастер Чакры' },
  { type: 'archer', name: 'Охотница' },
  { type: 'rocket', name: 'Штурмовик' },
  { type: 'amazon', name: 'Амазонка' },
  { type: 'vampire', name: 'Кармилла' },
  { type: 'necromancer', name: 'Некромант' }
];

export const LUCKY_TEST_WEAPON_POOL: string[] = [
  'bow',
  'kukri',
  'katana_slash',
  'whirlwind_slash',
  'greatsword',
  'flail',
  'astral_staff',
  'chakram',
  'lightning_strike',
  'ice_spike',
  'fireball',
  'assault_rifle',
  'poison_puddle',
  'reaper_scythe',
  'fire_ring'
];

export class LuckyTestManager {
  private static instance: LuckyTestManager | null = null;

  public static getInstance(): LuckyTestManager {
    if (!LuckyTestManager.instance) {
      LuckyTestManager.instance = new LuckyTestManager();
    }
    return LuckyTestManager.instance;
  }

  public rollRandomHero(): { type: CharacterType; name: string } {
    const idx = Math.floor(Math.random() * LUCKY_TEST_HERO_POOL.length);
    return LUCKY_TEST_HERO_POOL[idx];
  }

  public generateWeaponDraft(currentWeaponIds: string[]): [WeaponDraftChoice, WeaponDraftChoice] {
    const available = LUCKY_TEST_WEAPON_POOL.filter(id => !currentWeaponIds.includes(id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);

    const pick1 = shuffled[0] || 'bow';
    const pick2 = shuffled[1] || 'katana_slash';

    return [this.getWeaponDraftChoice(pick1), this.getWeaponDraftChoice(pick2)];
  }

  public getWeaponDraftChoice(weaponId: string): WeaponDraftChoice {
    const cfg = BalanceManager.getWeaponConfig(weaponId);
    return {
      id: weaponId,
      name: cfg?.name || weaponId,
      icon: cfg?.icon || '⚔️',
      iconImage: getWeaponIconUrl(weaponId),
      description: `Базовый урон: ${cfg?.damage ?? 25}, перезарядка: ${cfg?.cooldown ?? 1.0}с`
    };
  }

  /**
   * Generates 12 random weapon upgrades distributed across the player's 4 weapons,
   * strictly enforcing maxLevel = 4 so no weapon can exceed level 4.
   */
  public generate12Upgrades(weaponIds: string[]): WeaponUpgradeResult[] {
    const results: WeaponUpgradeResult[] = [];
    const levels: Record<string, number> = {};
    for (const id of weaponIds) {
      levels[id] = 1;
    }

    const gradesPool: { grade: WeaponGrade; weight: number }[] = [
      { grade: 'common', weight: 40 },
      { grade: 'uncommon', weight: 35 },
      { grade: 'rare', weight: 18 },
      { grade: 'legendary', weight: 7 }
    ];

    for (let i = 0; i < 12; i++) {
      const candidates = weaponIds.filter(id => levels[id] < 4);
      if (candidates.length === 0) {
        break; // All weapons reached cap of 4
      }

      const chosenId = candidates[Math.floor(Math.random() * candidates.length)];
      levels[chosenId]++;

      // Roll grade
      const roll = Math.random() * 100;
      let cumulative = 0;
      let chosenGrade: WeaponGrade = 'common';
      for (const entry of gradesPool) {
        cumulative += entry.weight;
        if (roll <= cumulative) {
          chosenGrade = entry.grade;
          break;
        }
      }

      const gradeCfg = WEAPON_GRADES[chosenGrade];
      const weaponCfg = BalanceManager.getWeaponConfig(chosenId);

      results.push({
        weaponId: chosenId,
        weaponName: weaponCfg?.name || chosenId,
        newLevel: levels[chosenId],
        grade: chosenGrade,
        gradeName: gradeCfg.name,
        gradeColor: gradeCfg.color
      });
    }

    return results;
  }

  public generatePassiveChoices(count: number = 3): LuckyPassiveChoice[] {
    const passiveDefs: {
      type: LuckyPassiveType;
      title: string;
      icon: string;
      minVal: number;
      maxVal: number;
      unit: string;
      desc: (val: number) => string;
    }[] = [
      {
        type: 'damage',
        title: 'Ярость Берсерка',
        icon: '⚔️',
        minVal: 12,
        maxVal: 32,
        unit: '%',
        desc: val => `+${val}% к общему урону всех видов оружия`
      },
      {
        type: 'max_hp',
        title: 'Кольчуга Титана',
        icon: '🛡️',
        minVal: 250,
        maxVal: 650,
        unit: ' HP',
        desc: val => `+${val} к максимальному здоровью гладиатора`
      },
      {
        type: 'speed',
        title: 'Сапоги Ветрохода',
        icon: '🥾',
        minVal: 10,
        maxVal: 25,
        unit: '%',
        desc: val => `+${val}% к скорости тактического бега`
      },
      {
        type: 'crit_chance',
        title: 'Острый Взор Хищника',
        icon: '🎯',
        minVal: 6,
        maxVal: 18,
        unit: '%',
        desc: val => `+${val}% к вероятности критического удара`
      },
      {
        type: 'crit_damage',
        title: 'Заточка Палача',
        icon: '🗡️',
        minVal: 35,
        maxVal: 85,
        unit: '%',
        desc: val => `+${val}% к дополнительному критическому урону`
      },
      {
        type: 'cooldown_reduction',
        title: 'Хроно-Амулет',
        icon: '⏱️',
        minVal: 8,
        maxVal: 20,
        unit: '%',
        desc: val => `-${val}% ко времени перезарядки всех способностей`
      },
      {
        type: 'hp_regen',
        title: 'Сердце Бессмертного',
        icon: '💖',
        minVal: 16,
        maxVal: 48,
        unit: ' HP/с',
        desc: val => `+${val} HP в секунду непрерывной регенерации`
      },
      {
        type: 'damage_reduction',
        title: 'Броня Гладиатора',
        icon: '🦺',
        minVal: 8,
        maxVal: 22,
        unit: '%',
        desc: val => `-${val}% к входящему урону на Арене`
      }
    ];

    const shuffled = [...passiveDefs].sort(() => Math.random() - 0.5).slice(0, count);

    return shuffled.map((def, i) => {
      const rolledVal = Math.round(def.minVal + Math.random() * (def.maxVal - def.minVal));
      const rangeRatio = (rolledVal - def.minVal) / Math.max(1, def.maxVal - def.minVal);
      const quality: 'good' | 'great' | 'legendary' =
        rangeRatio >= 0.75 ? 'legendary' : rangeRatio >= 0.35 ? 'great' : 'good';

      return {
        id: `passive_${def.type}_${i}_${Date.now()}`,
        type: def.type,
        title: def.title,
        icon: def.icon,
        value: rolledVal,
        description: def.desc(rolledVal),
        quality
      };
    });
  }

  /**
   * Applies the complete draft build state to the player entity.
   */
  public applyBuildToPlayer(player: Player, build: LuckyTestBuildState): void {
    player.setCharacter(build.hero);
    player.isGladiator = true;
    player.isManualAim = true;
    player.pvpResilience = 0.40; // 40% damage taken in PvP

    // 1500 Gladiator base HP
    player.baseMaxHp = 1500;
    player.maxHp = 1500;
    player.hp = 1500;

    // Add 3 drafted weapons (1st starting weapon is already created by setCharacter)
    for (const weaponId of build.draftedWeaponIds) {
      if (player.weapons.some(w => w.id === weaponId)) continue;
      const wInstance = createWeaponInstanceById(weaponId);
      if (wInstance) {
        player.weapons.push(wInstance);
      }
    }

    // Apply the 12 upgrades
    for (const upgrade of build.appliedUpgrades) {
      const targetWeapon = player.weapons.find(w => w.id === upgrade.weaponId);
      if (targetWeapon && targetWeapon.level < 4) {
        targetWeapon.level = upgrade.newLevel;
        targetWeapon.applyGradeUpgrade(upgrade.grade);
        targetWeapon.recalculateStats();
      }
    }

    // Apply passives
    for (const passive of build.chosenPassives) {
      switch (passive.type) {
        case 'damage':
          player.damageMultiplier += passive.value / 100;
          break;
        case 'max_hp':
          player.maxHp += passive.value;
          player.hp = player.maxHp;
          break;
        case 'speed':
          player.speed *= 1 + passive.value / 100;
          break;
        case 'crit_chance':
          player.critChance = Math.min(1.0, player.critChance + passive.value / 100);
          break;
        case 'crit_damage':
          player.critDamage += passive.value / 100;
          break;
        case 'cooldown_reduction':
          player.passiveCooldownMultiplier = Math.max(0.4, player.passiveCooldownMultiplier * (1 - passive.value / 100));
          for (const w of player.weapons) {
            w.cooldownMultiplier = player.passiveCooldownMultiplier;
          }
          break;
        case 'hp_regen':
          player.passiveHpRegen += passive.value;
          break;
        case 'damage_reduction':
          player.passiveDamageReduction = Math.min(0.60, player.passiveDamageReduction + passive.value / 100);
          break;
      }
    }

    player.redrawOverhead();
  }

  /**
   * Generates a balanced, randomized Gladiator build for the Solo Mode AI Bot.
   */
  public createBotGladiatorBuild(): LuckyTestBuildState {
    const heroInfo = this.rollRandomHero();
    const heroCfg = BalanceManager.getHeroConfig(heroInfo.type);
    const startingWeapon = heroCfg.startingWeapon || 'katana_slash';

    const weaponChoices1 = this.generateWeaponDraft([startingWeapon]);
    const pick1 = weaponChoices1[Math.floor(Math.random() * weaponChoices1.length)].id;

    const weaponChoices2 = this.generateWeaponDraft([startingWeapon, pick1]);
    const pick2 = weaponChoices2[Math.floor(Math.random() * weaponChoices2.length)].id;

    const weaponChoices3 = this.generateWeaponDraft([startingWeapon, pick1, pick2]);
    const pick3 = weaponChoices3[Math.floor(Math.random() * weaponChoices3.length)].id;

    const all4Weapons = [startingWeapon, pick1, pick2, pick3];
    const upgrades = this.generate12Upgrades(all4Weapons);

    const chosenPassives: LuckyPassiveChoice[] = [];
    for (let r = 0; r < 4; r++) {
      const options = this.generatePassiveChoices(3);
      // Pick best quality or random
      chosenPassives.push(options[0]);
    }

    return {
      hero: heroInfo.type,
      heroName: heroInfo.name,
      startingWeaponId: startingWeapon,
      draftedWeaponIds: [pick1, pick2, pick3],
      appliedUpgrades: upgrades,
      chosenPassives,
      isReady: true
    };
  }
}
