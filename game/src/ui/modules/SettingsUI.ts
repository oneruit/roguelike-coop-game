import { SettingsScreen, SettingsScreenOptions } from '../screens/Settings/SettingsScreen';

export type SettingsUIContext = SettingsScreenOptions;

/**
 * @deprecated Use SettingsScreen from '../screens/Settings/SettingsScreen'
 */
export class SettingsUI extends SettingsScreen {
  constructor(ctx: SettingsUIContext) {
    super(ctx);
  }
}
