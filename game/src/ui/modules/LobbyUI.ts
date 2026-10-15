import {
  LobbyScreen,
  LobbyScreenOptions,
  LobbyScreenElements
} from '../screens/Lobby/LobbyScreen';

export type LobbyUIElements = LobbyScreenElements;
export type LobbyUIContext = LobbyScreenOptions;

/**
 * @deprecated Use LobbyScreen from '../screens/Lobby/LobbyScreen'
 */
export class LobbyUI extends LobbyScreen {
  constructor(ctx: LobbyUIContext) {
    super(ctx);
  }
}
