import {
  HostSnapshotMessage,
  EnemySnapshot,
  DropSnapshot,
  PlayerNetState,
  PlayerStats,
  NetEvent,
  ChestSyncInfo,
  TeleporterSyncInfo,
  SLOTS,
  DIRECTIONS as DIRS,
  ANIM_STATES as ANIMS,
  CHARACTERS as CHARS,
  CHEST_TIERS,
  ENEMIES,
  GEMS
} from '../shared/types';

const MAGIC_HEADER = 0x48534e50; // "HSNP" (Host Snapshot Network Packet)
const PROTOCOL_VERSION = 3;

// Fast text encoder/decoder
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Checks if incoming data is a binary HostSnapshot packet
 */
export function isBinarySnapshot(data: any): boolean {
  if (data instanceof ArrayBuffer) {
    if (data.byteLength < 8) return false;
    const view = new DataView(data);
    return view.getUint32(0, true) === MAGIC_HEADER;
  }
  if (ArrayBuffer.isView(data)) {
    if (data.byteLength < 8) return false;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return view.getUint32(0, true) === MAGIC_HEADER;
  }
  return false;
}

/**
 * Packs a HostSnapshotMessage into an ultra-compact binary ArrayBuffer.
 * Reduces bandwidth from ~45 KB (JSON) down to ~2-3 KB!
 */
export function packHostSnapshot(msg: HostSnapshotMessage): ArrayBuffer {
  // Pre-calculate required buffer size, filtering out any invalid slot IDs
  const allPlayers = Object.entries(msg.players || (msg.hostPlayer ? { p1: msg.hostPlayer } : {}));
  const players = allPlayers.filter(([id]) => SLOTS.includes(id as any));
  const enemies = msg.enemies || [];
  const drops = msg.drops || [];
  const chests = msg.chests || [];
  const damageTaken = Object.entries(msg.damageTakenByClient || {}).filter(([id]) => SLOTS.includes(id as any));

  // Events serialized as compact JSON utf8 bytes
  const eventsJson = msg.events && msg.events.length > 0 ? JSON.stringify(msg.events) : '';
  const eventsBytes = eventsJson ? textEncoder.encode(eventsJson) : null;
  const eventsLen = eventsBytes ? eventsBytes.byteLength : 0;

  // Header (4) + Version (1) + GameTime (4) + TotalKills (4) + Boss (11) = 24 bytes
  // Players count (1) + Players (players.length * 52)
  // Enemies count (2) + Enemies (enemies.length * 24)
  // Drops count (2) + Drops (drops.length * 18)
  // DamageTaken count (1) + DamageTaken (damageTaken.length * 3)
  // Events length (2) + Events bytes
  // Chests count (2) + Chests (chests.length * 40)
  // Teleporter (15)
  const bufferSize =
    128 +
    players.length * 64 +
    enemies.length * 32 +
    drops.length * 24 +
    chests.length * 40 +
    damageTaken.length * 8 +
    eventsLen +
    512;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);
  let offset = 0;

  // 1. Header, Version & Stage
  view.setUint32(offset, MAGIC_HEADER, true); offset += 4;
  view.setUint8(offset, PROTOCOL_VERSION); offset += 1;
  view.setUint8(offset, msg.stage || 1); offset += 1;

  // 2. Game Time & Total Kills
  view.setFloat32(offset, msg.gameTime, true); offset += 4;
  view.setUint32(offset, msg.totalKills, true); offset += 4;

  // 3. Boss info
  if (msg.boss) {
    view.setUint8(offset, 1); offset += 1;
    view.setFloat32(offset, msg.boss.hp, true); offset += 4;
    view.setFloat32(offset, msg.boss.maxHp, true); offset += 4;
    view.setUint8(offset, msg.boss.isAlive ? 1 : 0); offset += 1;
  } else {
    view.setUint8(offset, 0); offset += 1;
  }

  // 4. Players
  view.setUint8(offset, players.length); offset += 1;
  for (const [id, p] of players) {
    const slotIdx = SLOTS.indexOf(id as any);
    if (slotIdx === -1) continue;
    view.setUint8(offset, slotIdx); offset += 1;

    let charIdx = CHARS.indexOf(p.charType);
    if (charIdx === -1) charIdx = 0;
    view.setUint8(offset, charIdx); offset += 1;

    let dirIdx = DIRS.indexOf(p.dir);
    if (dirIdx === -1) dirIdx = 0;
    view.setUint8(offset, dirIdx); offset += 1;

    let animIdx = ANIMS.indexOf(p.anim);
    if (animIdx === -1) animIdx = 0;
    view.setUint8(offset, animIdx); offset += 1;

    const downedVal = p.isDowned
      ? (1 + Math.min(100, Math.max(0, Math.round((p.reviveProgress || 0) * 100))))
      : 0;
    view.setUint8(offset, downedVal); offset += 1;
    view.setUint8(offset, p.level); offset += 1;

    view.setFloat32(offset, p.x, true); offset += 4;
    view.setFloat32(offset, p.z, true); offset += 4;
    view.setFloat32(offset, p.hp, true); offset += 4;
    view.setFloat32(offset, p.maxHp, true); offset += 4;
    view.setFloat32(offset, p.xp || 0, true); offset += 4;
    view.setFloat32(offset, p.xpToNextLevel || 10, true); offset += 4;
    view.setUint32(offset, p.credits || 0, true); offset += 4;

    const stats = msg.stats ? msg.stats[id] : undefined;
    view.setUint16(offset, p.kills || (stats?.kills || 0), true); offset += 2;
    view.setUint32(offset, Math.round(p.damageDealt || (stats?.damageDealt || 0)), true); offset += 4;
    view.setUint16(offset, stats?.revives || 0, true); offset += 2;
  }

  // 5. Enemies
  view.setUint16(offset, enemies.length, true); offset += 2;
  for (const enemy of enemies) {
    // ID as fixed 7-byte ASCII
    const idStr = enemy.id || '';
    for (let j = 0; j < 7; j++) {
      u8[offset + j] = j < idStr.length ? (idStr.charCodeAt(j) & 0x7f) : 32;
    }
    offset += 7;

    let typeIdx = ENEMIES.indexOf(enemy.type);
    if (typeIdx === -1) typeIdx = 0;
    view.setUint8(offset, typeIdx); offset += 1;

    let dirIdx = DIRS.indexOf(enemy.dir);
    if (dirIdx === -1) dirIdx = 0;
    view.setUint8(offset, dirIdx); offset += 1;

    view.setUint8(offset, enemy.isImmortal ? 1 : 0); offset += 1;

    view.setFloat32(offset, enemy.x, true); offset += 4;
    view.setFloat32(offset, enemy.z, true); offset += 4;
    view.setFloat32(offset, enemy.hp, true); offset += 4;
    view.setFloat32(offset, enemy.maxHp, true); offset += 4;
  }

  // 6. Drops (Gems)
  view.setUint16(offset, drops.length, true); offset += 2;
  for (const drop of drops) {
    const idStr = drop.id || '';
    for (let j = 0; j < 7; j++) {
      u8[offset + j] = j < idStr.length ? (idStr.charCodeAt(j) & 0x7f) : 32;
    }
    offset += 7;

    let gemIdx = GEMS.indexOf(drop.type);
    if (gemIdx === -1) gemIdx = 0;
    view.setUint8(offset, gemIdx); offset += 1;

    view.setFloat32(offset, drop.x, true); offset += 4;
    view.setFloat32(offset, drop.z, true); offset += 4;
  }

  // 7. Damage Taken by Clients
  view.setUint8(offset, damageTaken.length); offset += 1;
  for (const [clientId, dmg] of damageTaken) {
    const slotIdx = SLOTS.indexOf(clientId as any);
    if (slotIdx === -1) continue;
    view.setUint8(offset, slotIdx); offset += 1;
    view.setUint16(offset, Math.round(dmg), true); offset += 2;
  }

  // 8. Events
  view.setUint16(offset, eventsLen, true); offset += 2;
  if (eventsBytes && eventsLen > 0) {
    u8.set(eventsBytes, offset);
    offset += eventsLen;
  }

  // 9. Chests
  view.setUint16(offset, chests.length, true); offset += 2;
  for (const chest of chests) {
    const idBytes = textEncoder.encode(chest.id || '');
    const idLen = Math.min(255, idBytes.byteLength);
    view.setUint8(offset, idLen); offset += 1;
    if (idLen > 0) {
      u8.set(idBytes.subarray(0, idLen), offset);
      offset += idLen;
    }

    let tierIdx = CHEST_TIERS.indexOf(chest.tier);
    if (tierIdx === -1) tierIdx = 0;
    view.setUint8(offset, tierIdx); offset += 1;

    view.setUint16(offset, chest.baseCost || 25, true); offset += 2;
    view.setFloat32(offset, chest.x, true); offset += 4;
    view.setFloat32(offset, chest.z, true); offset += 4;
    view.setUint8(offset, chest.isOpened ? 1 : 0); offset += 1;
  }

  // 10. Teleporter
  if (msg.teleporter) {
    view.setUint8(offset, 1); offset += 1;
    view.setFloat32(offset, msg.teleporter.x, true); offset += 4;
    view.setFloat32(offset, msg.teleporter.z, true); offset += 4;
    view.setUint8(offset, msg.teleporter.isActivated ? 1 : 0); offset += 1;
    view.setFloat32(offset, msg.teleporter.chargeProgress, true); offset += 4;
    view.setUint8(offset, msg.teleporter.isCompleted ? 1 : 0); offset += 1;
  } else {
    view.setUint8(offset, 0); offset += 1;
  }

  return buffer.slice(0, offset);
}

/**
 * Unpacks an ArrayBuffer back into a complete HostSnapshotMessage object.
 */
export function unpackHostSnapshot(data: ArrayBuffer | ArrayBufferView): HostSnapshotMessage {
  const buffer = data instanceof ArrayBuffer ? data : data.buffer;
  const byteOffset = data instanceof ArrayBuffer ? 0 : data.byteOffset;
  const view = new DataView(buffer, byteOffset);
  const u8 = new Uint8Array(buffer, byteOffset);
  let offset = 0;

  // 1. Header & Version check
  const magic = view.getUint32(offset, true); offset += 4;
  if (magic !== MAGIC_HEADER) {
    throw new Error('Invalid binary snapshot magic header');
  }
  const version = view.getUint8(offset); offset += 1;
  if (version !== PROTOCOL_VERSION && version !== 2 && version !== 1) {
    console.warn(`Snapshot version mismatch: got ${version}, expected ${PROTOCOL_VERSION}`);
  }
  const stage = version >= 3 ? view.getUint8(offset) : 1;
  if (version >= 3) offset += 1;

  // 2. Game Time & Total Kills
  const gameTime = view.getFloat32(offset, true); offset += 4;
  const totalKills = view.getUint32(offset, true); offset += 4;

  // 3. Boss
  const hasBoss = view.getUint8(offset); offset += 1;
  let boss: { hp: number; maxHp: number; isAlive: boolean } | null = null;
  if (hasBoss === 1) {
    const hp = view.getFloat32(offset, true); offset += 4;
    const maxHp = view.getFloat32(offset, true); offset += 4;
    const isAlive = view.getUint8(offset) === 1; offset += 1;
    boss = { hp, maxHp, isAlive };
  }

  // 4. Players
  const playersCount = view.getUint8(offset); offset += 1;
  const players: Record<string, PlayerNetState> = {};
  const stats: Record<string, PlayerStats> = {};

  for (let i = 0; i < playersCount; i++) {
    const slotIdx = view.getUint8(offset); offset += 1;
    const charIdx = view.getUint8(offset); offset += 1;
    const dirIdx = view.getUint8(offset); offset += 1;
    const animIdx = view.getUint8(offset); offset += 1;
    const downedVal = view.getUint8(offset); offset += 1;
    const isDowned = downedVal > 0;
    const reviveProgress = downedVal > 1 ? Number(((downedVal - 1) / 100).toFixed(2)) : 0;
    const level = view.getUint8(offset); offset += 1;

    const x = view.getFloat32(offset, true); offset += 4;
    const z = view.getFloat32(offset, true); offset += 4;
    const hp = view.getFloat32(offset, true); offset += 4;
    const maxHp = view.getFloat32(offset, true); offset += 4;
    const xp = view.getFloat32(offset, true); offset += 4;
    const xpToNextLevel = view.getFloat32(offset, true); offset += 4;
    const credits = version >= 2 ? view.getUint32(offset, true) : 0;
    if (version >= 2) offset += 4;

    const kills = view.getUint16(offset, true); offset += 2;
    const damageDealt = view.getUint32(offset, true); offset += 4;
    const revives = view.getUint16(offset, true); offset += 2;
    const slotId = SLOTS[slotIdx];
    if (!slotId) continue;
    const charType = CHARS[charIdx] || 'ronin';
    const dir = DIRS[dirIdx] || 'front';
    const anim = ANIMS[animIdx] || 'IDLE';

    players[slotId] = {
      id: slotId,
      x,
      z,
      dir,
      anim,
      hp,
      maxHp,
      level,
      xp,
      xpToNextLevel,
      credits,
      isDowned,
      reviveProgress,
      charType,
      kills,
      damageDealt
    };

    stats[slotId] = {
      kills,
      damageDealt,
      level,
      revives
    };
  }

  // 5. Enemies
  const enemiesCount = view.getUint16(offset, true); offset += 2;
  const enemies: EnemySnapshot[] = new Array(enemiesCount);

  for (let i = 0; i < enemiesCount; i++) {
    let id = '';
    for (let j = 0; j < 7; j++) {
      const code = u8[offset + j];
      if (code > 32) id += String.fromCharCode(code);
    }
    offset += 7;

    const typeIdx = view.getUint8(offset); offset += 1;
    const dirIdx = view.getUint8(offset); offset += 1;
    const isImmortal = view.getUint8(offset) === 1; offset += 1;

    const x = view.getFloat32(offset, true); offset += 4;
    const z = view.getFloat32(offset, true); offset += 4;
    const hp = view.getFloat32(offset, true); offset += 4;
    const maxHp = view.getFloat32(offset, true); offset += 4;

    enemies[i] = {
      id,
      type: ENEMIES[typeIdx] || 'coyote',
      dir: DIRS[dirIdx] || 'front',
      isImmortal,
      x,
      z,
      hp,
      maxHp
    };
  }

  // 6. Drops
  const dropsCount = view.getUint16(offset, true); offset += 2;
  const drops: DropSnapshot[] = new Array(dropsCount);

  for (let i = 0; i < dropsCount; i++) {
    let id = '';
    for (let j = 0; j < 7; j++) {
      const code = u8[offset + j];
      if (code > 32) id += String.fromCharCode(code);
    }
    offset += 7;

    const gemIdx = view.getUint8(offset); offset += 1;
    const x = view.getFloat32(offset, true); offset += 4;
    const z = view.getFloat32(offset, true); offset += 4;

    drops[i] = {
      id,
      type: GEMS[gemIdx] || 'blue',
      x,
      z
    };
  }

  // 7. Damage Taken by Clients
  const damageCount = view.getUint8(offset); offset += 1;
  const damageTakenByClient: Record<string, number> = {};
  for (let i = 0; i < damageCount; i++) {
    const slotIdx = view.getUint8(offset); offset += 1;
    const dmg = view.getUint16(offset, true); offset += 2;
    const slotId = SLOTS[slotIdx] || 'p2';
    damageTakenByClient[slotId] = dmg;
  }

  // 8. Events
  const eventsLen = view.getUint16(offset, true); offset += 2;
  let events: NetEvent[] = [];
  if (eventsLen > 0) {
    const eventsBytes = u8.subarray(offset, offset + eventsLen);
    offset += eventsLen;
    try {
      const json = textDecoder.decode(eventsBytes);
      events = JSON.parse(json);
    } catch {
      events = [];
    }
  }

  // 9. Chests
  let chests: ChestSyncInfo[] | undefined = undefined;
  if (version >= 2 && offset + 2 <= buffer.byteLength) {
    const chestsCount = view.getUint16(offset, true); offset += 2;
    chests = new Array(chestsCount);
    for (let i = 0; i < chestsCount; i++) {
      const idLen = view.getUint8(offset); offset += 1;
      let id = '';
      if (idLen > 0) {
        id = textDecoder.decode(u8.subarray(offset, offset + idLen));
        offset += idLen;
      }
      const tierIdx = view.getUint8(offset); offset += 1;
      const baseCost = view.getUint16(offset, true); offset += 2;
      const x = view.getFloat32(offset, true); offset += 4;
      const z = view.getFloat32(offset, true); offset += 4;
      const isOpened = view.getUint8(offset) === 1; offset += 1;

      chests[i] = {
        id,
        tier: CHEST_TIERS[tierIdx] || 'small',
        baseCost,
        x,
        z,
        isOpened
      };
    }
  }

  // 10. Teleporter
  let teleporter: TeleporterSyncInfo | undefined = undefined;
  if (version >= 2 && offset < buffer.byteLength) {
    const hasTele = view.getUint8(offset); offset += 1;
    if (hasTele === 1) {
      const x = view.getFloat32(offset, true); offset += 4;
      const z = view.getFloat32(offset, true); offset += 4;
      const isActivated = view.getUint8(offset) === 1; offset += 1;
      const chargeProgress = view.getFloat32(offset, true); offset += 4;
      const isCompleted = view.getUint8(offset) === 1; offset += 1;
      teleporter = { x, z, isActivated, chargeProgress, isCompleted };
    }
  }

  return {
    type: 'HOST_SNAPSHOT',
    stage,
    players,
    stats,
    gameTime,
    totalKills,
    boss,
    enemies,
    drops,
    chests,
    teleporter,
    events,
    damageTakenByClient: Object.keys(damageTakenByClient).length > 0 ? damageTakenByClient : undefined,
    hostPlayer: players.p1 || players.host,
    hostStats: stats.p1 || stats.host,
    clientStats: stats.p2,
    clientDamageTaken: damageTakenByClient.p2
  };
}
