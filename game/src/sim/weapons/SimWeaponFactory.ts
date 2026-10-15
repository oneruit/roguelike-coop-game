import { CharacterType } from '../types';
import { invokerSpellFromWeaponId } from '../../shared/InvokerSpells';
import { SimWeapon } from './SimWeaponBase';
import {
  SimBowWeapon,
  SimKukriWeapon,
  SimAssaultRifleWeapon
} from './SimRangedWeapons';
import {
  SimWhirlwindSlashWeapon,
  SimGreatswordWeapon,
  SimFlailWeapon,
  SimReaperScytheWeapon,
  SimKatanaSlashWeapon
} from './SimMeleeWeapons';
import {
  SimAstralStaffWeapon,
  SimFireRingWeapon,
  SimChakramWeapon,
  SimLightningStrikeWeapon,
  SimIceSpikeWeapon,
  SimFireballWeapon,
  SimPoisonPuddleWeapon
} from './SimMagicWeapons';
import { SimInvokerWeapon } from './SimInvokerWeapon';

/** Creates the starting weapon for character selection. */
export function createSimWeaponForCharacter(charType: CharacterType): SimWeapon {
  switch (charType) {
    case 'invoker':
      return new SimInvokerWeapon();
    case 'valkyrie':
      return new SimGreatswordWeapon();
    case 'flail':
      return new SimFlailWeapon();
    case 'sorceress':
    case 'necromancer':
      return new SimAstralStaffWeapon();
    case 'chakram':
      return new SimChakramWeapon();
    case 'archer':
      return new SimBowWeapon();
    case 'rocket':
      return new SimAssaultRifleWeapon();
    case 'amazon':
      return new SimReaperScytheWeapon();
    case 'ronin':
    default:
      return new SimWhirlwindSlashWeapon();
  }
}

/**
 * Creates weapon by ID
 */
export function createSimWeaponById(id: string): SimWeapon | null {
  if (id === 'invoker_invoke') return new SimInvokerWeapon();
  const spell = invokerSpellFromWeaponId(id);
  if (spell) return new SimInvokerWeapon(spell);
  switch (id) {
    case 'bow':
    case 'heavy_colt':
      return new SimBowWeapon();
    case 'assault_rifle':
      return new SimAssaultRifleWeapon();
    case 'kukri':
    case 'dual_revolvers':
      return new SimKukriWeapon();
    case 'whirlwind_slash':
      return new SimWhirlwindSlashWeapon();
    case 'greatsword':
      return new SimGreatswordWeapon();
    case 'flail':
      return new SimFlailWeapon();
    case 'astral_staff':
      return new SimAstralStaffWeapon();
    case 'chakram':
      return new SimChakramWeapon();
    case 'lightning_strike':
      return new SimLightningStrikeWeapon();
    case 'ice_spike':
      return new SimIceSpikeWeapon();
    case 'fireball':
      return new SimFireballWeapon();
    case 'reaper_scythe':
    case 'orbiting_barrier':
      return new SimReaperScytheWeapon();
    case 'fire_ring':
    case 'holy_aura':
      return new SimFireRingWeapon();
    case 'katana_slash':
      return new SimKatanaSlashWeapon();
    case 'poison_puddle':
      return new SimPoisonPuddleWeapon();
    default:
      return null;
  }
}
