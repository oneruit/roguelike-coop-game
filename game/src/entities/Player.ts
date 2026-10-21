import { InvokerWeapon, InvokerInvokeWeapon } from '../combat/InvokerWeapons';
import { createInvokerBuff, type InvokerSpellCast, type SpellControl } from '../shared/InvokerSpells';
import {
  CanvasTexture,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  LinearFilter,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RGBADepthPacking,
  type Scene,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3
} from 'three';
import {
  Weapon,
  WhirlwindSlashWeapon,
  GreatswordWeapon,
  FlailWeapon,
  AstralStaffWeapon,
  ChakramWeapon,
  BowWeapon,
  KukriWeapon,
  ReaperScytheWeapon,
  FireRingWeapon,
  KatanaSlashWeapon,
  AssaultRifleWeapon,
  SummonUndeadWeapon
} from '../combat/Weapon';
import { Projectile } from '../combat/Projectile';
import { Enemy } from './Enemy';
import { TextureManager, SpriteDirection, AnimatedCharacterTextures } from '../core/TextureManager';
import { SoundManager } from '../core/SoundManager';
import { ObstacleManager } from '../world/ObstacleManager';
import { PassiveBuffId } from '../drops/PassiveBuffs';
import { RiftItemId, RiftItemDef } from '../items/RiftItemSystem';
import { BalanceManager } from '../balance/BalanceManager';
import { MetaProgression } from '../meta/MetaProgression';
import type { MeleeAttackInfo } from '../shared/types';

import { CharacterType, HeroAnimState, BuffType, ActiveBuff } from '../shared/types';
export type { CharacterType, HeroAnimState, BuffType, ActiveBuff };
export interface KillerInfo {
  name: string;
  damage: number;
}
import { CharacterAnimator, getCharacterAnimLayout } from './CharacterAnimator';
import { PlayerStatusManager } from './PlayerStatusManager';
import { renderPlayerOverhead } from './PlayerOverheadRenderer';
import { PlayerMotor } from '../mechanics/player/PlayerMotor';
import { PlayerStats } from '../mechanics/player/PlayerStats';
import { PlayerAnimation } from '../mechanics/player/PlayerAnimation';
import { GameEventBus } from '../mechanics/events/GameEventBus';
import { ChunkManager } from '../world/ChunkManager';

export class Player {
  public mesh: Group;
  public position: Vector3;
  public prevPosition: Vector3;
  public renderPosition: Vector3;
  public motor: PlayerMotor = new PlayerMotor();
  public animation!: PlayerAnimation;
  private spriteMesh: Mesh;
  private spriteMaterial: MeshBasicMaterial;
  private customDepthMaterial!: MeshDepthMaterial;

  // Directional Textures & Animated State Machine
  private animatedTextures!: AnimatedCharacterTextures;
  private animator?: CharacterAnimator;
  public animState: HeroAnimState = 'IDLE';
  public attackAnimTimer: number = 0;
  private animFrameTimer: number = 0;
  private roninGeom!: PlaneGeometry;

  public currentDir: SpriteDirection = 'front';
  public getElevation?: (x: number, z: number) => number;
  public getTerrainSlowFactor?: (x: number, z: number) => number;
  public isTerrainSlowed: boolean = false;

  // Stats
  public charType: CharacterType = 'ronin';
  public hp: number = 115;
  public maxHp: number = 115;
  public baseMaxHp: number = 115;
  public speed: number = 8.6;
  public baseSpeed: number = 8.6;
  public xp: number = 0;
  public xpToNextLevel: number = 10;
  public level: number = 1;
  public onLevelGained?: (levelsGained: number) => void;
  public onChronosTrigger?: (position: Vector3) => void;
  public pickupRadius: number = 4.0;
  public damageMultiplier: number = 1.35;
  public baseDamageMultiplier: number = 1.35;
  public passiveDamageMultiplier: number = 1.0;
  public passiveSpeedMultiplier: number = 1.0;
  public passiveCooldownMultiplier: number = 1.0;
  public passiveHpRegen: number = 0;
  public passiveDamageReduction: number = 0;
  public amplifierCount: number = 0;
  public speedBootsCount: number = 0;
  public flaskCount: number = 0;
  public magnetCount: number = 0;
  public amuletCount: number = 0;
  public vestCount: number = 0;
  public watchCount: number = 0;
  public mightElixirCount: number = 0;
  public critDamageCount: number = 0;
  public critChanceCount: number = 0;
  private scene: Scene;

  // The Rift: Item Inventory & Economy
  public riftItems: Map<RiftItemId, number> = new Map();
  public credits: number = 0; // Plasma Credits currency
  public shield: number = 35;
  public maxShield: number = 35;
  public shieldRegenDelay: number = 0;
  public shieldRegenBaseDelay: number = 5.0;
  public shieldRegenMultiplier: number = 1.0;
  public critChance: number = 0.05; // 5% base crit chance (max 100% / 1.0)
  public critDamage: number = 0.50; // 50% base crit damage (max 1000% / 10.0)
  public startingWeaponId: string = '';
  public singularityKillCounter: number = 0;
  public orbitalStrikeTimer: number = 12.0;
  public golemCoreTimer: number = 6.0;
  public moltenScaleTimer: number = 0.28;
  public isMoving: boolean = false;
  public statusManager: PlayerStatusManager = new PlayerStatusManager();

  public applyBurn(duration?: number): void {
    if (this.isGodMode || this.activeBuffs.has('invulnerable') || this.activeBuffs.has('ghost')) return;
    this.statusManager.applyBurn(duration);
  }

  public applyShock(duration?: number): void {
    if (this.isGodMode || this.activeBuffs.has('invulnerable') || this.activeBuffs.has('ghost')) return;
    this.statusManager.applyShock(duration);
  }

  public applySlow(factor: number, duration: number): void {
    if (this.isGodMode || this.activeBuffs.has('invulnerable') || this.activeBuffs.has('ghost')) return;
    this.statusManager.applySlow(factor, duration);
  }

  public get isBurning(): boolean {
    return this.statusManager.isBurning;
  }

  public get isShocked(): boolean {
    return this.statusManager.isShocked;
  }

  public get isSlowed(): boolean {
    return this.statusManager.isSlowed;
  }

  // Tactical Dash Ability
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public dashDuration: number = 0.22;
  public dashCooldown: number = 0;
  public maxDashCooldown: number = 2.5;
  public dashDirection: Vector3 = new Vector3();

  // Active Shrine Buffs
  public activeBuffs: Map<BuffType, ActiveBuff> = new Map();

  // Visual Buff Auras
  private invulnShieldMesh!: Mesh;
  private damageAuraMesh!: Mesh;
  private speedAuraMesh!: Mesh;
  private regenAuraMesh!: Mesh;

  // Developer Cheats
  public isGodMode: boolean = false;
  public isSpeedCheat: boolean = false;
  public isOneHitKill: boolean = false;

  // Weapons
  public weapons: Weapon[] = [];

  // Movement & Animation
  private animTimer: number = 0;
  public isAlive: boolean = true;
  public killerInfo: KillerInfo | null = null;
  private flashTimer: number = 0;

  // Co-op and Downed mechanics
  public isCoop: boolean = false;
  public isDowned: boolean = false;
  public reviveProgress: number = 0;

  // Individual player statistics
  public kills: number = 0;
  public totalDamageDealt: number = 0;
  public revivesCount: number = 0;

  // Overhead 3D Canvas Billboard (Name, HP, Revive Bar)
  public displayName: string = 'Игрок 1 (Вы)';
  public colorCss: string = '#f59e0b';
  private overheadCanvas: HTMLCanvasElement;
  private overheadCtx: CanvasRenderingContext2D;
  private overheadTexture: CanvasTexture;
  private overheadSprite: Sprite;
  private lastDrawnHp: number = -1;
  private lastDrawnMaxHp: number = -1;
  private lastDrawnShield: number = -1;
  private lastDrawnMaxShield: number = -1;
  private lastDrawnLevel: number = -1;
  private lastDrawnDowned: boolean = false;
  private lastDrawnRevive: number = -1;

  private static geometryCache = new Map<CharacterType, PlaneGeometry>();

  public static getCharacterGeometry(_charType?: CharacterType): PlaneGeometry {
    const key = 'standard_96';
    let geom = Player.geometryCache.get(key as any);
    if (!geom) {
      geom = new PlaneGeometry(2.7, 2.7);
      // Standardized 96px chibi geometry for all heroes:
      // Feet anchored at y=88 in 96px cell (8px bottom margin)
      // translation = (88 / 96 - 0.5) * 2.7 = (5 / 12) * 2.7 = 1.125
      geom.translate(0, 1.125, 0);
      Player.geometryCache.set(key as any, geom);
    }
    return geom;
  }

  constructor(scene: Scene, charType: CharacterType = 'ronin') {
    this.scene = scene;
    this.charType = charType;
    this.position = new Vector3(0, 0, 0);
    this.prevPosition = new Vector3(0, 0, 0);
    this.renderPosition = new Vector3(0, 0, 0);
    this.mesh = new Group();

    this.roninGeom = Player.getCharacterGeometry('ronin');

    this.loadCharacterTextures(this.charType);
    this.animator = new CharacterAnimator(
      this.animatedTextures,
      getCharacterAnimLayout(this.charType)
    );

    this.spriteMaterial = new MeshBasicMaterial({
      map: this.animatedTextures.idle,
      transparent: true,
      alphaTest: 0.25,
      side: DoubleSide,
      depthWrite: true,
      depthTest: true
    });

    this.spriteMesh = new Mesh(Player.getCharacterGeometry(this.charType), this.spriteMaterial);
    this.spriteMesh.rotation.x = -Math.PI / 4.8;
    this.spriteMesh.position.y = 0.05;
    this.spriteMesh.renderOrder = 0;
    this.customDepthMaterial = new MeshDepthMaterial({
      depthPacking: RGBADepthPacking,
      map: this.spriteMaterial.map,
      alphaTest: 0.25
    });
    this.spriteMesh.customDepthMaterial = this.customDepthMaterial;
    this.spriteMesh.castShadow = true;
    this.mesh.add(this.spriteMesh);
    this.animation = new PlayerAnimation({ spriteMesh: this.spriteMesh, spriteMaterial: this.spriteMaterial });
    this.animation.loadCharacterTextures(this.charType);
    this.animation.animator = this.animator;

    // Hero Light Glow
    const light = new PointLight(0xf59e0b, 1.4, 9);
    light.position.set(0, 1.2, 0.4);
    this.mesh.add(light);

    // Overhead 3D Canvas Billboard (Name, HP, Revive Bar)
    this.overheadCanvas = document.createElement('canvas');
    this.overheadCanvas.width = 256;
    this.overheadCanvas.height = 96;
    this.overheadCtx = this.overheadCanvas.getContext('2d')!;

    this.overheadTexture = new CanvasTexture(this.overheadCanvas);
    this.overheadTexture.minFilter = LinearFilter;
    const spriteMat = new SpriteMaterial({
      map: this.overheadTexture,
      transparent: true,
      depthTest: false
    });
    this.overheadSprite = new Sprite(spriteMat);
    this.overheadSprite.position.set(0, 2.95, 0);
    this.overheadSprite.scale.set(2.4, 0.9, 1);
    this.overheadSprite.renderOrder = 999;
    this.mesh.add(this.overheadSprite);

    // Setup 3D Buff Auras
    this.setupAuras();

    this.applyCharacterPerks();
    this.redrawOverhead();
    this.updateAnimatedCharacterAnimation(0);

    scene.add(this.mesh);
  }

  private setupAuras() {
    // 1. Invulnerability Golden Shield Bubble
    const shieldGeom = new IcosahedronGeometry(1.4, 1);
    const shieldMat = new MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.4,
      wireframe: true
    });
    this.invulnShieldMesh = new Mesh(shieldGeom, shieldMat);
    this.invulnShieldMesh.position.y = 1.2;
    this.invulnShieldMesh.visible = false;
    this.mesh.add(this.invulnShieldMesh);

    // 2. Crimson Wrath Ring (Damage Buff)
    const dmgGeom = new TorusGeometry(1.15, 0.08, 6, 24);
    dmgGeom.rotateX(Math.PI / 2);
    const dmgMat = new MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85
    });
    this.damageAuraMesh = new Mesh(dmgGeom, dmgMat);
    this.damageAuraMesh.position.y = 1.0;
    this.damageAuraMesh.visible = false;
    this.mesh.add(this.damageAuraMesh);

    // 3. Cyan Swift Wind Ring (Speed Buff)
    const speedGeom = new TorusGeometry(1.1, 0.06, 6, 24);
    speedGeom.rotateX(Math.PI / 2.2);
    const speedMat = new MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.8
    });
    this.speedAuraMesh = new Mesh(speedGeom, speedMat);
    this.speedAuraMesh.position.y = 0.5;
    this.speedAuraMesh.visible = false;
    this.mesh.add(this.speedAuraMesh);

    // 4. Emerald Vitality Ring (Regen Buff)
    const regenGeom = new TorusGeometry(0.95, 0.07, 6, 24);
    regenGeom.rotateX(Math.PI / 2);
    const regenMat = new MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85
    });
    this.regenAuraMesh = new Mesh(regenGeom, regenMat);
    this.regenAuraMesh.position.y = 0.8;
    this.regenAuraMesh.visible = false;
    this.mesh.add(this.regenAuraMesh);
  }

  public isAnimatedCharacter(): boolean {
    return true;
  }

  private loadCharacterTextures(charType: CharacterType) {
    const raw =
      charType === 'amazon'
        ? TextureManager.loadAmazonTextures()
        : charType === 'invoker'
        ? TextureManager.loadInvokerTextures()
        : charType === 'valkyrie'
        ? TextureManager.loadValkyrieTextures()
        : charType === 'flail'
        ? TextureManager.loadFlailTextures()
        : charType === 'sorceress'
        ? TextureManager.loadSorceressTextures()
        : charType === 'chakram'
        ? TextureManager.loadChakramTextures()
        : charType === 'archer'
        ? TextureManager.loadArcherTextures()
        : charType === 'rocket'
        ? TextureManager.loadRocketTextures()
        : charType === 'necromancer'
        ? TextureManager.loadNecromancerTextures()
        : TextureManager.loadRoninTextures();

    const idleAttack = (raw.idle_attack || raw.attack).clone();
    const walkAttack = (raw.walk_attack || raw.idle_attack || raw.attack).clone();
    this.animatedTextures = {
      idle: raw.idle.clone(),
      walk: raw.walk.clone(),
      idle_attack: idleAttack,
      walk_attack: walkAttack,
      attack: idleAttack
    };
    this.animatedTextures.idle.needsUpdate = true;
    this.animatedTextures.walk.needsUpdate = true;
    this.animatedTextures.idle_attack.needsUpdate = true;
    this.animatedTextures.walk_attack.needsUpdate = true;
  }

  public setCharacter(charType: CharacterType = 'ronin') {
    this.charType = charType;
    this.loadCharacterTextures(this.charType);
    this.animator = new CharacterAnimator(
      this.animatedTextures,
      getCharacterAnimLayout(this.charType)
    );
    this.animation.animator = this.animator;
    this.spriteMesh.geometry = Player.getCharacterGeometry(this.charType);
    this.spriteMaterial.map = this.animatedTextures.idle;
    if (this.customDepthMaterial) {
      this.customDepthMaterial.map = this.animatedTextures.idle;
      this.customDepthMaterial.needsUpdate = true;
    }
    this.animState = 'IDLE';
    this.animFrameTimer = 0;
    this.attackAnimTimer = 0;
    this.setDirection(this.currentDir);
    this.applyCharacterPerks();
    this.lastDrawnHp = -1;
    this.redrawOverhead();
    this.updateAnimatedCharacterAnimation(0);
  }

  public setDirection(dir: SpriteDirection) {
    this.currentDir = dir;
    if (this.animator) {
      this.animator.setDirection(dir);
    }
  }

  public onSpellCast?: (cast: InvokerSpellCast) => void;
  public onSpellControl?: (enemy: Enemy, control: SpellControl) => void;
  public onMeleeAttack?: (attack: MeleeAttackInfo) => void;
  public onDamageTaken?: (amount: number, currentHp: number, maxHp: number) => void;

  public triggerAttackAnim(baseDuration: number = 0.5, sourceWeaponId?: string) {
    if (sourceWeaponId && this.startingWeaponId) {
      const isMatch =
        sourceWeaponId === this.startingWeaponId ||
        (this.charType === 'invoker' && sourceWeaponId.startsWith('invoker_'));
      if (!isMatch) return;
    }
    const mainWeapon = this.weapons.find(w => w.id === this.startingWeaponId) || this.weapons[0];
    let duration = baseDuration;
    if (mainWeapon && mainWeapon.effectiveCooldown !== undefined && mainWeapon.effectiveCooldown > 0.1) {
      duration = Math.min(baseDuration, Math.max(0.08, mainWeapon.effectiveCooldown * 0.95));
    }

    const wasAttacking = this.attackAnimTimer > 0;
    this.attackAnimTimer = duration;
    if (!wasAttacking) {
      this.animFrameTimer = 0;
    }
    if (this.animation) {
      this.animation.attackAnimTimer = duration;
      if (!wasAttacking) {
        this.animation.animFrameTimer = 0;
      }
    }
    if (this.animator) {
      this.animator.triggerAttack(duration);
    }
  }

  public clearWeapons(): void {
    for (const w of this.weapons) {
      if (typeof w.destroy === 'function') {
        try {
          w.destroy(this.scene);
        } catch (e) {
          console.warn('[Player] Error destroying weapon:', e);
        }
      }
    }
    this.weapons = [];
  }

  private applyCharacterPerks() {
    this.clearWeapons();
    const heroCfg = BalanceManager.getHeroConfig(this.charType);
    const metaBonuses = MetaProgression.getInstance().getBonuses();
    this.baseDamageMultiplier = heroCfg.damageMultiplier;
    this.maxHp = heroCfg.maxHp + metaBonuses.maxHpBonus;
    this.baseMaxHp = heroCfg.maxHp + metaBonuses.maxHpBonus;
    this.hp = this.maxHp;
    this.baseSpeed = heroCfg.baseSpeed;

    if (this.charType === 'invoker') {
      this.weapons.push(new InvokerInvokeWeapon(() => this.triggerAttackAnim(.5, 'invoker_invoke')));
    } else if (this.charType === 'valkyrie') {
      this.weapons.push(new GreatswordWeapon(() => this.triggerAttackAnim(0.5, 'greatsword')));
    } else if (this.charType === 'flail') {
      this.weapons.push(new FlailWeapon(() => this.triggerAttackAnim(0.45, 'flail')));
    } else if (this.charType === 'necromancer') {
      const undead = new SummonUndeadWeapon(() => this.triggerAttackAnim(0.48, 'summon_undead'));
      if (this.scene) {
        undead.initVisual(this.scene, this.position);
      }
      this.weapons.push(undead);
    } else if (this.charType === 'sorceress') {
      this.weapons.push(new AstralStaffWeapon(() => this.triggerAttackAnim(0.48, 'astral_staff')));
    } else if (this.charType === 'chakram') {
      this.weapons.push(new ChakramWeapon(() => this.triggerAttackAnim(0.44, 'chakram')));
    } else if (this.charType === 'archer') {
      this.weapons.push(new BowWeapon(() => this.triggerAttackAnim(0.40, 'bow')));
    } else if (this.charType === 'rocket') {
      this.weapons.push(new AssaultRifleWeapon(() => this.triggerAttackAnim(0.20, 'assault_rifle')));
    } else if (this.charType === 'amazon') {
      this.weapons.push(new ReaperScytheWeapon(() => this.triggerAttackAnim(0.48, 'reaper_scythe')));
    } else {
      this.weapons.push(new WhirlwindSlashWeapon(() => this.triggerAttackAnim(0.42, 'whirlwind_slash')));
    }
    this.startingWeaponId = this.weapons[0]?.id || heroCfg.startingWeapon || '';
    this.passiveDamageMultiplier = 1.0;
    this.passiveSpeedMultiplier = 1.0;
    this.passiveCooldownMultiplier = 1.0;
    this.passiveHpRegen = 0;
    this.passiveDamageReduction = 0;
    this.amplifierCount = 0;
    this.speedBootsCount = 0;
    this.flaskCount = 0;
    this.magnetCount = 0;
    this.amuletCount = 0;
    this.vestCount = 0;
    this.watchCount = 0;
    this.mightElixirCount = 0;
    this.critDamageCount = 0;
    this.critChanceCount = 0;
    this.pickupRadius = BalanceManager.getGlobalConfig()?.basePickupRadius ?? 4.0;
    this.recalculateStats();
  }

  public syncBalance(): void {
    const heroCfg = BalanceManager.getHeroConfig(this.charType);
    const metaBonuses = MetaProgression.getInstance().getBonuses();
    this.baseDamageMultiplier = heroCfg.damageMultiplier;
    this.baseSpeed = heroCfg.baseSpeed;
    const titanPerStack = BalanceManager.getItemConfig('titan_heart')?.baseValue ?? 150;
    const titanBonus = this.getItemStacks('titan_heart') * titanPerStack;
    const flaskPerStack = BalanceManager.getPassiveConfig('stat_flask')?.perStackValue ?? 30;
    const bonusHp = this.flaskCount * flaskPerStack + titanBonus + metaBonuses.maxHpBonus;
    const newMaxHp = heroCfg.maxHp + bonusHp;
    const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 1.0;
    this.maxHp = newMaxHp;
    this.baseMaxHp = heroCfg.maxHp + metaBonuses.maxHpBonus;
    this.hp = Math.min(this.maxHp, Math.max(1, Math.round(this.maxHp * hpRatio)));

    for (const weapon of this.weapons) {
      weapon.applyBalance(BalanceManager.getWeaponConfig(weapon.id));
    }
    this.recalculateStats();
    this.redrawOverhead();
  }

  public addBuff(buff: ActiveBuff) {
    this.activeBuffs.set(buff.type, { ...buff });
  }

  public hasBuff(type: BuffType): boolean {
    return this.activeBuffs.has(type);
  }

  public getItemStacks(id: RiftItemId): number {
    return this.riftItems.get(id) || 0;
  }

  public addRiftItem(itemDef: RiftItemDef) {
    const cur = this.getItemStacks(itemDef.id);
    this.riftItems.set(itemDef.id, cur + 1);
    if (itemDef.id === 'titan_heart') {
      this.maxHp += 150;
      this.hp = Math.min(this.maxHp, this.hp + 150);
      this.redrawOverhead();
    }
    this.recalculateStats();
  }

  public removeRiftItem(id: RiftItemId, count: number = 1): void {
    const cur = this.getItemStacks(id);
    if (cur <= count) {
      this.riftItems.delete(id);
    } else {
      this.riftItems.set(id, cur - count);
    }
    if (id === 'titan_heart') {
      const reduction = 150 * Math.min(cur, count);
      this.maxHp = Math.max(100, this.maxHp - reduction);
      this.hp = Math.min(this.maxHp, this.hp);
      this.redrawOverhead();
    }
    this.recalculateStats();
  }

  public triggerDash(moveDir: Vector3): boolean {
    if (this.dashCooldown > 0 || this.isDashing || this.isDowned || !this.isAlive) {
      return false;
    }

    const success = this.motor.triggerDash(moveDir, this.currentDir);
    if (!success) return false;

    this.isDashing = this.motor.isDashing;
    this.dashTimer = this.motor.dashTimer;
    this.dashCooldown = this.motor.dashCooldown;
    this.dashDirection.copy(this.motor.dashDirection);

    SoundManager.playDash();
    GameEventBus.emit('player:dash', { cooldown: this.dashCooldown, maxCooldown: this.maxDashCooldown });
    return true;
  }

  public recalculateStats() {
    const metaBonuses = MetaProgression.getInstance().getBonuses();
    const stats = PlayerStats.recalculate(
      this.maxHp,
      this.baseSpeed,
      this.baseDamageMultiplier,
      this.activeBuffs,
      (id) => this.getItemStacks(id),
      {
        amplifierCount: this.amplifierCount,
        mightElixirCount: this.mightElixirCount,
        speedBootsCount: this.speedBootsCount,
        flaskCount: this.flaskCount,
        magnetCount: this.magnetCount,
        amuletCount: this.amuletCount,
        vestCount: this.vestCount,
        watchCount: this.watchCount,
        critDamageCount: this.critDamageCount,
        critChanceCount: this.critChanceCount
      },
      {
        isSpeedCheat: this.isSpeedCheat,
        isOneHitKill: this.isOneHitKill
      },
      this.weapons,
      metaBonuses
    );

    this.passiveHpRegen = stats.hpRegen;
    this.maxShield = stats.maxShield;
    this.shieldRegenBaseDelay = stats.shieldRegenDelay;
    this.shieldRegenMultiplier = stats.shieldRegenMultiplier;
    if (this.shield > this.maxShield) this.shield = this.maxShield;
    this.critChance = stats.critChance;
    this.critDamage = stats.critDamage;
    this.passiveDamageReduction = stats.damageReduction;
    this.passiveCooldownMultiplier = stats.cooldownMultiplier;
    this.pickupRadius = stats.pickupRadius;
    this.passiveSpeedMultiplier = stats.passiveSpeedMultiplier;
    this.speed = stats.speed;
    this.passiveDamageMultiplier = stats.passiveDamageMultiplier;
    this.damageMultiplier = stats.damageMultiplier;

    const globalCfg = BalanceManager.getGlobalConfig();
    const dashReduction = metaBonuses.dashCooldownBonus || 0;
    const baseDashCd = globalCfg?.dashCooldown ?? 2.5;
    this.maxDashCooldown = Math.max(0.5, baseDashCd * (1 - dashReduction));
    this.motor.maxDashCooldown = this.maxDashCooldown;
    if (globalCfg?.dashDuration !== undefined) {
      this.motor.dashDuration = globalCfg.dashDuration;
    }
  }

  /**
   * Calculates effective damage multiplier for a given weapon.
   * Per rule: initial hero damage bonus applies ONLY to their starting weapon!
   * Other weapons receive 1.0 * general bonuses (passive damage, altars, buffs, cheats, energy amplifier, void catalyst).
   */
  public getDamageMultiplier(weaponId?: string): number {
    return PlayerStats.getDamageMultiplier(
      weaponId,
      this.startingWeaponId,
      this.isOneHitKill,
      this.passiveDamageMultiplier,
      (id) => this.getItemStacks(id),
      this.activeBuffs,
      this.baseDamageMultiplier,
      this.charType
    );
  }

  public addAmplifierBonus(_multiplier?: number) { this.amplifierCount++; this.recalculateStats(); }
  public addMightElixirBonus() { this.mightElixirCount++; this.recalculateStats(); }

  public recordWeaponDamage(weaponId: string | undefined, damage: number): void {
    if (!weaponId || damage <= 0) return;
    let weapon = this.weapons.find(w => w.id === weaponId);
    if (!weapon && weaponId.startsWith('invoker_')) {
      weapon = this.weapons.find(w => w.id === 'invoker_invoke');
    }
    if (weapon) {
      weapon.damageDealt += damage;
    }
  }

  public addSpeedBootsBonus(_multiplier: number = 1.03) { this.speedBootsCount++; this.recalculateStats(); }
  public addSpeedBonus(multiplier: number = 1.03) { this.addSpeedBootsBonus(multiplier); }
  public addHpRegen(_amount: number = 1.0) { this.amuletCount++; this.recalculateStats(); }
  public addDamageReduction(_pct: number = 0.10) { this.vestCount++; this.recalculateStats(); }

  public addCooldownReduction(_pct: number = 0.01) {
    if (this.watchCount < 200) {
      this.watchCount++;
      this.recalculateStats();
    }
  }

  public addFlaskBonus(hpIncrease: number = 30) {
    this.flaskCount++;
    this.maxHp += hpIncrease;
    this.heal(this.maxHp);
    this.redrawOverhead();
  }

  public addMagnetBonus(_multiplier: number = 1.10) { this.magnetCount++; this.recalculateStats(); }

  public addCritDamageBonus() {
    this.critDamageCount++;
    this.recalculateStats();
  }

  public addCritChanceBonus() {
    this.critChanceCount++;
    this.recalculateStats();
  }


  /**
   * Calculates damage reduction provided by Nanite Plating (Нано-Броня).
   * Level 1 gives 5%, diminishing returns up to 60% at level 20, capped at 60%.
   */
  public getNaniteDamageReduction(): number {
    const stacks = this.getItemStacks('nanite_plating');
    if (stacks <= 0) return 0;
    return Math.min(0.60, 0.05 * Math.pow(stacks, Math.log(12) / Math.log(20)));
  }

  public isStatMaxedForItem(itemId: string): boolean {
    if (itemId === 'phase_carapace') {
      return this.getItemStacks('phase_carapace') >= 5 || this.maxShield >= 160;
    }
    if (itemId === 'aegis_exoskeleton') {
      return this.getItemStacks('aegis_exoskeleton') >= 5;
    }
    if (itemId === 'nanite_plating') {
      return this.getItemStacks('nanite_plating') >= 20;
    }
    if (itemId === 'crit_lens' || itemId === 'crit_visor') {
      return this.critChance >= 1.0;
    }
    if (itemId === 'heavy_hollowpoint') {
      return this.critDamage >= 10.0;
    }
    if (itemId === 'stat_watch') {
      return this.watchCount >= 200 || (this.watchCount > 0 && 0.01 * Math.pow(this.watchCount, Math.log(50) / Math.log(200)) >= 0.50);
    }
    if (itemId === 'stat_vest') {
      return this.passiveDamageReduction >= 0.70 || this.vestCount >= 300;
    }
    if (itemId === 'stat_speed_boots') {
      return this.passiveSpeedMultiplier >= 3.0 || this.speedBootsCount >= 300;
    }
    if (itemId === 'stat_magnet') {
      return this.pickupRadius >= 50.0 || this.magnetCount >= 100;
    }
    if (itemId === 'stat_crit_damage') {
      return this.critDamage >= 10.0;
    }
    if (itemId === 'stat_crit_chance') {
      return this.critChance >= 1.0;
    }
    return false;
  }

  public applyPassiveBuff(id: PassiveBuffId): string {
    switch (id) {
      case 'stat_amplifier':
        this.addAmplifierBonus();
        return `⭐ +2% Урон (+${Math.round((this.passiveDamageMultiplier - 1) * 100)}%)`;
      case 'stat_speed_boots':
        this.addSpeedBootsBonus(1.03);
        return `🥾 +3% Скорость (x${this.passiveSpeedMultiplier.toFixed(2)} / макс. x3.0)`;
      case 'stat_flask':
        this.addFlaskBonus(30);
        return `🍶 +30 Макс HP & Исцеление (${this.maxHp} HP)`;
      case 'stat_magnet':
        this.addMagnetBonus(1.10);
        return `🧲 +10% Радиус магнита (${this.pickupRadius.toFixed(1)}м / макс. 50м на 100 ур.)`;
      case 'stat_amulet':
        this.addHpRegen(1.0);
        return `🧿 +1 HP/с Реген (+${this.passiveHpRegen.toFixed(1)}/с)`;
      case 'stat_vest':
        this.addDamageReduction(0.10);
        return `🦺 -${(this.passiveDamageReduction * 100).toFixed(1)}% Урон от мобов (${Math.round(this.passiveDamageReduction * 100)}%)`;
      case 'stat_watch':
        this.addCooldownReduction(0.01);
        const cdrPct = Math.round((this.watchCount <= 0 ? 0 : Math.min(0.50, 0.01 * Math.pow(this.watchCount, Math.log(50) / Math.log(200)))) * 100);
        return `⏱️ -1% КД (-${cdrPct}% / макс. 50%)`;
      case 'stat_crit_damage':
        this.addCritDamageBonus();
        return `🗡️ +1% Крит. урон (+${Math.round(this.critDamage * 100)}%)`;
      case 'stat_crit_chance':
        this.addCritChanceBonus();
        return `🎯 +0.05% Шанс крита (${(this.critChance * 100).toFixed(2)}%)`;
    }
  }

  public update(
    dt: number,
    moveDir: Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void,
    obstacleManager?: ObstacleManager,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: Vector3, critChance?: number, critDamage?: number, weaponId?: string) => void,
    getElevation?: (x: number, z: number) => number
  ) {
    if (getElevation) {
      this.getElevation = getElevation;
    }
    if (!this.isAlive) return;

    // Record previous position for render interpolation between fixed simulation ticks
    this.prevPosition.copy(this.position);

    // Tactical Dash Cooldown & Movement
    const dashResult = this.motor.updateDash(dt, this.position, this.speed, obstacleManager);
    this.isDashing = this.motor.isDashing;
    this.dashTimer = this.motor.dashTimer;
    this.dashCooldown = this.motor.dashCooldown;
    if (dashResult.isDashing) {
      this.spriteMaterial.color.setHex(0x60a5fa);
    } else if (dashResult.justEnded) {
      this.spriteMaterial.color.setHex(0xffffff);
    }

    // Shield (Armor) Regeneration
    if (this.maxShield > 0) {
      if (this.shieldRegenDelay > 0) {
        this.shieldRegenDelay -= dt;
      } else if (this.shield < this.maxShield) {
        const prevShield = this.shield;
        const baseRate = this.maxShield / 6.0; // Fully restores shield in 6.0 seconds
        const regenRate = baseRate * this.shieldRegenMultiplier;
        this.shield = Math.min(this.maxShield, this.shield + regenRate * dt);
        if (Math.floor(prevShield) !== Math.floor(this.shield)) {
          this.redrawOverhead();
        }
      }
    }

    // Passive HP Regeneration from Hunter Amulet & Bio-Injectors
    if (this.passiveHpRegen > 0 && !this.isDowned) {
      this.heal(this.passiveHpRegen * dt);
    }

    // 1. Process Active Shrine Buffs
    for (const [type, buff] of this.activeBuffs.entries()) {
      buff.duration -= dt;

      // Health regeneration tick
      if (type === 'regen') {
        this.heal(buff.value * dt);
      }

      if (buff.duration <= 0) {
        this.activeBuffs.delete(type);
        SoundManager.playBuffExpire();
      }
    }
    this.recalculateStats();

    // 2. Animate Visual Buff Auras
    const hasInvuln = this.activeBuffs.has('invulnerable');
    this.invulnShieldMesh.visible = hasInvuln;
    if (hasInvuln) {
      this.invulnShieldMesh.rotation.y += dt * 2.2;
      this.invulnShieldMesh.rotation.x += dt * 1.1;
      const pulse = 1.0 + Math.sin(this.animTimer * 6) * 0.06;
      this.invulnShieldMesh.scale.set(pulse, pulse, pulse);
    }

    const hasDmg = this.activeBuffs.has('damage');
    this.damageAuraMesh.visible = hasDmg;
    if (hasDmg) {
      this.damageAuraMesh.rotation.z -= dt * 4.5;
      this.damageAuraMesh.position.y = 1.0 + Math.sin(this.animTimer * 4) * 0.12;
    }

    const hasSpeed = this.activeBuffs.has('speed');
    this.speedAuraMesh.visible = hasSpeed;
    if (hasSpeed) {
      this.speedAuraMesh.rotation.z += dt * 6.0;
    }

    const hasRegen = this.activeBuffs.has('regen');
    this.regenAuraMesh.visible = hasRegen;
    if (hasRegen) {
      this.regenAuraMesh.rotation.z += dt * 3.0;
      this.regenAuraMesh.position.y = 0.5 + ((this.animTimer * 1.4) % 1.5);
    }

    // Downed / dead state handling: player cannot move, attack, or crawl
    if (this.isDowned || !this.isAlive) {
      this.spriteMesh.rotation.z = Math.PI / 2.3;
      this.spriteMaterial.color.setHex(0xff6666);
      this.position.y = 0;
      this.mesh.position.copy(this.position);
      return;
    }

    // 3. Movement & 4-Directional Sprite Selection
    const isMoving = moveDir.lengthSq() > 0.01;
    this.isMoving = isMoving;
    if (this.isGodMode) {
      this.statusManager.reset();
    } else {
      this.statusManager.update(dt, (burnDmg) => this.takeDamage(burnDmg, false, 'Ожог'), this.maxHp);
    }
    const isAttacking = this.attackAnimTimer > 0;

    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer -= dt;
    }

    // Rough terrain / Sand dunes slowdown (slows by 35% on dunes)
    const terrainSlow = this.getTerrainSlowFactor ? this.getTerrainSlowFactor(this.position.x, this.position.z) : 1.0;
    this.isTerrainSlowed = terrainSlow < 0.99;

    if (isMoving) {
      const effectiveSpeed = this.speed * terrainSlow * this.statusManager.movementMultiplier;
      this.position.addScaledVector(moveDir, effectiveSpeed * dt);
      this.animTimer += dt * 12 * terrainSlow;

      let newDir: SpriteDirection = this.currentDir;
      if (Math.abs(moveDir.x) >= Math.abs(moveDir.z)) {
        newDir = moveDir.x < 0 ? 'left' : 'right';
      } else {
        newDir = moveDir.z < 0 ? 'back' : 'front';
      }

      if (newDir !== this.currentDir && !(isAttacking && this.charType === 'invoker')) {
        this.setDirection(newDir);
      }
    } else {
      this.animTimer += dt * 3;
    }

    // 4. Animation Execution: 4-State Machine (IDLE, WALK, IDLE_ATTACK, WALK_ATTACK)
    let newState: HeroAnimState = 'IDLE';
    if (isAttacking && isMoving) {
      newState = 'WALK_ATTACK';
    } else if (isAttacking) {
      newState = 'IDLE_ATTACK';
    } else if (isMoving) {
      newState = 'WALK';
    } else {
      newState = 'IDLE';
    }

    if (newState !== this.animState) {
      this.animState = newState;
      this.animFrameTimer = 0;
    }

    this.updateAnimatedCharacterAnimation(dt, isMoving);
    this.spriteMesh.position.y = 0.05;
    this.spriteMesh.rotation.z = 0;

    // Smooth collision sliding against surrounding obstacles (cacti, trees, boulders, altars, oasis)
    if (obstacleManager) {
      obstacleManager.resolveEntityCollision(this.position, 0.45);
    }

    // Clamp to map bounds (-168 to 168)
    const mapBound = ChunkManager.HALF_MAP - 7;
    this.position.x = Math.max(-mapBound, Math.min(mapBound, this.position.x));
    this.position.z = Math.max(-mapBound, Math.min(mapBound, this.position.z));
    this.position.y = 0;

    this.mesh.position.copy(this.position);

    // Hit flash & status effect visual tints
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.spriteMaterial.color.setHex(0xffffff);
      }
    } else if (this.isBurning) {
      this.spriteMaterial.color.setHex(0xfb923c); // Blazing orange
    } else if (this.isShocked) {
      this.spriteMaterial.color.setHex(0x93c5fd); // Electrified light blue
    } else if (this.isSlowed) {
      this.spriteMaterial.color.setHex(0x67e8f9); // Chilled cyan
    } else {
      this.spriteMaterial.color.setHex(0xffffff);
    }

    this.spriteMaterial.opacity = this.activeBuffs.has('ghost') ? .4 : 1;

    // Update weapons
    const invokeSource = this.weapons.find(weapon => weapon.id === 'invoker_invoke');
    for (const weapon of this.weapons) {
      if (typeof (weapon as any).initVisual === 'function' && !(weapon as any).hasInitVisual && this.scene) {
        (weapon as any).initVisual(this.scene, this.position);
      }
      const damageEnemyWithMultiplier = damageEnemy
        ? (enemy: Enemy, amount: number, sourcePos?: Vector3, critChanceBonus = 0, critDamageBonus = 0) => {
            damageEnemy(
              enemy,
              amount * this.getDamageMultiplier(weapon.id),
              sourcePos,
              Math.min(1.0, this.critChance + critChanceBonus),
              Math.min(10.0, this.critDamage + critDamageBonus),
              weapon.id
            );
          }
        : undefined;

      const spawnProjectileWithWeapon = (proj: Projectile) => {
        proj.sourceWeaponId = weapon.id;
        proj.critChance = this.critChance;
        proj.critDamage = this.critDamage;
        spawnProjectile(proj);
      };

      if (weapon instanceof InvokerWeapon) {
        weapon.setInvokeSource(invokeSource instanceof InvokerWeapon ? invokeSource : undefined);
        weapon.onSpellCast = cast => {
          if (Math.hypot(cast.dx, cast.dz) > .01) {
            this.setDirection(Math.abs(cast.dx) >= Math.abs(cast.dz) ?
              (cast.dx < 0 ? 'left' : 'right') : (cast.dz < 0 ? 'back' : 'front'));
          }
          this.triggerAttackAnim(.5, weapon.id);
          this.onSpellCast?.(cast);
        };
        weapon.onSpellControl = this.onSpellControl;
        weapon.onSpellBuff = (spell, level) => this.addBuff(createInvokerBuff(spell, level));
      }
      weapon.onMeleeAttack = this.onMeleeAttack;
      weapon.update(dt, this.position, enemies, spawnProjectileWithWeapon, damageEnemyWithMultiplier);
    }

    // Update overhead billboard UI (Name, Level, HP Bar, Revive progress)
    if (
      this.hp !== this.lastDrawnHp ||
      this.maxHp !== this.lastDrawnMaxHp ||
      this.shield !== this.lastDrawnShield ||
      this.maxShield !== this.lastDrawnMaxShield ||
      this.level !== this.lastDrawnLevel ||
      this.isDowned !== this.lastDrawnDowned ||
      Math.abs(this.reviveProgress - this.lastDrawnRevive) > 0.05
    ) {
      this.redrawOverhead();
    }
  }

  private updateAnimatedCharacterAnimation(dt: number, isMoving: boolean = false) {
    if (!this.animatedTextures) return;

    this.animation.currentDir = this.currentDir;
    this.animation.animState = this.animState;
    this.animation.animFrameTimer = this.animFrameTimer;
    this.animation.animatedTextures = this.animatedTextures;
    this.animation.animator = this.animator;

    this.animation.update(dt, isMoving, this.charType, this.spriteMaterial, this.customDepthMaterial);

    this.animFrameTimer = this.animation.animFrameTimer;
    if (this.animator) {
      this.animState = this.animator.animState;
    }
  }

  public takeDamage(amount: number, ignoreInvuln = false, sourceName?: string): boolean {
    if (this.isGodMode) return false;
    if (!this.isAlive || this.isDashing || (!ignoreInvuln && (this.activeBuffs.has('invulnerable') || this.activeBuffs.has('ghost'))) || this.isDowned) {
      return false;
    }

    this.shieldRegenDelay = this.shieldRegenBaseDelay;

    // Apply shock vulnerability (+10% damage taken) and Nanite Plating damage reduction
    const incomingAmount = this.isShocked
      ? Math.round(amount * this.statusManager.incomingDamageMultiplier)
      : amount;
    const naniteReduction = this.getNaniteDamageReduction();
    let finalAmount = ignoreInvuln
      ? incomingAmount
      : Math.max(1, (incomingAmount * (1 - naniteReduction)) * (1 - this.passiveDamageReduction));

    // Absorb with shield (armor) first
    if (this.shield > 0) {
      if (this.shield >= finalAmount) {
        this.shield -= finalAmount;
        finalAmount = 0;
        SoundManager.playShieldHit();
      } else {
        finalAmount -= this.shield;
        this.shield = 0;
        SoundManager.playShieldBreak();
      }
      this.redrawOverhead();
    }

    if (finalAmount > 0) {
      this.hp = Math.max(0, this.hp - finalAmount);
      this.flashTimer = 0.15;
      this.spriteMaterial.color.setHex(0xff2222);
      SoundManager.playPlayerHurt();
      this.onDamageTaken?.(finalAmount, this.hp, this.maxHp);
      GameEventBus.emit('player:damaged', { currentHp: this.hp, maxHp: this.maxHp, damage: finalAmount, isLocal: !this.isCoop });
    }

    // Check Chronos Phylactery (Legendary Item) lethal protection
    const chronosStacks = this.getItemStacks('chronos_phylactery');
    if (this.hp <= 0 && chronosStacks > 0) {
      // Consume 1 Time Crystal from inventory per use
      this.removeRiftItem('chronos_phylactery', 1);
      const healPercent = 0.50;
      this.hp = Math.round(this.maxHp * healPercent);
      this.addBuff({
        type: 'invulnerable',
        name: 'Кристалл Времени',
        icon: '⏳',
        color: '#38bdf8',
        duration: 5.0,
        maxDuration: 5.0,
        value: 1
      });
      SoundManager.playTimeFreeze();
      this.onChronosTrigger?.(this.position.clone());
      return false;
    }

    if (this.hp <= 0) {
      this.killerInfo = {
        name: sourceName || 'Монстр Разлома',
        damage: Math.round(finalAmount)
      };
      if (this.isCoop && !ignoreInvuln) {
        this.isDowned = true;
        this.hp = 0;
        this.spriteMesh.rotation.z = Math.PI / 2.3;
        return false;
      }
      this.isAlive = false;
      GameEventBus.emit('player:died', { isLocal: !this.isCoop, deathCount: 1 });
      return true;
    }
    return false;
  }

  public revive(percent = 0.45) {
    if (!this.isDowned) return;
    this.killerInfo = null;
    this.isDowned = false;
    this.hp = Math.round(this.maxHp * percent);
    this.spriteMesh.rotation.z = 0;
    this.spriteMaterial.color.setHex(0xffffff);
    this.addBuff({
      type: 'invulnerable',
      name: 'Щит возрождения',
      icon: '🛡️',
      color: '#f59e0b',
      duration: 3.5,
      maxDuration: 3.5,
      value: 1
    });
    SoundManager.playAltarCaptured();
    GameEventBus.emit('player:revived', { isLocal: !this.isCoop });
  }

  public heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    GameEventBus.emit('player:healed', { currentHp: this.hp, maxHp: this.maxHp, amount, isLocal: !this.isCoop });
  }

  public fullHeal() {
    this.hp = this.maxHp;
  }

  public toggleGodMode(): boolean {
    this.isGodMode = !this.isGodMode;
    if (this.isGodMode) {
      this.statusManager.reset();
      this.hp = this.maxHp;
    }
    return this.isGodMode;
  }

  public toggleSpeedCheat(): boolean {
    this.isSpeedCheat = !this.isSpeedCheat;
    this.recalculateStats();
    return this.isSpeedCheat;
  }

  public toggleOneHitKill(): boolean {
    this.isOneHitKill = !this.isOneHitKill;
    this.recalculateStats();
    return this.isOneHitKill;
  }

  public static readonly MAX_WEAPONS = 4;

  public getAwakenedCap(_grade: number = 1): number {
    return 12;
  }

  public areAllWeaponsMaxed(): boolean {
    if (this.weapons.length < Player.MAX_WEAPONS) return false;
    return this.weapons.every(w => w.level >= 12);
  }

  public giveAllWeapons(scene: Scene) {
    const hasBow = this.weapons.some(w => w.id === 'bow');
    if (!hasBow && this.weapons.length < Player.MAX_WEAPONS) this.weapons.push(new BowWeapon());

    const hasKukri = this.weapons.some(w => w.id === 'kukri');
    if (!hasKukri && this.weapons.length < Player.MAX_WEAPONS) this.weapons.push(new KukriWeapon());

    const hasOrbs = this.weapons.some(w => w.id === 'reaper_scythe');
    if (!hasOrbs && this.weapons.length < Player.MAX_WEAPONS) this.weapons.push(new ReaperScytheWeapon());

    const hasAura = this.weapons.some(w => w.id === 'fire_ring');
    if (!hasAura && this.weapons.length < Player.MAX_WEAPONS) {
      const aura = new FireRingWeapon();
      aura.initVisual(scene, this.position);
      this.weapons.push(aura);
    }

    const hasKatana = this.weapons.some(w => w.id === 'katana_slash');
    if (!hasKatana && this.weapons.length < Player.MAX_WEAPONS) this.weapons.push(new KatanaSlashWeapon());

    const hasUndead = this.weapons.some(w => w.id === 'summon_undead');
    if (!hasUndead && this.weapons.length < Player.MAX_WEAPONS) {
      const undead = new SummonUndeadWeapon();
      undead.initVisual(scene, this.position);
      this.weapons.push(undead);
    }
    this.recalculateStats();
  }

  public maxAllWeapons() {
    for (const weapon of this.weapons) {
      while (weapon.level < weapon.maxLevel) {
        weapon.upgrade();
      }
    }
  }

  public calculateXpToNextLevel(level: number): number {
    return PlayerStats.calculateXpToNextLevel(level);
  }

  public addLevel(): boolean {
    this.level++;
    this.xpToNextLevel = this.calculateXpToNextLevel(this.level);
    GameEventBus.emit('player:level_up', { newLevel: this.level, levelsGained: 1, isLocal: !this.isCoop });
    return true;
  }

  /** onLevelGained queues upgrades; the returned count is for visual feedback only. */
  public gainXp(amount: number): number {
    this.xp += amount;
    let levelsGained = 0;
    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level++;
      levelsGained++;
      this.xpToNextLevel = this.calculateXpToNextLevel(this.level);
    }
    if (levelsGained > 0 && this.onLevelGained) {
      this.onLevelGained(levelsGained);
      GameEventBus.emit('player:level_up', { newLevel: this.level, levelsGained, isLocal: !this.isCoop });
    }
    GameEventBus.emit('player:xp_gained', { xp: this.xp, xpToNextLevel: this.xpToNextLevel, level: this.level });
    return levelsGained;
  }

  public reset(pos: Vector3 = new Vector3(0, 0, 0)) {
    this.position.copy(pos);
    if (this.getElevation) {
      this.position.y = this.getElevation(this.position.x, this.position.z);
    }
    this.mesh.position.copy(this.position);
    this.xp = 0;
    this.level = 1;
    this.xpToNextLevel = this.calculateXpToNextLevel(1);
    this.pickupRadius = 4.0;
    this.isAlive = true;
    this.isDowned = false;
    this.reviveProgress = 0;
    this.kills = 0;
    this.totalDamageDealt = 0;
    this.revivesCount = 0;
    this.amplifierCount = 0;
    this.speedBootsCount = 0;
    this.flaskCount = 0;
    this.magnetCount = 0;
    this.amuletCount = 0;
    this.vestCount = 0;
    this.watchCount = 0;
    this.mightElixirCount = 0;
    this.critDamageCount = 0;
    this.critChanceCount = 0;
    for (const w of this.weapons) {
      w.damageDealt = 0;
    }
    this.passiveDamageMultiplier = 1.0;
    this.passiveSpeedMultiplier = 1.0;
    this.passiveCooldownMultiplier = 1.0;
    this.passiveHpRegen = 0;
    this.passiveDamageReduction = 0;
    this.spriteMesh.rotation.z = 0;
    this.spriteMaterial.color.setHex(0xffffff);
    this.statusManager.reset();
    this.golemCoreTimer = 6.0;
    this.moltenScaleTimer = 0.28;
    this.isMoving = false;
    this.activeBuffs.clear();
    this.setDirection('front');
    this.applyCharacterPerks();
    this.recalculateStats();
    this.shield = this.maxShield;
    this.shieldRegenDelay = 0;
    this.lastDrawnHp = -1;
    this.lastDrawnShield = -1;
    this.redrawOverhead();
  }

  public redrawOverhead() {
    this.lastDrawnHp = this.hp;
    this.lastDrawnMaxHp = this.maxHp;
    this.lastDrawnShield = this.shield;
    this.lastDrawnMaxShield = this.maxShield;
    this.lastDrawnLevel = this.level;
    this.lastDrawnDowned = this.isDowned;
    this.lastDrawnRevive = this.reviveProgress;

    const ctx = this.overheadCtx;
    if (!ctx) return;
    renderPlayerOverhead(ctx, this.overheadCanvas.width, this.overheadCanvas.height, {
      hp: this.hp,
      maxHp: this.maxHp,
      shield: this.shield,
      maxShield: this.maxShield,
      level: this.level,
      isDowned: this.isDowned,
      reviveProgress: this.reviveProgress,
      charType: this.charType,
      displayName: this.displayName,
      colorCss: this.colorCss
    });
    this.overheadTexture.needsUpdate = true;
  }

  public destroy(scene?: Scene) {
    if (scene) scene.remove(this.mesh);
    this.spriteMaterial.dispose();
    this.overheadTexture.dispose();
    this.overheadSprite.material.dispose();
    this.roninGeom.dispose();
    if (this.invulnShieldMesh) {
      this.invulnShieldMesh.geometry.dispose();
      (this.invulnShieldMesh.material as Material).dispose();
    }
    if (this.damageAuraMesh) {
      this.damageAuraMesh.geometry.dispose();
      (this.damageAuraMesh.material as Material).dispose();
    }
    if (this.speedAuraMesh) {
      this.speedAuraMesh.geometry.dispose();
      (this.speedAuraMesh.material as Material).dispose();
    }
    if (this.regenAuraMesh) {
      this.regenAuraMesh.geometry.dispose();
      (this.regenAuraMesh.material as Material).dispose();
    }
  }

  public getWeaponsNetState(): { id: string; name: string; icon: string; level: number }[] {
    return this.weapons.map(w => ({
      id: w.id,
      name: w.name,
      icon: w.icon,
      level: w.level
    }));
  }

  public getBuffsNetState(): { type: BuffType; duration: number; maxDuration: number; name: string; icon: string; color: string }[] {
    const list: { type: BuffType; duration: number; maxDuration: number; name: string; icon: string; color: string }[] = [];
    for (const b of this.activeBuffs.values()) {
      list.push({
        type: b.type,
        duration: Math.max(0, b.duration),
        maxDuration: b.maxDuration,
        name: b.name,
        icon: b.icon,
        color: b.color
      });
    }
    return list;
  }

  /**
   * Smoothly interpolates the player mesh position between the previous and current fixed simulation states.
   * Eliminates character stutter/ghosting/judder on variable refresh rates (60Hz, 120Hz, 144Hz+).
   * @param alpha Interpolation factor in [0, 1] representing the fractional progress through the current tick.
   */
  public updateVisuals(alpha: number = 1.0): void {
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    this.renderPosition.lerpVectors(this.prevPosition, this.position, clampedAlpha);
    this.mesh.position.copy(this.renderPosition);
  }
}
