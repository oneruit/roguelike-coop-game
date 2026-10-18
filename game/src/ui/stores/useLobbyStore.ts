import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface LobbyPeer {
  id: string;
  name: string;
  charType: string;
  isReady: boolean;
  isHost: boolean;
  ping?: number;
}

export interface LobbyStoreState {
  roomCode: string | null;
  role: 'solo' | 'host' | 'client';
  mySlotId: string | null;
  peers: LobbyPeer[];
  isConnecting: boolean;
  errorMessage: string | null;

  setRoomCode: (code: string | null) => void;
  setRole: (role: 'solo' | 'host' | 'client') => void;
  setMySlotId: (slotId: string | null) => void;
  setPeers: (peers: LobbyPeer[]) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  resetLobby: () => void;
}

/**
 * Co-op Lobby store coordinating network rooms, slots, and peer readiness.
 */
export const useLobbyStore = create<LobbyStoreState>()(
  subscribeWithSelector((set) => ({
    roomCode: null,
    role: 'solo',
    mySlotId: null,
    peers: [],
    isConnecting: false,
    errorMessage: null,

    setRoomCode: (code) => set({ roomCode: code }),
    setRole: (role) => set({ role }),
    setMySlotId: (slotId) => set({ mySlotId: slotId }),
    setPeers: (peers) => set({ peers }),
    setConnecting: (connecting) => set({ isConnecting: connecting }),
    setError: (error) => set({ errorMessage: error }),
    resetLobby: () =>
      set({
        roomCode: null,
        role: 'solo',
        mySlotId: null,
        peers: [],
        isConnecting: false,
        errorMessage: null
      })
  }))
);
