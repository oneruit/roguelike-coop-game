import * as THREE from 'three';
import { CharacterType, HeroAnimState, BuffType, ActiveBuff } from './Player';
import { SpriteDirection, TextureManager, AnimatedCharacterTextures } from '../core/TextureManager';
import { PlayerNetState, NetWeaponInfo } from '../net/NetworkManager';

export class RemotePlayer {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  private targetPosition: THREE.Vector3;
  private spriteMesh: THREE.Mesh;
  private spriteMaterial: THREE.MeshBasicMaterial;
  private shadowMesh: THREE.Mesh;

  public id: string = 'p2';
  public name: string = 'Игрок 2';
  public colorHex: number = 0x06b6d4;
  public colorCss: string = '#06b6d4';

  public charType: CharacterType = 'ronin';
  public currentDir: SpriteDirection = 'front';
  public animState: HeroAnimState = 'IDLE';
  public hp: number = 100;
  public maxHp: number = 100;
  public level: number = 1;
  public xp: number = 0;
  public xpToNextLevel: number = 10;
  public credits: number = 0;
  public isDowned: boolean = false;
  public reviveProgress: number = 0; // 0 to 1

  // Active Shrine Buffs & 3D Visual Auras
  public activeBuffs: Map<BuffType, ActiveBuff> = new Map();
  private invulnShieldMesh!: THREE.Mesh;
  private damageAuraMesh!: THREE.Mesh;
  private speedAuraMesh!: THREE.Mesh;
  private regenAuraMesh!: THREE.Mesh;

  // Active Weapons / Abilities
  public weapons: NetWeaponInfo[] = [];
  public riftItems: Map<string, number> = new Map();
  public getElevation?: (x: number, z: number) => number;

  private animatedTextures!: AnimatedCharacterTextures;
  private animFrameTimer: number = 0;
  private roninGeom: THREE.PlaneGeometry;

  // Overhead 3D Canvas Billboard (Name, HP Bar, Revive Status)
  private overheadSprite: THREE.Sprite;
  private overheadCanvas: HTMLCanvasElement;
  private overheadCtx: CanvasRenderingContext2D;
  private overheadTexture: THREE.CanvasTexture;
  private lastDrawnHp: number = -1;
  private lastDrawnDowned: boolean = false;
  private lastDrawnRevive: number = -1;

  // Downed red pulse light
  private pulseTimer: number = 0;
  private downedAuraMesh: THREE.Mesh;
  private customDepthMaterial!: THREE.MeshDepthMaterial;

  constructor(
    scene: THREE.Scene,
    id: string = 'p2',
    name: string = 'Игрок 2',
    charType: CharacterType = 'valkyrie',
    colorHex: number | string = 0x06b6d4
  ) {
    this.id = id;
    this.name = name;
    this.charType = charType;
    if (typeof colorHex === 'string') {
      this.colorCss = colorHex.startsWith('#') ? colorHex : '#' + colorHex;
      this.colorHex = parseInt(this.colorCss.replace('#', ''), 16) || 0x06b6d4;
    } else {
      this.colorHex = colorHex;
      this.colorCss = '#' + colorHex.toString(16).padStart(6, '0');
    }
    this.position = new THREE.Vector3(0, 0, 0);
    this.targetPosition = new THREE.Vector3(0, 0, 0);
    this.mesh = new THREE.Group();

    // 3.6 x 3.6 plane geometry anchored at feet
    this.roninGeom = new THREE.PlaneGeometry(3.6, 3.6);
    this.roninGeom.translate(0, 0.975, 0);

    // Load and clone textures so UV repeat/offsets are independent from local player
    this.loadCharacterTextures(charType);

    this.spriteMaterial = new THREE.MeshBasicMaterial({
      map: this.animatedTextures.idle,
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
      depthWrite: true,
      depthTest: true
    });

    this.spriteMesh = new THREE.Mesh(this.roninGeom, this.spriteMaterial);
    this.spriteMesh.rotation.x = -Math.PI / 4.8;
    this.spriteMesh.position.y = 0.05;
    this.spriteMesh.renderOrder = 0;
    this.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: this.spriteMaterial.map,
      alphaTest: 0.25
    });
    this.spriteMesh.customDepthMaterial = this.customDepthMaterial;
    this.spriteMesh.castShadow = true;
    this.mesh.add(this.spriteMesh);

    // Ground Shadow
    this.shadowMesh = TextureManager.createShadowMesh(0.75);
    this.mesh.add(this.shadowMesh);

    // Distinct Partner Halo Light (using player's assigned color)
    const partnerLight = new THREE.PointLight(this.colorHex, 1.2, 8);
    partnerLight.position.set(0, 1.2, 0.3);
    this.mesh.add(partnerLight);

    // Downed red warning beacon ring
    const ringGeom = new THREE.RingGeometry(0.8, 1.2, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    this.downedAuraMesh = new THREE.Mesh(ringGeom, ringMat);
    this.downedAuraMesh.position.y = 0.04;
    this.downedAuraMesh.visible = false;
    this.mesh.add(this.downedAuraMesh);

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

    // Clone textures so UV repeat and offset mutations never collide with player 1
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

  public setCharacter(charType: CharacterType) {
    if (this.charType === charType) return;
    this.charType = charType;
    this.loadCharacterTextures(charType);
    this.spriteMaterial.map = this.animatedTextures.idle;
    if (this.customDepthMaterial) {
      this.customDepthMaterial.map = this.animatedTextures.idle;
      this.customDepthMaterial.needsUpdate = true;
    }
    this.lastDrawnHp = -1;
    this.redrawOverhead();
  }

  public syncState(state: PlayerNetState) {
    this.targetPosition.set(state.x, 0, state.z);
    this.currentDir = state.dir;
    this.animState = state.anim;
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.level = state.level;
    if (state.xp !== undefined) this.xp = state.xp;
    this.isDowned = state.isDowned;
    if (state.reviveProgress !== undefined) {
      this.reviveProgress = state.reviveProgress;
    }
    if (!this.isDowned) {
      this.reviveProgress = 0;
    }
    if (state.charType && state.charType !== this.charType) {
      this.setCharacter(state.charType);
    }
    if (state.weapons) {
      this.weapons = state.weapons;
    }
    if (state.credits !== undefined) {
      this.credits = state.credits;
    }
    if (state.riftItems) {
      this.riftItems.clear();
      for (const [id, count] of Object.entries(state.riftItems)) {
        this.riftItems.set(id, count);
      }
    }
    if (state.buffs) {
      this.activeBuffs.clear();
      for (const b of state.buffs) {
        this.activeBuffs.set(b.type, {
          type: b.type,
          name: b.name || b.type,
          icon: b.icon || '✨',
          color: b.color || '#fbbf24',
          duration: b.duration,
          maxDuration: b.maxDuration || b.duration,
          value: 1
        });
      }
    }
  }

  public gainXp(amount: number) {
    this.xp += amount;
    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level++;
      this.xpToNextLevel = Math.floor(10 * Math.pow(1.3, this.level - 1));
      this.lastDrawnHp = -1;
      this.redrawOverhead();
    }
  }

  public update(dt: number) {
    this.pulseTimer += dt;

    // Process buff durations
    for (const [type, buff] of this.activeBuffs.entries()) {
      buff.duration -= dt;
      if (buff.duration <= 0) {
        this.activeBuffs.delete(type);
      }
    }

    // 3D Altar Buff Auras Animation on Character Model
    const hasInvuln = this.activeBuffs.has('invulnerable');
    this.invulnShieldMesh.visible = hasInvuln;
    if (hasInvuln) {
      this.invulnShieldMesh.rotation.y += dt * 2.2;
      this.invulnShieldMesh.rotation.x += dt * 1.1;
      const pulse = 1.0 + Math.sin(this.pulseTimer * 6) * 0.06;
      this.invulnShieldMesh.scale.set(pulse, pulse, pulse);
    }

    const hasDmg = this.activeBuffs.has('damage');
    this.damageAuraMesh.visible = hasDmg;
    if (hasDmg) {
      this.damageAuraMesh.rotation.z -= dt * 4.5;
      this.damageAuraMesh.position.y = 1.0 + Math.sin(this.pulseTimer * 4) * 0.12;
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
      this.regenAuraMesh.position.y = 0.5 + ((this.pulseTimer * 1.4) % 1.5);
    }

    // Smooth position interpolation (lerp)
    this.position.lerp(this.targetPosition, Math.min(1, dt * 18));
    if (this.getElevation) {
      this.position.y = this.getElevation(this.position.x, this.position.z);
    }
    this.mesh.position.copy(this.position);

    // Downed visual state
    this.downedAuraMesh.visible = this.isDowned;
    if (this.isDowned) {
      const pulse = 1.0 + Math.sin(this.pulseTimer * 8) * 0.2;
      this.downedAuraMesh.scale.set(pulse, pulse, pulse);
      this.spriteMesh.rotation.z = Math.PI / 2.3; // lying down / crawl pose
      this.spriteMesh.position.y = 0.05;
      this.spriteMaterial.color.setHex(0xff6666);
    } else {
      this.spriteMesh.rotation.z = 0;
      this.spriteMaterial.color.setHex(0xffffff);
      this.updateAnimation(dt);
    }

    // Overhead billboard updates when stats or revive change
    if (
      Math.abs(this.hp - this.lastDrawnHp) > 0.5 ||
      this.isDowned !== this.lastDrawnDowned ||
      Math.abs(this.reviveProgress - this.lastDrawnRevive) > 0.02
    ) {
      this.redrawOverhead();
    }
  }

  private updateAnimation(dt: number) {
    if (!this.animatedTextures) return;

    const STATE_CONFIG: Record<HeroAnimState, { texture: THREE.Texture; cols: number; fps: number }> = {
      IDLE: { texture: this.animatedTextures.idle, cols: 10, fps: 8 },
      WALK: { texture: this.animatedTextures.walk, cols: 6, fps: 12 },
      ATTACK: { texture: this.animatedTextures.attack, cols: 8, fps: 16 },
      WALK_ATTACK: { texture: this.animatedTextures.walk_attack, cols: 6, fps: 14 }
    };

    const cfg = STATE_CONFIG[this.animState] || STATE_CONFIG.IDLE;
    const tex = cfg.texture;

    this.animFrameTimer += dt * cfg.fps;
    const frameCol = Math.floor(this.animFrameTimer) % cfg.cols;

    const DIR_ROW_MAP: Record<SpriteDirection, number> = {
      front: 0,
      right: 2,
      left: 1,
      back: 3
    };
    const row = DIR_ROW_MAP[this.currentDir] ?? 0;

    if (this.spriteMaterial.map !== tex) {
      this.spriteMaterial.map = tex;
      if (this.customDepthMaterial) {
        this.customDepthMaterial.map = tex;
        this.customDepthMaterial.needsUpdate = true;
      }
    }

    tex.repeat.set(1 / cfg.cols, 1 / 4);
    tex.offset.set(frameCol / cfg.cols, (3 - row) / 4);
  }

  public redrawOverhead() {
    this.lastDrawnHp = this.hp;
    this.lastDrawnDowned = this.isDowned;
    this.lastDrawnRevive = this.reviveProgress;

    const ctx = this.overheadCtx;
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
      ctx.fillText(`${this.name} (${heroName}) [L${this.level}]`, w / 2, 24);

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

  public destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
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
}
