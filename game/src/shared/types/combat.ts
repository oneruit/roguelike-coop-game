export type MeleeWeaponId = 'katana_slash' | 'whirlwind_slash' | 'greatsword' | 'flail';

/** Cosmetic attack data; never participates in damage or collision checks. */
export interface MeleeAttackInfo {
  weaponId: MeleeWeaponId;
  x: number;
  y: number;
  z: number;
  radius: number;
  angle: number;
}
