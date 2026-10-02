export type CharacterType = 'ronin' | 'valkyrie' | 'flail' | 'sorceress' | 'chakram';
export type HeroAnimState = 'IDLE' | 'WALK' | 'ATTACK' | 'WALK_ATTACK';
export type SpriteDirection = 'front' | 'back' | 'left' | 'right';
export type BuffType = 'damage' | 'speed' | 'regen' | 'invulnerable';
export type GemType = 'blue' | 'green' | 'red' | 'gold';

export type EnemyType =
  | 'coyote'
  | 'crawler'
  | 'cactus'
  | 'skeleton'
  | 'ghost'
  | 'scorpion'
  | 'brute'
  | 'bison'
  | 'boss'
  | 'hydra';

export interface ActiveBuff {
  type: BuffType;
  name: string;
  icon: string;
  color: string;
  duration: number;
  maxDuration: number;
  value: number;
}

export interface SimPlayerInput {
  moveX: number;
  moveZ: number;
  dir?: SpriteDirection;
}

export interface SimPlayerStats {
  kills: number;
  damageDealt: number;
  level: number;
  revives: number;
}

export interface SimPlayerState {
  id: string;
  x: number;
  z: number;
  dir: SpriteDirection;
  anim: HeroAnimState;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  isDowned: boolean;
  charType: CharacterType;
  kills: number;
  damageDealt: number;
  revives: number;
  buffs: BuffType[];
}

export interface SimEnemyState {
  id: string;
  type: EnemyType;
  name: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  dir: SpriteDirection;
  isBoss: boolean;
  isImmortal?: boolean;
}

export interface SimProjectileState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  speed: number;
  damage: number;
  radius: number;
  color: number;
  isMagic?: boolean;
  isOrbiting?: boolean;
}

export interface SimDropState {
  id: string;
  type: GemType;
  x: number;
  z: number;
}

export interface SimAltarState {
  id: string;
  type: BuffType;
  x: number;
  z: number;
  radius: number;
  captureProgress: number;
  isCaptured: boolean;
}

export type SimEvent =
  | {
      type: 'damage_num';
      x: number;
      y: number;
      z: number;
      damage: number;
      isCrit: boolean;
      attackerId: string;
      enemyId: string;
    }
  | {
      type: 'enemy_death';
      enemyId: string;
      attackerId: string;
      enemyType: EnemyType;
      x: number;
      z: number;
      gemType: GemType;
    }
  | {
      type: 'gem_collected';
      gemId: string;
      playerId: string;
      xp: number;
      x: number;
      z: number;
    }
  | {
      type: 'player_level_up';
      playerId: string;
      level: number;
      x: number;
      z: number;
    }
  | {
      type: 'player_hurt';
      playerId: string;
      damage: number;
      isFatal: boolean;
      isVictory: boolean;
    }
  | {
      type: 'player_revived';
      targetId: string;
      reviverId: string;
    }
  | {
      type: 'boss_spawn';
      name: string;
      isImmortal: boolean;
      hp: number;
    }
  | {
      type: 'boss_defeat';
      name: string;
    }
  | {
      type: 'altar_captured';
      altarType: BuffType;
      buffDuration: number;
      name: string;
    }
  | {
      type: 'sound';
      sound: 'shoot' | 'slash' | 'magic' | 'hit' | 'gem' | 'level_up' | 'altar' | 'player_hurt';
    };

export interface SimSnapshot {
  tick: number;
  gameTime: number;
  totalKills: number;
  players: Record<string, SimPlayerState>;
  stats: Record<string, SimPlayerStats>;
  enemies: SimEnemyState[];
  projectiles: SimProjectileState[];
  drops: SimDropState[];
  altars: SimAltarState[];
  boss: { hp: number; maxHp: number; isAlive: boolean; isImmortal?: boolean } | null;
  events: SimEvent[];
}
