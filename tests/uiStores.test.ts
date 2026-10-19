import test from 'node:test';
import assert from 'node:assert/strict';
import {
  useGameStore,
  usePlayerStore,
  useUIModalStore,
  useLobbyStore,
  GameStateBridge
} from '../game/src/ui/stores';

test('useGameStore - State transitions and subscriptions', () => {
  const store = useGameStore.getState();
  store.resetGame();

  assert.equal(useGameStore.getState().gameState, 'MAIN_MENU');
  store.setGameState('PLAYING');
  assert.equal(useGameStore.getState().gameState, 'PLAYING');

  store.setCurrentSeed('TEST-SEED-123');
  assert.equal(useGameStore.getState().currentSeed, 'TEST-SEED-123');
});

test('usePlayerStore - Immediate events vs discrete state', () => {
  const store = usePlayerStore.getState();
  store.resetPlayerStats();

  // Immediate state
  assert.equal(usePlayerStore.getState().isAlive, true);
  store.setAlive(false);
  assert.equal(usePlayerStore.getState().isAlive, false);

  store.triggerDamageFlash(25);
  assert.equal(usePlayerStore.getState().damageFlashAmount, 25);

  store.setActiveBoss({
    name: 'Grave Robber',
    tier: 1,
    hp: 500,
    maxHp: 1000,
    hpPercent: 50
  });
  assert.equal(usePlayerStore.getState().activeBoss?.name, 'Grave Robber');
});

test('useUIModalStore - Modal stack and level-up choices', () => {
  const store = useUIModalStore.getState();
  store.closeAllModals();

  assert.equal(useUIModalStore.getState().activeModal, null);
  store.openModal('settings');
  assert.equal(useUIModalStore.getState().activeModal, 'settings');

  // Push second modal
  store.openModal('auth');
  assert.equal(useUIModalStore.getState().activeModal, 'auth');
  assert.deepEqual(useUIModalStore.getState().modalStack, ['settings']);

  // Close top modal (returns to previous)
  store.closeModal('auth');
  assert.equal(useUIModalStore.getState().activeModal, 'settings');

  // Level Up
  store.openLevelUp([
    { id: 'w1', name: 'Bow', description: 'Ranged attack', type: 'new_weapon' }
  ]);
  assert.equal(useUIModalStore.getState().isLevelUpOpen, true);
  assert.equal(useUIModalStore.getState().levelUpChoices.length, 1);

  store.closeLevelUp();
  assert.equal(useUIModalStore.getState().isLevelUpOpen, false);
});

test('useLobbyStore - Network room state and peer updates', () => {
  const store = useLobbyStore.getState();
  store.resetLobby();

  assert.equal(useLobbyStore.getState().roomCode, null);
  store.setRoomCode('RIFT-404');
  store.setRole('host');
  store.setPeers([
    { id: 'p1', name: 'Player 1', charType: 'ronin', isReady: true, isHost: true }
  ]);

  assert.equal(useLobbyStore.getState().roomCode, 'RIFT-404');
  assert.equal(useLobbyStore.getState().role, 'host');
  assert.equal(useLobbyStore.getState().peers.length, 1);
});

test('GameStateBridge - Minimap fast-path streaming (non-React)', () => {
  const bridge = GameStateBridge.getInstance();
  bridge.cleanup();

  let receivedPlayerX = 0;
  let receivedCount = 0;

  const unsubscribe = bridge.subscribeMinimap((snapshot) => {
    receivedPlayerX = snapshot.playerX;
    receivedCount = snapshot.entities.length;
  });

  bridge.emitMinimapSnapshot({
    playerX: 120,
    playerZ: -50,
    entities: [{ x: 125, z: -45, type: 'enemy' }]
  });

  assert.equal(receivedPlayerX, 120);
  assert.equal(receivedCount, 1);

  unsubscribe();
});
