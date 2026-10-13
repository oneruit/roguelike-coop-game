import {
  LevelUpScreen,
  LevelUpScreenOptions,
  LevelUpScreenElements,
  UpgradeOption,
  getWeaponIconUrl
} from '../screens/LevelUp/LevelUpScreen';

export type { UpgradeOption };
export { getWeaponIconUrl };

export type LevelUpUIElements = LevelUpScreenElements;
export type LevelUpUIContext = LevelUpScreenOptions;

/**
 * @deprecated Use LevelUpScreen from '../screens/LevelUp/LevelUpScreen'
 */
export class LevelUpUI extends LevelUpScreen {
  constructor(ctx: LevelUpUIContext) {
    super(ctx);
  }
}
