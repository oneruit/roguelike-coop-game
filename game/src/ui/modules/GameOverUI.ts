import {
  GameOverScreen,
  GameOverScreenOptions,
  DetailedPlayerResult,
  BattlePassGameOverResult
} from '../screens/GameOver/GameOverScreen';

export type { DetailedPlayerResult, BattlePassGameOverResult };

/**
 * @deprecated Use GameOverScreen from '../screens/GameOver/GameOverScreen'
 */
export class GameOverUI extends GameOverScreen {
  constructor(options?: GameOverScreenOptions) {
    super(options);
  }
}
