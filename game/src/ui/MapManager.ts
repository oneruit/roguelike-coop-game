import type { Vector3 } from 'three';
import { Player, BuffType } from '../entities/Player';
import { EnemyManager } from '../entities/EnemyManager';
import { DropManager } from '../drops/DropManager';
import { AltarManager } from '../world/AltarManager';
import { ObstacleManager } from '../world/ObstacleManager';
import { RemotePlayer } from '../entities/RemotePlayer';
import { ChestManager } from '../world/ChestManager';
import { RiftTeleporter } from '../world/RiftTeleporter';

export interface DiscoveredAltar {
  type: BuffType;
  name: string;
  icon: string;
  color: string;
  pos: Vector3;
  isCaptured: boolean;
}

export class MapManager {
  private player: Player;
  private enemyManager: EnemyManager;
  private dropManager: DropManager;
  private altarManager: AltarManager;
  private obstacleManager?: ObstacleManager;
  public chestManager?: ChestManager;
  public riftTeleporter?: RiftTeleporter;
  public partner: RemotePlayer | null = null;
  public partners: RemotePlayer[] = [];

  // Exploration state
  public currentSeed: number | string = 1337;
  public exploredChunks = new Set<string>();
  public discoveredAltars = new Map<string, DiscoveredAltar>();

  public setSeed(seed: number | string) {
    this.currentSeed = seed;
  }

  // Minimap DOM & Canvas
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private elMinimapCoords: HTMLElement;

  // Full Map Modal DOM & Canvas
  private mapModal: HTMLElement;
  private fullMapCanvas: HTMLCanvasElement;
  private fullMapCtx: CanvasRenderingContext2D;
  private elFullMapStats: HTMLElement;
  private btnCloseMap: HTMLElement;

  public isOpen = false;
  public onStateChange?: (isOpen: boolean) => void;

  private animTimer = 0;

  // Interactive full map pan & zoom
  private mapZoom = 1.4;
  private panOffsetX = 0;
  private panOffsetZ = 0;
  private isDragging = false;
  private lastDragX = 0;
  private lastDragY = 0;

  constructor(
    player: Player,
    enemyManager: EnemyManager,
    dropManager: DropManager,
    altarManager: AltarManager,
    obstacleManager?: ObstacleManager,
    chestManager?: ChestManager,
    riftTeleporter?: RiftTeleporter
  ) {
    this.player = player;
    this.enemyManager = enemyManager;
    this.dropManager = dropManager;
    this.altarManager = altarManager;
    this.obstacleManager = obstacleManager;
    this.chestManager = chestManager;
    this.riftTeleporter = riftTeleporter;

    // Minimap elements
    this.minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.elMinimapCoords = document.getElementById('minimap-coords')!;

    // Full Map modal elements
    this.mapModal = document.getElementById('map-modal')!;
    this.fullMapCanvas = document.getElementById('fullmap-canvas') as HTMLCanvasElement;
    this.fullMapCtx = this.fullMapCanvas.getContext('2d')!;
    this.elFullMapStats = document.getElementById('fullmap-stats')!;
    this.btnCloseMap = document.getElementById('btn-close-map')!;

    // Starting exploration: reveal origin chunks around (0, 0)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.exploredChunks.add(`${dx},${dz}`);
      }
    }

    this.bindEvents();
  }

  private bindEvents() {
    this.btnCloseMap?.addEventListener('click', () => {
      this.close();
    });

    document.getElementById('map-backdrop')?.addEventListener('click', () => {
      this.close();
    });

    document.getElementById('minimap-container')?.addEventListener('click', () => {
      this.toggle();
    });

    // Zoom with mouse wheel over map
    this.fullMapCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      this.mapZoom = Math.max(0.6, Math.min(3.5, this.mapZoom * zoomFactor));
      this.renderFullMap();
    }, { passive: false });

    // Drag to pan map
    this.fullMapCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.lastDragX = e.clientX;
        this.lastDragY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.isOpen) {
        const dx = e.clientX - this.lastDragX;
        const dy = e.clientY - this.lastDragY;
        this.lastDragX = e.clientX;
        this.lastDragY = e.clientY;
        this.panOffsetX += dx;
        this.panOffsetZ += dy;
        this.renderFullMap();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Double-click on canvas resets center to player
    this.fullMapCanvas.addEventListener('dblclick', () => {
      this.panOffsetX = 0;
      this.panOffsetZ = 0;
      this.mapZoom = 1.4;
      this.renderFullMap();
    });

    // Space key resets center to player when map is open
    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.code === 'Space') {
        e.preventDefault();
        this.panOffsetX = 0;
        this.panOffsetZ = 0;
        this.mapZoom = 1.4;
        this.renderFullMap();
      }
    });
  }

  public toggle(): boolean {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
    return this.isOpen;
  }

  public open() {
    this.isOpen = true;
    this.panOffsetX = 0;
    this.panOffsetZ = 0;
    this.mapModal.classList.remove('hidden');
    this.renderFullMap();
    if (this.onStateChange) {
      this.onStateChange(true);
    }
  }

  public close() {
    this.isOpen = false;
    this.isDragging = false;
    this.mapModal.classList.add('hidden');
    if (this.onStateChange) {
      this.onStateChange(false);
    }
  }

  public setChestManager(chestManager: ChestManager) {
    this.chestManager = chestManager;
  }

  public setRiftTeleporter(riftTeleporter: RiftTeleporter) {
    this.riftTeleporter = riftTeleporter;
  }

  public update(dt: number) {
    this.animTimer += dt;

    // 1. Update Exploration radius around player
    const px = this.player.position.x;
    const pz = this.player.position.z;
    const currentCx = Math.floor(px / 50);
    const currentCz = Math.floor(pz / 50);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.exploredChunks.add(`${currentCx + dx},${currentCz + dz}`);
      }
    }

    // 2. Discover nearby altars
    for (const altar of this.altarManager.altars) {
      const key = `${Math.round(altar.position.x)},${Math.round(altar.position.z)}`;
      const dist = altar.position.distanceTo(this.player.position);

      const chunkKey = `${Math.floor(altar.position.x / 50)},${Math.floor(altar.position.z / 50)}`;
      if (dist < 60 || this.exploredChunks.has(chunkKey)) {
        this.discoveredAltars.set(key, {
          type: altar.config.type,
          name: altar.config.name,
          icon: altar.config.icon,
          color: altar.config.colorCss,
          pos: altar.position.clone(),
          isCaptured: altar.isCaptured
        });
      }
    }

    // 2b. Discover Rift Teleporter when approached or chunk explored
    if (this.riftTeleporter && !this.riftTeleporter.isDiscovered) {
      const chunkX = Math.floor(this.riftTeleporter.position.x / 50);
      const chunkZ = Math.floor(this.riftTeleporter.position.z / 50);
      const chunkKey = `${chunkX},${chunkZ}`;
      const dist = this.riftTeleporter.position.distanceTo(this.player.position);
      if (dist < 45 || this.exploredChunks.has(chunkKey) || this.riftTeleporter.state !== 'IDLE') {
        this.riftTeleporter.isDiscovered = true;
      }
    }

    // 3. Render Minimap
    this.renderMinimap();

    // 4. If full map modal is open, animate its pulsing markers
    if (this.isOpen) {
      this.renderFullMap();
    }
  }

  /**
   * Renders the real-time circular Minimap in the corner of the screen.
   */
  private renderMinimap() {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = cx - 6;

    ctx.clearRect(0, 0, w, h);

    // Update coords label
    const px = Math.round(this.player.position.x);
    const pz = Math.round(this.player.position.z);
    if (this.elMinimapCoords) {
      this.elMinimapCoords.innerText = `${px}, ${pz}`;
    }

    // Circular clip path for the radar view
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Dark desert sand gradient background
    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
    bgGrad.addColorStop(0, '#2b1a13');
    bgGrad.addColorStop(0.7, '#1f120c');
    bgGrad.addColorStop(1, '#140b07');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle radar range rings (15m, 30m, 45m)
    // Scale: 1 world unit = 1.7 pixels
    const scale = 1.7;
    ctx.strokeStyle = 'rgba(217, 139, 74, 0.22)';
    ctx.lineWidth = 1;
    [15, 30, 42].forEach(dist => {
      ctx.beginPath();
      ctx.arc(cx, cy, dist * scale, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(217, 139, 74, 0.15)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.stroke();

    const playerX = this.player.position.x;
    const playerZ = this.player.position.z;

    // 1. Draw XP Gems (small cyan/green sparkle dots)
    for (const gem of this.dropManager.gems) {
      const relX = (gem.position.x - playerX) * scale;
      const relZ = (gem.position.z - playerZ) * scale;
      if (relX * relX + relZ * relZ <= radius * radius) {
        ctx.fillStyle = gem.type === 'red' ? '#ef4444' : gem.type === 'green' ? '#10b981' : '#06b6d4';
        ctx.fillRect(cx + relX - 1.5, cy + relZ - 1.5, 3, 3);
      }
    }

    // 2. Draw Altars (colored glowing diamonds & capture rings)
    for (const altar of this.discoveredAltars.values()) {
      const relX = (altar.pos.x - playerX) * scale;
      const relZ = (altar.pos.z - playerZ) * scale;
      const distSq = relX * relX + relZ * relZ;

      if (distSq <= (radius + 15) * (radius + 15)) {
        // Clamp to edge if just outside
        let drawX = cx + relX;
        let drawY = cy + relZ;
        if (distSq > radius * radius) {
          const d = Math.sqrt(distSq);
          drawX = cx + (relX / d) * (radius - 8);
          drawY = cy + (relZ / d) * (radius - 8);
        }

        // Capture ring circle
        ctx.strokeStyle = altar.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 4.2 * scale, 0, Math.PI * 2);
        ctx.stroke();

        // Diamond center
        ctx.fillStyle = altar.color;
        ctx.beginPath();
        ctx.moveTo(drawX, drawY - 6);
        ctx.lineTo(drawX + 6, drawY);
        ctx.lineTo(drawX, drawY + 6);
        ctx.lineTo(drawX - 6, drawY);
        ctx.closePath();
        ctx.fill();

        // Icon inside
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(altar.icon, drawX, drawY - 9);
      }
    }

    // 2b. Draw Chests (Loot Pods) on Minimap in visible range
    if (this.chestManager) {
      for (const chest of this.chestManager.chests) {
        if (chest.isOpened) continue; // Unopened chests only
        const relX = (chest.position.x - playerX) * scale;
        const relZ = (chest.position.z - playerZ) * scale;
        const distSq = relX * relX + relZ * relZ;

        if (distSq <= radius * radius) {
          const drawX = cx + relX;
          const drawY = cy + relZ;

          const color = chest.tier === 'legendary' ? '#f43f5e' : chest.tier === 'large' ? '#06b6d4' : '#fbbf24';
          const pulse = 1 + Math.sin(this.animTimer * 4) * 0.15;

          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(drawX, drawY, 5 * pulse, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(drawX, drawY, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = '9px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('📦', drawX, drawY - 7);
        }
      }
    }

    // 2c. Draw Rift Teleporter on Minimap (analogous to chests: shown only once discovered and within radar range)
    if (this.riftTeleporter && this.riftTeleporter.isDiscovered) {
      const relX = (this.riftTeleporter.position.x - playerX) * scale;
      const relZ = (this.riftTeleporter.position.z - playerZ) * scale;
      const distSq = relX * relX + relZ * relZ;

      if (distSq <= radius * radius) {
        const drawX = cx + relX;
        const drawY = cy + relZ;

        const teleColor = this.riftTeleporter.state === 'WARP_READY' ? '#10b981' : this.riftTeleporter.state === 'CHARGING' ? '#f43f5e' : '#818cf8';
        const pulse = 1 + Math.sin(this.animTimer * 4) * 0.15;

        ctx.strokeStyle = teleColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 7 * pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = teleColor;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌀', drawX, drawY);
      }
    }

    // 3. Draw Enemies (crimson dots, boss as glowing skull)
    for (const enemy of this.enemyManager.enemies) {
      if (!enemy.isAlive) continue;
      const relX = (enemy.position.x - playerX) * scale;
      const relZ = (enemy.position.z - playerZ) * scale;
      const distSq = relX * relX + relZ * relZ;

      if (enemy.isBoss) {
        // Boss Marker (Always visible with arrow if outside)
        let bx = cx + relX;
        let by = cy + relZ;
        if (distSq > radius * radius) {
          const d = Math.sqrt(distSq);
          bx = cx + (relX / d) * (radius - 12);
          by = cy + (relZ / d) * (radius - 12);
        }

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(bx, by, 7 + Math.sin(this.animTimer * 5) * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 9px "Cinzel", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💀', bx, by);
      } else if (distSq <= radius * radius) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx + relX, cy + relZ, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Draw Player at Center (facing direction chevron)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Direction pointer
    let angle = 0;
    if (this.player.currentDir === 'front') angle = Math.PI / 2;
    else if (this.player.currentDir === 'back') angle = -Math.PI / 2;
    else if (this.player.currentDir === 'left') angle = Math.PI;
    else if (this.player.currentDir === 'right') angle = 0;

    const tipX = cx + Math.cos(angle) * 10;
    const tipY = cy + Math.sin(angle) * 10;
    const sideX1 = cx + Math.cos(angle + 2.4) * 6;
    const sideY1 = cy + Math.sin(angle + 2.4) * 6;
    const sideX2 = cx + Math.cos(angle - 2.4) * 6;
    const sideY2 = cy + Math.sin(angle - 2.4) * 6;

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(sideX1, sideY1);
    ctx.lineTo(cx, cy);
    ctx.lineTo(sideX2, sideY2);
    ctx.closePath();
    ctx.fill();

    // 4b. Draw Partners on Minimap (if present in co-op)
    const partnerList = this.partners.length > 0 ? this.partners : this.partner ? [this.partner] : [];
    for (const rp of partnerList) {
      const partRelX = (rp.position.x - playerX) * scale;
      const partRelZ = (rp.position.z - playerZ) * scale;
      const partDist = Math.sqrt(partRelX * partRelX + partRelZ * partRelZ);

      // Clamp to radar edge if beyond radar boundary
      let drawX = cx + partRelX;
      let drawZ = cy + partRelZ;
      if (partDist > radius - 7) {
        drawX = cx + (partRelX / partDist) * (radius - 7);
        drawZ = cy + (partRelZ / partDist) * (radius - 7);
      }

      ctx.fillStyle = rp.colorCss || '#06b6d4';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(drawX, drawZ, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const slotLabel = rp.id.startsWith('p') ? `P${rp.id.slice(1)}` : rp.name.slice(0, 2);
      ctx.fillText(slotLabel, drawX, drawZ);
    }

    ctx.restore(); // Exit clip

    // 5. Compass Bezel Frame (Weathered Brass & Cardinal Ticks)
    ctx.strokeStyle = '#c2884f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#452a1b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2.5, 0, Math.PI * 2);
    ctx.stroke();

    // Cardinal Points (N, S, W, E)
    ctx.font = 'bold 11px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // North (top)
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('N', cx, 9);

    ctx.fillStyle = '#d4af37';
    ctx.fillText('S', cx, h - 8);
    ctx.fillText('W', 9, cy);
    ctx.fillText('E', w - 8, cy);
  }

  /**
   * Renders the full-screen vintage parchment surveyor map (TAB).
   */
  private renderFullMap() {
    const ctx = this.fullMapCtx;
    const w = this.fullMapCanvas.width;
    const h = this.fullMapCanvas.height;

    // Pan & zoom transform: centered on player + user pan offset
    const mapScale = this.mapZoom;
    const cx = w / 2 + this.panOffsetX;
    const cy = h / 2 + this.panOffsetZ;

    ctx.clearRect(0, 0, w, h);

    // 1. Vintage Parchment Background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#ebd5b3');
    bgGrad.addColorStop(0.5, '#deb887');
    bgGrad.addColorStop(1, '#c99f6b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle longitude & latitude surveyor grid aligned with pan offset
    ctx.strokeStyle = 'rgba(120, 75, 40, 0.16)';
    ctx.lineWidth = 1;
    const gridSize = 45;
    const startGridX = ((cx % gridSize) + gridSize) % gridSize;
    const startGridY = ((cy % gridSize) + gridSize) % gridSize;
    for (let x = startGridX; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = startGridY; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // World-to-Map Coordinate Transform
    const px = this.player.position.x;
    const pz = this.player.position.z;

    // 2. Explored Chunks & Fog of War
    const chunkPx = 50 * mapScale;

    // First, draw dark dusty unexplored fog over whole map
    ctx.fillStyle = 'rgba(38, 24, 18, 0.9)';
    ctx.fillRect(0, 0, w, h);

    // Clear / reveal explored chunks
    for (const chunkKey of this.exploredChunks) {
      const [ckx, ckz] = chunkKey.split(',').map(Number);
      const chunkWorldX = ckx * 50;
      const chunkWorldZ = ckz * 50;

      const screenX = cx + (chunkWorldX - px) * mapScale;
      const screenZ = cy + (chunkWorldZ - pz) * mapScale;

      if (screenX + chunkPx > 0 && screenX < w && screenZ + chunkPx > 0 && screenZ < h) {
        // Parchment revealed chunk
        ctx.fillStyle = '#deb887';
        ctx.fillRect(screenX, screenZ, chunkPx + 1, chunkPx + 1);

        // Subtle topographic dune lines inside chunk
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenZ, chunkPx, chunkPx);

        // Dune waves
        ctx.beginPath();
        ctx.moveTo(screenX + 4, screenZ + chunkPx * 0.35);
        ctx.quadraticCurveTo(screenX + chunkPx * 0.5, screenZ + chunkPx * 0.25, screenX + chunkPx - 4, screenZ + chunkPx * 0.35);
        ctx.moveTo(screenX + 4, screenZ + chunkPx * 0.7);
        ctx.quadraticCurveTo(screenX + chunkPx * 0.5, screenZ + chunkPx * 0.6, screenX + chunkPx - 4, screenZ + chunkPx * 0.7);
        ctx.stroke();

        // 3. Draw Environmental Obstacles (Cacti, Trees, Rocks) in explored chunks
        if (this.obstacleManager) {
          const obstacles = this.obstacleManager.getObstaclesForChunkKey(chunkKey);
          if (obstacles) {
            for (const obs of obstacles) {
              const ox = cx + (obs.x - px) * mapScale;
              const oz = cy + (obs.z - pz) * mapScale;
              if (ox >= 12 && ox <= w - 12 && oz >= 12 && oz <= h - 12) {
                if (obs.type === 'cactus') {
                  ctx.fillStyle = '#2d6a4f';
                  ctx.beginPath();
                  ctx.arc(ox, oz, 2.5, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = '#1b4332';
                  ctx.lineWidth = 1;
                  ctx.stroke();
                } else if (obs.type === 'tree') {
                  ctx.fillStyle = '#6f4e37';
                  ctx.beginPath();
                  ctx.arc(ox, oz, 3, 0, Math.PI * 2);
                  ctx.fill();
                } else if (obs.type === 'boulder') {
                  ctx.fillStyle = '#78716c';
                  ctx.beginPath();
                  ctx.arc(ox, oz, 2.6, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }
          }
        }
      }
    }

    // Terra Incognita watermark in corners
    ctx.font = 'italic 16px "Cinzel", serif';
    ctx.fillStyle = 'rgba(217, 175, 130, 0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('~ TERRA INCOGNITA ~', 120, 42);
    ctx.fillText('~ ДИКИЕ НЕИССЛЕДОВАННЫЕ ЗЕМЛИ ~', w - 180, h - 30);

    // 4. Starting Camp Origin Marker (0, 0)
    const campX = cx + (0 - px) * mapScale;
    const campZ = cy + (0 - pz) * mapScale;
    if (campX >= -50 && campX <= w + 50 && campZ >= -50 && campZ <= h + 50) {
      ctx.fillStyle = '#8b5a2b';
      ctx.font = 'bold 12px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[ЛАГЕРЬ]', campX, campZ);

      ctx.font = 'bold 11px "Cinzel", serif';
      ctx.fillStyle = '#4a2c13';
      ctx.fillText('Стартовая стоянка (0, 0)', campX, campZ + 18);
    }

    // 5. Items & Drops on ground (XP gems, chests)
    for (const gem of this.dropManager.gems) {
      const gx = cx + (gem.position.x - px) * mapScale;
      const gz = cy + (gem.position.z - pz) * mapScale;
      if (gx >= 8 && gx <= w - 8 && gz >= 8 && gz <= h - 8) {
        ctx.fillStyle = gem.type === 'red' ? '#ef4444' : gem.type === 'green' ? '#10b981' : '#06b6d4';
        ctx.beginPath();
        ctx.arc(gx, gz, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // 6. Regular Enemies in visible range
    for (const enemy of this.enemyManager.enemies) {
      if (!enemy.isAlive || enemy.isBoss) continue;
      const ex = cx + (enemy.position.x - px) * mapScale;
      const ez = cy + (enemy.position.z - pz) * mapScale;
      if (ex >= 8 && ex <= w - 8 && ez >= 8 && ez <= h - 8) {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(ex, ez, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. Discovered Altars (fixed top-down coordinates: Z mapped to vertical canvas axis)
    for (const altar of this.discoveredAltars.values()) {
      const ax = cx + (altar.pos.x - px) * mapScale;
      const az = cy + (altar.pos.z - pz) * mapScale;

      if (ax >= -40 && ax <= w + 40 && az >= -40 && az <= h + 40) {
        // Altar pin badge
        ctx.fillStyle = 'rgba(20, 14, 10, 0.88)';
        ctx.strokeStyle = altar.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ax, az, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '15px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(altar.icon, ax, az);

        // Label
        ctx.font = 'bold 11px "Cinzel", serif';
        ctx.fillStyle = '#2d180d';
        ctx.fillText(altar.name, ax, az + 22);

        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = altar.isCaptured ? '#888' : altar.color;
        const statusText = altar.isCaptured ? '[ПЕРЕЗАРЯДКА]' : '[АКТИВЕН]';
        ctx.fillText(statusText, ax, az + 34);
      }
    }

    // 7b. Draw Chests on Full Map (in explored chunk or visible range)
    if (this.chestManager) {
      for (const chest of this.chestManager.chests) {
        const chunkX = Math.floor(chest.position.x / 50);
        const chunkZ = Math.floor(chest.position.z / 50);
        const chunkKey = `${chunkX},${chunkZ}`;
        const distToPlayer = chest.position.distanceTo(this.player.position);

        const isVisible = this.exploredChunks.has(chunkKey) || distToPlayer < 65;
        if (!isVisible) continue;

        const screenX = cx + (chest.position.x - px) * mapScale;
        const screenZ = cy + (chest.position.z - pz) * mapScale;

        if (screenX >= 10 && screenX <= w - 10 && screenZ >= 10 && screenZ <= h - 10) {
          const color = chest.tier === 'legendary' ? '#f43f5e' : chest.tier === 'large' ? '#06b6d4' : '#fbbf24';
          const tierLabel = chest.tier === 'legendary' ? 'Легендарная капсула' : chest.tier === 'large' ? 'Большой контейнер' : 'Малый контейнер';

          ctx.save();
          if (chest.isOpened) {
            ctx.fillStyle = 'rgba(30, 20, 15, 0.75)';
            ctx.strokeStyle = 'rgba(140, 140, 140, 0.6)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(screenX, screenZ, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 9px sans-serif';
            ctx.fillStyle = '#888888';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', screenX, screenZ);
          } else {
            ctx.fillStyle = 'rgba(20, 14, 10, 0.9)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenZ, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.font = '12px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📦', screenX, screenZ);

            ctx.font = 'bold 10px "Cinzel", serif';
            ctx.fillStyle = '#2d180d';
            ctx.fillText(tierLabel, screenX, screenZ + 18);
          }
          ctx.restore();
        }
      }
    }

    // 7c. Draw Teleporter on Full Map (analogous to chests: only if discovered)
    if (this.riftTeleporter && this.riftTeleporter.isDiscovered) {
      const tx = cx + (this.riftTeleporter.position.x - px) * mapScale;
      const tz = cy + (this.riftTeleporter.position.z - pz) * mapScale;

      if (tx >= 15 && tx <= w - 15 && tz >= 15 && tz <= h - 15) {
        ctx.save();
        const teleColor = this.riftTeleporter.state === 'WARP_READY' ? '#10b981' : this.riftTeleporter.state === 'CHARGING' ? '#f43f5e' : '#818cf8';
        ctx.fillStyle = 'rgba(20, 14, 10, 0.92)';
        ctx.strokeStyle = teleColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(tx, tz, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌀', tx, tz);

        ctx.font = 'bold 11px "Cinzel", serif';
        ctx.fillStyle = '#2d180d';
        ctx.fillText('ТЕЛЕПОРТ РАЗЛОМА', tx, tz + 22);
        ctx.restore();
      }
    }

    // 8. Boss Marker (if active)
    if (this.enemyManager.activeBoss && this.enemyManager.activeBoss.isAlive) {
      const bossPos = this.enemyManager.activeBoss.position;
      const bx = cx + (bossPos.x - px) * mapScale;
      const bz = cy + (bossPos.z - pz) * mapScale;

      const pulse = Math.sin(this.animTimer * 6) * 4;

      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.arc(bx, bz, 24 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b91c1c';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(bx, bz, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 10px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💀', bx, bz);

      ctx.font = 'bold 12px "Cinzel", serif';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('«КРОВАВЫЙ ШЕРИФ»', bx, bz + 24);
    }

    // 9. Current Player Location Marker with Facing Direction Pointer
    const playerScreenX = cx;
    const playerScreenZ = cy;

    const pPulse = Math.sin(this.animTimer * 5) * 3;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenZ, 18 + pPulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenZ, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Facing direction pointer chevron
    let angle = 0;
    if (this.player.currentDir === 'front') angle = Math.PI / 2;
    else if (this.player.currentDir === 'back') angle = -Math.PI / 2;
    else if (this.player.currentDir === 'left') angle = Math.PI;
    else if (this.player.currentDir === 'right') angle = 0;

    const tipX = playerScreenX + Math.cos(angle) * 16;
    const tipY = playerScreenZ + Math.sin(angle) * 16;
    const sideX1 = playerScreenX + Math.cos(angle + 2.5) * 9;
    const sideY1 = playerScreenZ + Math.sin(angle + 2.5) * 9;
    const sideX2 = playerScreenX + Math.cos(angle - 2.5) * 9;
    const sideY2 = playerScreenZ + Math.sin(angle - 2.5) * 9;

    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(sideX1, sideY1);
    ctx.lineTo(playerScreenX, playerScreenZ);
    ctx.lineTo(sideX2, sideY2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 12px "Cinzel", serif';
    ctx.fillStyle = '#3a1f0d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('ВЫ (ТЕКУЩАЯ ПОЗИЦИЯ)', playerScreenX, playerScreenZ - 20);

    // Coordinate tag
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#78350f';
    ctx.fillText(`[${Math.round(px)}, ${Math.round(pz)}]`, playerScreenX, playerScreenZ + 24);

    // 9b. Draw Partners on Full Desert Map
    const fullPartnerList = this.partners.length > 0 ? this.partners : this.partner ? [this.partner] : [];
    for (const rp of fullPartnerList) {
      const partX = cx + (rp.position.x - px) * mapScale;
      const partZ = cy + (rp.position.z - pz) * mapScale;

      const pPulse = Math.sin(this.animTimer * 5) * 3;
      ctx.strokeStyle = rp.colorCss || 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(partX, partZ, 16 + pPulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = rp.colorCss || '#06b6d4';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(partX, partZ, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 11px "Cinzel", serif';
      ctx.fillStyle = rp.colorCss || '#0e7490';
      ctx.textAlign = 'center';
      ctx.fillText(rp.name, partX, partZ - 16);
    }

    // 10. Decorative Border & Cardinal Compass Indicators
    ctx.strokeStyle = '#5c3a21';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.strokeStyle = '#a47242';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // Cardinal Points on borders
    ctx.font = 'bold 12px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // North (top)
    ctx.fillStyle = '#b91c1c';
    ctx.fillText('▲ СЕВЕР (N)', w / 2, 22);

    // South (bottom)
    ctx.fillStyle = '#78350f';
    ctx.fillText('▼ ЮГ (S)', w / 2, h - 20);

    // West (left)
    ctx.fillText('◀ ЗАПАД (W)', 58, h / 2);

    // East (right)
    ctx.fillText('ВОСТОК (E) ▶', w - 58, h / 2);

    // Compass Rose in top-right corner
    const roseX = w - 46;
    const roseY = 46;
    ctx.font = 'bold 22px "Cinzel", serif';
    ctx.fillStyle = '#8b5a2b';
    ctx.fillText('N', roseX, roseY);

    // 11. Update Header Stats Bar
    if (this.elFullMapStats) {
      const exploredAreaM2 = this.exploredChunks.size * 2500;
      const percent = Math.min(100, Math.round((this.exploredChunks.size / 100) * 100));
      this.elFullMapStats.innerHTML = `
        <div class="map-stat-item">Исследовано: <strong>${this.exploredChunks.size} / 100 чанков</strong> (${percent}%, ${exploredAreaM2} м²)</div>
        <div class="map-stat-item">Алтари: <strong>${this.discoveredAltars.size} / 3</strong></div>
        <div class="map-stat-item">Предметов: <strong>${this.dropManager.gems.length}</strong></div>
        <div class="map-stat-item" id="btn-copy-seed-stat" style="cursor: pointer; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 2px 8px; border-radius: 4px;" title="Нажмите, чтобы скопировать seed карты">Seed: <strong style="color: #f59e0b;">#${this.currentSeed}</strong> 📋</div>
        <div class="map-stat-item">Координаты: <strong>${Math.round(px)}, ${Math.round(pz)}</strong></div>
      `;

      const btnCopy = document.getElementById('btn-copy-seed-stat');
      if (btnCopy) {
        btnCopy.onclick = (e) => {
          e.stopPropagation();
          if (navigator.clipboard) {
            navigator.clipboard.writeText(this.currentSeed.toString());
          }
          btnCopy.innerHTML = `Seed: <strong style="color: #10b981;">Скопировано!</strong> ✓`;
          setTimeout(() => {
            if (btnCopy) {
              btnCopy.innerHTML = `Seed: <strong style="color: #f59e0b;">#${this.currentSeed}</strong> 📋`;
            }
          }, 1500);
        };
      }
    }
  }

  public clear() {
    this.exploredChunks.clear();
    this.discoveredAltars.clear();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.exploredChunks.add(`${dx},${dz}`);
      }
    }
  }
}
