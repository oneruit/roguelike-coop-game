import { Weapon } from './WeaponBase';
import {
  BowWeapon,
  ChakramWeapon,
  AssaultRifleWeapon,
  KukriWeapon,
  KatanaSlashWeapon,
  WhirlwindSlashWeapon,
  GreatswordWeapon,
  FlailWeapon,
  ReaperScytheWeapon,
  FireRingWeapon,
  AstralStaffWeapon,
  LightningStrikeWeapon,
  IceSpikeWeapon,
  FireballWeapon,
  PoisonPuddleWeapon,
  SummonUndeadWeapon,
  BloodBatsWeapon
} from './weapons';
import { InvokerWeapon, InvokerQuasWeapon, InvokerWexWeapon, InvokerExortWeapon } from './InvokerWeapons';
import { INVOKER_SPELL_IDS, type InvokerSpellId } from '../shared/InvokerSpells';

export function createWeaponInstanceById(id: string): Weapon | null {
  switch (id) {
    case 'bow':
      return new BowWeapon();
    case 'chakram':
      return new ChakramWeapon();
    case 'assault_rifle':
      return new AssaultRifleWeapon();
    case 'kukri':
      return new KukriWeapon();
    case 'katana_slash':
      return new KatanaSlashWeapon();
    case 'whirlwind_slash':
      return new WhirlwindSlashWeapon();
    case 'greatsword':
      return new GreatswordWeapon();
    case 'flail':
      return new FlailWeapon();
    case 'reaper_scythe':
      return new ReaperScytheWeapon();
    case 'fire_ring':
      return new FireRingWeapon();
    case 'astral_staff':
      return new AstralStaffWeapon();
    case 'lightning_strike':
      return new LightningStrikeWeapon();
    case 'ice_spike':
      return new IceSpikeWeapon();
    case 'fireball':
      return new FireballWeapon();
    case 'poison_puddle':
      return new PoisonPuddleWeapon();
    case 'summon_undead':
      return new SummonUndeadWeapon();
    case 'blood_bats':
      return new BloodBatsWeapon();
    default:
      if (id === 'invoker_invoke') {
        return new InvokerWeapon(null);
      }
      if (id === 'invoker_quas') {
        return new InvokerQuasWeapon();
      }
      if (id === 'invoker_wex') {
        return new InvokerWexWeapon();
      }
      if (id === 'invoker_exort') {
        return new InvokerExortWeapon();
      }
      if (id.startsWith('invoker_')) {
        const spellKey = id.replace('invoker_', '');
        if ((INVOKER_SPELL_IDS as readonly string[]).includes(spellKey)) {
          return new InvokerWeapon(spellKey as InvokerSpellId);
        }
      }
      return null;
  }
}
