import type { Scene } from 'three';
import { Player } from '../../entities/Player';
import {
  Weapon,
  getWeaponEffectiveCap,
  BowWeapon,
  KukriWeapon,
  ReaperScytheWeapon,
  FireRingWeapon,
  KatanaSlashWeapon,
  WhirlwindSlashWeapon,
  GreatswordWeapon,
  FlailWeapon,
  AstralStaffWeapon,
  ChakramWeapon,
  LightningStrikeWeapon,
  IceSpikeWeapon,
  FireballWeapon,
  AssaultRifleWeapon
} from '../../combat/Weapon';
import { InvokerInvokeWeapon, InvokerSpellWeapon } from '../../combat/InvokerWeapons';
import { INVOKER_SPELL_IDS, INVOKER_SPELLS, invokerWeaponId } from '../../shared/InvokerSpells';
import { canCharacterAcquireWeapon } from '../../shared/UniqueCharacters';
import { selectWeaponUpgradeOptions, filterAndShuffleForReroll, canRerollWeaponOptions } from '../selectWeaponUpgradeOptions';
import { rollWeaponGrade, getGradeLabel, type WeaponGrade } from '../../combat/WeaponGrades';
import { SoundManager } from '../../core/SoundManager';
import { TextureManager } from '../../core/TextureManager';

export interface UpgradeOption {
  id: string;
  title: string;
  icon: string;
  iconImage?: string;
  levelTag: string;
  description: string;
  grade?: WeaponGrade;
  apply: () => void;
}

export function getWeaponIconUrl(weaponId: string): string {
  const map: Record<string, string> = {
    bow: '/textures/weapons/weapon_bow.png',
    heavy_colt: '/textures/weapons/weapon_bow.png',
    kukri: '/textures/weapons/weapon_kukri.png',
    dual_revolvers: '/textures/weapons/weapon_kukri.png',
    orbiting_barrier: '/textures/weapons/weapon_reaper_scythe.png',
    reaper_scythe: '/textures/weapons/weapon_reaper_scythe.png',
    holy_aura: '/textures/weapons/weapon_fire_ring.png',
    fire_ring: '/textures/weapons/weapon_fire_ring.png',
    katana_slash: '/textures/weapons/weapon_katana_slash.png',
    whirlwind_slash: '/textures/weapons/weapon_whirlwind_slash.png',
    greatsword: '/textures/weapons/weapon_greatsword.png',
    flail: '/textures/weapons/weapon_flail.png',
    astral_staff: '/textures/weapons/weapon_astral_staff.png',
    chakram: '/textures/weapons/weapon_chakram.png',
    lightning_strike: '/textures/weapons/weapon_lightning_strike.png',
    ice_spike: '/textures/weapons/weapon_ice_spike.png',
    fireball: '/textures/weapons/weapon_fireball.png',
    assault_rifle: '/textures/weapons/weapon_assault_rifle.png',
    invoker_invoke: '/textures/weapons/weapon_invoker_invoke.png'
  };
  const path = map[weaponId] || `/textures/weapons/weapon_${weaponId}.png`;
  return TextureManager.getWeaponBlobUrl(path);
}

export interface LevelUpUIElements {
  levelUpModal: HTMLElement;
  levelUpStepIndicator: HTMLElement;
  levelUpTitle: HTMLElement;
  levelUpRerollContainer: HTMLElement | null;
  btnLevelUpReroll: HTMLButtonElement | null;
  upgradeCardsContainer: HTMLElement;
}

export interface LevelUpUIContext {
  elements: LevelUpUIElements;
  getScene: () => Scene;
  getCurrentStageNumber: () => number;
  getIsAutoLevelUp: () => boolean;
  updateWeaponsBar: (weapons: Weapon[]) => void;
  updatePassivesBar: (player: Player) => void;
  onLevelUpComplete?: () => void;
}

export class LevelUpUI {
  private ctx: LevelUpUIContext;
  private levelUpKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  public rerollsRemaining: number = 2;
  public nextLevelUpExcludedIds: Set<string> | null = null;

  constructor(ctx: LevelUpUIContext) {
    this.ctx = ctx;
  }

  private get el(): LevelUpUIElements {
    return this.ctx.elements;
  }

  public resetLevelUpState(): void {
    this.hideLevelUp();
    this.rerollsRemaining = 2;
    this.nextLevelUpExcludedIds = null;
  }

  public showLevelUp(player: Player, onSelect: () => void) {
    const excludedIds = this.nextLevelUpExcludedIds ?? undefined;
    this.nextLevelUpExcludedIds = null;

    if (this.ctx.getIsAutoLevelUp()) {
      const weaponOptions = this.generateWeaponOptions(player, excludedIds);
      if (weaponOptions.length > 0) {
        const chosen = this.selectAutoLevelUpOption(weaponOptions, player);
        chosen.apply();
      } else {
        player.maxHp += 50;
        player.heal(player.maxHp);
        player.redrawOverhead();
      }
      this.ctx.updateWeaponsBar(player.weapons);
      this.ctx.updatePassivesBar(player);
      SoundManager.playLevelUp();
      this.hideLevelUp();
      setTimeout(() => onSelect(), 30);
      return;
    }

    SoundManager.playLevelUp();
    this.el.levelUpModal.classList.remove('hidden');

    const weaponOptions = this.generateWeaponOptions(player, excludedIds);

    if (weaponOptions.length > 0) {
      this.renderWeaponStep(player, weaponOptions, () => {
        this.hideLevelUp();
        onSelect();
      });
    } else {
      const fallbackOption: UpgradeOption = {
        id: 'max_arsenal_reward',
        title: 'Эликсир Героя',
        icon: '💖',
        levelTag: 'АРСЕНАЛ МАКСИМАЛЕН • ЛЕГЕНДАРНЫЙ',
        description: 'Все оружия прокачаны на максимум! Восстанавливает здоровье и дарует +50 к максимальному HP.',
        grade: 'legendary',
        apply: () => {
          player.maxHp += 50;
          player.heal(player.maxHp);
          player.redrawOverhead();
        }
      };
      this.renderWeaponStep(player, [fallbackOption], () => {
        this.hideLevelUp();
        onSelect();
      });
    }
  }

  private selectAutoLevelUpOption(options: UpgradeOption[], _player: Player): UpgradeOption {
    // 1. Prioritize awakening if offered
    const anyAwaken = options.find(opt => opt.id.startsWith('awaken_') || opt.id.startsWith('awaken3_'));
    if (anyAwaken) return anyAwaken;

    // 2. Normal upgrades for weapons
    const anyUpgrade = options.filter(opt => opt.id.startsWith('upgrade_'));
    if (anyUpgrade.length > 0) return anyUpgrade[Math.floor(Math.random() * anyUpgrade.length)];

    // 3. New weapon
    const anyNew = options.find(opt => opt.id.startsWith('new_'));
    if (anyNew) return anyNew;

    // 4. Elixirs
    const dmgOpt = options.find(opt => opt.id === 'bonus_damage_elixir');
    if (dmgOpt) return dmgOpt;

    const hpOpt = options.find(opt => opt.id === 'bonus_health_elixir');
    if (hpOpt) return hpOpt;

    return options[0];
  }

  private renderWeaponStep(
    player: Player,
    options: UpgradeOption[],
    onChosen: () => void,
    isRerolled: boolean = false
  ) {
    const canReroll = this.rerollsRemaining > 0 && canRerollWeaponOptions(options);

    if (this.el.levelUpStepIndicator) {
      this.el.levelUpStepIndicator.innerHTML = 'ПОВЫШЕНИЕ УРОВНЯ';
      this.el.levelUpStepIndicator.style.color = '#fbbf24';
    }
    if (this.el.levelUpTitle) {
      this.el.levelUpTitle.innerText = canReroll
        ? 'ВЫБЕРИТЕ ОРУЖИЕ [1 - 3] ИЛИ РЕРОЛ [R]'
        : 'ВЫБЕРИТЕ ОРУЖИЕ [1 - 3]';
    }

    if (this.el.levelUpRerollContainer) {
      if (canReroll) {
        this.el.levelUpRerollContainer.classList.remove('hidden');
        if (this.el.btnLevelUpReroll) {
          this.el.btnLevelUpReroll.innerHTML = `🎲 <span class="btn-hotkey">[R]</span> Пропустить уровень (Рерол ${this.rerollsRemaining}/2)`;
        }
      } else {
        this.el.levelUpRerollContainer.classList.add('hidden');
      }
    }

    this.el.upgradeCardsContainer.innerHTML = '';
    let chosen = false;

    if (this.levelUpKeyHandler) {
      window.removeEventListener('keydown', this.levelUpKeyHandler);
      this.levelUpKeyHandler = null;
    }

    const selectOptionByIndex = (index: number) => {
      if (chosen || index < 0 || index >= options.length) return;
      chosen = true;
      if (this.levelUpKeyHandler) {
        window.removeEventListener('keydown', this.levelUpKeyHandler);
        this.levelUpKeyHandler = null;
      }
      if (this.el.btnLevelUpReroll) {
        this.el.btnLevelUpReroll.onclick = null;
      }
      options[index].apply();
      player.recalculateStats();
      this.ctx.updateWeaponsBar(player.weapons);
      this.ctx.updatePassivesBar(player);
      SoundManager.playShoot();
      onChosen();
    };

    const handleReroll = () => {
      if (chosen || this.rerollsRemaining <= 0 || !canRerollWeaponOptions(options)) return;
      chosen = true;
      this.rerollsRemaining--;
      SoundManager.playReroll();

      const excluded = new Set<string>();
      for (const opt of options) {
        excluded.add(opt.id);
        const wId = opt.id.replace(/^(upgrade_|new_|awaken_|awaken3_)/, '');
        excluded.add('upgrade_' + wId);
        excluded.add('new_' + wId);
        excluded.add('awaken_' + wId);
        excluded.add('awaken3_' + wId);
      }
      this.nextLevelUpExcludedIds = excluded;

      if (this.levelUpKeyHandler) {
        window.removeEventListener('keydown', this.levelUpKeyHandler);
        this.levelUpKeyHandler = null;
      }
      if (this.el.btnLevelUpReroll) {
        this.el.btnLevelUpReroll.onclick = null;
      }
      this.hideLevelUp();
      onChosen();
    };

    if (this.el.btnLevelUpReroll) {
      this.el.btnLevelUpReroll.onclick = canReroll ? () => handleReroll() : null;
    }

    options.forEach((opt, idx) => {
      const card = document.createElement('div');
      const gradeClass = opt.grade ? ` grade-${opt.grade}` : '';
      card.className = `character-card upgrade-card card-weapon-step${gradeClass}${isRerolled ? ' rerolled' : ''}`;
      const iconHtml = opt.iconImage
        ? `<div class="char-portrait-wrapper upgrade-icon-wrapper"><img src="${opt.iconImage}" class="char-portrait card-icon-img" alt="${opt.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'" /><div class="card-icon" style="display:none">${opt.icon}</div></div>`
        : `<div class="char-portrait-wrapper upgrade-icon-wrapper"><div class="card-icon">${opt.icon}</div></div>`;
      const gradeBadgeHtml = opt.grade
        ? `<div class="card-grade-badge grade-${opt.grade}">${getGradeLabel(opt.grade).toUpperCase()}</div>`
        : '';
      card.innerHTML = `
        <div class="card-hotkey-badge">[${idx + 1}]</div>
        ${gradeBadgeHtml}
        ${iconHtml}
        <div class="char-name card-title">${opt.title}</div>
        <div class="char-type card-level-tag">${opt.levelTag}</div>
        <div class="char-perks card-perks-box">
          <div class="perk-tag card-description">${opt.description}</div>
        </div>
        <button class="action-btn select-btn upgrade-select-btn"><span class="btn-hotkey">[${idx + 1}]</span> ВЫБРАТЬ</button>
      `;

      card.addEventListener('click', () => {
        selectOptionByIndex(idx);
      });

      this.el.upgradeCardsContainer.appendChild(card);
    });

    this.levelUpKeyHandler = (e: KeyboardEvent) => {
      if (chosen || e.repeat || e.defaultPrevented) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (this.el.levelUpModal.classList.contains('hidden')) return;

      if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1') {
        e.preventDefault();
        selectOptionByIndex(0);
      } else if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2') {
        e.preventDefault();
        selectOptionByIndex(1);
      } else if (e.code === 'Digit3' || e.code === 'Numpad3' || e.key === '3') {
        e.preventDefault();
        selectOptionByIndex(2);
      } else if (canReroll && (e.code === 'KeyR' || e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К')) {
        e.preventDefault();
        handleReroll();
      }
    };

    window.addEventListener('keydown', this.levelUpKeyHandler);
  }

  public hideLevelUp() {
    if (this.levelUpKeyHandler) {
      window.removeEventListener('keydown', this.levelUpKeyHandler);
      this.levelUpKeyHandler = null;
    }
    if (this.el.btnLevelUpReroll) {
      this.el.btnLevelUpReroll.onclick = null;
    }
    this.el.levelUpRerollContainer?.classList.add('hidden');
    this.el.levelUpModal.classList.add('hidden');
  }

  public generateWeaponOptions(player: Player, excludeIds?: ReadonlySet<string>): UpgradeOption[] {
    const weapons = player.weapons;
    const tier3Weapons = weapons.filter(w => (w.awakenedGrade ?? 0) === 0);
    const tier2Weapons = weapons.filter(w => (w.awakenedGrade ?? 0) === 1);
    const tier1Weapons = weapons.filter(w => (w.awakenedGrade ?? 0) >= 2);

    const hpOption: UpgradeOption = {
      id: 'bonus_health_elixir',
      title: 'Эликсир Жизни (+50 HP)',
      icon: '❤️',
      levelTag: 'БОНУС ЗДОРОВЬЯ',
      description: 'Увеличивает максимальное здоровье героя на +50 HP и мгновенно восстанавливает 50 HP.',
      grade: 'rare',
      apply: () => {
        player.maxHp += 50;
        player.hp = Math.min(player.maxHp, player.hp + 50);
        player.recalculateStats();
      }
    };

    const damageOption: UpgradeOption = {
      id: 'bonus_damage_elixir',
      title: 'Эликсир Могущества (+5% урона)',
      icon: '⚡',
      levelTag: 'БОНУС УРОНА',
      description: 'Увеличивает весь наносимый урон героя на +5%.',
      grade: 'legendary',
      apply: () => {
        player.addMightElixirBonus();
      }
    };

    const createTier2AwakenOption = (weapon: Weapon): UpgradeOption => ({
      id: `awaken_${weapon.id}`,
      title: `Пробуждение Тира 2: ${weapon.name}`,
      icon: '🌟',
      iconImage: weapon.iconImage || getWeaponIconUrl(weapon.id),
      levelTag: 'ТИР 2 • СБРОС (МАКС. 12)',
      description: `Сбрасывает ${weapon.name} до 1 уровня, удваивая все прибавки характеристик (x2)! Доступна прокачка до 12 ур.`,
      grade: 'legendary',
      apply: () => {
        weapon.awakenGrade();
        player.recalculateStats();
      }
    });

    const createTier1AwakenOption = (weapon: Weapon): UpgradeOption => ({
      id: `awaken3_${weapon.id}`,
      title: `Пробуждение Тира 1: ${weapon.name}`,
      icon: '🔥',
      iconImage: weapon.iconImage || getWeaponIconUrl(weapon.id),
      levelTag: 'ТИР 1 • СБРОС (МАКС. 12)',
      description: `Сбрасывает ${weapon.name} до 1 уровня, утраивая все прибавки характеристик (x3)! Доступна прокачка до 12 ур.`,
      grade: 'legendary',
      apply: () => {
        weapon.awakenGrade();
        player.recalculateStats();
      }
    });

    // Milestone 1: First time all 4 Tier 3 weapons reach level 12
    // "(при повышении уровня получаем 3 карточки: повышение HP и два улучшения Тира оружия)"
    const isFirstTimeTier2Unlock = weapons.length === 4 &&
      tier3Weapons.length === 4 &&
      weapons.every(w => w.level >= 12);
    if (isFirstTimeTier2Unlock) {
      const awakenCards = tier3Weapons.map(createTier2AwakenOption).sort(() => 0.5 - Math.random());
      const selectedAwaken = awakenCards.slice(0, 2);
      return [hpOption, ...selectedAwaken];
    }

    // Milestone 2: First time all 4 Tier 2 weapons reach level 12
    // "И тоже самое до Тир 1."
    const isFirstTimeTier1Unlock = weapons.length === 4 &&
      tier2Weapons.length === 4 &&
      weapons.every(w => w.level >= 12);
    if (isFirstTimeTier1Unlock) {
      const awakenCards = tier2Weapons.map(createTier1AwakenOption).sort(() => 0.5 - Math.random());
      const selectedAwaken = awakenCards.slice(0, 2);
      return [hpOption, ...selectedAwaken];
    }

    // Milestone 3: All 4 weapons are Tier 1 and all are level 12
    // '"Эликсир могущества" доступен только после того как игрок улучшил все Тир 1 оружия до 12 уровня.'
    const allTier1Maxed = weapons.length === 4 &&
      tier1Weapons.length === 4 &&
      weapons.every(w => w.level >= 12);
    if (allTier1Maxed) {
      return [hpOption, damageOption];
    }

    const upgradeOptions: UpgradeOption[] = [];
    for (const weapon of weapons) {
      const effectiveCap = getWeaponEffectiveCap(weapon, weapons);
      if (weapon.level < effectiveCap && canCharacterAcquireWeapon(player.charType, weapon.id, weapons)) {
        const grade = rollWeaponGrade(this.ctx.getCurrentStageNumber());
        const gradeLabel = getGradeLabel(grade);
        const prefix = weapon.getGradePrefix();
        upgradeOptions.push({
          id: `upgrade_${weapon.id}`,
          title: `${prefix}Улучшение: ${weapon.name}`,
          icon: weapon.icon,
          iconImage: weapon.iconImage || getWeaponIconUrl(weapon.id),
          levelTag: `УРОВЕНЬ ${weapon.level + 1}/${effectiveCap} • ${gradeLabel.toUpperCase()}`,
          description: weapon.getNextUpgradeDescription(grade),
          grade,
          apply: () => {
            weapon.upgrade(grade);
            player.recalculateStats();
          }
        });
      }
    }

    const pool: UpgradeOption[] = [];

    // Awakening options (if unlocked)
    const tier2Unlocked = weapons.length === 4 && weapons.every(w => (w.awakenedGrade ?? 0) >= 1 || w.level >= 12);
    const tier1Unlocked = weapons.length === 4 && weapons.every(w => (w.awakenedGrade ?? 0) >= 2 || (w.awakenedGrade === 1 && w.level >= 12));

    const tier2Awakenings = tier2Unlocked
      ? tier3Weapons.filter(w => w.level >= 12).map(createTier2AwakenOption)
      : [];

    const tier1Awakenings = tier1Unlocked
      ? tier2Weapons.filter(w => w.level >= 12).map(createTier1AwakenOption)
      : [];

    const availableAwakenings = [...tier2Awakenings, ...tier1Awakenings];

    if (upgradeOptions.length > 0) {
      // While weapons are actively leveling up, AT MOST ONE tier upgrade card can appear
      pool.push(...upgradeOptions);
      if (availableAwakenings.length > 0) {
        const randomAwaken = availableAwakenings[Math.floor(Math.random() * availableAwakenings.length)];
        pool.push(randomAwaken);
      }
    } else {
      // All upgradeable weapons are at their current cap (e.g. 6/8/10), waiting to awaken
      pool.push(...availableAwakenings);
    }

    if (player.weapons.length < 4) {
      const invokerWeapons = [null, ...INVOKER_SPELL_IDS] as const;
      for (const spell of invokerWeapons) {
        const id = spell ? invokerWeaponId(spell) : 'invoker_invoke';
        if (!canCharacterAcquireWeapon(player.charType, id, player.weapons)) continue;
        if (player.weapons.some(weapon => weapon.id === id)) continue;
        const def = spell ? INVOKER_SPELLS[spell] : null;
        pool.push({
          id: 'new_' + id,
          title: 'Новое: ' + (def?.name ?? 'Invoke'),
          icon: def?.icon ?? '🔮',
          iconImage: getWeaponIconUrl(id),
          levelTag: 'НОВОЕ ОРУЖИЕ',
          description: def?.description ?? 'Каждая атака случайно выбирает одно из десяти заклинаний Инвокера.',
          apply: () => {
            if (!canCharacterAcquireWeapon(player.charType, id, player.weapons)) return;
            const triggerAttack = () => player.triggerAttackAnim(0.5);
            const w = spell
              ? new InvokerSpellWeapon(spell, triggerAttack)
              : new InvokerInvokeWeapon(triggerAttack);
            player.weapons.push(w);
            player.recalculateStats();
          }
        });
      }

      const canUseGenericWeapons = canCharacterAcquireWeapon(player.charType, 'bow', player.weapons);
      if (canUseGenericWeapons) {
        const addGenericOption = (
          id: string,
          title: string,
          icon: string,
          description: string,
          factory: () => Weapon
        ) => {
          pool.push({
            id: 'new_' + id,
            title: 'Новое: ' + title,
            icon,
            iconImage: getWeaponIconUrl(id),
            levelTag: 'НОВОЕ ОРУЖИЕ',
            description,
            apply: () => {
              const w = factory();
              player.weapons.push(w);
              player.recalculateStats();
            }
          });
        };

        const hasBow = player.weapons.some(w => w.id === 'bow' || w.id === 'heavy_colt');
        if (!hasBow) {
          addGenericOption('bow', 'Охотничий Лук', '🏹', 'Острые дальнобойные стрелы с мощным пробитием нескольких врагов', () => new BowWeapon(() => player.triggerAttackAnim(0.40)));
        }

        const hasKukri = player.weapons.some(w => w.id === 'kukri' || w.id === 'dual_revolvers');
        if (!hasKukri) {
          addGenericOption('kukri', 'Нож Кукри', '🔪', 'Стремительные броски изогнутых клинков кукри в ближайших врагов', () => new KukriWeapon());
        }

        const hasOrbs = player.weapons.some(w => w.id === 'reaper_scythe' || w.id === 'orbiting_barrier');
        if (!hasOrbs) {
          addGenericOption('reaper_scythe', 'Коса Жнеца', '🌙', 'Призывает смертоносные косы, вращающиеся вокруг героя, наносящие прямой урон и накладывающие стакающееся кровотечение', () => new ReaperScytheWeapon());
        }

        const hasAura = player.weapons.some(w => w.id === 'fire_ring' || w.id === 'holy_aura');
        if (!hasAura) {
          addGenericOption('fire_ring', 'Огненное Кольцо', '🔥', 'Окружает героя анимированным кольцом дикого огня, сжигающего монстров', () => {
            const aura = new FireRingWeapon();
            aura.initVisual(this.ctx.getScene(), player.position);
            return aura;
          });
        }

        const hasKatana = player.weapons.some(w => w.id === 'katana_slash');
        if (!hasKatana) {
          addGenericOption('katana_slash', 'Рассекающий Клинок', '🗡️', 'Рассекает окружающих врагов смертоносным круговым ударом', () => new KatanaSlashWeapon(() => player.triggerAttackAnim(0.48)));
        }

        const hasWhirlwind = player.weapons.some(w => w.id === 'whirlwind_slash');
        if (!hasWhirlwind) {
          addGenericOption('whirlwind_slash', 'Багровый Вихрь', '🌪️', 'Шквал стремительных багровых рассекающих ударов с повышенной скоростью', () => new WhirlwindSlashWeapon(() => player.triggerAttackAnim(0.42)));
        }

        const hasGreatsword = player.weapons.some(w => w.id === 'greatsword');
        if (!hasGreatsword) {
          addGenericOption('greatsword', 'Двуручный Меч', '⚔️', 'Тяжёлый круговой размах гигантского клинка с колоссальным уроном и радиусом', () => new GreatswordWeapon(() => player.triggerAttackAnim(0.5)));
        }

        const hasFlail = player.weapons.some(w => w.id === 'flail');
        if (!hasFlail) {
          addGenericOption('flail', 'Боевой Цеп', '⛓️', 'Сокрушительный вихрь тяжёлого шипастого цепа, отбрасывающего монстров', () => new FlailWeapon(() => player.triggerAttackAnim(0.45)));
        }

        const hasStaff = player.weapons.some(w => w.id === 'astral_staff');
        if (!hasStaff) {
          addGenericOption('astral_staff', 'Звёздный Посох', '🔮', 'Магический посох, запускающий скоростные пробивающие звёздные снаряды', () => new AstralStaffWeapon(() => player.triggerAttackAnim(0.48)));
        }

        const hasChakram = player.weapons.some(w => w.id === 'chakram');
        if (!hasChakram) {
          addGenericOption('chakram', 'Танцующий Чакрам', '🪃', 'Бросок вращающегося клинка по дуге с возвращением бумерангом и повторным рассечением', () => new ChakramWeapon(() => player.triggerAttackAnim(0.42)));
        }

        const hasLightning = player.weapons.some(w => w.id === 'lightning_strike');
        if (!hasLightning) {
          addGenericOption('lightning_strike', 'Удар Молнии', '⚡', 'Призывает сокрушительные грозовые молнии с небес, поражающие монстров электрическим взрывом сверху', () => new LightningStrikeWeapon(() => player.triggerAttackAnim(0.40)));
        }

        const hasIceSpike = player.weapons.some(w => w.id === 'ice_spike');
        if (!hasIceSpike) {
          addGenericOption('ice_spike', 'Ледяной Шип', '🧊', 'Ледяной шип вырывается из-под земли и пронзает монстров снизу ледяным всплеском', () => new IceSpikeWeapon(() => player.triggerAttackAnim(0.38)));
        }

        const hasFireball = player.weapons.some(w => w.id === 'fireball');
        if (!hasFireball) {
          addGenericOption('fireball', 'Огненный Шар', '☄️', 'Огненный шар падает сверху с небес и детонирует огненным взрывом по области', () => new FireballWeapon(() => player.triggerAttackAnim(0.42)));
        }

        const hasRifle = player.weapons.some(w => w.id === 'assault_rifle');
        if (!hasRifle) {
          addGenericOption('assault_rifle', 'Штурмовая Винтовка', '🔫', 'Скорострельная автоматическая винтовка, ведущая непрерывный огонь очередями пуль', () => new AssaultRifleWeapon(() => player.triggerAttackAnim(0.20)));
        }
      }
    }
    // Add elixirs if pool has fewer than 3 options
    if (pool.length < 3) {
      const elixirs = [hpOption];
      for (const elixir of elixirs) {
        if (pool.length >= 3) break;
        if (!pool.some(o => o.id === elixir.id)) pool.push(elixir);
      }
    }

    const shuffled = filterAndShuffleForReroll(pool, excludeIds);
    return selectWeaponUpgradeOptions(shuffled, player.charType);
  }
}
