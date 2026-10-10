import type { InvokerSpellCast, SpellControl } from '../InvokerSpells';
/**
 * Shared Network Protocol Contracts & Types
 * Defines the complete synchronization contract between Host, Clients, and Dedicated Server.
 */

import {
  CharacterType,
  HeroAnimState,
  SpriteDirection,
  BuffType,
  GemType,
  EnemyType,
  PlayerStats
} from './entities';

import type { MeleeWeaponId } from './combat';

export type NetRole = 'solo' | 'host' | 'client';

export interface EnemySnapshot {
  id: string;
  type: EnemyType;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  dir: SpriteDirection;
  isImmortal?: boolean;
}

export interface DropSnapshot {
  id: string;
  type: GemType;
  x: number;
  z: number;
}

export interface NetWeaponInfo {
  id: string;
  name: string;
  icon: string;
  level: number;
}

export interface NetBuffInfo {
  type: BuffType;
  name?: string;
  icon?: string;
  color?: string;
  duration: number;
  maxDuration: number;
}

export interface PlayerNetState {
  id: string;
  x: number;
  z: number;
  dir: SpriteDirection;
  anim: HeroAnimState;
  hp: number;
  maxHp: number;
  level: number;
  xp?: number;
  xpToNextLevel?: number;
  credits?: number;
  isDowned: boolean;
  reviveProgress?: number;
  charType: CharacterType;
  kills: number;
  damageDealt: number;
  weapons?: NetWeaponInfo[];
  buffs?: NetBuffInfo[];
  riftItems?: Record<string, number>;
}

export interface DamageDealtEvent {
  enemyId: string;
  damage: number;
  sourceX: number;
  sourceZ: number;
  isFatal?: boolean;
  attackerId?: string;
  control?: SpellControl;
}

export interface NetShotInfo {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy?: number;
  dz: number;
  spd: number;
  lt: number;
  rad: number;
  col: number;
  mag?: boolean;
  orb?: boolean;
  orad?: number;
  ospd?: number;
  ownerId: string;
  arr?: boolean;
  kkr?: boolean;
  ltg?: boolean;
  ice?: boolean;
  fb?: boolean;
  melee?: MeleeWeaponId;
  spell?: InvokerSpellCast;
}

export interface NetEvent {
  enemyId?: string;
  control?: SpellControl;
  type:
    | 'damage_num'
    | 'altar_captured'
    | 'boss_spawn'
    | 'boss_defeat'
    | 'revive'
    | 'sound'
    | 'level_up'
    | 'xp_gain'
    | 'spell_control'
    | 'shot'
    | 'credit_gain'
    | 'chest_opened'
    | 'teleporter_activated'
    | 'stage_warp';
  x?: number;
  z?: number;
  val?: number | string;
  name?: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  altarType?: BuffType;
  buffDuration?: number;
  playerId?: string;
  targetId?: string;
  killer?: string;
  chestId?: string;
  stage?: number;
  biomeName?: string;
  reviverId?: string;
  shot?: NetShotInfo;
}

export interface LobbyPlayerInfo {
  id: string; // 'p1', 'p2', 'p3', 'p4', 'p5'
  name: string;
  hero: CharacterType;
  charType?: CharacterType;
  heroName?: string;
  isHost: boolean;
  isReady: boolean;
  colorHex: number;
  colorCss: string;
}

export const PLAYER_COLORS: Record<string, { hex: number; css: string; name: string }> = {
  p1: { hex: 0xf59e0b, css: '#f59e0b', name: 'Игрок 1' },
  p2: { hex: 0x06b6d4, css: '#06b6d4', name: 'Игрок 2' },
  p3: { hex: 0xa855f7, css: '#a855f7', name: 'Игрок 3' },
  p4: { hex: 0xf97316, css: '#f97316', name: 'Игрок 4' },
  p5: { hex: 0x10b981, css: '#10b981', name: 'Игрок 5' }
};

export const AVAILABLE_SLOT_IDS = ['p2', 'p3', 'p4', 'p5'];

export function getPlayerSlotNumber(slotId: string): number {
  if (slotId === 'p1' || slotId === 'host') return 1;
  if (slotId === 'p2') return 2;
  if (slotId === 'p3') return 3;
  if (slotId === 'p4') return 4;
  if (slotId === 'p5') return 5;
  const match = slotId.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

export function getPlayerSlotDisplayName(slotId: string, isLocal = false): string {
  const num = getPlayerSlotNumber(slotId);
  return isLocal ? `Игрок ${num} (Вы)` : `Игрок ${num}`;
}

export interface ChestSyncInfo {
  id: string;
  tier: 'small' | 'large' | 'legendary';
  baseCost: number;
  x: number;
  z: number;
  isOpened: boolean;
}

export interface TeleporterSyncInfo {
  x: number;
  z: number;
  isActivated: boolean;
  chargeProgress: number;
  isCompleted: boolean;
  isDiscovered?: boolean;
}

export interface HostSnapshotMessage {
  type: 'HOST_SNAPSHOT';
  stage?: number;
  players: Record<string, PlayerNetState>; // All players: p1 + all active clients
  stats: Record<string, PlayerStats>; // All player stats
  gameTime: number;
  totalKills: number;
  boss: { hp: number; maxHp: number; isAlive: boolean } | null;
  enemies: EnemySnapshot[];
  drops: DropSnapshot[];
  chests?: ChestSyncInfo[];
  teleporter?: TeleporterSyncInfo;
  events: NetEvent[];
  damageTakenByClient?: Record<string, number>; // clientId -> damage taken
  hostPlayer?: PlayerNetState;
  hostStats?: PlayerStats;
  clientStats?: PlayerStats;
  clientDamageTaken?: number;
}

export interface ClientSyncMessage {
  type: 'CLIENT_SYNC';
  clientId: string;
  clientPlayer: PlayerNetState;
  clientStats: PlayerStats;
  damageDealt: DamageDealtEvent[];
  collectedGemIds: string[];
  openedChestIds?: string[];
  isRevivingPartner: boolean;
  revivingTargetId?: string;
  reviveProgress?: number;
  shots?: NetShotInfo[];
}

export interface LobbyUpdateMessage {
  type: 'LOBBY_UPDATE';
  players: LobbyPlayerInfo[];
}

export interface GameStartMessage {
  type: 'GAME_START';
  players: LobbyPlayerInfo[];
  seed: number;
}

export interface ReviveActionMessage {
  type: 'REVIVE_ACTION';
  reviverId?: string;
  targetId: string;
  target?: string;
  progress?: number;
}

export type NetMessage =
  | { type: 'HELLO'; clientId?: string; hero: CharacterType; name?: string; password?: string }
  | { type: 'HELLO_ACK'; assignedId: string; players: LobbyPlayerInfo[] }
  | { type: 'JOIN_REJECTED'; reason: 'WRONG_PASSWORD' | 'ROOM_FULL' | 'GAME_STARTED'; message: string }
  | { type: 'HERO_SELECT'; playerId: string; hero: CharacterType }
  | { type: 'PLAYER_READY'; playerId: string; isReady: boolean }
  | { type: 'ALTAR_CAPTURED'; altarType: BuffType; playerId: string }
  | { type: 'CHEST_OPENED'; chestId: string; playerId: string; itemId?: string }
  | { type: 'WARP_REQUEST'; playerId?: string }
  | LobbyUpdateMessage
  | GameStartMessage
  | HostSnapshotMessage
  | ClientSyncMessage
  | ReviveActionMessage
  | { type: 'DISCONNECT'; playerId: string }
  | { type: 'PING'; timestamp: number; fromId: string; targetId?: string }
  | { type: 'PONG'; timestamp: number; fromId: string; targetId: string }
  | { type: 'DEV_ACTION'; action: string; value?: any };
