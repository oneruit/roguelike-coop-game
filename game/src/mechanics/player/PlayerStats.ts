import { RiftItemId } from '../../items/RiftItemSystem';
import { BuffType, ActiveBuff } from '../../shared/types';
import { Weapon } from '../../combat/Weapon';
import type { MetaBonuses } from '../../meta/MetaProgression';
import { BalanceManager } from '../../balance/BalanceManager';

export interface PlayerStatsConfig {
  baseMaxHp: number;
  baseSpeed: number;
  baseDamageMultiplier: number;
  startingWeaponId?: string;
}

export interface CalculatedPlayerStats {
  hpRegen: number;
  maxShield: number;
  shieldRegenDelay: number;
  shieldRegenMultiplier: number;
  critChance: number;
  critDamage: number;
  damageReduction: number;
  cooldownMultiplier: number;
  pickupRadius: number;
  passiveSpeedMultiplier: number;
  speed: number;
  passiveDamageMultiplier: number;
  damageMultiplier: number;
}

/**
 * Encapsulates RPG stat computation, passive bonus scaling,
 * dimishing returns, Rift item multipliers, and XP level progression.
 */
export class PlayerStats {
  public static calculateXpToNextLevel(level: number): number {
    const baseXp = 10;
    const growth = 1.08;
    return Math.floor(baseXp * Math.pow(level, 1.5) * growth);
  }

  public static recalculate(
    _baseMaxHp: number,
    baseSpeed: number,
    baseDamageMultiplier: number,
    activeBuffs: Map<BuffType, ActiveBuff>,
    getItemStacks: (id: RiftItemId) => number,
    counts: {
      amplifierCount: number;
      mightElixirCount: number;
      speedBootsCount: number;
      flaskCount: number;
      magnetCount: number;
      amuletCount: number;
      vestCount: number;
      watchCount: number;
    },
    cheats: {
      isSpeedCheat?: boolean;
      isOneHitKill?: boolean;
    },
    weapons: Weapon[],
    metaBonuses?: MetaBonuses
  ): CalculatedPlayerStats {
    let speedBonus = 0;
    let dmgBonus = 0;

    const ghostBuff = activeBuffs.get('ghost');
    if (ghostBuff) speedBonus += ghostBuff.value;
    const alacrityBuff = activeBuffs.get('alacrity');
    if (alacrityBuff) dmgBonus += alacrityBuff.value;
    const speedBuff = activeBuffs.get('speed');
    if (speedBuff) speedBonus += speedBuff.value;

    const dmgBuff = activeBuffs.get('damage');
    if (dmgBuff) dmgBonus += dmgBuff.value;

    // Apply Rift items passives
    const adrenalineStacks = getItemStacks('adrenaline_dart');
    const injectorStacks = getItemStacks('kinetic_injector');
    const vialStacks = getItemStacks('health_vial');
    const carapaceStacks = getItemStacks('phase_carapace');
    const exoskeletonStacks = getItemStacks('aegis_exoskeleton');
    const critStacks = getItemStacks('crit_visor');
    const titanHeartStacks = getItemStacks('titan_heart');
    const overclockStacks = getItemStacks('overclock_module');
    const voidCatalystStacks = getItemStacks('void_catalyst');

    const globalCfg = BalanceManager.getGlobalConfig();
    const ampCfg = BalanceManager.getPassiveConfig('stat_amplifier');
    const amuletCfg = BalanceManager.getPassiveConfig('stat_amulet');
    const vestCfg = BalanceManager.getPassiveConfig('stat_vest');
    const watchCfg = BalanceManager.getPassiveConfig('stat_watch');
    const magnetCfg = BalanceManager.getPassiveConfig('stat_magnet');
    const bootsCfg = BalanceManager.getPassiveConfig('stat_speed_boots');

    // Speed: +12% per Adrenaline Dart stack
    speedBonus += adrenalineStacks * 0.12;

    // HP Regen: +2.5 HP/s per Health Vial stack, +15 HP/s per Titan Heart, +1.0 HP/s per Amulet stack, + meta HP regen, NO LIMIT
    const amuletScale = amuletCfg?.perStackValue ?? 1.0;
    const hpRegen = (counts.amuletCount * amuletScale) + (vialStacks * 2.5) + (titanHeartStacks * 15) + (metaBonuses?.hpRegenBonus ?? 0);

    // Max Shield (Armor): 100 base + 50 per Phase Carapace stack, capped at 350 max
    const maxShield = Math.min(350, 100 + (carapaceStacks * 50));

    // Shield Regen Delay: 3.0s base, reduced by 0.25s per Aegis Exoskeleton stack (min 1.5s)
    const shieldRegenDelay = Math.max(1.5, 3.0 - (exoskeletonStacks * 0.25));

    // Shield Regen Speed: +25% regen rate per Aegis Exoskeleton stack
    const shieldRegenMultiplier = 1.0 + (exoskeletonStacks * 0.25);

    // Crit Chance: baseCritChance from globalCfg + meta crit + 6% per Crit Lens + 3% per Crit Visor, cap at 1.0 (100%)
    const critLensStacks = getItemStacks('crit_lens');
    const baseCritChance = globalCfg?.baseCritChance ?? 0.05;
    const critChance = Math.min(1.0, baseCritChance + (metaBonuses?.critChanceBonus ?? 0) + critLensStacks * 0.04 + critStacks * 0.03);

    // Crit Damage: 50% base + meta crit dmg + 20% per Heavy Hollowpoint + 25% per Void Catalyst, cap at 10.0 (1000%)
    const hollowStacks = getItemStacks('heavy_hollowpoint');
    const critDamage = Math.min(10.0, 0.50 + (metaBonuses?.critDamageMultBonus ?? 0) + hollowStacks * 0.20 + voidCatalystStacks * 0.25);

    // Leather Vest % damage reduction: 2% at level 1, diminishing returns up to cap at level 300, capped at maxArmorReduction (+ meta reduction)
    let damageReduction = metaBonuses?.damageReductionBonus ?? 0;
    const vestCap = (vestCfg?.maxValue ?? 70) / 100;
    const maxReduction = globalCfg?.maxArmorReduction ?? vestCap;
    if (counts.vestCount > 0) {
      damageReduction += 0.02 * Math.pow(counts.vestCount, Math.log(35) / Math.log(300));
    }
    damageReduction = Math.min(maxReduction, damageReduction);

    // Attack Cooldown Multiplier
    const watchMaxReduction = (watchCfg?.maxValue ?? 30) / 100;
    const watchReduction = counts.watchCount <= 0 ? 0 : Math.min(watchMaxReduction, 0.01 * Math.pow(counts.watchCount, Math.log(watchMaxReduction * 100) / Math.log(300)));
    const metaCdr = metaBonuses?.cooldownReductionBonus ?? 0;
    const watchMult = Math.max(0.40, 1 - watchReduction - metaCdr);
    const injectorMult = Math.pow(0.90, injectorStacks);
    const overclockMult = Math.pow(0.82, overclockStacks);
    const cooldownMultiplier = Math.max(0.15, watchMult * injectorMult * overclockMult);

    for (const weapon of weapons) {
      weapon.cooldownMultiplier = cooldownMultiplier / (1 + (alacrityBuff?.value ?? 0));
    }

    // Magnet pickup radius: base from globalCfg, diminishing returns up to maxValue at level 300, capped at maxValue (+ meta bonus)
    const basePickupRadius = globalCfg?.basePickupRadius ?? (magnetCfg?.baseValue ?? 4.0);
    const magnetCap = magnetCfg?.maxValue ?? 50.0;
    let pickupRadius = basePickupRadius;
    if (counts.magnetCount > 0) {
      pickupRadius = basePickupRadius + 0.4 * Math.pow(counts.magnetCount, Math.log((magnetCap - basePickupRadius) / 0.4) / Math.log(300));
    }
    pickupRadius = Math.min(magnetCap, pickupRadius + (metaBonuses?.pickupRadiusBonus ?? 0));

    // Speed Boots: +3% speed at level 1, diminishing returns up to maxValue at level 300, capped at maxValue (+ meta bonus)
    const bootsCap = (bootsCfg?.maxValue ?? 300) / 100;
    const bootsBonus = counts.speedBootsCount <= 0 ? 0 : 0.03 * Math.pow(counts.speedBootsCount, Math.log(200 / 3) / Math.log(300));
    const passiveSpeedMultiplier = Math.min(bootsCap, 1.0 + bootsBonus + (metaBonuses?.speedMultiplierBonus ?? 0));

    // Apply speed cheat or base speed * passive multiplier + speed buff
    const baseSpd = cheats.isSpeedCheat ? baseSpeed * 2.2 : (baseSpeed * passiveSpeedMultiplier);
    const speed = baseSpd * (1 + speedBonus);

    // Amplifier additive scaling:
    // Elixir of Might: +1% damage per stack (+0.01)
    // Meta progression Offense bonus
    const ampPercent = (ampCfg?.perStackValue ?? 2) / 100;
    const passiveDamageMultiplier = 1.0 + (counts.amplifierCount * ampPercent) + (counts.mightElixirCount * 0.01) + (metaBonuses?.damageMultiplierBonus ?? 0);

    // Apply 1-hit kill cheat or base damage * passive multiplier + damage buff
    const ampMult = (1 + getItemStacks('energy_amplifier') * 0.12) * (1 + getItemStacks('void_catalyst') * 0.10);
    const baseDmg = cheats.isOneHitKill ? 50.0 : (baseDamageMultiplier * passiveDamageMultiplier * ampMult);
    const damageMultiplier = baseDmg * (1 + dmgBonus);

    return {
      hpRegen,
      maxShield,
      shieldRegenDelay,
      shieldRegenMultiplier,
      critChance,
      critDamage,
      damageReduction,
      cooldownMultiplier,
      pickupRadius,
      passiveSpeedMultiplier,
      speed,
      passiveDamageMultiplier,
      damageMultiplier
    };
  }

  public static getDamageMultiplier(
    weaponId: string | undefined,
    startingWeaponId: string,
    isOneHitKill: boolean,
    passiveDamageMultiplier: number,
    getItemStacks: (id: RiftItemId) => number,
    activeBuffs: Map<BuffType, ActiveBuff>,
    baseDamageMultiplier: number,
    charType?: string
  ): number {
    const dmgBonus = (activeBuffs.get('damage')?.value ?? 0) + (activeBuffs.get('alacrity')?.value ?? 0);
    const ampMult = (1 + getItemStacks('energy_amplifier') * 0.18) * (1 + getItemStacks('void_catalyst') * 0.15);
    const generalBonus = (isOneHitKill ? 50.0 : passiveDamageMultiplier * ampMult) * (1 + dmgBonus);

    const isStarting = !weaponId ||
      weaponId === startingWeaponId ||
      (charType === 'invoker' && (weaponId === 'invoker_invoke' || weaponId.startsWith('invoker_')));
    const heroMultiplier = isStarting ? baseDamageMultiplier : 1.0;
    return heroMultiplier * generalBonus;
  }
}
