import { SpellControlState, type SpellControl } from '../shared/InvokerSpells';
import {
  Group,
  Vector3,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  RGBADepthPacking,
  PlaneGeometry,
  RingGeometry,
  DoubleSide,
  PointLight,
  type Scene
} from 'three';
import { GemType } from '../drops/Gem';
import { TextureManager, SpriteDirection, DirectionalTextures, BossTextures, MonsterTextures } from '../core/TextureManager';

export type EnemyAnimState = 'WALK' | 'ATTACK';
export type BossAnimState = EnemyAnimState;

import { EnemyType } from '../shared/types';
export type { EnemyType };

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  texturePrefix: string;
  hp: number;
  speed: number;
  damage: number;
  width: number;
  height: number;
  gemType: GemType;
  isBoss?: boolean;
  isImmortal?: boolean;
  animated?: boolean;
  eliteAffix?: 'blazing' | 'glacial' | 'overloading';
  creditsValue?: number;
}

export interface BleedStack {
  dps: number;
  remainingTime: number;
  hitter: string;
}

export class Enemy {
  public id: string;
  public type: EnemyType;
  public name: string;
  public mesh: Group;
  public position: Vector3;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public damage: number;
  public width: number;
  public height: number;
  public gemType: GemType;
  public isBoss: boolean;
  public isImmortal: boolean;
  public eliteAffix?: 'blazing' | 'glacial' | 'overloading';
  public creditsValue: number = 3;
  public isAlive = true;
  public readonly spellControl = new SpellControlState();
  public get canAttack(): boolean { return this.spellControl.canAttack; }
  public lastHitBy: string = 'p1';
  public boundingRadius: number;

  // Stacking Bleed System
  public bleedStacks: BleedStack[] = [];
  private bleedTickTimer = 0;
  public onBleedDamage?: (enemy: Enemy, damage: number, isDead: boolean, hitter: string) => void;

  // 4-Directional Sprites
  private textures: DirectionalTextures;
  public currentDir: SpriteDirection = 'front';
  private spriteMesh: Mesh;
  private spriteMaterial: MeshBasicMaterial;
  private customDepthMaterial!: MeshDepthMaterial;

  // Animation & Attack State (2 states: WALK and ATTACK)
  public animState: EnemyAnimState = 'WALK';
  public attackAnimTimer = 0;
  public attackCooldownTimer = 0;
  public readonly attackDuration = 0.5;
  public hasDealtDamageThisAttack = false;
  public pendingAttackHit = false;
  public attackTargetId = 'p1';
  public get hasAttackAnimation(): boolean {
    return !!((this.isBoss && this.bossTextures?.attack) || this.monsterTextures?.attack);
  }
  private bossAnimFrameTimer = 0;
  private monsterAnimFrameTimer = 0;
  private bossTextures?: BossTextures;
  private monsterTextures?: MonsterTextures;

  private animTimer = Math.random() * Math.PI * 2;
  private flashTimer = 0;
  public knockbackVelocity = new Vector3();

  private static geometryCache = new Map<EnemyType, PlaneGeometry>();

  constructor(config: EnemyConfig, spawnPos: Vector3) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.type = config.type;
    this.name = config.name;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;
    this.damage = config.damage;
    this.width = config.width;
    this.height = config.height;
    this.gemType = config.gemType;
    this.isBoss = !!config.isBoss;
    this.isImmortal = !!config.isImmortal;
    this.eliteAffix = config.eliteAffix;
    this.creditsValue = config.creditsValue ?? (this.isBoss ? 100 : (this.eliteAffix ? 16 : 3));

    if (this.eliteAffix) {
      this.hp = Math.round(this.hp * 2.2);
      this.maxHp = this.hp;
      this.damage = Math.round(this.damage * 1.35);
      const affixNames = {
        blazing: 'Пылающий',
        glacial: 'Ледяной',
        overloading: 'Перегруженный'
      };
      this.name = `${affixNames[this.eliteAffix]} ${this.name}`;
    }

    this.position = spawnPos.clone();
    this.boundingRadius = Math.max(this.width, this.height) * 0.75 + 0.5;
    this.mesh = new Group();

    if (this.eliteAffix) {
      const auraColors = {
        blazing: 0xef4444,
        glacial: 0x38bdf8,
        overloading: 0x818cf8
      };
      const ringGeom = new RingGeometry(this.width * 0.5, this.width * 0.75, 24);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new MeshBasicMaterial({
        color: auraColors[this.eliteAffix],
        side: DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const aura = new Mesh(ringGeom, ringMat);
      aura.position.y = 0.08;
      this.mesh.add(aura);
    }

    // 1. Load Textures
    if (this.isBoss && !this.isImmortal) {
      const bossBase = config.texturePrefix ? config.texturePrefix.replace(/^.*[\\/]/, '') : 'boss_demon';
      const rawBoss = TextureManager.loadBossTextures(bossBase);
      this.bossTextures = {
        walk: rawBoss.walk.clone(),
        attack: rawBoss.attack.clone()
      };
      this.bossTextures.walk.needsUpdate = true;
      this.bossTextures.attack.needsUpdate = true;
    } else if (config.animated && !this.isImmortal) {
      const monsterBase = config.texturePrefix ? config.texturePrefix.replace(/^.*[\\/]/, '') : '';
      if (monsterBase) {
        const rawMonster = TextureManager.loadMonsterTextures(monsterBase);
        this.monsterTextures = {
          walk: rawMonster.walk.clone(),
          attack: rawMonster.attack.clone()
        };
        this.monsterTextures.walk.needsUpdate = true;
        this.monsterTextures.attack.needsUpdate = true;
      }
    }
    this.textures = TextureManager.loadDirectional(config.texturePrefix);

    let geom: PlaneGeometry;
    if (this.isBoss && !this.isImmortal) {
      geom = new PlaneGeometry(this.width, this.height);
      // For demon: cell_size 160, feet_y 136 -> (136/160 - 0.5) = 0.35
      // For hydra: cell_size 224, feet_y 180 -> (180/224 - 0.5) = 0.30
      const anchorFactor = this.type === 'hydra' ? 0.30 : 0.35;
      geom.translate(0, this.height * anchorFactor, 0);
    } else {
      let cachedGeom = Enemy.geometryCache.get(this.type);
      if (!cachedGeom) {
        cachedGeom = new PlaneGeometry(this.width, this.height);
        // Anchor at feet so sprite sits cleanly on the ground
        // For animated monsters: target_feet_y = 118 in 128px cell -> (118/128 - 0.5) = 0.421875
        const anchorFactor = config.animated ? 0.421875 : 0.5;
        cachedGeom.translate(0, this.height * anchorFactor, 0);
        Enemy.geometryCache.set(this.type, cachedGeom);
      }
      geom = cachedGeom;
    }

    const initialMap = this.bossTextures
      ? this.bossTextures.walk
      : (this.monsterTextures ? this.monsterTextures.walk : this.textures.front);

    this.spriteMaterial = new MeshBasicMaterial({
      map: initialMap,
      transparent: true,
      alphaTest: 0.08,
      side: DoubleSide
    });

    if (this.isImmortal) {
      // Menacing dark-purple death silhouette
      this.spriteMaterial.color.setHex(0x380949);
      this.spriteMaterial.opacity = 0.95;
    }

    this.spriteMesh = new Mesh(geom, this.spriteMaterial);
    this.spriteMesh.rotation.x = -Math.PI / 4.8;
    this.spriteMesh.renderOrder = 0;
    this.customDepthMaterial = new MeshDepthMaterial({
      depthPacking: RGBADepthPacking,
      map: this.spriteMaterial.map,
      alphaTest: 0.25
    });
    this.spriteMesh.customDepthMaterial = this.customDepthMaterial;
    this.spriteMesh.castShadow = true;
    this.mesh.add(this.spriteMesh);

    // Boss special key light
    if (this.isImmortal) {
      const reaperLight = new PointLight(0xa855f7, 4.0, 22);
      reaperLight.position.set(0, 3.0, 0.5);
      this.mesh.add(reaperLight);
    } else if (this.isBoss) {
      const lightColor = this.type === 'hydra' ? 0xf97316 : 0xdc2626;
      const bossLight = new PointLight(lightColor, 3.2, 18);
      bossLight.position.set(0, 3.5, 0.8);
      this.mesh.add(bossLight);
    } else if (this.type === 'ghost') {
      // Ethereal translucent ghost without expensive dynamic GPU PointLight
      this.spriteMaterial.opacity = 0.82;
    }

    this.mesh.position.copy(this.position);
  }

  public applySpellControl(control: SpellControl): void {
    this.spellControl.apply(control, this.isBoss, this.isImmortal);
    if (this.isImmortal) return;
    const resistance = this.isBoss ? .15 : 1;
    if (Number.isFinite(control.pushX)) this.knockbackVelocity.x += Math.max(-12,Math.min(12,control.pushX!))*resistance;
    if (Number.isFinite(control.pushZ)) this.knockbackVelocity.z += Math.max(-12,Math.min(12,control.pushZ!))*resistance;
  }

  public setDirection(dir: SpriteDirection) {
    this.currentDir = dir;
    if (!this.bossTextures && !this.monsterTextures) {
      this.spriteMaterial.map = this.textures[dir];
      if (this.customDepthMaterial) {
        this.customDepthMaterial.map = this.textures[dir];
        this.customDepthMaterial.needsUpdate = true;
      }
    }
  }

  public triggerAttack(targetId: string = 'p1') {
    if (this.hasAttackAnimation && this.animState !== 'ATTACK' && this.attackCooldownTimer <= 0) {
      this.animState = 'ATTACK';
      this.attackAnimTimer = this.attackDuration;
      this.attackCooldownTimer = this.isBoss ? 1.0 : 0.8;
      this.hasDealtDamageThisAttack = false;
      this.pendingAttackHit = false;
      this.attackTargetId = targetId;
      this.bossAnimFrameTimer = 0;
      this.monsterAnimFrameTimer = 0;
    }
  }

  private updateBossAnimation(dt: number) {
    if (!this.bossTextures) return;

    const tex = this.animState === 'ATTACK' ? this.bossTextures.attack : this.bossTextures.walk;
    const img = (tex as any).image as { width?: number; height?: number } | undefined;
    const cols = (img && img.width && img.height && img.height > 0)
      ? Math.round((img.width / img.height) * 4)
      : 4;

    let frameCol = 0;

    if (this.animState === 'ATTACK') {
      const progress = Math.max(0, Math.min(0.999, 1 - (this.attackAnimTimer / this.attackDuration)));
      frameCol = Math.floor(progress * cols);
    } else {
      // 8-10 FPS walk cycle adapted to frame count
      this.bossAnimFrameTimer += dt * (cols === 4 ? 8 : 10);
      frameCol = Math.floor(this.bossAnimFrameTimer) % cols;
    }

    if (this.spriteMaterial.map !== tex) {
      this.spriteMaterial.map = tex;
      this.spriteMaterial.needsUpdate = true;
      if (this.customDepthMaterial) {
        this.customDepthMaterial.map = tex;
        this.customDepthMaterial.needsUpdate = true;
      }
    }

    const DIR_ROW_MAP: Record<SpriteDirection, number> = {
      front: 0,
      left: 1,
      right: 2,
      back: 3
    };
    const row = DIR_ROW_MAP[this.currentDir];

    tex.repeat.set(1 / cols, 1 / 4);
    tex.offset.set(frameCol / cols, (3 - row) / 4);

    this.spriteMesh.position.y = 0;
    this.spriteMesh.rotation.z = 0;
  }

  private updateMonsterAnimation(dt: number) {
    if (!this.monsterTextures) return;

    const tex = this.animState === 'ATTACK' ? this.monsterTextures.attack : this.monsterTextures.walk;
    const img = (tex as any).image as { width?: number; height?: number } | undefined;
    const cols = (img && img.width && img.height && img.height > 0)
      ? Math.round((img.width / img.height) * 4)
      : 4;

    let frameCol = 0;

    if (this.animState === 'ATTACK') {
      const progress = Math.max(0, Math.min(0.999, 1 - (this.attackAnimTimer / this.attackDuration)));
      frameCol = Math.floor(progress * cols);
    } else {
      const fps = this.speed > 5 ? 10 : 8;
      this.monsterAnimFrameTimer += dt * fps;
      frameCol = Math.floor(this.monsterAnimFrameTimer) % cols;
    }

    if (this.spriteMaterial.map !== tex) {
      this.spriteMaterial.map = tex;
      this.spriteMaterial.needsUpdate = true;
      if (this.customDepthMaterial) {
        this.customDepthMaterial.map = tex;
        this.customDepthMaterial.needsUpdate = true;
      }
    }

    const DIR_ROW_MAP: Record<SpriteDirection, number> = {
      front: 0,
      left: 1,
      right: 2,
      back: 3
    };
    const row = DIR_ROW_MAP[this.currentDir];

    tex.repeat.set(1 / cols, 1 / 4);
    tex.offset.set(frameCol / cols, (3 - row) / 4);

    this.spriteMesh.position.y = 0;
    this.spriteMesh.rotation.z = 0;
  }

  /**
   * Authoritative simulation update: handles movement, knockback, and AI logic.
   * Completely decoupled from rendering and Three.js draw cycles.
   */
  public updateSimulation(dt: number, playerPos: Vector3) {
    if (!this.isAlive) return;
    this.spellControl.update(dt);

    if (this.bleedStacks.length > 0) {
      this.updateBleed(dt);
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= dt;
    }

    // Process attack animation & hit registration strictly on frame 2 (the 3rd frame)
    if (this.animState === 'ATTACK') {
      this.attackAnimTimer -= dt;
      const progress = Math.max(0, Math.min(0.999, 1 - (this.attackAnimTimer / this.attackDuration)));
      const frameCol = Math.floor(progress * 4); // 4 frames: 0, 1, 2, 3

      // Damage is registered ONLY on the 3rd frame (frame index 2)
      if (frameCol === 2 && !this.hasDealtDamageThisAttack) {
        this.hasDealtDamageThisAttack = true;
        this.pendingAttackHit = true;
      }

      if (this.attackAnimTimer <= 0) {
        this.animState = 'WALK';
        this.attackAnimTimer = 0;
      }
    }

    // Knockback handling (Immortal Reaper is completely immune to knockback)
    const kbSq = this.knockbackVelocity.lengthSq();
    if (kbSq > 0.01) {
      const resistance = this.isImmortal ? 0 : (this.isBoss ? 0.05 : 1.0);
      this.position.addScaledVector(this.knockbackVelocity, dt * resistance);
      this.knockbackVelocity.multiplyScalar(Math.pow(0.08, dt * 5));
    }

    // Move towards player (zero Vector3 heap allocations)
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const distSq = dx * dx + dz * dz;

    if (this.hasAttackAnimation) {
      const attackDist = this.isBoss ? (this.type === 'hydra' ? 5.2 : 4.8) : ((this.width + this.height) * 0.28 + 0.6);
      if (distSq <= attackDist * attackDist && this.attackCooldownTimer <= 0 && this.canAttack && this.animState !== 'ATTACK') {
        this.triggerAttack();
      }

      if (distSq > 0.0625) { // 0.25m squared
        const dist = Math.sqrt(distSq);
        const invDist = 1 / dist;
        const normX = dx * invDist;
        const normZ = dz * invDist;
        const moveSpeed = (this.animState === 'ATTACK' ? this.speed * 0.25 : this.speed) * this.spellControl.movementFactor;
        this.position.x += normX * moveSpeed * dt;
        this.position.z += normZ * moveSpeed * dt;

        let newDir: SpriteDirection = this.currentDir;
        if (Math.abs(dx) >= Math.abs(dz)) {
          newDir = dx < 0 ? 'left' : 'right';
        } else {
          newDir = dz < 0 ? 'back' : 'front';
        }

        if (newDir !== this.currentDir && this.animState !== 'ATTACK') {
          this.setDirection(newDir);
        }
      }
    } else {
      if (distSq > 0.0625) { // 0.25m squared
        const dist = Math.sqrt(distSq);
        const invDist = 1 / dist;
        const normX = dx * invDist;
        const normZ = dz * invDist;
        this.position.x += normX * this.speed * this.spellControl.movementFactor * dt;
        this.position.z += normZ * this.speed * this.spellControl.movementFactor * dt;

        // Determine 4-directional sprite based on movement towards player
        let newDir: SpriteDirection = this.currentDir;
        if (Math.abs(dx) >= Math.abs(dz)) {
          newDir = dx < 0 ? 'left' : 'right';
        } else {
          newDir = dz < 0 ? 'back' : 'front';
        }

        if (newDir !== this.currentDir) {
          this.setDirection(newDir);
        }
      }
    }

    // Clamp to 500x500 map bounds (-246 to 246)
    this.position.x = Math.max(-246, Math.min(246, this.position.x));
    this.position.z = Math.max(-246, Math.min(246, this.position.z));
  }

  public update(dt: number, playerPos: Vector3) {
    this.updateSimulation(dt, playerPos);
    this.updateVisuals(dt, true);
  }

  /**
   * Rendering phase: Viewport/Frustum culling and visual animations.
   * If inFrustum is false, skips all bobbing math, matrix copies, and sets mesh.visible = false.
   */
  public updateVisuals(dt: number, inFrustum: boolean) {
    if (!this.isAlive || !inFrustum) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = true;
    this.mesh.position.copy(this.position);

    this.animTimer += dt * (this.speed > 5 ? 14 : 9);

    if (this.isBoss && this.bossTextures) {
      this.updateBossAnimation(dt);
    } else if (this.monsterTextures) {
      this.updateMonsterAnimation(dt);
    } else {
      // Walking / Bobbing animation
      if (this.isImmortal) {
        this.spriteMesh.position.y = Math.sin(this.animTimer * 0.4) * 0.35 + 0.15;
        this.spriteMesh.rotation.z = Math.sin(this.animTimer * 0.25) * 0.04;
      } else if (this.type === 'ghost') {
        this.spriteMesh.position.y = Math.sin(this.animTimer * 0.5) * 0.25;
        this.spriteMesh.rotation.z = Math.sin(this.animTimer * 0.3) * 0.05;
      } else {
        this.spriteMesh.position.y = Math.abs(Math.sin(this.animTimer)) * (this.isBoss ? 0.08 : 0.12);
        this.spriteMesh.rotation.z = Math.sin(this.animTimer) * 0.06;
      }
    }

    // Hit flash handling
    if (this.flashTimer > 0) {
      this.spriteMaterial.color.setHex(this.isImmortal ? 0xc084fc : 0xff3333);
    } else {
      this.spriteMaterial.color.setHex(this.isImmortal ? 0x380949 : 0xffffff);
    }
  }

  public takeDamage(
    amount: number,
    sourcePos?: Vector3,
    hitter: string = 'p1'
  ): boolean {
    if (this.isImmortal) {
      this.flashTimer = 0.09;
      this.spriteMaterial.color.setHex(0xc084fc); // Ethereal purple flash
      return false; // Immortal cannot die or lose HP
    }

    this.lastHitBy = hitter;
    this.hp -= amount;
    this.flashTimer = 0.12;
    this.spriteMaterial.color.setHex(0xff3333);

    if (sourcePos && !this.isBoss) {
      const kbx = this.position.x - sourcePos.x;
      const kbz = this.position.z - sourcePos.z;
      const klenSq = kbx * kbx + kbz * kbz;
      if (klenSq > 0.0001) {
        const invLen = 1 / Math.sqrt(klenSq);
        this.knockbackVelocity.x += kbx * invLen * 3.75;
        this.knockbackVelocity.z += kbz * invLen * 3.75;
      }
    }

    if (this.hp <= 0) {
      this.isAlive = false;
      return true;
    }
    return false;
  }

  public addBleed(dps: number, duration: number = 3.0, hitter: string = 'p1'): void {
    if (this.isImmortal || !this.isAlive) return;
    this.bleedStacks.push({ dps, remainingTime: duration, hitter });
    if (this.bleedStacks.length > 50) {
      this.bleedStacks.shift();
    }
  }

  private updateBleed(dt: number): void {
    if (!this.isAlive || this.bleedStacks.length === 0) return;
    this.bleedTickTimer += dt;
    if (this.bleedTickTimer >= 0.33) {
      const elapsed = this.bleedTickTimer;
      this.bleedTickTimer = 0;
      let totalDmg = 0;
      let lastHitter = 'p1';

      for (let i = this.bleedStacks.length - 1; i >= 0; i--) {
        const stack = this.bleedStacks[i];
        stack.remainingTime -= elapsed;
        totalDmg += stack.dps * elapsed;
        lastHitter = stack.hitter;
        if (stack.remainingTime <= 0) {
          this.bleedStacks.splice(i, 1);
        }
      }

      const tickAmount = Math.max(1, Math.round(totalDmg));
      if (!this.isImmortal) {
        this.hp -= tickAmount;
        this.flashTimer = 0.08;
        this.lastHitBy = lastHitter;
        const isDead = this.hp <= 0;
        if (isDead) {
          this.isAlive = false;
        }
        if (this.onBleedDamage) {
          this.onBleedDamage(this, tickAmount, isDead, lastHitter);
        }
      }
    }
  }

  public destroy(scene: Scene) {
    this.isAlive = false;
    this.bleedStacks = [];
    scene.remove(this.mesh);
    this.spriteMaterial.dispose();
    if (this.customDepthMaterial) {
      this.customDepthMaterial.dispose();
    }
    if (this.bossTextures) {
      this.bossTextures.walk.dispose();
      this.bossTextures.attack.dispose();
    }
    if (this.monsterTextures) {
      this.monsterTextures.walk.dispose();
      this.monsterTextures.attack.dispose();
    }
  }
}
