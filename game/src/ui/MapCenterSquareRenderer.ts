import type { Player } from '../entities/Player';
import type { EnemyManager } from '../entities/EnemyManager';
import type { DropManager } from '../drops/DropManager';
import type { ChestManager } from '../world/ChestManager';
import type { RiftTeleporter } from '../world/RiftTeleporter';
import type { MerchantManager } from '../world/MerchantManager';
import type { RemotePlayer } from '../entities/RemotePlayer';
import type { DiscoveredAltar } from './MapManager';
import type { MobNestManager } from '../world/MobNestManager';
import { ChunkManager } from '../world/ChunkManager';

export interface CenterSquareMapRenderContext {
  ctx: CanvasRenderingContext2D;
  playerCtx?: CanvasRenderingContext2D | null;
  width: number;
  height: number;
  player: Player;
  exploredChunks: Set<string>;
  dropManager: DropManager;
  chestManager?: ChestManager;
  discoveredAltars: Map<string, DiscoveredAltar>;
  mobNestManager?: MobNestManager;
  riftTeleporter?: RiftTeleporter;
  merchantManager?: MerchantManager;
  enemyManager: EnemyManager;
  partners: RemotePlayer[];
  animTimer: number;
  elMinimapCoords?: HTMLElement | null;
}

/**
 * Renders the square full-world interactive overlay map (Diablo / PoE TAB style).
 * Displays all 10x10 chunks across the 500x500 world bounds without bezel or round border.
 * Shrouds unexplored chunks in Fog of War (туман войны).
 * Displays all discovered altars, teleporter, chests, bosses, teammates, and player.
 */
export function renderCenterSquareMap(context: CenterSquareMapRenderContext): void {
  const {
    ctx,
    playerCtx,
    width: w,
    height: h,
    player,
    exploredChunks,
    dropManager,
    chestManager,
    discoveredAltars,
    mobNestManager,
    riftTeleporter,
    merchantManager,
    enemyManager,
    partners,
    animTimer,
    elMinimapCoords,
  } = context;

  ctx.clearRect(0, 0, w, h);
  playerCtx?.clearRect(0, 0, w, h);

  // Update coords in footer
  const px = Math.round(player.position.x);
  const pz = Math.round(player.position.z);
  if (elMinimapCoords) {
    const totalChunks = ChunkManager.GRID_SIZE * ChunkManager.GRID_SIZE;
    elMinimapCoords.innerText = `X: ${px}, Z: ${pz} | ${exploredChunks.size}/${totalChunks} зон`;
  }

  // 1. Semi-transparent dark tactical backdrop
  ctx.fillStyle = 'rgba(6, 12, 22, 0.40)';
  ctx.fillRect(0, 0, w, h);

  // 2. World Coordinate Transform for 9x9 chunks (450x450m bounds, -225 to +225)
  const halfWorld = ChunkManager.HALF_MAP;
  const worldSize = ChunkManager.MAP_SIZE;
  const toScreenX = (worldX: number) => ((worldX + halfWorld) / worldSize) * w;
  const toScreenZ = (worldZ: number) => ((worldZ + halfWorld) / worldSize) * h;
  const chunkScreenW = (50 / worldSize) * w;
  const chunkScreenH = (50 / worldSize) * h;

  // Chunks & Fog of War (9x9 chunks, 50m each from cx = -4..4, cz = -4..4)
  for (let cx = ChunkManager.MIN_CHUNK; cx <= ChunkManager.MAX_CHUNK; cx++) {
    for (let cz = ChunkManager.MIN_CHUNK; cz <= ChunkManager.MAX_CHUNK; cz++) {
      const chunkX = toScreenX(cx * 50 - 25);
      const chunkZ = toScreenZ(cz * 50 - 25);
      const key = `${cx},${cz}`;
      const isExplored = exploredChunks.has(key);

      if (!isExplored) {
        // Fog of War (Туман войны)
        ctx.fillStyle = 'rgba(8, 14, 24, 0.88)';
        ctx.fillRect(chunkX, chunkZ, chunkScreenW + 0.5, chunkScreenH + 0.5);

        ctx.strokeStyle = 'rgba(30, 48, 77, 0.40)';
        ctx.lineWidth = 1;
        ctx.strokeRect(chunkX, chunkZ, chunkScreenW, chunkScreenH);

        // Subtle diagonal fog hatch lines
        ctx.beginPath();
        ctx.moveTo(chunkX, chunkZ + chunkScreenH * 0.5);
        ctx.lineTo(chunkX + chunkScreenW * 0.5, chunkZ);
        ctx.moveTo(chunkX, chunkZ + chunkScreenH);
        ctx.lineTo(chunkX + chunkScreenW, chunkZ);
        ctx.moveTo(chunkX + chunkScreenW * 0.5, chunkZ + chunkScreenH);
        ctx.lineTo(chunkX + chunkScreenW, chunkZ + chunkScreenH * 0.5);
        ctx.stroke();
      } else {
        // Explored zone
        ctx.fillStyle = 'rgba(20, 38, 64, 0.35)';
        ctx.fillRect(chunkX, chunkZ, chunkScreenW + 0.5, chunkScreenH + 0.5);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.20)';
        ctx.lineWidth = 1;
        ctx.strokeRect(chunkX, chunkZ, chunkScreenW, chunkScreenH);
      }
    }
  }

  // 3. XP Gems & Passive drops on ground (in explored chunks)
  for (const gem of dropManager.gems) {
    const gcx = Math.round(gem.position.x / 50);
    const gcz = Math.round(gem.position.z / 50);
    if (exploredChunks.has(`${gcx},${gcz}`)) {
      const gx = toScreenX(gem.position.x);
      const gz = toScreenZ(gem.position.z);
      if (gx >= 0 && gx <= w && gz >= 0 && gz <= h) {
        ctx.fillStyle = gem.type === 'gold' ? '#f59e0b' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(gx, gz, gem.type === 'gold' ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 4. Chests (Unopened chests only, opened chests removed - 2x bigger)
  if (chestManager) {
    for (const chest of chestManager.chests) {
      if (chest.isOpened) continue; // Completely remove picked-up/opened chests
      const ccx = Math.round(chest.position.x / 50);
      const ccz = Math.round(chest.position.z / 50);
      if (exploredChunks.has(`${ccx},${ccz}`)) {
        const cxPos = toScreenX(chest.position.x);
        const czPos = toScreenZ(chest.position.z);
        if (cxPos >= 0 && cxPos <= w && czPos >= 0 && czPos <= h) {
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#fbbf24';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('📦', cxPos, czPos);
          ctx.shadowBlur = 0;
        }
      }
    }
  }

  // 5. Discovered Altars (Remove once captured/spent - 1.5x bigger)
  for (const altar of discoveredAltars.values()) {
    if (altar.isCaptured || (altar as any).isSpent) continue;
    const ax = toScreenX(altar.pos.x);
    const az = toScreenZ(altar.pos.z);
    if (ax >= 0 && ax <= w && az >= 0 && az <= h) {
      ctx.fillStyle = altar.color;
      ctx.beginPath();
      ctx.arc(ax, az, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.25;
      ctx.stroke();

      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(altar.icon || '⛩️', ax, az);
    }
  }

  // 6. Discovered Rift Teleporter
  if (riftTeleporter && riftTeleporter.isDiscovered) {
    const tx = toScreenX(riftTeleporter.position.x);
    const tz = toScreenZ(riftTeleporter.position.z);
    if (tx >= 0 && tx <= w && tz >= 0 && tz <= h) {
      const isReady = riftTeleporter.state === 'WARP_READY';
      const isStage4Waiting = riftTeleporter.isStage4 && riftTeleporter.coresDelivered < 4;
      const pulse = Math.sin(animTimer * 4) * 2;
      const color = isReady ? '#10b981' : (isStage4Waiting ? '#38bdf8' : '#f59e0b');

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, tz, 10 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌀', tx, tz);

      ctx.font = 'bold 8px Montserrat, sans-serif';
      ctx.fillStyle = color;
      const label = isReady ? 'ТЕЛЕПОРТ' : (isStage4Waiting ? `ЯДРА: ${riftTeleporter.coresDelivered}/4` : 'БОСС НУЖЕН');
      ctx.fillText(label, tx, tz + 14);
    }
  }

  // 6b. Rift Merchant on Full Map
  if (merchantManager && merchantManager.isActive) {
    const mx = toScreenX(merchantManager.position.x);
    const mz = toScreenZ(merchantManager.position.z);
    if (mx >= 0 && mx <= w && mz >= 0 && mz <= h) {
      const pulse = Math.sin(animTimer * 5) * 2;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(mx, mz, 10 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💰', mx, mz);

      ctx.font = 'bold 9px Montserrat, sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('ТОРГОВЕЦ', mx, mz + 15);
    }
  }

  // 6c. Astral Core Generators & Dropped Cores on Stage 4
  if (mobNestManager && mobNestManager.nests.length > 0) {
    for (const nest of mobNestManager.nests) {
      const nx = toScreenX(nest.position.x);
      const nz = toScreenZ(nest.position.z);
      if (nx >= 0 && nx <= w && nz >= 0 && nz <= h) {
        if (nest.state === 'DESTROYED') {
          // Dimmed extracted generator
          ctx.fillStyle = 'rgba(51, 65, 85, 0.7)';
          ctx.beginPath();
          ctx.arc(nx, nz, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚙️', nx, nz);

          ctx.font = 'bold 8px Montserrat, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText('ОПУСТОШЕН', nx, nz + 13);
        } else if (nest.state === 'ARMED') {
          // Blinking warning beacon & 1-cell blast danger ring on map (radius 25m)
          const pulse = Math.sin(animTimer * 12) * 2;
          const cellRadiusPx = (25 / worldSize) * w;
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(nx, nz, cellRadiusPx, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(nx, nz, 9 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💣', nx, nz);

          ctx.font = 'bold 8px Montserrat, sans-serif';
          ctx.fillStyle = '#ef4444';
          ctx.fillText(`${Math.ceil(nest.fuseTimer)}с`, nx, nz + 13);
        } else {
          // Charged Astral Generator
          const pulse = Math.sin(animTimer * 4) * 1.5;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(nx, nz, 9 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', nx, nz);

          ctx.font = 'bold 8px Montserrat, sans-serif';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('ГЕНЕРАТОР', nx, nz + 13);
        }
      }
    }
  }

  // 6d. Dropped Astral Cores on Ground (from tactical dash or knockout)
  if (mobNestManager && mobNestManager.droppedCores.length > 0) {
    for (const core of mobNestManager.droppedCores) {
      const cx = toScreenX(core.position.x);
      const cz = toScreenZ(core.position.z);
      if (cx >= 0 && cx <= w && cz >= 0 && cz <= h) {
        const pulse = Math.sin(animTimer * 8) * 2;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx, cz, 8 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', cx, cz);

        ctx.font = 'bold 8px Montserrat, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('ЯДРО', cx, cz + 13);
      }
    }
  }

  // 7. Active Boss
  if (enemyManager.activeBoss && enemyManager.activeBoss.isAlive) {
    const boss = enemyManager.activeBoss;
    const bx = toScreenX(boss.position.x);
    const bz = toScreenZ(boss.position.z);
    if (bx >= 0 && bx <= w && bz >= 0 && bz <= h) {
      const bPulse = Math.sin(animTimer * 6) * 3;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, bz, 11 + bPulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💀', bx, bz);

      const hpPct = Math.max(0, boss.hp / boss.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(bx - 12, bz + 12, 24, 3);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 12, bz + 12, 24 * hpPct, 3);
    }
  }

  // 8. Teammates / Partners (Co-op)
  for (const rp of partners) {
    const rx = toScreenX(rp.position.x);
    const rz = toScreenZ(rp.position.z);
    if (rx >= 0 && rx <= w && rz >= 0 && rz <= h) {
      ctx.fillStyle = rp.colorCss || '#06b6d4';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rx, rz, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rp.id.startsWith('p') ? `P${rp.id.slice(1)}` : 'P2', rx, rz);
    }
  }

  // 9. Local Player Marker - Rendered on fully opaque minimapPlayerCtx (independent of map overlay opacity)
  const pctx = playerCtx || ctx;
  const pxPos = toScreenX(player.position.x);
  const pzPos = toScreenZ(player.position.z);
  if (pxPos >= 0 && pxPos <= w && pzPos >= 0 && pzPos <= h) {
    // 9a. Double expanding sonar pulse rings
    const r1 = (animTimer * 20) % 26;
    const a1 = Math.max(0, 1 - r1 / 26) * 0.8;
    pctx.strokeStyle = `rgba(56, 189, 248, ${a1})`;
    pctx.lineWidth = 1.8;
    pctx.beginPath();
    pctx.arc(pxPos, pzPos, r1, 0, Math.PI * 2);
    pctx.stroke();

    const r2 = (animTimer * 20 + 13) % 26;
    const a2 = Math.max(0, 1 - r2 / 26) * 0.8;
    pctx.strokeStyle = `rgba(251, 191, 36, ${a2})`;
    pctx.lineWidth = 1.4;
    pctx.beginPath();
    pctx.arc(pxPos, pzPos, r2, 0, Math.PI * 2);
    pctx.stroke();

    // 9b. Glowing beacon core
    pctx.save();
    pctx.shadowColor = '#38bdf8';
    pctx.shadowBlur = 12;

    // Outer golden beacon ring
    pctx.fillStyle = '#f59e0b';
    pctx.strokeStyle = '#ffffff';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.arc(pxPos, pzPos, 7, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    // Bright center core
    pctx.fillStyle = '#38bdf8';
    pctx.beginPath();
    pctx.arc(pxPos, pzPos, 3.5, 0, Math.PI * 2);
    pctx.fill();
    pctx.restore();

    // 9c. Directional chevron pointer based on player orientation (Non-transparent crisp arrow)
    pctx.save();
    pctx.translate(pxPos, pzPos);
    pctx.rotate(-player.mesh.rotation.y);

    pctx.fillStyle = '#fef08a';
    pctx.strokeStyle = '#0f172a';
    pctx.lineWidth = 1.5;
    pctx.beginPath();
    pctx.moveTo(0, -13);
    pctx.lineTo(8, 8);
    pctx.lineTo(0, 4);
    pctx.lineTo(-8, 8);
    pctx.closePath();
    pctx.fill();
    pctx.stroke();
    pctx.restore();
  }

  // 10. Top Bar (Header with title and exploration %)
  ctx.font = 'bold 10px Montserrat, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.textAlign = 'left';
  ctx.fillText('ИНТЕРАКТИВНАЯ КАРТА [TAB]', 8, 14);

  const exploredPct = Math.min(100, Math.round((exploredChunks.size / (ChunkManager.GRID_SIZE * ChunkManager.GRID_SIZE)) * 100));
  ctx.textAlign = 'right';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`ТУМАН ВОЙНЫ: ${exploredPct}% ОТКРЫТО`, 492, 14);
}
