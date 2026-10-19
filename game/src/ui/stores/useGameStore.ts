import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type GameStateEnum =
  | 'MAIN_MENU'
  | 'CHARACTER_SELECT'
  | 'HOST_LOBBY'
  | 'JOIN_LOBBY'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER';

export interface GameStoreState {
  gameState: GameStateEnum;
  gameTime: number;
  currentSeed: string;
  isTrainingMode: boolean;
  isDevMode: boolean;
  isVictory: boolean;

  setGameState: (state: GameStateEnum) => void;
  setGameTime: (time: number) => void;
  setCurrentSeed: (seed: string) => void;
  setTrainingMode: (enabled: boolean) => void;
  setDevMode: (enabled: boolean) => void;
  setVictory: (isVictory: boolean) => void;
  resetGame: () => void;
}

/**
 * Global game lifecycle store for game states, timers, and dev mode.
 * Uses subscribeWithSelector middleware for fine-grained non-re-rendering subscriptions.
 */
export const useGameStore = create<GameStoreState>()(
  subscribeWithSelector((set) => ({
    gameState: 'MAIN_MENU',
    gameTime: 0,
    currentSeed: '',
    isTrainingMode: false,
    isDevMode: false,
    isVictory: false,

    setGameState: (state) => set({ gameState: state }),
    setGameTime: (time) => set({ gameTime: time }),
    setCurrentSeed: (seed) => set({ currentSeed: seed }),
    setTrainingMode: (enabled) => set({ isTrainingMode: enabled }),
    setDevMode: (enabled) => set({ isDevMode: enabled }),
    setVictory: (isVictory) => set({ isVictory }),
    resetGame: () =>
      set({
        gameState: 'MAIN_MENU',
        gameTime: 0,
        isVictory: false
      })
  }))
);
