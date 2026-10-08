import { HUD } from '../ui/HUD';
import { NetworkManager } from './NetworkManager';
import { Player, CharacterType } from '../entities/Player';
import { RoomDirectory } from './RoomDirectory';

export class LobbyCoordinator {
  private hud: HUD;
  private net: NetworkManager;
  private player: Player;
  private roomPollingTimer: number | null = null;

  public onSinglePlayerSelected?: () => void;
  public onHostStartExpedition?: (seedInput?: string) => void;
  public onReturnToMenu?: () => void;
  public onHostLobbyOpened?: () => void;
  public onJoinLobbyOpened?: () => void;

  constructor(hud: HUD, net: NetworkManager, player: Player) {
    this.hud = hud;
    this.net = net;
    this.player = player;

    this.setupMenuNavigation();
  }

  private setupMenuNavigation(): void {
    this.hud.onSinglePlayerSelected = () => {
      this.net.reset();
      this.player.isCoop = false;
      this.hud.showCharacterSelect();
      this.onSinglePlayerSelected?.();
    };

    this.hud.onCreateRoomClicked = () => {
      this.openHostLobby();
    };

    this.hud.onJoinRoomClicked = () => {
      this.openJoinLobby();
    };

    this.hud.onReturnToMenu = () => {
      this.stopRoomPolling();
      this.onReturnToMenu?.();
    };

    this.hud.onHostHeroChanged = (hero) => {
      this.player.setCharacter(hero);
      this.net.setHero(hero);
      this.hud.renderHostRoster(this.net.lobbyPlayers);
    };

    this.hud.onGuestHeroChanged = (hero) => {
      this.player.setCharacter(hero);
      if (this.net.isConnected) {
        this.net.setHero(hero);
      }
    };

    this.hud.onHostStartExpedition = (seedInput) => {
      this.onHostStartExpedition?.(seedInput);
    };

    this.hud.onHostPasswordChanged = (pwd) => {
      this.net.setPassword(pwd);
    };

    this.hud.onRefreshRoomsClicked = async () => {
      const rooms = await RoomDirectory.fetchRooms();
      this.hud.renderAvailableRooms(rooms);
    };

    this.hud.onGuestConnectClicked = (roomCode, hero, password) => {
      this.connectAsGuest(roomCode, hero, password);
    };

    this.hud.onGuestReadyToggle = (isReady) => {
      this.net.setReady(isReady);
    };
  }

  public async openHostLobby(): Promise<void> {
    this.onHostLobbyOpened?.();
    const roomCode = NetworkManager.generateRoomCode();
    const hero = this.player.charType || 'ronin';
    this.hud.showHostLobby(roomCode, hero);
    await this.net.createRoom(roomCode, hero);
  }

  public openJoinLobby(): void {
    this.onJoinLobbyOpened?.();
    const nextHero: CharacterType =
      this.player.charType === 'ronin'
        ? 'valkyrie'
        : this.player.charType === 'valkyrie'
        ? 'flail'
        : this.player.charType === 'flail'
        ? 'sorceress'
        : this.player.charType === 'sorceress'
        ? 'chakram'
        : this.player.charType === 'chakram'
        ? 'archer'
        : 'ronin';
    this.hud.showJoinLobby(nextHero);
    this.startRoomPolling();
  }

  public startRoomPolling(): void {
    this.stopRoomPolling();
    RoomDirectory.fetchRooms().then((rooms) => {
      this.hud.renderAvailableRooms(rooms);
    });

    this.roomPollingTimer = window.setInterval(async () => {
      if (!this.hud.isGuestConnected) {
        const rooms = await RoomDirectory.fetchRooms();
        this.hud.renderAvailableRooms(rooms);
      } else {
        this.stopRoomPolling();
      }
    }, 3500);
  }

  public stopRoomPolling(): void {
    if (this.roomPollingTimer) {
      clearInterval(this.roomPollingTimer);
      this.roomPollingTimer = null;
    }
  }

  public async connectAsGuest(roomCode: string, hero: CharacterType, password?: string): Promise<void> {
    const upperCode = roomCode.toUpperCase().trim();
    this.hud.setJoinStatus(`Подключение к комнате ${upperCode}...`, false);
    this.player.setCharacter(hero);
    const ok = await this.net.joinRoom(upperCode, hero, password);
    if (ok || this.net.isConnected) {
      this.stopRoomPolling();
      this.hud.setGuestConnectedMode(true);
      if (!this.hud.isGuestReady) {
        this.hud.setJoinStatus(`Подключено к ${upperCode}! Нажмите «ГОТОВ» для подтверждения.`, false);
      }
      this.hud.renderJoinRoster(this.net.lobbyPlayers, this.net.mySlotId);
    } else {
      this.hud.setGuestConnectedMode(false);
      if (!this.hud.isGuestConnected) {
        this.hud.setJoinStatus('Не удалось подключиться. Проверьте код комнаты или пароль!', true);
      }
    }
  }
}
