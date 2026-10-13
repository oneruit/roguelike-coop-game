import {
  CharacterSelectScreen,
  CharacterSelectScreenOptions
} from '../screens/CharacterSelect/CharacterSelectScreen';

export type CharacterSelectUIOptions = CharacterSelectScreenOptions;

/**
 * @deprecated Use CharacterSelectScreen from '../screens/CharacterSelect/CharacterSelectScreen'
 */
export class CharacterSelectUI extends CharacterSelectScreen {
  constructor(options: CharacterSelectUIOptions) {
    super(options);
  }
}
