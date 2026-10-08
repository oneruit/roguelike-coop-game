import type { Scene, Camera } from 'three';
import { Player } from '../entities/Player';
import { EnemyManager } from '../entities/EnemyManager';
import { DropManager } from '../drops/DropManager';
import { EnemyType } from '../entities/Enemy';
import { UpdateNotifier } from '../core/UpdateNotifier';

export class DevManager {
  private modal: HTMLElement;
  private isVisible = false;

  // Telemetry elements
  private elFps: HTMLElement;
  private elCoords: HTMLElement;
  private elChunk: HTMLElement;
  private elEnemies: HTMLElement;
  private elProjectiles: HTMLElement;
  private elGems: HTMLElement;
  private elTimeStr: HTMLElement;

  // Cheat status elements
  private elGodStatus: HTMLElement;
  private elSpeedStatus: HTMLElement;
  private elOnehitStatus: HTMLElement;
  private elCoopBanner: HTMLElement | null = null;

  // External context
  private player: Player;
  private enemyManager: EnemyManager;
  private dropManager: DropManager;
  private scene: Scene;
  private camera: Camera;
  private onTriggerLevelUp: (count?: number) => void;
  public timeScale: number = 1.0;

  // Co-op multiplayer authority
  public isHost: () => boolean = () => true;
  public isCoop: () => boolean = () => false;
  public onBroadcastDevAction?: (action: string, value?: any) => void;
  public onApplySeed?: (seed: string | number) => void;

  // Seed controls
  private elSeedInput: HTMLInputElement | null = null;

  constructor(
    player: Player,
    enemyManager: EnemyManager,
    dropManager: DropManager,
    scene: Scene,
    camera: Camera,
    onTriggerLevelUp: (count?: number) => void
  ) {
    this.player = player;
    this.enemyManager = enemyManager;
    this.dropManager = dropManager;
    this.scene = scene;
    this.camera = camera;
    this.onTriggerLevelUp = onTriggerLevelUp;

    this.modal = document.getElementById('dev-panel-modal')!;
    this.elCoopBanner = document.getElementById('dev-coop-banner');

    this.elFps = document.getElementById('dev-fps')!;
    this.elCoords = document.getElementById('dev-coords')!;
    this.elChunk = document.getElementById('dev-chunk')!;
    this.elEnemies = document.getElementById('dev-enemies-count')!;
    this.elProjectiles = document.getElementById('dev-projectiles-count')!;
    this.elGems = document.getElementById('dev-gems-count')!;
    this.elTimeStr = document.getElementById('dev-time-str')!;

    this.elGodStatus = document.getElementById('dev-god-status')!;
    this.elSpeedStatus = document.getElementById('dev-speed-status')!;
    this.elOnehitStatus = document.getElementById('dev-onehit-status')!;
    this.elSeedInput = document.getElementById('dev-seed-input') as HTMLInputElement | null;

    this.bindEvents();
  }

  private bindEvents() {
    // Close button
    document.getElementById('btn-dev-close')?.addEventListener('click', () => this.toggle());
    document.getElementById('dev-backdrop')?.addEventListener('click', () => this.toggle());

    // 0. Seed Controls
    document.getElementById('dev-btn-apply-seed')?.addEventListener('click', () => {
      if (this.isCoop() && !this.isHost()) return;
      const seedVal = this.elSeedInput?.value?.trim();
      if (seedVal && seedVal.length > 0) {
        this.onApplySeed?.(seedVal);
      } else {
        const randSeed = Math.floor(Math.random() * 1000000);
        if (this.elSeedInput) this.elSeedInput.value = String(randSeed);
        this.onApplySeed?.(randSeed);
      }
    });

    document.getElementById('dev-btn-random-seed')?.addEventListener('click', () => {
      if (this.isCoop() && !this.isHost()) return;
      const randSeed = Math.floor(Math.random() * 1000000);
      if (this.elSeedInput) this.elSeedInput.value = String(randSeed);
      this.onApplySeed?.(randSeed);
    });

    document.getElementById('dev-btn-copy-seed')?.addEventListener('click', () => {
      const seedVal = this.elSeedInput?.value?.trim();
      if (seedVal && navigator.clipboard) {
        navigator.clipboard.writeText(seedVal);
        const btn = document.getElementById('dev-btn-copy-seed');
        if (btn) {
          const oldText = btn.innerHTML;
          btn.innerHTML = '<span class="btn-icon">✓</span><span>Скопировано!</span>';
          setTimeout(() => { if (btn) btn.innerHTML = oldText; }, 1500);
        }
      }
    });

    // 1. Hero Cheats
    document.getElementById('dev-btn-god')?.addEventListener('click', () => {
      const active = this.player.toggleGodMode();
      this.updateStatusBadge(this.elGodStatus, active);
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('toggle_god', active);
      }
    });

    document.getElementById('dev-btn-heal')?.addEventListener('click', () => {
      this.player.fullHeal();
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('full_heal');
      }
    });

    document.getElementById('dev-btn-speed')?.addEventListener('click', () => {
      const active = this.player.toggleSpeedCheat();
      this.updateStatusBadge(this.elSpeedStatus, active);
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('toggle_speed', active);
      }
    });

    document.getElementById('dev-btn-onehit')?.addEventListener('click', () => {
      const active = this.player.toggleOneHitKill();
      this.updateStatusBadge(this.elOnehitStatus, active);
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('toggle_onehit', active);
      }
    });

    document.getElementById('dev-btn-vacuum')?.addEventListener('click', () => {
      this.dropManager.vacuumAll();
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('vacuum');
      }
    });

    // 2. Altars & Shrine Buffs
    document.getElementById('dev-buff-damage')?.addEventListener('click', () => {
      const buff = {
        type: 'damage' as const,
        name: 'Ярость Пустыни',
        icon: '⚔️',
        color: '#ef4444',
        duration: 25,
        maxDuration: 25,
        value: 0.8
      };
      this.player.addBuff(buff);
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('buff', buff);
      }
    });

    document.getElementById('dev-buff-speed')?.addEventListener('click', () => {
      const buff = {
        type: 'speed' as const,
        name: 'Дыхание Прерии',
        icon: '⚡',
        color: '#06b6d4',
        duration: 20,
        maxDuration: 20,
        value: 0.6
      };
      this.player.addBuff(buff);
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('buff', buff);
      }
    });

    document.getElementById('dev-buff-regen')?.addEventListener('click', () => {
      const buff = {
        type: 'regen' as const,
        name: 'Живительный Оазис',
        icon: '💖',
        color: '#10b981',
        duration: 18,
        maxDuration: 18,
        value: 12
      };
      this.player.addBuff(buff);
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('buff', buff);
      }
    });

    document.getElementById('dev-buff-invuln')?.addEventListener('click', () => {
      const buff = {
        type: 'invulnerable' as const,
        name: 'Щит Солнца',
        icon: '🛡️',
        color: '#f59e0b',
        duration: 12,
        maxDuration: 12,
        value: 1.0
      };
      this.player.addBuff(buff);
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('buff', buff);
      }
    });

    // 3. Time & Speed
    document.getElementById('dev-btn-boss-30')?.addEventListener('click', () => {
      this.enemyManager.setGameTime(1795); // 29:55 - 5 seconds before 30:00!
    });

    document.getElementById('dev-btn-boss-time')?.addEventListener('click', () => {
      this.enemyManager.setGameTime(295); // 04:55
    });

    document.getElementById('dev-btn-boss-10')?.addEventListener('click', () => {
      this.enemyManager.setGameTime(595); // 09:55
    });

    document.getElementById('dev-btn-boss-15')?.addEventListener('click', () => {
      this.enemyManager.setGameTime(895); // 14:55
    });

    document.getElementById('dev-btn-time-plus')?.addEventListener('click', () => {
      this.enemyManager.setGameTime(this.enemyManager.gameTime + 60);
    });

    document.getElementById('dev-btn-time-minus')?.addEventListener('click', () => {
      this.enemyManager.setGameTime(Math.max(0, this.enemyManager.gameTime - 60));
    });

    // Speed 1x, 2x, 5x
    const speedBtns = [
      { id: 'dev-speed-1x', scale: 1.0 },
      { id: 'dev-speed-2x', scale: 2.0 },
      { id: 'dev-speed-5x', scale: 5.0 },
    ];

    speedBtns.forEach(btnInfo => {
      const el = document.getElementById(btnInfo.id);
      el?.addEventListener('click', () => {
        this.timeScale = btnInfo.scale;
        speedBtns.forEach(b => document.getElementById(b.id)?.classList.remove('active'));
        el.classList.add('active');
        if (this.isCoop() && this.isHost()) {
          this.onBroadcastDevAction?.('time_scale', btnInfo.scale);
        }
      });
    });

    // 3. Level & Weapons
    document.getElementById('dev-btn-lvl1')?.addEventListener('click', () => {
      this.player.addLevel();
      this.onTriggerLevelUp(1);
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('level_up', 1);
      }
    });

    document.getElementById('dev-btn-lvl10')?.addEventListener('click', () => {
      for (let i = 0; i < 10; i++) {
        this.player.addLevel();
      }
      this.onTriggerLevelUp(10);
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('level_up', 10);
      }
    });

    document.getElementById('dev-btn-xp1000')?.addEventListener('click', () => {
      const levels = this.player.gainXp(1000);
      if (levels > 0) {
        this.onTriggerLevelUp(levels);
      }
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('xp_1000', 1000);
      }
    });

    document.getElementById('dev-btn-all-weapons')?.addEventListener('click', () => {
      this.player.giveAllWeapons(this.scene);
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('all_weapons');
      }
    });

    document.getElementById('dev-btn-max-weapons')?.addEventListener('click', () => {
      this.player.maxAllWeapons();
      if (this.isCoop() && this.isHost()) {
        this.onBroadcastDevAction?.('max_weapons');
      }
    });

    document.getElementById('dev-btn-test-update')?.addEventListener('click', () => {
      UpdateNotifier.getInstance().simulateUpdate('1.0.1');
    });


    // 4. Monsters & Boss
    document.getElementById('dev-btn-spawn-boss')?.addEventListener('click', () => {
      if (this.isCoop() && !this.isHost()) return;
      this.enemyManager.spawnBossNow(this.player.position);
    });

    document.getElementById('dev-btn-spawn-hydra')?.addEventListener('click', () => {
      if (this.isCoop() && !this.isHost()) return;
      this.enemyManager.spawnHydraNow(this.player.position);
    });

    document.getElementById('dev-btn-spawn-reaper')?.addEventListener('click', () => {
      if (this.isCoop() && !this.isHost()) return;
      this.enemyManager.spawnImmortalBossNow(this.player.position);
    });

    document.getElementById('dev-btn-nuke')?.addEventListener('click', () => {
      if (this.isCoop() && !this.isHost()) return;
      this.enemyManager.killAll(this.camera);
    });

    // Specific monster spawn buttons
    const monsterSpawnBtns = document.querySelectorAll('.dev-spawn-btn');
    monsterSpawnBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.isCoop() && !this.isHost()) return;
        const target = e.currentTarget as HTMLElement;
        const type = (target.getAttribute('data-type') || 'coyote') as EnemyType | 'reaper';
        this.enemyManager.spawnSpecificEnemy(type, this.player.position);
      });
    });
  }

  private updateStatusBadge(badge: HTMLElement, isActive: boolean) {
    if (isActive) {
      badge.innerText = 'ВКЛ';
      badge.className = 'status-on';
    } else {
      badge.innerText = 'ВЫКЛ';
      badge.className = 'status-off';
    }
  }

  public updateCoopAccess() {
    const isClient = this.isCoop() && !this.isHost();
    if (this.elCoopBanner) {
      if (isClient) {
        this.elCoopBanner.classList.remove('hidden');
      } else {
        this.elCoopBanner.classList.add('hidden');
      }
    }

    const cheatButtons = this.modal.querySelectorAll('button:not(#btn-dev-close)');
    cheatButtons.forEach((btn) => {
      const b = btn as HTMLButtonElement;
      b.disabled = isClient;
      if (isClient) {
        b.classList.add('disabled-cheat');
      } else {
        b.classList.remove('disabled-cheat');
      }
    });
  }

  public toggle(): boolean {
    if (this.isCoop() && !this.isHost()) {
      return false;
    }
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.modal.classList.remove('hidden');
      this.updateCoopAccess();
      // Update badge states
      this.updateStatusBadge(this.elGodStatus, this.player.isGodMode);
      this.updateStatusBadge(this.elSpeedStatus, this.player.isSpeedCheat);
      this.updateStatusBadge(this.elOnehitStatus, this.player.isOneHitKill);
    } else {
      this.modal.classList.add('hidden');
    }
    return this.isVisible;
  }

  public getIsOpen(): boolean {
    return this.isVisible;
  }

  public updateTelemetry(fps: number, projectilesCount: number) {
    if (!this.isVisible) return;

    this.elFps.innerText = `${Math.round(fps)}`;
    const px = Math.round(this.player.position.x);
    const pz = Math.round(this.player.position.z);
    this.elCoords.innerText = `${px}, ${pz}`;

    const cx = Math.floor(this.player.position.x / 50);
    const cz = Math.floor(this.player.position.z / 50);
    this.elChunk.innerText = `[${cx}, ${cz}]`;

    this.elEnemies.innerText = `${this.enemyManager.enemies.length}`;
    this.elProjectiles.innerText = `${projectilesCount}`;
    this.elGems.innerText = `${this.dropManager.gems.length}`;

    const mins = Math.floor(this.enemyManager.gameTime / 60);
    const secs = Math.floor(this.enemyManager.gameTime % 60);
    this.elTimeStr.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Resets all dev mode cheats and restores default session state
   */
  public reset() {
    this.timeScale = 1.0;
    this.updateStatusBadge(this.elGodStatus, false);
    this.updateStatusBadge(this.elSpeedStatus, false);
    this.updateStatusBadge(this.elOnehitStatus, false);

    const speedBtns = ['dev-speed-1x', 'dev-speed-2x', 'dev-speed-5x'];
    speedBtns.forEach(id => document.getElementById(id)?.classList.remove('active'));
    document.getElementById('dev-speed-1x')?.classList.add('active');

    if (this.isVisible) {
      this.toggle();
    }
  }

  /**
   * Updates the seed input field with the current active world seed
   */
  public setCurrentSeed(seed: string | number) {
    if (this.elSeedInput) {
      this.elSeedInput.value = String(seed);
    }
  }
}
