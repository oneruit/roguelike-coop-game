import type { CharacterType } from '../shared/types/entities';
import { invokerSpellFromWeaponId } from '../shared/InvokerSpells';

/** The pool is already shuffled and filtered for ownership, prerequisites and weapon slots. */
export function selectWeaponUpgradeOptions<T extends { id: string }>(
  shuffled: readonly T[],
  hero: CharacterType
): T[] {
  if (hero !== 'invoker') return shuffled.slice(0, 3);

  const newSpells = shuffled.filter(option =>
    option.id.startsWith('new_') && invokerSpellFromWeaponId(option.id.slice(4)) !== null
  );
  if (newSpells.length === 0) return shuffled.slice(0, 3);

  // Prefer two new Invoker spells while keeping an existing weapon upgrade available.
  const upgrade = shuffled.find(option => option.id.startsWith('upgrade_'));
  const selected = newSpells.slice(0, upgrade ? 2 : 3);
  if (upgrade) selected.push(upgrade);

  // Fill any remaining cards from the normal pool without repeating an option.
  return [...selected, ...shuffled.filter(option => !selected.includes(option))].slice(0, 3);
}
