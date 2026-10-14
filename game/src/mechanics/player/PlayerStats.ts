import { RiftItemId } from '../../items/RiftItemSystem';
import { BuffType, ActiveBuff } from '../../shared/types';
import { Weapon } from '../../combat/Weapon';
import type { MetaBonuses } from '../../meta/MetaProgression';

export interface PlayerStatsConfig {
  baseMaxHp: number;
  baseSpeed: number;
  baseDamageMultiplier: number;
  startingWeaponId?: string;
}

export interface CalculatedPlayerStats {
  hpRegen: number;
  maxShield: number;
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
    const aegisStacks = getItemStacks('aegis_battery');
    const critStacks = getItemStacks('crit_visor');
    const titanHeartStacks = getItemStacks('titan_heart');
    const overclockStacks = getItemStacks('overclock_module');
    const voidCatalystStacks = getItemStacks('void_catalyst');

    // Speed: +12% per Adrenaline Dart stack
    speedBonus += adrenalineStacks * 0.12;

    // HP Regen: +2.5 HP/s per Health Vial stack, +15 HP/s per Titan Heart, +1.0 HP/s per Amulet stack, + meta HP regen, NO LIMIT
    const hpRegen = (counts.amuletCount * 1.0) + (vialStacks * 2.5) + (titanHeartStacks * 15) + (metaBonuses?.hpRegenBonus ?? 0);

    // Max Shield: +50 shield per Aegis Battery stack
    const maxShield = aegisStacks * 50;

    // Crit Chance: 5% base + meta crit + 6% per Crit Lens + 3% per Crit Visor, cap at 1.0 (100%)
    const critLensStacks = getItemStacks('crit_lens');
    const critChance = Math.min(1.0, 0.05 + (metaBonuses?.critChanceBonus ?? 0) + critLensStacks * 0.06 + critStacks * 0.03);

    // Crit Damage: 50% base + meta crit dmg + 20% per Heavy Hollowpoint + 40% per Void Catalyst, cap at 10.0 (1000%)
    const hollowStacks = getItemStacks('heavy_hollowpoint');
    const critDamage = Math.min(10.0, 0.50 + (metaBonuses?.critDamageMultBonus ?? 0) + hollowStacks * 0.20 + voidCatalystStacks * 0.40);

    // Leather Vest % damage reduction: 2% at level 1, diminishing returns up to 70% at level 300, capped at 70% (+ meta reduction)
    let damageReduction = metaBonuses?.damageReductionBonus ?? 0;
    if (counts.vestCount > 0) {
      damageReduction += 0.02 * Math.pow(counts.vestCount, Math.log(35) / Math.log(300));
    }
    damageReduction = Math.min(0.70, damageReduction);

    // Attack Cooldown Multiplier
    const watchReduction = counts.watchCount <= 0 ? 0 : Math.min(0.30, 0.01 * Math.pow(counts.watchCount, Math.log(30) / Math.log(300)));
    const metaCdr = metaBonuses?.cooldownReductionBonus ?? 0;
    const watchMult = Math.max(0.60, 1 - watchReduction - metaCdr);
    const injectorMult = Math.pow(0.90, injectorStacks);
    const overclockMult = Math.pow(0.82, overclockStacks);
    const cooldownMultiplier = Math.max(0.15, watchMult * injectorMult * overclockMult);

    for (const weapon of weapons) {
      weapon.cooldownMultiplier = cooldownMultiplier / (1 + (alacrityBuff?.value ?? 0));
    }

    // Magnet pickup radius: base 4m, +10% at level 1 (+0.4m), diminishing returns up to 50m at level 300, capped at 50m (+ meta bonus)
    let pickupRadius = 4.0;
    if (counts.magnetCount > 0) {
      pickupRadius = 4.0 + 0.4 * Math.pow(counts.magnetCount, Math.log((50.0 - 4.0) / 0.4) / Math.log(300));
    }
    pickupRadius = Math.min(50.0, pickupRadius + (metaBonuses?.pickupRadiusBonus ?? 0));

    // Speed Boots: +3% speed at level 1, diminishing returns up to x3.0 at level 300, capped at x3.0 (+ meta bonus)
    const bootsBonus = counts.speedBootsCount <= 0 ? 0 : 0.03 * Math.pow(counts.speedBootsCount, Math.log(200 / 3) / Math.log(300));
    const passiveSpeedMultiplier = Math.min(3.0, 1.0 + bootsBonus + (metaBonuses?.speedMultiplierBonus ?? 0));

    // Apply speed cheat or base speed * passive multiplier + speed buff
    const baseSpd = cheats.isSpeedCheat ? baseSpeed * 2.2 : (baseSpeed * passiveSpeedMultiplier);
    const speed = baseSpd * (1 + speedBonus);

    // Amplifier additive scaling: 100 stacks = +200%, 138 stacks = +276%
    // Elixir of Might: +5% damage per stack (+0.05)
    // Meta progression Offense bonus
    const passiveDamageMultiplier = 1.0 + (counts.amplifierCount * 0.02) + (counts.mightElixirCount * 0.05) + (metaBonuses?.damageMultiplierBonus ?? 0);

    // Apply 1-hit kill cheat or base damage * passive multiplier + damage buff
    const ampMult = (1 + getItemStacks('energy_amplifier') * 0.18) * (1 + getItemStacks('void_catalyst') * 0.15);
    const baseDmg = cheats.isOneHitKill ? 50.0 : (baseDamageMultiplier * passiveDamageMultiplier * ampMult);
    const damageMultiplier = baseDmg * (1 + dmgBonus);

    return {
      hpRegen,
      maxShield,
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
