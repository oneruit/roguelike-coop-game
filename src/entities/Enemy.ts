import * as THREE from 'three';
import { GemType } from '../drops/Gem';
import { TextureManager, SpriteDirection, DirectionalTextures, BossTextures } from '../core/TextureManager';

export type BossAnimState = 'WALK' | 'ATTACK';

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
  eliteAffix?: 'blazing' | 'glacial' | 'overloading';
  creditsValue?: number;
}

export class Enemy {
  public id: string;
  public type: EnemyType;
  public name: string;
  public mesh: THREE.Group;
  public position: THREE.Vector3;
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
  public lastHitBy: string = 'p1';
  public boundingRadius: number;

  // 4-Directional Sprites
  private textures: DirectionalTextures;
  public currentDir: SpriteDirection = 'front';
  private spriteMesh: THREE.Mesh;
  private spriteMaterial: THREE.MeshBasicMaterial;
  private shadowMesh: THREE.Mesh;

  // Boss Animation States
  public animState: BossAnimState = 'WALK';
  public attackAnimTimer = 0;
  public attackCooldownTimer = 0;
  private bossAnimFrameTimer = 0;
  private bossTextures?: BossTextures;

  private animTimer = Math.random() * Math.PI * 2;
  private flashTimer = 0;
  public knockbackVelocity = new THREE.Vector3();

  private static geometryCache = new Map<EnemyType, THREE.PlaneGeometry>();

  constructor(config: EnemyConfig, spawnPos: THREE.Vector3) {
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
    this.mesh = new THREE.Group();

    if (this.eliteAffix) {
      const auraColors = {
        blazing: 0xef4444,
        glacial: 0x38bdf8,
        overloading: 0x818cf8
      };
      const ringGeom = new THREE.RingGeometry(this.width * 0.5, this.width * 0.75, 24);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: auraColors[this.eliteAffix],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const aura = new THREE.Mesh(ringGeom, ringMat);
      aura.position.y = 0.08;
      this.mesh.add(aura);
    }

    // 1. Load Textures
    if (this.isBoss && !this.isImmortal) {
      const bossBase = config.texturePrefix ? config.texturePrefix.replace('/textures/', '') : 'boss_demon';
      this.bossTextures = TextureManager.loadBossTextures(bossBase);
    }
    this.textures = TextureManager.loadDirectional(config.texturePrefix);

    let geom: THREE.PlaneGeometry;
    if (this.isBoss && !this.isImmortal) {
      geom = new THREE.PlaneGeometry(this.width, this.height);
      // For demon: cell_size 160, feet_y 136 -> (136/160 - 0.5) = 0.35
      // For hydra: cell_size 224, feet_y 180 -> (180/224 - 0.5) = 0.30
      const anchorFactor = this.type === 'hydra' ? 0.30 : 0.35;
      geom.translate(0, this.height * anchorFactor, 0);
    } else {
      let cachedGeom = Enemy.geometryCache.get(this.type);
      if (!cachedGeom) {
        cachedGeom = new THREE.PlaneGeometry(this.width, this.height);
        // Anchor at feet so sprite sits cleanly on the ground
        cachedGeom.translate(0, this.height / 2, 0);
        Enemy.geometryCache.set(this.type, cachedGeom);
      }
      geom = cachedGeom;
    }

    this.spriteMaterial = new THREE.MeshBasicMaterial({
      map: this.bossTextures ? this.bossTextures.walk : this.textures.front,
      transparent: true,
      alphaTest: 0.08,
      side: THREE.DoubleSide
    });

    if (this.isImmortal) {
      // Menacing dark-purple death silhouette
      this.spriteMaterial.color.setHex(0x380949);
      this.spriteMaterial.opacity = 0.95;
    }

    this.spriteMesh = new THREE.Mesh(geom, this.spriteMaterial);
    this.spriteMesh.rotation.x = -Math.PI / 4.8;
    this.mesh.add(this.spriteMesh);

    // 2. Contact Shadow
    const shadowRadius = Math.max(0.6, (this.width + this.height) * 0.22);
    this.shadowMesh = TextureManager.createShadowMesh(shadowRadius);
    this.mesh.add(this.shadowMesh);

    // Boss special key light
    if (this.isImmortal) {
      const reaperLight = new THREE.PointLight(0xa855f7, 4.0, 22);
      reaperLight.position.set(0, 3.0, 0.5);
      this.mesh.add(reaperLight);
    } else if (this.isBoss) {
      const lightColor = this.type === 'hydra' ? 0xf97316 : 0xdc2626;
      const bossLight = new THREE.PointLight(lightColor, 3.2, 18);
      bossLight.position.set(0, 3.5, 0.8);
      this.mesh.add(bossLight);
    } else if (this.type === 'ghost') {
      // Ethereal translucent ghost without expensive dynamic GPU PointLight
      this.spriteMaterial.opacity = 0.82;
    }

    this.mesh.position.copy(this.position);
  }

  public setDirection(dir: SpriteDirection) {
    this.currentDir = dir;
    if (!this.bossTextures) {
      this.spriteMaterial.map = this.textures[dir];
    }
  }

  public triggerAttack() {
    if (this.isBoss && this.bossTextures && this.animState !== 'ATTACK' && this.attackCooldownTimer <= 0) {
      this.animState = 'ATTACK';
      this.attackAnimTimer = 0.5;
      this.bossAnimFrameTimer = 0;
      this.attackCooldownTimer = 1.0;
    }
  }

  private updateBossAnimation(dt: number) {
    if (!this.bossTextures) return;

    const cols = 6;
    let frameCol = 0;

    if (this.animState === 'ATTACK') {
      this.attackAnimTimer -= dt;
      // 6 frames over 0.5s duration
      const progress = Math.max(0, Math.min(0.999, 1 - (this.attackAnimTimer / 0.5)));
      frameCol = Math.floor(progress * cols);

      if (this.attackAnimTimer <= 0) {
        this.animState = 'WALK';
        this.bossAnimFrameTimer = 0;
      }
    } else {
      // 10 FPS walk cycle
      this.bossAnimFrameTimer += dt * 10;
      frameCol = Math.floor(this.bossAnimFrameTimer) % cols;
    }

    const tex = this.animState === 'ATTACK' ? this.bossTextures.attack : this.bossTextures.walk;
    if (this.spriteMaterial.map !== tex) {
      this.spriteMaterial.map = tex;
      this.spriteMaterial.needsUpdate = true;
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
  public updateSimulation(dt: number, playerPos: THREE.Vector3) {
    if (!this.isAlive) return;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
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

    if (this.isBoss && this.bossTextures) {
      if (this.attackCooldownTimer > 0) {
        this.attackCooldownTimer -= dt;
      }

      const attackDist = this.type === 'hydra' ? 5.2 : 4.8;
      if (distSq <= attackDist * attackDist && this.attackCooldownTimer <= 0 && this.animState !== 'ATTACK') {
        this.triggerAttack();
      }

      if (distSq > 0.0625) { // 0.25m squared
        const dist = Math.sqrt(distSq);
        const invDist = 1 / dist;
        const normX = dx * invDist;
        const normZ = dz * invDist;
        const moveSpeed = this.animState === 'ATTACK' ? this.speed * 0.35 : this.speed;
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
        this.position.x += normX * this.speed * dt;
        this.position.z += normZ * this.speed * dt;

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

  public update(dt: number, playerPos: THREE.Vector3) {
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
    sourcePos?: THREE.Vector3,
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

  public destroy(scene: THREE.Scene) {
    this.isAlive = false;
    scene.remove(this.mesh);
    this.spriteMaterial.dispose();
  }
}
