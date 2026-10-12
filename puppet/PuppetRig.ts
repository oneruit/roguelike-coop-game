import * as THREE from 'three';
import { getAssetUrl } from '../game/src/utils/assetPath';

export interface PuppetPartDef {
  name: string;
  file: string;
  width: number;
  height: number;
  pivot: [number, number]; // [0..1]
  zOrder: number;
  parent: string;
  attachPos: [number, number]; // offset from parent joint in pixels
  explodeDir: [number, number]; // direction to float in exploded view
}

export const PUPPET_PARTS: Record<string, PuppetPartDef> = {
  pelvis: {
    name: 'pelvis',
    file: 'pelvis.png',
    width: 146,
    height: 103,
    pivot: [0.5, 0.4],
    zOrder: 8,
    parent: 'root',
    attachPos: [0, 0],
    explodeDir: [0, -0.3]
  },
  torso: {
    name: 'torso',
    file: 'torso.png',
    width: 120,
    height: 184,
    pivot: [0.5, 0.85],
    zOrder: 9,
    parent: 'pelvis',
    attachPos: [0, 38],
    explodeDir: [0, 0.4]
  },
  head: {
    name: 'head',
    file: 'head.png',
    width: 175,
    height: 188,
    pivot: [0.5, 0.90],
    zOrder: 10,
    parent: 'torso',
    attachPos: [0, 138],
    explodeDir: [0, 0.9]
  },
  hair: {
    name: 'hair',
    file: 'hair.png',
    width: 141,
    height: 261,
    pivot: [0.75, 0.15],
    zOrder: 1,
    parent: 'head',
    attachPos: [-25, 50],
    explodeDir: [-0.9, 0.3]
  },
  // Левая рука (дальняя / задний план)
  upper_arm_l: {
    name: 'upper_arm_l',
    file: 'upper_arm_l.png',
    width: 73,
    height: 115,
    pivot: [0.5, 0.15],
    zOrder: 2,
    parent: 'torso',
    attachPos: [-44, 110],
    explodeDir: [-0.7, 0.2]
  },
  forearm_l: {
    name: 'forearm_l',
    file: 'forearm_l.png',
    width: 81,
    height: 128,
    pivot: [0.45, 0.15],
    zOrder: 3,
    parent: 'upper_arm_l',
    attachPos: [-12, -80],
    explodeDir: [-0.9, -0.2]
  },
  fist_l: {
    name: 'fist_l',
    file: 'fist_l.png',
    width: 64,
    height: 73,
    pivot: [0.5, 0.2],
    zOrder: 4,
    parent: 'forearm_l',
    attachPos: [-10, -85],
    explodeDir: [-1.0, -0.5]
  },
  // Правая рука (передний план)
  upper_arm_r: {
    name: 'upper_arm_r',
    file: 'upper_arm_r.png',
    width: 73,
    height: 115,
    pivot: [0.5, 0.15],
    zOrder: 14,
    parent: 'torso',
    attachPos: [44, 110],
    explodeDir: [0.7, 0.2]
  },
  forearm_r: {
    name: 'forearm_r',
    file: 'forearm_r.png',
    width: 81,
    height: 128,
    pivot: [0.55, 0.15],
    zOrder: 15,
    parent: 'upper_arm_r',
    attachPos: [12, -80],
    explodeDir: [0.9, -0.2]
  },
  fist_r: {
    name: 'fist_r',
    file: 'fist_r.png',
    width: 64,
    height: 73,
    pivot: [0.5, 0.2],
    zOrder: 16,
    parent: 'forearm_r',
    attachPos: [10, -85],
    explodeDir: [1.0, -0.5]
  },
  // Левая нога (дальняя)
  thigh_l: {
    name: 'thigh_l',
    file: 'thigh_l.png',
    width: 78,
    height: 146,
    pivot: [0.5, 0.15],
    zOrder: 5,
    parent: 'pelvis',
    attachPos: [-35, -25],
    explodeDir: [-0.5, -0.5]
  },
  shin_l: {
    name: 'shin_l',
    file: 'shin_l.png',
    width: 74,
    height: 116,
    pivot: [0.5, 0.15],
    zOrder: 6,
    parent: 'thigh_l',
    attachPos: [-5, -105],
    explodeDir: [-0.6, -0.8]
  },
  boot_l: {
    name: 'boot_l',
    file: 'boot_l.png',
    width: 82,
    height: 103,
    pivot: [0.5, 0.2],
    zOrder: 7,
    parent: 'shin_l',
    attachPos: [-5, -85],
    explodeDir: [-0.7, -1.0]
  },
  // Правая нога (передняя)
  thigh_r: {
    name: 'thigh_r',
    file: 'thigh_r.png',
    width: 77,
    height: 146,
    pivot: [0.5, 0.15],
    zOrder: 11,
    parent: 'pelvis',
    attachPos: [35, -25],
    explodeDir: [0.5, -0.5]
  },
  shin_r: {
    name: 'shin_r',
    file: 'shin_r.png',
    width: 73,
    height: 116,
    pivot: [0.5, 0.15],
    zOrder: 12,
    parent: 'thigh_r',
    attachPos: [5, -105],
    explodeDir: [0.6, -0.8]
  },
  boot_r: {
    name: 'boot_r',
    file: 'boot_r.png',
    width: 81,
    height: 103,
    pivot: [0.5, 0.2],
    zOrder: 13,
    parent: 'shin_r',
    attachPos: [5, -85],
    explodeDir: [0.7, -1.0]
  },
  // Магические орбы
  orb_purple: {
    name: 'orb_purple',
    file: 'orb_purple.png',
    width: 102,
    height: 131,
    pivot: [0.5, 0.5],
    zOrder: 17,
    parent: 'fist_r',
    attachPos: [35, -20],
    explodeDir: [1.3, 0.4]
  },
  orb_cyan: {
    name: 'orb_cyan',
    file: 'orb_cyan.png',
    width: 101,
    height: 125,
    pivot: [0.5, 0.5],
    zOrder: 18,
    parent: 'fist_r',
    attachPos: [35, -20],
    explodeDir: [1.4, -0.2]
  }
};

export type AnimStateName = 'IDLE' | 'WALK' | 'RUN' | 'ATTACK' | 'CAST' | 'HIT' | 'DANCE';

export class PuppetRig {
  public root: THREE.Group = new THREE.Group();
  public joints: Record<string, THREE.Group> = {};
  public meshes: Record<string, THREE.Mesh> = {};
  public debugLines: THREE.LineSegments | null = null;
  public debugPoints: THREE.Points | null = null;

  // Animation & Physics State
  public currentAnim: AnimStateName = 'IDLE';
  public animTime: number = 0;
  public animSpeed: number = 1.0;
  public breathingDepth: number = 1.0;
  public stepAmplitude: number = 1.0;
  public hairSpringStiffness: number = 28.0;
  public hairDamping: number = 4.0;
  public explodeFactor: number = 0.0;
  public mouseAimEnabled: boolean = false;
  public targetAimPos: THREE.Vector2 = new THREE.Vector2(0, 0);
  public activeOrb: 'purple' | 'cyan' | 'both' | 'none' = 'cyan';
  public showDebugRig: boolean = false;

  // One-shot animation progress
  private oneShotTimer: number = 0;
  private oneShotDuration: number = 1.0;

  // Secondary hair physics
  private hairAngle: number = 0;
  private hairVelocity: number = 0;

  // Scale factor: 1 pixel in sprite = 0.01 Three.js units
  public readonly pixelScale: number = 0.01;

  constructor(textureBasePath: string = getAssetUrl('textures/heroes/puppet_warrior/')) {
    this.buildHierarchy(textureBasePath);
    this.createDebugVisualizer();
  }

  private buildHierarchy(basePath: string): void {
    const loader = new THREE.TextureLoader();

    // 1. Создаем группы суставов
    for (const [key] of Object.entries(PUPPET_PARTS)) {
      this.joints[key] = new THREE.Group();
      this.joints[key].name = `joint_${key}`;
    }

    // 2. Собираем иерархию связей (Parent -> Child)
    for (const [key, def] of Object.entries(PUPPET_PARTS)) {
      const joint = this.joints[key];
      const attachX = def.attachPos[0] * this.pixelScale;
      const attachY = def.attachPos[1] * this.pixelScale;
      joint.position.set(attachX, attachY, 0);

      if (def.parent === 'root') {
        this.root.add(joint);
      } else if (this.joints[def.parent]) {
        this.joints[def.parent].add(joint);
      }

      // 3. Создаем спрайт и настраиваем Pivot
      const w = def.width * this.pixelScale;
      const h = def.height * this.pixelScale;
      const geom = new THREE.PlaneGeometry(w, h);

      // Смещаем геометрию, чтобы ось вращения joint находилась в Pivot Point
      const pivotOffsetX = (0.5 - def.pivot[0]) * w;
      const pivotOffsetY = (0.5 - def.pivot[1]) * h;
      geom.translate(pivotOffsetX, pivotOffsetY, 0);

      const texture = loader.load(`${basePath}${def.file}`);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;

      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = `mesh_${key}`;
      mesh.position.z = def.zOrder * 0.005; // четкое разделение по глубине без z-fighting
      joint.add(mesh);
      this.meshes[key] = mesh;
    }
  }

  private createDebugVisualizer(): void {
    // Геометрия для отрисовки костей скелета
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      depthTest: false,
      transparent: true,
      opacity: 0.8
    });

    const numBones = Object.keys(PUPPET_PARTS).length;
    const lineGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(numBones * 2 * 3);
    lineGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.debugLines = new THREE.LineSegments(lineGeom, lineMat);
    this.debugLines.renderOrder = 999;
    this.root.add(this.debugLines);

    // Геометрия суставов (точек шарниров)
    const pointsGeom = new THREE.BufferGeometry();
    const pointsPositions = new Float32Array(numBones * 3);
    pointsGeom.setAttribute('position', new THREE.BufferAttribute(pointsPositions, 3));
    const pointsMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 8,
      sizeAttenuation: false,
      depthTest: false
    });
    this.debugPoints = new THREE.Points(pointsGeom, pointsMat);
    this.debugPoints.renderOrder = 1000;
    this.root.add(this.debugPoints);

    this.debugLines.visible = this.showDebugRig;
    this.debugPoints.visible = this.showDebugRig;
  }

  public setAnimation(anim: AnimStateName): void {
    this.currentAnim = anim;
    if (anim === 'ATTACK' || anim === 'CAST' || anim === 'HIT') {
      this.oneShotTimer = 0;
      this.oneShotDuration = anim === 'ATTACK' ? 0.6 : anim === 'CAST' ? 1.0 : 0.45;
    }
  }

  public update(dt: number): void {
    const effectiveDt = dt * this.animSpeed;
    this.animTime += effectiveDt;

    // Обновляем видимость орбов
    if (this.meshes['orb_purple']) {
      this.meshes['orb_purple'].visible = this.activeOrb === 'purple' || this.activeOrb === 'both';
    }
    if (this.meshes['orb_cyan']) {
      this.meshes['orb_cyan'].visible = this.activeOrb === 'cyan' || this.activeOrb === 'both';
    }

    // Сброс базовых поз перед обновлением
    this.resetPose();

    // Выбор режима анимации
    switch (this.currentAnim) {
      case 'IDLE':
        this.animateIdle(this.animTime, effectiveDt);
        break;
      case 'WALK':
        this.animateWalk(this.animTime, 4.5, effectiveDt);
        break;
      case 'RUN':
        this.animateRun(this.animTime, 8.5, effectiveDt);
        break;
      case 'ATTACK':
        this.animateAttack(effectiveDt);
        break;
      case 'CAST':
        this.animateCast(effectiveDt);
        break;
      case 'HIT':
        this.animateHit(effectiveDt);
        break;
      case 'DANCE':
        this.animateDance(this.animTime, effectiveDt);
        break;
    }

    // Mouse Aiming (IK-подобие наведения верхней части тела и руки на курсор)
    if (this.mouseAimEnabled) {
      this.applyMouseAim();
    }

    // Эффект разборки на составные части (Exploded View)
    if (this.explodeFactor > 0.001) {
      this.applyExplodedView();
    }

    // Обновление дебаг-скелета
    if (this.showDebugRig) {
      this.updateDebugVisualizer();
    }
  }

  private resetPose(): void {
    for (const [key, def] of Object.entries(PUPPET_PARTS)) {
      const joint = this.joints[key];
      joint.position.set(
        def.attachPos[0] * this.pixelScale,
        def.attachPos[1] * this.pixelScale,
        0
      );
      joint.rotation.set(0, 0, 0);
      joint.scale.set(1, 1, 1);
    }
  }

  // ==================== PROCEDURAL ANIMATIONS ====================

  private animateIdle(t: number, dt: number): void {
    const breathRate = 2.4;
    const breath = Math.sin(t * breathRate) * this.breathingDepth;

    // Таз и торс
    this.joints.pelvis.position.y += breath * 0.04;
    this.joints.torso.rotation.z = Math.sin(t * 1.2) * 0.02;
    this.joints.torso.position.y += breath * 0.02;

    // Голова
    this.joints.head.rotation.z = -breath * 0.035;

    // Руки покачиваются
    const armSway = Math.sin(t * breathRate - 0.5) * 0.05 * this.breathingDepth;
    this.joints.upperArmL.rotation.z = 0.15 + armSway;
    this.joints.forearmL.rotation.z = -0.25 - armSway * 0.5;
    this.joints.upperArmR.rotation.z = -0.15 - armSway;
    this.joints.forearmR.rotation.z = 0.25 + armSway * 0.5;

    // Вторичная физика волос (Spring oscillation)
    this.updateHairPhysics(Math.sin(t * breathRate - 0.8) * 0.15, dt);

    // Парение орба
    this.pulseOrbs(t);
  }

  private animateWalk(t: number, cycleSpeed: number, dt: number): void {
    const cycle = t * cycleSpeed;
    const sinC = Math.sin(cycle);
    const cosC = Math.cos(cycle);
    const amp = this.stepAmplitude;

    // Вертикальный отскок таза на каждый шаг (частота x2)
    const bounce = Math.abs(Math.sin(cycle)) * 0.08 * amp;
    this.joints.pelvis.position.y += bounce;
    this.joints.pelvis.rotation.z = sinC * 0.04 * amp;

    // Торс слегка наклонен вперед и компенсирует таз
    this.joints.torso.rotation.z = -sinC * 0.05 * amp;
    this.joints.head.rotation.z = sinC * 0.03 * amp;

    // Ноги (противофазный маятник)
    // Левая нога
    this.joints.thigh_l.rotation.z = sinC * 0.55 * amp;
    this.joints.shin_l.rotation.z = sinC > 0 ? sinC * 0.65 * amp : 0.1;
    this.joints.boot_l.rotation.z = -sinC * 0.25 * amp;

    // Правая нога
    this.joints.thigh_r.rotation.z = -sinC * 0.55 * amp;
    this.joints.shin_r.rotation.z = -sinC > 0 ? -sinC * 0.65 * amp : 0.1;
    this.joints.boot_r.rotation.z = sinC * 0.25 * amp;

    // Руки (противофазно ногам)
    this.joints.upperArmL.rotation.z = -sinC * 0.45 * amp;
    this.joints.forearmL.rotation.z = -Math.abs(sinC) * 0.3 * amp;
    this.joints.upperArmR.rotation.z = sinC * 0.45 * amp;
    this.joints.forearmR.rotation.z = Math.abs(sinC) * 0.3 * amp;

    // Волосы отстают от движения
    this.updateHairPhysics(-0.25 + cosC * 0.2 * amp, dt);
    this.pulseOrbs(t);
  }

  private animateRun(t: number, cycleSpeed: number, dt: number): void {
    const cycle = t * cycleSpeed;
    const sinC = Math.sin(cycle);
    const amp = this.stepAmplitude * 1.2;

    // Агрессивный наклон всего тела вперед
    this.joints.pelvis.position.y += Math.abs(Math.sin(cycle)) * 0.14 * amp;
    this.joints.pelvis.rotation.z = 0.15;
    this.joints.torso.rotation.z = 0.1;
    this.joints.head.rotation.z = -0.05;

    // Размашистый бег ног
    this.joints.thigh_l.rotation.z = sinC * 0.85 * amp;
    this.joints.shin_l.rotation.z = sinC > 0 ? sinC * 0.95 * amp : 0.2;
    this.joints.boot_l.rotation.z = -sinC * 0.4 * amp;

    this.joints.thigh_r.rotation.z = -sinC * 0.85 * amp;
    this.joints.shin_r.rotation.z = -sinC > 0 ? -sinC * 0.95 * amp : 0.2;
    this.joints.boot_r.rotation.z = sinC * 0.4 * amp;

    // Руки сильно согнуты в локтях и активно машут
    this.joints.upperArmL.rotation.z = -sinC * 0.8 * amp;
    this.joints.forearmL.rotation.z = -0.7 - Math.abs(sinC) * 0.4;
    this.joints.upperArmR.rotation.z = sinC * 0.8 * amp;
    this.joints.forearmR.rotation.z = 0.7 + Math.abs(sinC) * 0.4;

    // Волосы сильно отлетают назад
    this.updateHairPhysics(-0.55 + Math.sin(cycle - 0.4) * 0.35, dt);
    this.pulseOrbs(t);
  }

  private animateAttack(dt: number): void {
    this.oneShotTimer += dt;
    const p = Math.min(1.0, this.oneShotTimer / this.oneShotDuration);

    if (p < 0.3) {
      // Фаза 1: Замах назад (0..0.3)
      const t = p / 0.3;
      this.joints.pelvis.position.x = -0.1 * t;
      this.joints.torso.rotation.z = -0.2 * t;
      this.joints.head.rotation.z = 0.1 * t;
      this.joints.upperArmR.rotation.z = -0.8 * t;
      this.joints.forearmR.rotation.z = 0.9 * t;
      this.updateHairPhysics(0.2 * t, dt);
    } else if (p < 0.6) {
      // Фаза 2: Резкий удар / выпад вперед (0.3..0.6)
      const t = (p - 0.3) / 0.3;
      this.joints.pelvis.position.x = -0.1 + 0.35 * t;
      this.joints.pelvis.position.y = -0.08 * t;
      this.joints.torso.rotation.z = -0.2 + 0.45 * t;
      this.joints.head.rotation.z = -0.15 * t;
      this.joints.upperArmR.rotation.z = -0.8 + 1.6 * t; // выброс руки
      this.joints.forearmR.rotation.z = 0.9 - 0.8 * t;
      this.joints.fist_r.rotation.z = 0.3 * t;
      this.updateHairPhysics(-0.45 * t, dt);
    } else {
      // Фаза 3: Плавный возврат в стойку (0.6..1.0)
      const t = (p - 0.6) / 0.4;
      const ease = 1 - Math.pow(1 - t, 2);
      this.joints.pelvis.position.x = 0.25 * (1 - ease);
      this.joints.torso.rotation.z = 0.25 * (1 - ease);
      this.joints.upperArmR.rotation.z = 0.8 * (1 - ease);
      this.updateHairPhysics(-0.45 * (1 - ease), dt);
    }

    if (p >= 1.0) {
      this.setAnimation('IDLE');
    }
  }

  private animateCast(dt: number): void {
    this.oneShotTimer += dt;
    const p = Math.min(1.0, this.oneShotTimer / this.oneShotDuration);

    // Левитация и подъем правой руки со сферой вверх
    if (p < 0.45) {
      const t = p / 0.45;
      this.joints.pelvis.position.y = 0.2 * t; // отрыв от земли
      this.joints.torso.rotation.z = -0.15 * t;
      this.joints.head.rotation.z = 0.2 * t; // взгляд вверх на сферу
      this.joints.upperArmR.rotation.z = -1.4 * t; // рука вверх
      this.joints.forearmR.rotation.z = -0.5 * t;
      this.updateHairPhysics(0.3 * t, dt);
    } else if (p < 0.75) {
      // Вспышка и пульсация энергии
      this.joints.pelvis.position.y = 0.22 + Math.sin(p * 25) * 0.03;
      this.joints.upperArmR.rotation.z = -1.4;
      this.joints.forearmR.rotation.z = -0.5;
      const flare = 1.0 + Math.sin(p * 30) * 0.4;
      this.joints.orb_cyan.scale.setScalar(flare);
      this.joints.orb_purple.scale.setScalar(flare);
      this.updateHairPhysics(0.35 + Math.sin(p * 20) * 0.1, dt);
    } else {
      // Спуск на землю
      const t = (p - 0.75) / 0.25;
      this.joints.pelvis.position.y = 0.2 * (1 - t);
      this.joints.upperArmR.rotation.z = -1.4 * (1 - t);
      this.updateHairPhysics(0.2 * (1 - t), dt);
    }

    if (p >= 1.0) {
      this.setAnimation('IDLE');
    }
  }

  private animateHit(dt: number): void {
    this.oneShotTimer += dt;
    const p = Math.min(1.0, this.oneShotTimer / this.oneShotDuration);

    if (p < 0.35) {
      const t = p / 0.35;
      this.joints.pelvis.position.x = -0.25 * t;
      this.joints.torso.rotation.z = -0.35 * t;
      this.joints.head.rotation.z = -0.2 * t;
      this.updateHairPhysics(0.6 * t, dt);
    } else {
      const t = (p - 0.35) / 0.65;
      this.joints.pelvis.position.x = -0.25 * (1 - t);
      this.joints.torso.rotation.z = -0.35 * (1 - t);
      this.updateHairPhysics(0.6 * (1 - t), dt);
    }

    if (p >= 1.0) {
      this.setAnimation('IDLE');
    }
  }

  private animateDance(t: number, dt: number): void {
    const cycle = t * 6.0;
    const sinC = Math.sin(cycle);
    const cosC = Math.cos(cycle);

    this.joints.pelvis.position.y = Math.abs(sinC) * 0.1;
    this.joints.pelvis.position.x = cosC * 0.08;
    this.joints.torso.rotation.z = sinC * 0.15;
    this.joints.head.rotation.z = -sinC * 0.2;

    this.joints.upperArmL.rotation.z = -1.2 + cosC * 0.4;
    this.joints.forearmL.rotation.z = -0.5 + sinC * 0.3;
    this.joints.upperArmR.rotation.z = 1.2 - cosC * 0.4;
    this.joints.forearmR.rotation.z = 0.5 - sinC * 0.3;

    this.updateHairPhysics(sinC * 0.4, dt);
    this.pulseOrbs(t);
  }

  // ==================== HAIR SPRING PHYSICS ====================

  private updateHairPhysics(targetAngle: number, dt: number): void {
    const springForce = (targetAngle - this.hairAngle) * this.hairSpringStiffness;
    const dampingForce = -this.hairVelocity * this.hairDamping;
    this.hairVelocity += (springForce + dampingForce) * dt;
    this.hairAngle += this.hairVelocity * dt;
    this.joints.hair.rotation.z = this.hairAngle;
  }

  private pulseOrbs(t: number): void {
    const pulse = 1.0 + Math.sin(t * 5.0) * 0.12;
    this.joints.orb_purple.scale.setScalar(pulse);
    this.joints.orb_cyan.scale.setScalar(pulse);
    this.joints.orb_purple.rotation.z = t * 2.0;
    this.joints.orb_cyan.rotation.z = -t * 2.5;
  }

  // ==================== MOUSE AIM IK ====================

  private applyMouseAim(): void {
    // Вектор от сустава правого плеча до курсора мыши
    const shoulderWorldPos = new THREE.Vector3();
    this.joints.upperArmR.getWorldPosition(shoulderWorldPos);

    const dx = this.targetAimPos.x - shoulderWorldPos.x;
    const dy = this.targetAimPos.y - shoulderWorldPos.y;
    const angle = Math.atan2(dy, dx);

    // Плавно направляем руку и голову в сторону курсора
    this.joints.upperArmR.rotation.z = THREE.MathUtils.lerp(this.joints.upperArmR.rotation.z, angle - Math.PI * 0.5, 0.2);
    this.joints.torso.rotation.z = THREE.MathUtils.lerp(this.joints.torso.rotation.z, (dx > 0 ? 0.1 : -0.1), 0.1);
    this.joints.head.rotation.z = THREE.MathUtils.lerp(this.joints.head.rotation.z, angle * 0.3, 0.15);
  }

  // ==================== EXPLODED ANATOMY VIEW ====================

  private applyExplodedView(): void {
    const factor = this.explodeFactor * 1.5;
    for (const [key, def] of Object.entries(PUPPET_PARTS)) {
      const joint = this.joints[key];
      joint.position.x += def.explodeDir[0] * factor;
      joint.position.y += def.explodeDir[1] * factor;
    }
  }

  // ==================== DEBUG SKELETON RENDERER ====================

  public toggleDebugRig(visible: boolean): void {
    this.showDebugRig = visible;
    if (this.debugLines) this.debugLines.visible = visible;
    if (this.debugPoints) this.debugPoints.visible = visible;
  }

  private updateDebugVisualizer(): void {
    if (!this.debugLines || !this.debugPoints) return;

    this.root.updateMatrixWorld(true);

    const linePos = this.debugLines.geometry.attributes.position.array as Float32Array;
    const ptPos = this.debugPoints.geometry.attributes.position.array as Float32Array;

    let lineIdx = 0;
    let ptIdx = 0;

    const rootWorld = new THREE.Vector3();
    this.root.getWorldPosition(rootWorld);

    for (const [key, def] of Object.entries(PUPPET_PARTS)) {
      const childJoint = this.joints[key];
      const childPos = new THREE.Vector3();
      childJoint.getWorldPosition(childPos);
      childPos.sub(rootWorld); // relative to root

      ptPos[ptIdx++] = childPos.x;
      ptPos[ptIdx++] = childPos.y;
      ptPos[ptIdx++] = childPos.z + 0.1;

      // Connect to parent
      const parentJoint = def.parent === 'root' ? this.root : this.joints[def.parent];
      const parentPos = new THREE.Vector3();
      parentJoint.getWorldPosition(parentPos);
      parentPos.sub(rootWorld);

      linePos[lineIdx++] = parentPos.x;
      linePos[lineIdx++] = parentPos.y;
      linePos[lineIdx++] = parentPos.z + 0.1;

      linePos[lineIdx++] = childPos.x;
      linePos[lineIdx++] = childPos.y;
      linePos[lineIdx++] = childPos.z + 0.1;
    }

    this.debugLines.geometry.attributes.position.needsUpdate = true;
    this.debugPoints.geometry.attributes.position.needsUpdate = true;
  }
}
