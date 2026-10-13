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
  type Texture,
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
  AssaultRifleWeapon
} from '../combat/Weapon';
import { Projectile } from '../combat/Projectile';
import { Enemy } from './Enemy';
import { TextureManager, SpriteDirection, AnimatedCharacterTextures } from '../core/TextureManager';
import { SoundManager } from '../core/SoundManager';
import { ObstacleManager } from '../world/ObstacleManager';
import { PassiveBuffId } from '../drops/PassiveBuffs';
import { RiftItemId, RiftItemDef } from '../items/RiftItemSystem';
import { BalanceManager } from '../balance/BalanceManager';
import type { MeleeAttackInfo } from '../shared/types';

import { CharacterType, HeroAnimState, BuffType, ActiveBuff } from '../shared/types';
export type { CharacterType, HeroAnimState, BuffType, ActiveBuff };
import { CharacterAnimator, ANIM_LAYOUT_V2 } from './CharacterAnimator';
import { PlayerStatusManager } from './PlayerStatusManager';

export class Player {
  public mesh: Group;
  public position: Vector3;
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

  // Backwards compatibility aliases
  public get sheriffStarCount(): number { return this.amplifierCount; }
  public set sheriffStarCount(v: number) { this.amplifierCount = v; }
  public get spursCount(): number { return this.speedBootsCount; }
  public set spursCount(v: number) { this.speedBootsCount = v; }
  public get lassoCount(): number { return this.magnetCount; }
  public set lassoCount(v: number) { this.magnetCount = v; }

  public amuletCount: number = 0;
  public vestCount: number = 0;
  public watchCount: number = 0;
  public mightElixirCount: number = 0;
  private scene: Scene;

  // The Rift: Item Inventory & Economy
  public riftItems: Map<RiftItemId, number> = new Map();
  public credits: number = 0; // Plasma Credits currency
  public shield: number = 0;
  public maxShield: number = 0;
  public shieldRegenDelay: number = 0;
  public critChance: number = 0.05; // 5% base crit chance (max 100% / 1.0)
  public critDamage: number = 0.50; // 50% base crit damage (max 1000% / 10.0)
  public startingWeaponId: string = '';
  public hasChronosReady: boolean = true;
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
  public maxDashCooldown: number = 2.8;
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
  private lastDrawnLevel: number = -1;
  private lastDrawnDowned: boolean = false;
  private lastDrawnRevive: number = -1;

  private static geometryCache = new Map<CharacterType, PlaneGeometry>();

  public static getCharacterGeometry(charType: CharacterType): PlaneGeometry {
    let geom = Player.geometryCache.get(charType);
    if (!geom) {
      geom = new PlaneGeometry(3.6, 3.6);
      // 128x128 chibi standard: feet anchored at y=118 in 128px cell (10px bottom margin)
      // translation = (118 / 128 - 0.5) * 3.6 = 0.421875 * 3.6 = 1.51875
      // Legacy 96x96 standard: feet anchored at y=74 in 96px cell -> 0.975
      const is128Standard = charType === 'valkyrie' || charType === 'necromancer' || charType === 'amazon';
      const translateY = is128Standard ? 1.51875 : 0.975;
      geom.translate(0, translateY, 0);
      Player.geometryCache.set(charType, geom);
    }
    return geom;
  }

  constructor(scene: Scene, charType: CharacterType = 'ronin') {
    this.scene = scene;
    this.charType = charType;
    this.position = new Vector3(0, 0, 0);
    this.mesh = new Group();

    this.roninGeom = Player.getCharacterGeometry('ronin');

    this.loadCharacterTextures(this.charType);
    if (this.charType === 'amazon') {
      this.animator = new CharacterAnimator(this.animatedTextures, ANIM_LAYOUT_V2);
    }

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
    this.overheadSprite.position.set(0, 3.85, 0);
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

    this.animatedTextures = {
      idle: raw.idle.clone(),
      walk: raw.walk.clone(),
      attack: raw.attack.clone(),
      walk_attack: raw.walk_attack.clone()
    };
    this.animatedTextures.idle.needsUpdate = true;
    this.animatedTextures.walk.needsUpdate = true;
    this.animatedTextures.attack.needsUpdate = true;
    this.animatedTextures.walk_attack.needsUpdate = true;
  }

  public setCharacter(charType: CharacterType = 'ronin') {
    this.charType = charType;
    this.loadCharacterTextures(this.charType);
    if (this.charType === 'amazon') {
      this.animator = new CharacterAnimator(this.animatedTextures, ANIM_LAYOUT_V2);
    } else {
      this.animator = undefined;
    }
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

  public triggerAttackAnim(duration: number = 0.5) {
    this.attackAnimTimer = Math.max(this.attackAnimTimer, duration);
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
    this.baseDamageMultiplier = heroCfg.damageMultiplier;
    this.maxHp = heroCfg.maxHp;
    this.baseMaxHp = heroCfg.maxHp;
    this.hp = heroCfg.maxHp;
    this.baseSpeed = heroCfg.baseSpeed;

    if (this.charType === 'invoker') {
      this.weapons.push(new InvokerInvokeWeapon(() => this.triggerAttackAnim(.5)));
    } else if (this.charType === 'valkyrie') {
      this.weapons.push(new GreatswordWeapon(() => this.triggerAttackAnim(0.5)));
    } else if (this.charType === 'flail') {
      this.weapons.push(new FlailWeapon(() => this.triggerAttackAnim(0.45)));
    } else if (this.charType === 'sorceress') {
      this.weapons.push(new AstralStaffWeapon(() => this.triggerAttackAnim(0.48)));
    } else if (this.charType === 'chakram') {
      this.weapons.push(new ChakramWeapon(() => this.triggerAttackAnim(0.44)));
    } else if (this.charType === 'archer') {
      this.weapons.push(new BowWeapon(() => this.triggerAttackAnim(0.40)));
    } else if (this.charType === 'rocket') {
      this.weapons.push(new AssaultRifleWeapon(() => this.triggerAttackAnim(0.20)));
    } else if (this.charType === 'amazon') {
      this.weapons.push(new ReaperScytheWeapon());
    } else {
      this.weapons.push(new WhirlwindSlashWeapon(() => this.triggerAttackAnim(0.42)));
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
    this.pickupRadius = 10.0;
    this.recalculateStats();
  }

  public syncBalance(): void {
    const heroCfg = BalanceManager.getHeroConfig(this.charType);
    this.baseDamageMultiplier = heroCfg.damageMultiplier;
    this.baseSpeed = heroCfg.baseSpeed;
    const titanBonus = this.getItemStacks('titan_heart') * 150;
    const bonusHp = this.flaskCount * 30 + titanBonus;
    const newMaxHp = heroCfg.maxHp + bonusHp;
    const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 1.0;
    this.maxHp = newMaxHp;
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

    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.dashCooldown = this.maxDashCooldown;

    if (moveDir.lengthSq() > 0.01) {
      this.dashDirection.copy(moveDir).normalize();
    } else {
      const DIR_VEC_MAP: Record<SpriteDirection, Vector3> = {
        front: new Vector3(0, 0, 1),
        back: new Vector3(0, 0, -1),
        left: new Vector3(-1, 0, 0),
        right: new Vector3(1, 0, 0)
      };
      this.dashDirection.copy(DIR_VEC_MAP[this.currentDir]);
    }

    SoundManager.playDash();
    return true;
  }

  public recalculateStats() {
    let speedBonus = 0;
    let dmgBonus = 0;

    const ghostBuff = this.activeBuffs.get('ghost');
    if (ghostBuff) speedBonus += ghostBuff.value;
    const alacrityBuff = this.activeBuffs.get('alacrity');
    if (alacrityBuff) dmgBonus += alacrityBuff.value;
    const speedBuff = this.activeBuffs.get('speed');
    if (speedBuff) speedBonus += speedBuff.value;

    const dmgBuff = this.activeBuffs.get('damage');
    if (dmgBuff) dmgBonus += dmgBuff.value;

    // Apply Rift items passives
    const adrenalineStacks = this.getItemStacks('adrenaline_dart');
    const injectorStacks = this.getItemStacks('kinetic_injector');
    const vialStacks = this.getItemStacks('health_vial');
    const aegisStacks = this.getItemStacks('aegis_battery');
    const critStacks = this.getItemStacks('crit_visor');
    const titanHeartStacks = this.getItemStacks('titan_heart');
    const overclockStacks = this.getItemStacks('overclock_module');
    const voidCatalystStacks = this.getItemStacks('void_catalyst');

    // Speed: +12% per Adrenaline Dart stack
    speedBonus += adrenalineStacks * 0.12;

    // HP Regen: +2.5 HP/s per Health Vial stack, +15 HP/s per Titan Heart, +1.0 HP/s per Amulet stack, NO LIMIT
    this.passiveHpRegen = (this.amuletCount * 1.0) + (vialStacks * 2.5) + (titanHeartStacks * 15);

    // Max Shield: +50 shield per Aegis Battery stack
    this.maxShield = aegisStacks * 50;
    if (this.shield > this.maxShield) this.shield = this.maxShield;

    // Crit Chance: 5% base + 6% per Crit Lens + 3% per Crit Visor, cap at 1.0 (100%)
    const critLensStacks = this.getItemStacks('crit_lens');
    this.critChance = Math.min(1.0, 0.05 + critLensStacks * 0.06 + critStacks * 0.03);

    // Crit Damage: 50% base + 20% per Heavy Hollowpoint + 40% per Void Catalyst, cap at 10.0 (1000%)
    const hollowStacks = this.getItemStacks('heavy_hollowpoint');
    this.critDamage = Math.min(10.0, 0.50 + hollowStacks * 0.20 + voidCatalystStacks * 0.40);

    // Leather Vest % damage reduction: 2% at level 1, diminishing returns up to 70% at level 300, capped at 70%
    if (this.vestCount <= 0) {
      this.passiveDamageReduction = 0;
    } else {
      this.passiveDamageReduction = Math.min(0.70, 0.02 * Math.pow(this.vestCount, Math.log(35) / Math.log(300)));
    }

    // Attack Cooldown Multiplier:
    // Pocket watch: -1% at level 1, diminishing returns up to 30% at level 300, capped at 30% reduction (floor 0.70)
    // Kinetic Injector (Common): -10% cooldown per stack (0.90^stacks)
    // Overclock module (Uncommon): -18% cooldown per stack (0.82^stacks)
    // Combined floor 0.15
    const watchReduction = this.watchCount <= 0 ? 0 : Math.min(0.30, 0.01 * Math.pow(this.watchCount, Math.log(30) / Math.log(300)));
    const watchMult = 1 - watchReduction;
    const injectorMult = Math.pow(0.90, injectorStacks);
    const overclockMult = Math.pow(0.82, overclockStacks);
    this.passiveCooldownMultiplier = Math.max(0.15, watchMult * injectorMult * overclockMult);
    for (const weapon of this.weapons) {
      weapon.cooldownMultiplier = this.passiveCooldownMultiplier / (1 + (alacrityBuff?.value ?? 0));
    }

    // Magnet (formerly Magnet Lasso) pickup radius: base 4m, +10% at level 1 (+0.4m), diminishing returns up to 50m at level 300, capped at 50m
    if (this.magnetCount <= 0) {
      this.pickupRadius = 4.0;
    } else {
      this.pickupRadius = Math.min(50.0, 4.0 + 0.4 * Math.pow(this.magnetCount, Math.log((50.0 - 4.0) / 0.4) / Math.log(300)));
    }

    // Speed Boots (formerly Cowboy Spurs): +3% speed at level 1, diminishing returns up to x3.0 at level 300, capped at x3.0
    const bootsBonus = this.speedBootsCount <= 0 ? 0 : 0.03 * Math.pow(this.speedBootsCount, Math.log(200 / 3) / Math.log(300));
    this.passiveSpeedMultiplier = Math.min(3.0, 1.0 + bootsBonus);

    // Apply speed cheat or base speed * passive multiplier + speed buff
    const baseSpd = this.isSpeedCheat ? this.baseSpeed * 2.2 : (this.baseSpeed * this.passiveSpeedMultiplier);
    this.speed = baseSpd * (1 + speedBonus);

    // Amplifier (formerly Sheriff Star) additive scaling: 100 stacks = +200%, 138 stacks = +276%
    // Elixir of Might: +5% damage per stack (+0.05)
    this.passiveDamageMultiplier = 1.0 + (this.amplifierCount * 0.02) + (this.mightElixirCount * 0.05);

    // Apply 1-hit kill cheat or base damage * passive multiplier + damage buff
    const ampMult = 1 + this.getItemStacks('energy_amplifier') * 0.18;
    const baseDmg = this.isOneHitKill ? 50.0 : (this.baseDamageMultiplier * this.passiveDamageMultiplier * ampMult);
    this.damageMultiplier = baseDmg * (1 + dmgBonus);
  }

  /**
   * Calculates effective damage multiplier for a given weapon.
   * Per rule: initial hero damage bonus applies ONLY to their starting weapon!
   * Other weapons receive 1.0 * general bonuses (passive damage, altars, buffs, cheats, energy amplifier).
   */
  public getDamageMultiplier(weaponId?: string): number {
    const dmgBonus = (this.activeBuffs.get('damage')?.value ?? 0) + (this.activeBuffs.get('alacrity')?.value ?? 0);
    const ampMult = 1 + this.getItemStacks('energy_amplifier') * 0.18;
    const generalBonus = (this.isOneHitKill ? 50.0 : this.passiveDamageMultiplier * ampMult) * (1 + dmgBonus);
    const isStarting = !weaponId ||
      weaponId === this.startingWeaponId ||
      (this.charType === 'invoker' && (weaponId === 'invoker_invoke' || weaponId.startsWith('invoker_')));
    const heroMultiplier = isStarting ? this.baseDamageMultiplier : 1.0;
    return heroMultiplier * generalBonus;
  }

  public addAmplifierBonus(_multiplier?: number) { this.amplifierCount++; this.recalculateStats(); }
  public addSheriffStarBonus(multiplier?: number) { this.addAmplifierBonus(multiplier); }
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
    if (this.watchCount < 300) {
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
  public addLassoBonus(multiplier: number = 1.10) { this.addMagnetBonus(multiplier); }


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
      return this.watchCount >= 300 || (this.watchCount > 0 && 0.01 * Math.pow(this.watchCount, Math.log(30) / Math.log(300)) >= 0.30);
    }
    if (itemId === 'stat_vest') {
      return this.passiveDamageReduction >= 0.70 || this.vestCount >= 300;
    }
    if (itemId === 'stat_speed_boots' || itemId === 'stat_spurs') {
      return this.passiveSpeedMultiplier >= 3.0 || this.speedBootsCount >= 300;
    }
    if (itemId === 'stat_magnet' || itemId === 'stat_lasso') {
      return this.pickupRadius >= 50.0 || this.magnetCount >= 300;
    }
    return false;
  }

  public applyPassiveBuff(id: PassiveBuffId): string {
    switch (id) {
      case 'stat_amplifier':
      case 'stat_sheriff_star':
        this.addAmplifierBonus();
        return `⭐ +2% Урон (+${Math.round((this.passiveDamageMultiplier - 1) * 100)}%)`;
      case 'stat_speed_boots':
      case 'stat_spurs':
        this.addSpeedBootsBonus(1.03);
        return `🥾 +3% Скорость (x${this.passiveSpeedMultiplier.toFixed(2)} / макс. x3.0)`;
      case 'stat_flask':
        this.addFlaskBonus(30);
        return `🍶 +30 Макс HP & Исцеление (${this.maxHp} HP)`;
      case 'stat_magnet':
      case 'stat_lasso':
        this.addMagnetBonus(1.10);
        return `🧲 +10% Радиус магнита (${this.pickupRadius.toFixed(1)}м / макс. 50м)`;
      case 'stat_amulet':
        this.addHpRegen(1.0);
        return `🧿 +1 HP/с Реген (+${this.passiveHpRegen.toFixed(1)}/с)`;
      case 'stat_vest':
        this.addDamageReduction(0.10);
        return `🦺 -${(this.passiveDamageReduction * 100).toFixed(1)}% Урон от мобов (${Math.round(this.passiveDamageReduction * 100)}%)`;
      case 'stat_watch':
        this.addCooldownReduction(0.01);
        const cdrPct = Math.round((this.watchCount <= 0 ? 0 : Math.min(0.30, 0.01 * Math.pow(this.watchCount, Math.log(30) / Math.log(300)))) * 100);
        return `⏱️ -1% КД (-${cdrPct}% / макс. 30%)`;
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

    // Tactical Dash Cooldown & Movement
    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    }
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.position.addScaledVector(this.dashDirection, this.speed * 2.5 * dt);
      if (obstacleManager) {
        obstacleManager.resolveEntityCollision(this.position, 0.45);
      }
      this.spriteMaterial.color.setHex(0x60a5fa);
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.spriteMaterial.color.setHex(0xffffff);
      }
    }

    // Shield Regeneration (Aegis Battery)
    if (this.maxShield > 0) {
      if (this.shieldRegenDelay > 0) {
        this.shieldRegenDelay -= dt;
      } else if (this.shield < this.maxShield) {
        this.shield = Math.min(this.maxShield, this.shield + (this.maxShield * 0.25) * dt);
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
      this.statusManager.update(dt, (burnDmg) => this.takeDamage(burnDmg, false), this.maxHp);
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

    // 4. Animation Execution: 4-State Machine (IDLE, WALK, ATTACK, WALK_ATTACK)
    let newState: HeroAnimState = 'IDLE';
    if (isAttacking && isMoving) {
      newState = 'WALK_ATTACK';
    } else if (isAttacking) {
      newState = 'ATTACK';
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

    // Clamp to 450x450 map bounds (-218 to 218)
    this.position.x = Math.max(-218, Math.min(218, this.position.x));
    this.position.z = Math.max(-218, Math.min(218, this.position.z));
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
          this.triggerAttackAnim(.5);
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
      this.level !== this.lastDrawnLevel ||
      this.isDowned !== this.lastDrawnDowned ||
      Math.abs(this.reviveProgress - this.lastDrawnRevive) > 0.05
    ) {
      this.redrawOverhead();
    }
  }

  private updateAnimatedCharacterAnimation(dt: number, isMoving: boolean = false) {
    if (!this.animatedTextures) return;

    if (this.animator) {
      this.animator.update(dt, isMoving, this.spriteMaterial, this.customDepthMaterial);
      this.animState = this.animator.animState;
      return;
    }

    // Config for each of the 4 states: texture, column frame count, and playback FPS
    const STATE_CONFIG: Record<HeroAnimState, { texture: Texture; cols: number; fps: number }> = {
      IDLE: {
        texture: this.animatedTextures.idle,
        cols: 6,
        fps: 8 // Smooth breathing/idle
      },
      WALK: {
        texture: this.animatedTextures.walk,
        cols: 6,
        fps: 12 // Responsive run footsteps
      },
      ATTACK: {
        texture: this.animatedTextures.attack,
        cols: 6,
        fps: 16 // Fast, punchy slash
      },
      WALK_ATTACK: {
        texture: this.animatedTextures.walk_attack,
        cols: 6,
        fps: 14 // Dash cleave
      }
    };

    const cfg = STATE_CONFIG[this.animState];
    const tex = cfg.texture;

    const img = (tex as any).image as { width?: number; height?: number } | undefined;
    const dynamicCols = (img && img.width && img.height && img.height > 0)
      ? Math.round((img.width / img.height) * 4)
      : cfg.cols;

    this.animFrameTimer += dt * cfg.fps;
    const frameCol = Math.floor(this.animFrameTimer) % dynamicCols;

    // Direction to row mapping:
    // New 6x4 pipeline (necromancer): Row 0: front, Row 1: back, Row 2: left, Row 3: right
    // Legacy 6x4 / 4x4 characters: Row 0: front, Row 1: left, Row 2: right, Row 3: back
    const isNewStandard = this.charType === 'necromancer';
    const DIR_ROW_MAP: Record<SpriteDirection, number> = isNewStandard
      ? { front: 0, back: 1, left: 2, right: 3 }
      : { front: 0, left: 1, right: 2, back: 3 };
    const row = DIR_ROW_MAP[this.currentDir];

    if (this.spriteMaterial.map !== tex) {
      this.spriteMaterial.map = tex;
      if (this.customDepthMaterial) {
        this.customDepthMaterial.map = tex;
        this.customDepthMaterial.needsUpdate = true;
      }
    }

    // Three.js UV repeat and offset mapping
    tex.repeat.set(1 / dynamicCols, 1 / 4);
    tex.offset.set(frameCol / dynamicCols, (3 - row) / 4);
  }

  public takeDamage(amount: number, ignoreInvuln = false): boolean {
    if (this.isGodMode) return false;
    if (!this.isAlive || this.isDashing || (!ignoreInvuln && (this.activeBuffs.has('invulnerable') || this.activeBuffs.has('ghost'))) || this.isDowned) {
      return false;
    }

    this.shieldRegenDelay = 3.5;

    // Apply shock vulnerability (+10% damage taken) and Nanite Plating damage reduction
    const incomingAmount = this.isShocked
      ? Math.round(amount * this.statusManager.incomingDamageMultiplier)
      : amount;
    const naniteReduction = this.getNaniteDamageReduction();
    let finalAmount = ignoreInvuln
      ? incomingAmount
      : Math.max(1, (incomingAmount * (1 - naniteReduction)) * (1 - this.passiveDamageReduction));

    // Absorb with shield first
    if (this.shield > 0) {
      if (this.shield >= finalAmount) {
        this.shield -= finalAmount;
        finalAmount = 0;
      } else {
        finalAmount -= this.shield;
        this.shield = 0;
      }
    }

    if (finalAmount > 0) {
      this.hp = Math.max(0, this.hp - finalAmount);
      this.flashTimer = 0.15;
      this.spriteMaterial.color.setHex(0xff2222);
      SoundManager.playPlayerHurt();
      this.onDamageTaken?.(finalAmount, this.hp, this.maxHp);
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
      if (this.isCoop && !ignoreInvuln) {
        this.isDowned = true;
        this.hp = 0;
        this.spriteMesh.rotation.z = Math.PI / 2.3;
        return false;
      }
      this.isAlive = false;
      return true;
    }
    return false;
  }

  public revive(percent = 0.45) {
    if (!this.isDowned) return;
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
  }

  public heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
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
    const hasBow = this.weapons.some(w => w.id === 'bow' || w.id === 'heavy_colt');
    if (!hasBow && this.weapons.length < Player.MAX_WEAPONS) this.weapons.push(new BowWeapon(() => this.triggerAttackAnim(0.40)));

    const hasKukri = this.weapons.some(w => w.id === 'kukri' || w.id === 'dual_revolvers');
    if (!hasKukri && this.weapons.length < Player.MAX_WEAPONS) this.weapons.push(new KukriWeapon());

    const hasOrbs = this.weapons.some(w => w.id === 'reaper_scythe' || w.id === 'orbiting_barrier');
    if (!hasOrbs && this.weapons.length < Player.MAX_WEAPONS) this.weapons.push(new ReaperScytheWeapon());

    const hasAura = this.weapons.some(w => w.id === 'fire_ring' || w.id === 'holy_aura');
    if (!hasAura && this.weapons.length < Player.MAX_WEAPONS) {
      const aura = new FireRingWeapon();
      aura.initVisual(scene, this.position);
      this.weapons.push(aura);
    }

    const hasKatana = this.weapons.some(w => w.id === 'katana_slash');
    if (!hasKatana && this.weapons.length < Player.MAX_WEAPONS) this.weapons.push(new KatanaSlashWeapon(() => this.triggerAttackAnim(0.48)));
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
    const baseXp = 10;
    const growth = 1.08;

    return Math.floor(baseXp * Math.pow(level, 1.5) * growth);
  }

  public addLevel(): boolean {
    this.level++;
    this.xpToNextLevel = this.calculateXpToNextLevel(this.level);
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
    }
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
    this.lastDrawnHp = -1;
    this.redrawOverhead();
  }

  public redrawOverhead() {
    this.lastDrawnHp = this.hp;
    this.lastDrawnMaxHp = this.maxHp;
    this.lastDrawnLevel = this.level;
    this.lastDrawnDowned = this.isDowned;
    this.lastDrawnRevive = this.reviveProgress;

    const ctx = this.overheadCtx;
    if (!ctx) return;
    const w = this.overheadCanvas.width;
    const h = this.overheadCanvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.isDowned) {
      // Downed Badge
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.beginPath();
      ctx.roundRect(16, 8, w - 32, 34, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Cinzel", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️ РАНЕН! СПАСИТЕ!', w / 2, 25);

      // Revive progress bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(24, 48, w - 48, 18, 9);
      ctx.fill();

      if (this.reviveProgress > 0) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(26, 50, (w - 52) * Math.min(1, this.reviveProgress), 14, 7);
        ctx.fill();
      }
    } else {
      // Name & Level Pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = this.colorCss;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(16, 6, w - 32, 36, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.colorCss;
      ctx.font = 'bold 17px "Cinzel", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const heroName =
        this.charType === 'invoker'
          ? 'Инвокер'
          : this.charType === 'valkyrie'
          ? 'Каэла'
          : this.charType === 'flail'
          ? 'Бригитта'
          : this.charType === 'sorceress'
          ? 'Ария'
          : this.charType === 'chakram'
          ? 'Кира'
          : this.charType === 'archer'
          ? 'Эльф'
          : this.charType === 'rocket'
          ? 'Ракета'
          : this.charType === 'necromancer'
          ? 'Мортис'
          : this.charType === 'amazon'
          ? 'Амазонка'
          : 'Рен';
      ctx.fillText(`${this.displayName} (${heroName}) [L${this.level}]`, w / 2, 24);

      // Health Bar (XP-bar capsule style, red palette, lighter as HP drops)
      const barX = 22;
      const barY = 48;
      const barW = w - 44;
      const barH = 17;
      const radius = barH / 2;

      // Track Container (matching XP-bar glass capsule)
      ctx.fillStyle = 'rgba(6, 12, 22, 0.94)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, radius);
      ctx.fill();
      ctx.stroke();

      // Fill with dynamic lightness (less HP = lighter red)
      const hpPct = Math.max(0, Math.min(1, this.hp / (this.maxHp || 100)));
      const fillW = (barW - 4) * hpPct;
      if (hpPct > 0 && fillW > 0) {
        const lightnessFactor = 1 - hpPct; // 0 at full HP -> 1 at empty HP
        const l1 = Math.round(38 + lightnessFactor * 32); // 38% -> 70%
        const l2 = Math.round(50 + lightnessFactor * 30); // 50% -> 80%
        if (ctx.createLinearGradient) {
          const grad = ctx.createLinearGradient(barX + 2, barY, barX + 2 + fillW, barY);
          grad.addColorStop(0, `hsl(0, 90%, ${l1}%)`);
          grad.addColorStop(1, `hsl(0, 95%, ${l2}%)`);
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = `hsl(0, 90%, ${l1}%)`;
        }
        ctx.beginPath();
        ctx.roundRect(barX + 2, barY + 2, fillW, barH - 4, (barH - 4) / 2);
        ctx.fill();

        // Subtle XP-style glass gloss highlight on upper half
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.roundRect(barX + 4, barY + 2.5, Math.max(0, fillW - 4), (barH - 4) * 0.38, (barH - 4) * 0.19);
        ctx.fill();
      }

      // Numeric HP Text
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.font = 'bold 11px "Cinzel", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp}`, w / 2, barY + barH / 2 + 1);
      ctx.shadowBlur = 0;
    }

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
}
