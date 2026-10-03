import * as THREE from 'three';
import {
  Weapon,
  WhirlwindSlashWeapon,
  GreatswordWeapon,
  FlailWeapon,
  AstralStaffWeapon,
  ChakramWeapon,
  BowWeapon,
  KukriWeapon,
  OrbitingBarrierWeapon,
  HolyAuraWeapon,
  KatanaSlashWeapon
} from '../combat/Weapon';
import { Projectile } from '../combat/Projectile';
import { Enemy } from './Enemy';
import { TextureManager, SpriteDirection, AnimatedCharacterTextures } from '../core/TextureManager';
import { SoundManager } from '../core/SoundManager';
import { ObstacleManager } from '../world/ObstacleManager';
import { PassiveBuffId } from '../drops/PassiveBuffs';
import { RiftItemId, RiftItemDef } from '../items/RiftItemSystem';

export type CharacterType = 'ronin' | 'valkyrie' | 'flail' | 'sorceress' | 'chakram' | 'archer';
export type HeroAnimState = 'IDLE' | 'WALK' | 'ATTACK' | 'WALK_ATTACK';
export type BuffType = 'damage' | 'speed' | 'regen' | 'invulnerable';

export interface ActiveBuff {
  type: BuffType;
  name: string;
  icon: string;
  color: string;
  duration: number;
  maxDuration: number;
  value: number; // e.g. 0.8 for +80% damage, 0.6 for +60% speed, 12 for 12 hp/s regen
}

export class Player {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  private spriteMesh: THREE.Mesh;
  private spriteMaterial: THREE.MeshBasicMaterial;
  private shadowMesh: THREE.Mesh;

  // Directional Textures & Animated State Machine
  private animatedTextures!: AnimatedCharacterTextures;
  public animState: HeroAnimState = 'IDLE';
  public attackAnimTimer: number = 0;
  private animFrameTimer: number = 0;
  private roninGeom!: THREE.PlaneGeometry;

  public currentDir: SpriteDirection = 'front';

  // Stats
  public charType: CharacterType = 'ronin';
  public hp: number = 115;
  public maxHp: number = 115;
  public speed: number = 8.6;
  public baseSpeed: number = 8.6;
  public xp: number = 0;
  public xpToNextLevel: number = 10;
  public level: number = 1;
  public pickupRadius: number = 4.2;
  public damageMultiplier: number = 1.35;
  public baseDamageMultiplier: number = 1.35;
  public passiveDamageMultiplier: number = 1.0;
  public passiveSpeedMultiplier: number = 1.0;
  public passiveCooldownMultiplier: number = 1.0;
  public passiveHpRegen: number = 0;
  public passiveDamageReduction: number = 0;
  public sheriffStarCount: number = 0;
  public spursCount: number = 0;
  public flaskCount: number = 0;
  public lassoCount: number = 0;
  public amuletCount: number = 0;
  public vestCount: number = 0;
  public watchCount: number = 0;

  // The Rift: Item Inventory & Economy
  public riftItems: Map<RiftItemId, number> = new Map();
  public credits: number = 0; // Plasma Credits currency
  public shield: number = 0;
  public maxShield: number = 0;
  public shieldRegenDelay: number = 0;
  public critChance: number = 0.05; // 5% base crit chance
  public hasChronosReady: boolean = true;
  public singularityKillCounter: number = 0;
  public orbitalStrikeTimer: number = 12.0;

  // Tactical Dash Ability
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public dashDuration: number = 0.22;
  public dashCooldown: number = 0;
  public maxDashCooldown: number = 2.8;
  public dashDirection: THREE.Vector3 = new THREE.Vector3();

  // Active Shrine Buffs
  public activeBuffs: Map<BuffType, ActiveBuff> = new Map();

  // Visual Buff Auras
  private invulnShieldMesh!: THREE.Mesh;
  private damageAuraMesh!: THREE.Mesh;
  private speedAuraMesh!: THREE.Mesh;
  private regenAuraMesh!: THREE.Mesh;

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
  private overheadTexture: THREE.CanvasTexture;
  private overheadSprite: THREE.Sprite;
  private lastDrawnHp: number = -1;
  private lastDrawnMaxHp: number = -1;
  private lastDrawnLevel: number = -1;
  private lastDrawnDowned: boolean = false;
  private lastDrawnRevive: number = -1;

  constructor(scene: THREE.Scene, charType: CharacterType = 'ronin') {
    this.charType = charType;
    this.position = new THREE.Vector3(0, 0, 0);
    this.mesh = new THREE.Group();

    // Ren (Ronin) animated 96x96 cell geometry (anchored at feet y=74, cell 96x96)
    // Offset from center is (74/96 - 0.5) * 3.6 = 0.27083 * 3.6 = 0.975
    this.roninGeom = new THREE.PlaneGeometry(3.6, 3.6);
    this.roninGeom.translate(0, 0.975, 0);

    this.loadCharacterTextures(this.charType);

    this.spriteMaterial = new THREE.MeshBasicMaterial({
      map: this.animatedTextures.idle,
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false
    });

    this.spriteMesh = new THREE.Mesh(this.roninGeom, this.spriteMaterial);
    this.spriteMesh.rotation.x = -Math.PI / 4.8;
    this.spriteMesh.position.y = 0.05;
    this.spriteMesh.renderOrder = 25;
    this.mesh.add(this.spriteMesh);

    // Ground Shadow
    this.shadowMesh = TextureManager.createShadowMesh(0.75);
    this.mesh.add(this.shadowMesh);

    // Hero Light Glow
    const light = new THREE.PointLight(0xf59e0b, 1.4, 9);
    light.position.set(0, 1.2, 0.4);
    this.mesh.add(light);

    // Overhead 3D Canvas Billboard (Name, HP, Revive Bar)
    this.overheadCanvas = document.createElement('canvas');
    this.overheadCanvas.width = 256;
    this.overheadCanvas.height = 96;
    this.overheadCtx = this.overheadCanvas.getContext('2d')!;

    this.overheadTexture = new THREE.CanvasTexture(this.overheadCanvas);
    this.overheadTexture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: this.overheadTexture,
      transparent: true,
      depthTest: false
    });
    this.overheadSprite = new THREE.Sprite(spriteMat);
    this.overheadSprite.position.set(0, 3.0, 0);
    this.overheadSprite.scale.set(2.4, 0.9, 1);
    this.overheadSprite.renderOrder = 999;
    this.mesh.add(this.overheadSprite);

    // Setup 3D Buff Auras
    this.setupAuras();

    this.applyCharacterPerks();
    this.redrawOverhead();

    scene.add(this.mesh);
  }

  private setupAuras() {
    // 1. Invulnerability Golden Shield Bubble
    const shieldGeom = new THREE.IcosahedronGeometry(1.4, 1);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.4,
      wireframe: true
    });
    this.invulnShieldMesh = new THREE.Mesh(shieldGeom, shieldMat);
    this.invulnShieldMesh.position.y = 1.2;
    this.invulnShieldMesh.visible = false;
    this.mesh.add(this.invulnShieldMesh);

    // 2. Crimson Wrath Ring (Damage Buff)
    const dmgGeom = new THREE.TorusGeometry(1.15, 0.08, 6, 24);
    dmgGeom.rotateX(Math.PI / 2);
    const dmgMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85
    });
    this.damageAuraMesh = new THREE.Mesh(dmgGeom, dmgMat);
    this.damageAuraMesh.position.y = 1.0;
    this.damageAuraMesh.visible = false;
    this.mesh.add(this.damageAuraMesh);

    // 3. Cyan Swift Wind Ring (Speed Buff)
    const speedGeom = new THREE.TorusGeometry(1.1, 0.06, 6, 24);
    speedGeom.rotateX(Math.PI / 2.2);
    const speedMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.8
    });
    this.speedAuraMesh = new THREE.Mesh(speedGeom, speedMat);
    this.speedAuraMesh.position.y = 0.5;
    this.speedAuraMesh.visible = false;
    this.mesh.add(this.speedAuraMesh);

    // 4. Emerald Vitality Ring (Regen Buff)
    const regenGeom = new THREE.TorusGeometry(0.95, 0.07, 6, 24);
    regenGeom.rotateX(Math.PI / 2);
    const regenMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85
    });
    this.regenAuraMesh = new THREE.Mesh(regenGeom, regenMat);
    this.regenAuraMesh.position.y = 0.8;
    this.regenAuraMesh.visible = false;
    this.mesh.add(this.regenAuraMesh);
  }

  public isAnimatedCharacter(): boolean {
    return true;
  }

  private loadCharacterTextures(charType: CharacterType) {
    const raw =
      charType === 'valkyrie'
        ? TextureManager.loadValkyrieTextures()
        : charType === 'flail'
        ? TextureManager.loadFlailTextures()
        : charType === 'sorceress'
        ? TextureManager.loadSorceressTextures()
        : charType === 'chakram'
        ? TextureManager.loadChakramTextures()
        : charType === 'archer'
        ? TextureManager.loadArcherTextures()
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
    this.spriteMesh.geometry = this.roninGeom;
    this.spriteMaterial.map = this.animatedTextures.idle;
    this.animState = 'IDLE';
    this.animFrameTimer = 0;
    this.attackAnimTimer = 0;
    this.setDirection(this.currentDir);
    this.applyCharacterPerks();
    this.lastDrawnHp = -1;
    this.redrawOverhead();
  }

  public setDirection(dir: SpriteDirection) {
    this.currentDir = dir;
  }

  public triggerAttackAnim(duration: number = 0.5) {
    this.attackAnimTimer = Math.max(this.attackAnimTimer, duration);
  }

  private applyCharacterPerks() {
    this.weapons = [];
    if (this.charType === 'valkyrie') {
      // Hero 2: Valkyrie (Каэла «Двуручный Меч»)
      // Heavy greatsword: wide sweeping cleave, heavy impact, high HP & fortitude
      this.baseDamageMultiplier = 1.45;
      this.maxHp = 135;
      this.hp = 135;
      this.baseSpeed = 8.2;
      this.weapons.push(new GreatswordWeapon(() => this.triggerAttackAnim(0.5)));
    } else if (this.charType === 'flail') {
      // Hero 3: Brigitta (Бригитта «Стальной Цеп»)
      // Heavy spiked flail: crushing sweeps, staggered enemy knockback, balanced swift combat
      this.baseDamageMultiplier = 1.40;
      this.maxHp = 125;
      this.hp = 125;
      this.baseSpeed = 8.5;
      this.weapons.push(new FlailWeapon(() => this.triggerAttackAnim(0.45)));
    } else if (this.charType === 'sorceress') {
      // Hero 4: Aria (Ария «Звёздный Посох»)
      // Astral starlight bolts, long-range magic pierce, high swiftness
      this.baseDamageMultiplier = 1.30;
      this.maxHp = 105;
      this.hp = 105;
      this.baseSpeed = 8.8;
      this.weapons.push(new AstralStaffWeapon(() => this.triggerAttackAnim(0.48)));
    } else if (this.charType === 'chakram') {
      // Hero 5: Kira (Кира «Танцующий Чакрам»)
      // Returning curved boomerang chakram, medium-range agile skirmisher
      this.baseDamageMultiplier = 1.35;
      this.maxHp = 115;
      this.hp = 115;
      this.baseSpeed = 8.7;
      this.weapons.push(new ChakramWeapon(() => this.triggerAttackAnim(0.44)));
    } else if (this.charType === 'archer') {
      // Hero 6: Elf Archer (Эльф лучник «Охотничий Лук»)
      // High swiftness, precise long-range piercing arrows, agile ranger stats
      this.baseDamageMultiplier = 1.35;
      this.maxHp = 110;
      this.hp = 110;
      this.baseSpeed = 8.9;
      this.weapons.push(new BowWeapon(() => this.triggerAttackAnim(0.40)));
    } else {
      // Hero 1: Ren Ronin (Рен «Багровый вихрь»)
      this.baseDamageMultiplier = 1.35;
      this.maxHp = 115;
      this.hp = 115;
      this.baseSpeed = 8.6;
      this.weapons.push(new WhirlwindSlashWeapon(() => this.triggerAttackAnim(0.42)));
    }
    this.passiveDamageMultiplier = 1.0;
    this.passiveSpeedMultiplier = 1.0;
    this.passiveCooldownMultiplier = 1.0;
    this.passiveHpRegen = 0;
    this.passiveDamageReduction = 0;
    this.sheriffStarCount = 0;
    this.recalculateStats();
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
    this.recalculateStats();
  }

  public triggerDash(moveDir: THREE.Vector3): boolean {
    if (this.dashCooldown > 0 || this.isDashing || this.isDowned || !this.isAlive) {
      return false;
    }

    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.dashCooldown = this.maxDashCooldown;

    if (moveDir.lengthSq() > 0.01) {
      this.dashDirection.copy(moveDir).normalize();
    } else {
      const DIR_VEC_MAP: Record<SpriteDirection, THREE.Vector3> = {
        front: new THREE.Vector3(0, 0, 1),
        back: new THREE.Vector3(0, 0, -1),
        left: new THREE.Vector3(-1, 0, 0),
        right: new THREE.Vector3(1, 0, 0)
      };
      this.dashDirection.copy(DIR_VEC_MAP[this.currentDir]);
    }

    SoundManager.playDash();
    return true;
  }

  public recalculateStats() {
    let speedBonus = 0;
    let dmgBonus = 0;

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
    const naniteStacks = this.getItemStacks('nanite_plating');

    // Speed: +12% per Adrenaline Dart stack
    speedBonus += adrenalineStacks * 0.12;

    // HP Regen: +2.5 HP/s per Health Vial stack
    this.passiveHpRegen = (this.amuletCount * 1.5) + (vialStacks * 2.5);

    // Max Shield: +35 shield per Aegis Battery stack
    this.maxShield = aegisStacks * 35;
    if (this.shield > this.maxShield) this.shield = this.maxShield;

    // Crit Chance: 5% base + 12% per Crit Visor stack
    this.critChance = 0.05 + critStacks * 0.12;

    // Flat armor reduction: Nanite Plating
    this.passiveDamageReduction = Math.min(0.75, (this.vestCount * 0.1) + (naniteStacks * 0.08));

    // Attack Cooldown Multiplier: -15% cooldown per Kinetic Injector stack
    this.passiveCooldownMultiplier = Math.max(0.2, (1 - this.watchCount * 0.08) * Math.pow(0.85, injectorStacks));
    for (const weapon of this.weapons) {
      weapon.cooldownMultiplier = this.passiveCooldownMultiplier;
    }

    // Apply speed cheat or base speed * passive multiplier + speed buff
    const baseSpd = this.isSpeedCheat ? this.baseSpeed * 2.2 : (this.baseSpeed * this.passiveSpeedMultiplier);
    this.speed = baseSpd * (1 + speedBonus);

    // Apply 1-hit kill cheat or base damage * passive multiplier + damage buff
    const baseDmg = this.isOneHitKill ? 50.0 : (this.baseDamageMultiplier * this.passiveDamageMultiplier);
    this.damageMultiplier = baseDmg * (1 + dmgBonus);
  }

  public addSheriffStarBonus(multiplier: number = 1.02) {
    this.passiveDamageMultiplier *= multiplier;
    this.sheriffStarCount++;
    this.recalculateStats();
  }

  public addSpeedBonus(multiplier: number = 1.03) {
    this.passiveSpeedMultiplier = Math.min(2.5, this.passiveSpeedMultiplier * multiplier);
    this.spursCount++;
    this.recalculateStats();
  }

  public addHpRegen(amount: number = 1.5) {
    this.passiveHpRegen = Math.min(30, this.passiveHpRegen + amount);
    this.amuletCount++;
  }

  public addDamageReduction(pct: number = 0.10) {
    this.passiveDamageReduction = Math.min(0.70, this.passiveDamageReduction + pct);
    this.vestCount++;
  }

  public addCooldownReduction(pct: number = 0.08) {
    this.passiveCooldownMultiplier = Math.max(0.30, this.passiveCooldownMultiplier * (1 - pct));
    this.watchCount++;
    for (const w of this.weapons) {
      (w as any).cooldown = Math.max(0.12, (w as any).cooldown * (1 - pct));
    }
  }

  public addFlaskBonus(hpIncrease: number = 30) {
    this.maxHp += hpIncrease;
    this.heal(this.maxHp);
    this.flaskCount++;
    this.redrawOverhead();
  }

  public addLassoBonus(multiplier: number = 1.35) {
    this.pickupRadius = Math.min(25, this.pickupRadius * multiplier);
    this.lassoCount++;
  }

  public applyPassiveBuff(id: PassiveBuffId): string {
    switch (id) {
      case 'stat_sheriff_star':
        this.addSheriffStarBonus(1.02);
        return `⭐ +2% Урон (${Math.round((this.passiveDamageMultiplier - 1) * 100)}%)`;
      case 'stat_spurs':
        this.addSpeedBonus(1.03);
        return `👢 +3% Скорость (x${this.passiveSpeedMultiplier.toFixed(2)})`;
      case 'stat_flask':
        this.addFlaskBonus(30);
        return `🍶 +30 Макс HP & Исцеление (${this.maxHp} HP)`;
      case 'stat_lasso':
        this.addLassoBonus(1.35);
        return `➰ +35% Радиус магнита (${this.pickupRadius.toFixed(1)}м)`;
      case 'stat_amulet':
        this.addHpRegen(1.5);
        return `🧿 +1.5 Реген HP/с (${this.passiveHpRegen.toFixed(1)}/с)`;
      case 'stat_vest':
        this.addDamageReduction(0.10);
        return `🦺 -10% Урон от мобов (${Math.round(this.passiveDamageReduction * 100)}%)`;
      case 'stat_watch':
        this.addCooldownReduction(0.08);
        return `⏱️ +8% Скорость атаки (-${Math.round((1 - this.passiveCooldownMultiplier) * 100)}% кд)`;
    }
  }

  public update(
    dt: number,
    moveDir: THREE.Vector3,
    enemies: Enemy[],
    spawnProjectile: (p: Projectile) => void,
    obstacleManager?: ObstacleManager,
    damageEnemy?: (enemy: Enemy, amount: number, sourcePos?: THREE.Vector3) => void
  ) {
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
      this.mesh.position.copy(this.position);
      return;
    }

    // 3. Movement & 4-Directional Sprite Selection
    const isMoving = moveDir.lengthSq() > 0.01;
    const isAttacking = this.attackAnimTimer > 0;

    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer -= dt;
    }

    if (isMoving) {
      this.position.addScaledVector(moveDir, this.speed * dt);
      this.animTimer += dt * 12;

      let newDir: SpriteDirection = this.currentDir;
      if (Math.abs(moveDir.x) >= Math.abs(moveDir.z)) {
        newDir = moveDir.x < 0 ? 'left' : 'right';
      } else {
        newDir = moveDir.z < 0 ? 'back' : 'front';
      }

      if (newDir !== this.currentDir) {
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

    this.updateAnimatedCharacterAnimation(dt);
    this.spriteMesh.position.y = 0.05;
    this.spriteMesh.rotation.z = 0;

    // Smooth collision sliding against surrounding obstacles (cacti, trees, boulders, altars)
    if (obstacleManager) {
      obstacleManager.resolveEntityCollision(this.position, 0.45);
    }

    this.mesh.position.copy(this.position);

    // Hit flash handling
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.spriteMaterial.color.setHex(0xffffff);
      }
    }

    // Update weapons
    const damageEnemyWithMultiplier = damageEnemy
      ? (enemy: Enemy, amount: number, sourcePos?: THREE.Vector3) => {
          damageEnemy(enemy, amount * this.damageMultiplier, sourcePos);
        }
      : undefined;
    for (const weapon of this.weapons) {
      weapon.update(dt, this.position, enemies, spawnProjectile, damageEnemyWithMultiplier);
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

  private updateAnimatedCharacterAnimation(dt: number) {
    if (!this.animatedTextures) return;

    // Config for each of the 4 states: texture, column frame count, and playback FPS
    const STATE_CONFIG: Record<HeroAnimState, { texture: THREE.Texture; cols: number; fps: number }> = {
      IDLE: {
        texture: this.animatedTextures.idle,
        cols: 10,
        fps: 8 // Smooth breathing/idle
      },
      WALK: {
        texture: this.animatedTextures.walk,
        cols: 6,
        fps: 12 // Responsive run footsteps
      },
      ATTACK: {
        texture: this.animatedTextures.attack,
        cols: 8,
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

    this.animFrameTimer += dt * cfg.fps;
    const frameCol = Math.floor(this.animFrameTimer) % cfg.cols;

    // Direction to row mapping:
    // Row 0: front, Row 1: left, Row 2: right, Row 3: back
    const DIR_ROW_MAP: Record<SpriteDirection, number> = {
      front: 0,
      right: 2,
      left: 1,
      back: 3
    };
    const row = DIR_ROW_MAP[this.currentDir];

    if (this.spriteMaterial.map !== tex) {
      this.spriteMaterial.map = tex;
    }

    // Three.js UV repeat and offset mapping
    tex.repeat.set(1 / cfg.cols, 1 / 4);
    tex.offset.set(frameCol / cfg.cols, (3 - row) / 4);
  }

  public takeDamage(amount: number, ignoreInvuln = false): boolean {
    if (!this.isAlive || this.isDashing || (!ignoreInvuln && (this.isGodMode || this.activeBuffs.has('invulnerable'))) || this.isDowned) {
      return false;
    }

    this.shieldRegenDelay = 3.5;

    // Apply Nanite Plating flat reduction
    const naniteStacks = this.getItemStacks('nanite_plating');
    const flatReduction = naniteStacks * 4;
    let finalAmount = ignoreInvuln ? amount : Math.max(1, (amount - flatReduction) * (1 - this.passiveDamageReduction));

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
    }

    // Check Chronos Phylactery (Legendary Item) lethal protection
    if (this.hp <= 0 && this.hasChronosReady && this.getItemStacks('chronos_phylactery') > 0) {
      this.hasChronosReady = false;
      this.hp = Math.round(this.maxHp * 0.5);
      this.addBuff({
        type: 'invulnerable',
        name: 'Кристалл Времени',
        icon: '⏳',
        color: '#ef4444',
        duration: 3.0,
        maxDuration: 3.0,
        value: 1
      });
      SoundManager.playTeleporterComplete();
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

  public giveAllWeapons(scene: THREE.Scene) {
    const hasBow = this.weapons.some(w => w.id === 'bow' || w.id === 'heavy_colt');
    if (!hasBow && this.weapons.length < 5) this.weapons.push(new BowWeapon());

    const hasKukri = this.weapons.some(w => w.id === 'kukri' || w.id === 'dual_revolvers');
    if (!hasKukri && this.weapons.length < 5) this.weapons.push(new KukriWeapon());

    const hasOrbs = this.weapons.some(w => w.id === 'orbiting_barrier');
    if (!hasOrbs && this.weapons.length < 5) this.weapons.push(new OrbitingBarrierWeapon());

    const hasAura = this.weapons.some(w => w.id === 'holy_aura');
    if (!hasAura && this.weapons.length < 5) {
      const aura = new HolyAuraWeapon();
      aura.initVisual(scene, this.position);
      this.weapons.push(aura);
    }

    const hasKatana = this.weapons.some(w => w.id === 'katana_slash');
    if (!hasKatana && this.weapons.length < 5) this.weapons.push(new KatanaSlashWeapon(() => this.triggerAttackAnim(0.48)));
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

  public gainXp(amount: number): number {
    this.xp += amount;
    let levelsGained = 0;
    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level++;
      levelsGained++;
      this.xpToNextLevel = this.calculateXpToNextLevel(this.level);
    }
    return levelsGained;
  }

  public reset(pos: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    this.position.copy(pos);
    this.mesh.position.copy(pos);
    this.xp = 0;
    this.level = 1;
    this.xpToNextLevel = this.calculateXpToNextLevel(1);
    this.pickupRadius = 4.2;
    this.isAlive = true;
    this.isDowned = false;
    this.reviveProgress = 0;
    this.kills = 0;
    this.totalDamageDealt = 0;
    this.revivesCount = 0;
    this.sheriffStarCount = 0;
    this.spursCount = 0;
    this.flaskCount = 0;
    this.lassoCount = 0;
    this.amuletCount = 0;
    this.vestCount = 0;
    this.watchCount = 0;
    this.passiveDamageMultiplier = 1.0;
    this.passiveSpeedMultiplier = 1.0;
    this.passiveCooldownMultiplier = 1.0;
    this.passiveHpRegen = 0;
    this.passiveDamageReduction = 0;
    this.spriteMesh.rotation.z = 0;
    this.spriteMaterial.color.setHex(0xffffff);
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
        this.charType === 'valkyrie'
          ? 'Каэла'
          : this.charType === 'flail'
          ? 'Бригитта'
          : this.charType === 'sorceress'
          ? 'Ария'
          : this.charType === 'chakram'
          ? 'Кира'
          : 'Рен';
      ctx.fillText(`${this.displayName} (${heroName}) [L${this.level}]`, w / 2, 24);

      // Health Bar
      const barX = 26;
      const barY = 48;
      const barW = w - 52;
      const barH = 16;

      // Track
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 6);
      ctx.fill();
      ctx.stroke();

      // Fill
      const hpPct = Math.max(0, Math.min(1, this.hp / (this.maxHp || 100)));
      ctx.fillStyle = hpPct > 0.5 ? '#10b981' : (hpPct > 0.25 ? '#f59e0b' : '#ef4444');
      if (hpPct > 0) {
        ctx.beginPath();
        ctx.roundRect(barX + 2, barY + 2, (barW - 4) * hpPct, barH - 4, 4);
        ctx.fill();
      }

      // Numeric HP Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Cinzel", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp}`, w / 2, barY + barH / 2 + 1);
    }

    this.overheadTexture.needsUpdate = true;
  }

  public destroy(scene?: THREE.Scene) {
    if (scene) scene.remove(this.mesh);
    this.spriteMaterial.dispose();
    this.overheadTexture.dispose();
    this.overheadSprite.material.dispose();
    this.roninGeom.dispose();
    if (this.invulnShieldMesh) {
      this.invulnShieldMesh.geometry.dispose();
      (this.invulnShieldMesh.material as THREE.Material).dispose();
    }
    if (this.damageAuraMesh) {
      this.damageAuraMesh.geometry.dispose();
      (this.damageAuraMesh.material as THREE.Material).dispose();
    }
    if (this.speedAuraMesh) {
      this.speedAuraMesh.geometry.dispose();
      (this.speedAuraMesh.material as THREE.Material).dispose();
    }
    if (this.regenAuraMesh) {
      this.regenAuraMesh.geometry.dispose();
      (this.regenAuraMesh.material as THREE.Material).dispose();
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
