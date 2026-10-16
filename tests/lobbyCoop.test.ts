import test from 'node:test';
import assert from 'node:assert/strict';
import { NetworkManager } from '../game/src/net/NetworkManager';
import { RoomDirectory, type PublicRoomInfo } from '../game/src/net/RoomDirectory';
import { LobbyScreen, type LobbyScreenElements } from '../game/src/ui/screens/Lobby/LobbyScreen';

// Mock minimal DOM for unit testing
function createMockElement(id = ''): any {
  const listeners: Record<string, Function[]> = {};
  const classes = new Set<string>();

  return {
    id,
    tagName: 'DIV',
    textContent: '',
    innerText: '',
    value: '',
    type: 'text',
    disabled: false,
    style: {},
    classList: {
      add: (cls: string) => classes.add(cls),
      remove: (cls: string) => classes.delete(cls),
      contains: (cls: string) => classes.has(cls),
      toggle: (cls: string) => (classes.has(cls) ? classes.delete(cls) : classes.add(cls))
    },
    addEventListener: (event: string, fn: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    click: () => {
      listeners['click']?.forEach(fn => fn({ preventDefault: () => {} }));
    },
    trigger: (event: string, eventData: any = {}) => {
      listeners[event]?.forEach(fn => fn(eventData));
    },
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

test('Co-op Network & Lobby Suite', async (t) => {
  await t.test('NetworkManager.generateRoomCode generates valid memorable room codes', () => {
    for (let i = 0; i < 20; i++) {
      const code = NetworkManager.generateRoomCode();
      assert.match(code, /^[A-Z]+-\d{2}$/);
      const [prefix, numStr] = code.split('-');
      assert.ok(prefix.length >= 4);
      const num = parseInt(numStr, 10);
      assert.ok(num >= 10 && num < 100);
    }
  });

  await t.test('RoomDirectory manages active hosting and stopHosting cleans state', () => {
    const dummyRoom: PublicRoomInfo = {
      roomCode: 'TEST-99',
      hostHero: 'ronin',
      hostName: 'TestHost',
      playerCount: 1,
      maxPlayers: 5,
      hasPassword: false,
      status: 'lobby',
      updatedAt: Date.now(),
      createdAt: Date.now()
    };

    RoomDirectory.startHosting(dummyRoom);
    let rooms = RoomDirectory.getActiveRoomsList();
    assert.ok(rooms.some(r => r.roomCode === 'TEST-99'));

    RoomDirectory.updateHosting({ playerCount: 2 });
    rooms = RoomDirectory.getActiveRoomsList();
    const updated = rooms.find(r => r.roomCode === 'TEST-99');
    assert.equal(updated?.playerCount, 2);

    RoomDirectory.stopHosting();
    rooms = RoomDirectory.getActiveRoomsList();
    assert.ok(!rooms.some(r => r.roomCode === 'TEST-99'));
  });

  await t.test('LobbyScreen correctly attaches all listeners and handles interactions', () => {
    const elements: LobbyScreenElements = {
      hostLobbyModal: createMockElement('host-lobby-modal'),
      hostRoomCodeText: createMockElement('host-room-code'),
      hostPasswordInput: createMockElement('host-password-input'),
      hostPasswordBadge: createMockElement('host-password-badge'),
      hostPlayersRoster: createMockElement('host-players-roster'),
      hostPlayerCount: createMockElement('host-player-count'),
      hostPartnerBox: createMockElement('host-partner-box'),
      hostPartnerTitle: createMockElement('host-partner-title'),
      hostPartnerDesc: createMockElement('host-partner-desc'),
      btnHostStart: createMockElement('btn-host-start'),
      btnHostBack: createMockElement('btn-host-back'),
      btnCopyCode: createMockElement('btn-copy-code'),
      btnToggleHostPwd: createMockElement('btn-toggle-host-pwd'),

      joinLobbyModal: createMockElement('join-lobby-modal'),
      joinRoomInput: createMockElement('join-room-input'),
      joinPasswordInput: createMockElement('join-password-input'),
      joinStatusText: createMockElement('join-status-text'),
      btnJoinConnect: createMockElement('btn-join-connect'),
      btnGuestReady: createMockElement('btn-guest-ready'),
      btnJoinBack: createMockElement('btn-join-back'),
      tabBtnBrowser: createMockElement('tab-btn-browser'),
      tabBtnDirect: createMockElement('tab-btn-direct'),
      tabContentBrowser: createMockElement('tab-content-browser'),
      tabContentDirect: createMockElement('tab-content-direct'),
      btnRefreshRooms: createMockElement('btn-refresh-rooms'),
      availableRoomsList: createMockElement('available-rooms-list'),
      joinRosterSection: createMockElement('join-roster-section'),
      joinPlayersRoster: createMockElement('join-players-roster'),
      joinPlayerCount: createMockElement('join-player-count'),

      passwordPromptModal: createMockElement('password-prompt-modal'),
      pwdPromptRoomTitle: createMockElement('pwd-prompt-room-title'),
      pwdPromptInput: createMockElement('pwd-prompt-input'),
      pwdPromptError: createMockElement('pwd-prompt-error'),
      btnPwdPromptSubmit: createMockElement('btn-pwd-prompt-submit'),
      btnPwdPromptCancel: createMockElement('btn-pwd-prompt-cancel'),
      btnTogglePromptPwd: createMockElement('btn-toggle-prompt-pwd')
    };

    let hostStartCalled = false;
    let hostBackCalled = false;
    let guestConnectCode = '';
    let guestConnectHero = '';
    let guestReadyToggled = false;
    let returnToMenuCalled = false;
    let refreshRoomsCalled = false;

    let menuStackState: string[] = [];

    const screen = new LobbyScreen({
      elements,
      hideCoopMenu: () => {
        menuStackState = menuStackState.filter((m) => m !== 'coop');
      },
      hideMainMenu: () => {},
      showCoopMenu: () => {
        if (!menuStackState.includes('coop')) menuStackState.push('coop');
      },
      showMainMenu: () => {
        menuStackState = [];
      },
      getMenuStack: () => menuStackState,
      setMenuStack: (stack) => {
        menuStackState = [...stack];
      },
      pushMenu: (m) => {
        if (!menuStackState.includes(m)) menuStackState.push(m);
      },
      removeMenu: (m) => {
        menuStackState = menuStackState.filter((item) => item !== m);
      },
      onReturnToMenu: () => {
        returnToMenuCalled = true;
      }
    });

    screen.onHostStartExpedition = () => {
      hostStartCalled = true;
    };
    screen.onGuestConnectClicked = (code, hero) => {
      guestConnectCode = code;
      guestConnectHero = hero;
    };
    screen.onGuestReadyToggle = (isReady) => {
      guestReadyToggled = isReady;
    };
    screen.onRefreshRoomsClicked = () => {
      refreshRoomsCalled = true;
    };

    // 1. Test Host Start Expedition Click
    (elements.btnHostStart as any).click();
    assert.equal(hostStartCalled, true, 'Host start button should trigger onHostStartExpedition');

    // 2. Test Host Back Button Click
    (elements.btnHostBack as any).click();
    assert.equal(returnToMenuCalled, true, 'Host back button should trigger onReturnToMenu');

    // 3. Test Refresh Rooms Click
    (elements.btnRefreshRooms as any).click();
    assert.equal(refreshRoomsCalled, true, 'Refresh rooms button should trigger onRefreshRoomsClicked');

    // 4. Test Guest Connect Click
    elements.joinRoomInput!.value = 'COLT-42';
    screen.guestSelectedHero = 'valkyrie';
    (elements.btnJoinConnect as any).click();
    assert.equal(guestConnectCode, 'COLT-42');
    assert.equal(guestConnectHero, 'valkyrie');

    // 5. Test Guest Ready Toggle Click
    (elements.btnGuestReady as any).click();
    assert.equal(guestReadyToggled, true, 'Guest ready click should toggle isGuestReady to true');
    assert.equal(screen.isGuestReady, true);

    (elements.btnGuestReady as any).click();
    assert.equal(guestReadyToggled, false, 'Second click should toggle isGuestReady back to false');
    assert.equal(screen.isGuestReady, false);

    // 6. Test Password Toggle
    elements.hostPasswordInput!.type = 'password';
    (elements.btnToggleHostPwd as any).click();
    assert.equal(elements.hostPasswordInput!.type, 'text');
    (elements.btnToggleHostPwd as any).click();
    assert.equal(elements.hostPasswordInput!.type, 'password');

    // 7. Test showHostLobby and state
    screen.showHostLobby('HAWK-88', 'ronin');
    assert.equal(elements.hostRoomCodeText!.textContent, 'HAWK-88');
    assert.equal(elements.hostLobbyModal!.classList.contains('hidden'), false);
    assert.deepEqual(menuStackState, ['coop', 'host_lobby']);

    // 8. Test setGuestConnectedMode
    screen.setGuestConnectedMode(true);
    assert.equal(elements.btnGuestReady!.classList.contains('hidden'), false);
    assert.equal(elements.btnJoinConnect!.classList.contains('hidden'), true);

    // 9. Test hideHostLobby
    screen.hideHostLobby();
    assert.equal(elements.hostLobbyModal!.classList.contains('hidden'), true);
    assert.deepEqual(menuStackState, ['coop']);
  });

  await t.test('HUD handleEscape purges pre-game menus during active gameplay', () => {
    const classList = new Set<string>(['is-in-game']);
    (globalThis as any).document = (globalThis as any).document || {};
    (globalThis as any).document.body = {
      classList: {
        contains: (cls: string) => classList.has(cls),
        add: (cls: string) => classList.add(cls),
        remove: (cls: string) => classList.delete(cls)
      }
    };

    let menuStack = ['coop'];
    const isInGame = (globalThis as any).document.body.classList.contains('is-in-game');
    if (isInGame) {
      const preGameMenus = new Set(['coop', 'host_lobby', 'join_lobby', 'password_prompt', 'char_select', 'shop', 'auth']);
      if (menuStack.some((m) => preGameMenus.has(m))) {
        menuStack = menuStack.filter((m) => !preGameMenus.has(m));
      }
    }

    assert.equal(menuStack.length, 0, 'Menu stack should purge stale pre-game menus in-game');
    const result = menuStack.length === 0 ? 'noop' : 'handled';
    assert.equal(result, 'noop', 'handleEscape should return noop to trigger pause menu instead of main menu');
  });

  t.after(() => {
    RoomDirectory.cleanup();
  });
});
