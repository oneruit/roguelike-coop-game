import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type ModalType =
  | 'main_menu'
  | 'character_select'
  | 'host_lobby'
  | 'join_lobby'
  | 'settings'
  | 'shop'
  | 'inventory'
  | 'level_up'
  | 'quests'
  | 'game_over'
  | 'dev_panel'
  | 'auth'
  | 'leaderboard';

export interface LevelUpOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
  type: 'new_weapon' | 'upgrade_weapon' | 'passive_buff' | 'might_elixir';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UIModalStoreState {
  activeModal: ModalType | null;
  modalStack: ModalType[];
  isInventoryOpen: boolean;
  isMapOpen: boolean;
  isLevelUpOpen: boolean;
  levelUpChoices: LevelUpOption[];
  pendingLevelUps: number;

  openModal: (modal: ModalType, pushToStack?: boolean) => void;
  closeModal: (modal?: ModalType) => void;
  closeAllModals: () => void;
  toggleInventory: (forced?: boolean) => void;
  toggleMap: (forced?: boolean) => void;
  openLevelUp: (choices: LevelUpOption[]) => void;
  closeLevelUp: () => void;
  setPendingLevelUps: (count: number) => void;
}

/**
 * UI Modal store coordinating modal stack, overlays, and card draft dialogs.
 */
export const useUIModalStore = create<UIModalStoreState>()(
  subscribeWithSelector((set, get) => ({
    activeModal: null,
    modalStack: [],
    isInventoryOpen: false,
    isMapOpen: false,
    isLevelUpOpen: false,
    levelUpChoices: [],
    pendingLevelUps: 0,

    openModal: (modal, pushToStack = true) => {
      const current = get().activeModal;
      const stack = pushToStack && current ? [...get().modalStack, current] : get().modalStack;
      set({
        activeModal: modal,
        modalStack: stack
      });
    },

    closeModal: (modal) => {
      const current = get().activeModal;
      if (modal && current !== modal) return;

      const stack = [...get().modalStack];
      const previous = stack.pop() || null;
      set({
        activeModal: previous,
        modalStack: stack
      });
    },

    closeAllModals: () => {
      set({
        activeModal: null,
        modalStack: [],
        isInventoryOpen: false,
        isMapOpen: false,
        isLevelUpOpen: false
      });
    },

    toggleInventory: (forced) => {
      const next = typeof forced === 'boolean' ? forced : !get().isInventoryOpen;
      set({ isInventoryOpen: next });
    },

    toggleMap: (forced) => {
      const next = typeof forced === 'boolean' ? forced : !get().isMapOpen;
      set({ isMapOpen: next });
    },

    openLevelUp: (choices) => {
      set({
        isLevelUpOpen: true,
        levelUpChoices: choices,
        activeModal: 'level_up'
      });
    },

    closeLevelUp: () => {
      set((state) => ({
        isLevelUpOpen: false,
        levelUpChoices: [],
        activeModal: state.activeModal === 'level_up' ? null : state.activeModal
      }));
    },

    setPendingLevelUps: (count) => set({ pendingLevelUps: count })
  }))
);
