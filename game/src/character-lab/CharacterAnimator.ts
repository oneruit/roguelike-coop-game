import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { CharacterAnimationState, CharacterClass } from './types';

/**
 * Procedural kinematic animation controller for realistic and natural character movement.
 * Features smooth state cross-fading, biomechanical walk/run cycles, and class-specific combat attacks.
 */
export class CharacterAnimator {
  private rig: CharacterRig;
  public currentState: CharacterAnimationState = 'idle';
  public currentClass: CharacterClass = 'warrior';

  public playbackSpeed: number = 1.0;
  private animationTime: number = 0;
  private attackTime: number = 0;
  public isAttacking: boolean = false;

  // Attack duration in seconds
  private attackDuration: number = 0.85;

  // Weapon trail geometry for warrior slash
  public weaponTrailGroup: THREE.Group;
  private trailMesh?: THREE.Mesh;

  constructor(rig: CharacterRig) {
    this.rig = rig;
    this.weaponTrailGroup = new THREE.Group();
    this.weaponTrailGroup.name = 'WeaponTrail';
    this.rig.root.add(this.weaponTrailGroup);
    this.buildWeaponTrail();
  }

  private buildWeaponTrail() {
    // Arc trail for melee attacks
    const trailShape = new THREE.RingGeometry(0.8, 1.25, 24, 1, 0, Math.PI * 0.7);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.trailMesh = new THREE.Mesh(trailShape, trailMat);
    this.trailMesh.rotation.x = Math.PI / 2;
    this.trailMesh.position.set(0, 1.1, 0.2);
    this.weaponTrailGroup.add(this.trailMesh);
  }

  public setClass(classType: CharacterClass) {
    this.currentClass = classType;
  }

  public setState(state: CharacterAnimationState) {
    if (this.currentState === state && !this.isAttacking) return;
    this.currentState = state;
    if (state === 'attack' || state === 'special') {
      this.triggerAttack();
    }
  }

  public triggerAttack() {
    this.isAttacking = true;
    this.attackTime = 0;
    this.currentState = 'attack';
  }

  public update(delta: number) {
    const dt = delta * this.playbackSpeed;
    this.animationTime += dt;

    if (this.isAttacking) {
      this.attackTime += dt;
      const progress = Math.min(1.0, this.attackTime / this.attackDuration);
      this.animateAttack(progress);

      if (progress >= 1.0) {
        this.isAttacking = false;
        this.currentState = 'idle';
        if (this.trailMesh) {
          (this.trailMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      }
      return;
    }

    switch (this.currentState) {
      case 'idle':
        this.animateIdle(this.animationTime);
        break;
      case 'walk':
        this.animateLocomotion(this.animationTime, 3.2, 0.45);
        break;
      case 'run':
        this.animateLocomotion(this.animationTime, 6.0, 0.85);
        break;
    }
  }

  // ==========================================
  // NATURAL IDLE (Breathing, Sway, Balance)
  // ==========================================
  private animateIdle(time: number) {
    const breath = Math.sin(time * 2.2);
    const sway = Math.sin(time * 1.1);

    // Pelvis subtle vertical breathing bounce
    this.rig.pelvisNode.position.y = 1.05 + breath * 0.015;
    this.rig.pelvisNode.rotation.y = sway * 0.03;
    this.rig.pelvisNode.rotation.z = sway * 0.02;

    // Chest expansion
    this.rig.chestNode.rotation.x = breath * 0.025;
    this.rig.headNode.rotation.x = -breath * 0.015;
    this.rig.headNode.rotation.y = -sway * 0.04;

    // Natural Arm resting / Ready poses per class
    if (this.currentClass === 'warrior') {
      // Right arm holding heavy sword
      this.rig.rightArm.rotation.set(0.2 + breath * 0.02, 0, -0.25);
      this.rig.rightForearm.rotation.set(-0.6, 0.2, 0);

      // Left arm raising shield in defensive stance
      this.rig.leftArm.rotation.set(-0.25, 0.4, 0.35);
      this.rig.leftForearm.rotation.set(-1.1, 0, 0);
    } else if (this.currentClass === 'archer') {
      // Holding bow upright in left hand
      this.rig.leftArm.rotation.set(0.15, 0.2, 0.25);
      this.rig.leftForearm.rotation.set(-0.5, 0.1, 0);

      // Right arm relaxed with arrow
      this.rig.rightArm.rotation.set(0.15, -0.1, -0.2);
      this.rig.rightForearm.rotation.set(-0.35, -0.2, 0);
    } else if (this.currentClass === 'vampire') {
      // Graceful hovering vampire / succubus stance
      this.rig.pelvisNode.position.y = 1.05 + breath * 0.035;
      this.rig.leftArm.rotation.set(-0.15 + breath * 0.02, 0.2, 0.25);
      this.rig.leftForearm.rotation.set(-0.35, 0.1, 0);
      this.rig.rightArm.rotation.set(-0.15 + breath * 0.02, -0.2, -0.25);
      this.rig.rightForearm.rotation.set(-0.35, -0.1, 0);
    } else {
      // Mage holding staff upright
      this.rig.rightArm.rotation.set(0.15, -0.15, -0.22);
      this.rig.rightForearm.rotation.set(-0.8, -0.1, 0);

      // Left hand hovering with open fingers
      this.rig.leftArm.rotation.set(-0.1 + breath * 0.03, 0.2, 0.3);
      this.rig.leftForearm.rotation.set(-0.65, 0.3, 0);
    }

    // Legs standing natural stance
    this.rig.leftThigh.rotation.set(0.04, 0.05, 0.06);
    this.rig.rightThigh.rotation.set(0.04, -0.05, -0.06);
    this.rig.leftShin.rotation.set(-0.06, 0, 0);
    this.rig.rightShin.rotation.set(-0.06, 0, 0);
  }

  // ==========================================
  // NATURAL LOCOMOTION (Walk / Run Cycles)
  // ==========================================
  private animateLocomotion(time: number, speed: number, intensity: number) {
    const cycle = time * speed;
    const sinCycle = Math.sin(cycle);

    // Pelvic bounce & forward lean
    this.rig.pelvisNode.position.y = 1.05 - Math.abs(sinCycle) * (0.05 * intensity);
    this.rig.pelvisNode.rotation.y = -sinCycle * (0.12 * intensity);
    this.rig.spineNode.rotation.x = 0.12 * intensity; // Forward lean
    this.rig.chestNode.rotation.y = sinCycle * (0.15 * intensity); // Torso counter-twist

    // Legs: Alternating strides with knee bend
    this.rig.leftThigh.rotation.x = sinCycle * (0.65 * intensity);
    this.rig.rightThigh.rotation.x = -sinCycle * (0.65 * intensity);

    // Dynamic knee bending on backward stride
    this.rig.leftShin.rotation.x = Math.max(0, -sinCycle) * (0.85 * intensity);
    this.rig.rightShin.rotation.x = Math.max(0, sinCycle) * (0.85 * intensity);

    // Arms: Natural counter-swing to legs
    this.rig.leftArm.rotation.x = -sinCycle * (0.55 * intensity);
    this.rig.leftArm.rotation.z = 0.2;
    this.rig.leftForearm.rotation.x = -0.4 - Math.max(0, -sinCycle) * (0.4 * intensity);

    this.rig.rightArm.rotation.x = sinCycle * (0.55 * intensity);
    this.rig.rightArm.rotation.z = -0.2;
    this.rig.rightForearm.rotation.x = -0.4 - Math.max(0, sinCycle) * (0.4 * intensity);

    // Head compensation
    this.rig.headNode.rotation.x = -0.08 * intensity;
    this.rig.headNode.rotation.y = -sinCycle * (0.05 * intensity);
  }

  // ==========================================
  // COMBAT ATTACKS (Warrior / Archer / Mage)
  // ==========================================
  private animateAttack(progress: number) {
    if (this.currentClass === 'warrior') {
      this.animateWarriorSlash(progress);
    } else if (this.currentClass === 'archer') {
      this.animateArcherShoot(progress);
    } else if (this.currentClass === 'vampire') {
      this.animateVampireCurse(progress);
    } else {
      this.animateMageCast(progress);
    }
  }

  private animateWarriorSlash(p: number) {
    // Phase 1: Wind-up (0.0 -> 0.3)
    // Phase 2: Cleave slash (0.3 -> 0.6)
    // Phase 3: Recovery (0.6 -> 1.0)
    if (p < 0.3) {
      const t = p / 0.3;
      // Torso twists right for windup
      this.rig.pelvisNode.rotation.y = -0.3 * t;
      this.rig.chestNode.rotation.y = -0.5 * t;
      this.rig.rightArm.rotation.set(-0.8 * t, -0.4 * t, -0.6 * t);
      this.rig.rightForearm.rotation.set(-1.2 * t, 0, 0);
      this.rig.leftArm.rotation.set(0.2 * t, 0.4 * t, 0.5 * t); // Shield braces
    } else if (p < 0.6) {
      const t = (p - 0.3) / 0.3;
      // Explosive horizontal swing across front
      this.rig.pelvisNode.rotation.y = -0.3 + 0.7 * t;
      this.rig.chestNode.rotation.y = -0.5 + 1.1 * t;
      this.rig.rightArm.rotation.set(-0.8 + 1.4 * t, -0.4 + 1.2 * t, 0.2 * t);
      this.rig.rightForearm.rotation.set(-1.2 + 0.8 * t, 0, 0);

      // Weapon Trail Arc Visibility
      if (this.trailMesh) {
        (this.trailMesh.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.85;
        this.trailMesh.rotation.z = -Math.PI * 0.3 + t * Math.PI * 0.8;
      }
    } else {
      const t = (p - 0.6) / 0.4;
      // Smooth recovery back to idle
      this.rig.pelvisNode.rotation.y = 0.4 * (1 - t);
      this.rig.chestNode.rotation.y = 0.6 * (1 - t);
      this.rig.rightArm.rotation.set(0.6 * (1 - t), 0.8 * (1 - t), 0);
      this.rig.rightForearm.rotation.set(-0.4 * (1 - t), 0, 0);
      if (this.trailMesh) {
        (this.trailMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }
  }

  private animateArcherShoot(p: number) {
    // Phase 1: Draw bowstring (0.0 -> 0.5)
    // Phase 2: Snap release & recoil (0.5 -> 0.7)
    // Phase 3: Lower bow (0.7 -> 1.0)
    if (p < 0.5) {
      const t = p / 0.5;
      // Left arm raises bow aiming forward
      this.rig.leftArm.rotation.set(-1.4 * t, 0.2 * t, 0.1);
      this.rig.leftForearm.rotation.set(-0.2 * t, 0, 0);

      // Right arm pulls string to cheek
      this.rig.rightArm.rotation.set(-1.2 * t, -0.5 * t, -0.4 * t);
      this.rig.rightForearm.rotation.set(-1.8 * t, 0, 0);

      // Body turns sideways for archery stance
      this.rig.pelvisNode.rotation.y = 0.6 * t;
      this.rig.headNode.rotation.y = -0.55 * t;
    } else if (p < 0.7) {
      const t = (p - 0.5) / 0.2;
      // Snap release recoil
      this.rig.rightArm.rotation.set(-1.2, -0.8 * (1 + t * 0.3), -0.6);
      this.rig.rightForearm.rotation.set(-0.6 * (1 - t), 0, 0);
      this.rig.leftArm.rotation.x = -1.4 + Math.sin(t * Math.PI) * 0.15; // Bow kicks upward
    } else {
      const t = (p - 0.7) / 0.3;
      // Lower back
      this.rig.pelvisNode.rotation.y = 0.6 * (1 - t);
      this.rig.headNode.rotation.y = -0.55 * (1 - t);
      this.rig.leftArm.rotation.x = -1.4 * (1 - t);
      this.rig.rightArm.rotation.set(-1.2 * (1 - t), 0, 0);
    }
  }

  private animateMageCast(p: number) {
    // Phase 1: Raise staff to charge arcane light (0.0 -> 0.45)
    // Phase 2: Slam/thrust forward to unleash spell (0.45 -> 0.7)
    // Phase 3: Float down (0.7 -> 1.0)
    if (p < 0.45) {
      const t = p / 0.45;
      // Lift both hands upward
      this.rig.pelvisNode.position.y = 1.05 + 0.15 * t; // Levitates slightly!
      this.rig.rightArm.rotation.set(-2.2 * t, -0.3 * t, -0.2);
      this.rig.leftArm.rotation.set(-1.8 * t, 0.4 * t, 0.4);
      this.rig.chestNode.rotation.x = -0.2 * t; // Arch back
      this.rig.headNode.rotation.x = -0.3 * t; // Look up at staff
    } else if (p < 0.7) {
      const t = (p - 0.45) / 0.25;
      // Thrust staff forward & down
      this.rig.pelvisNode.position.y = 1.2 - 0.25 * t;
      this.rig.rightArm.rotation.set(-2.2 + 2.8 * t, 0, -0.1);
      this.rig.rightForearm.rotation.set(-0.3 * t, 0, 0);
      this.rig.leftArm.rotation.set(-1.8 + 2.2 * t, 0, 0.2);
      this.rig.chestNode.rotation.x = -0.2 + 0.45 * t; // Lean forward into cast
      this.rig.headNode.rotation.x = 0.2;
    } else {
      const t = (p - 0.7) / 0.3;
      this.rig.pelvisNode.position.y = 0.95 + 0.1 * t;
      this.rig.rightArm.rotation.set(0.6 * (1 - t), 0, 0);
      this.rig.leftArm.rotation.set(0.4 * (1 - t), 0, 0);
      this.rig.chestNode.rotation.x = 0.25 * (1 - t);
    }
  }

  private animateVampireCurse(p: number) {
    // Phase 1: Ascend and spread wings/arms (0.0 -> 0.45)
    // Phase 2: Unleash dark vampiric screech / blood burst (0.45 -> 0.7)
    // Phase 3: Glide down (0.7 -> 1.0)
    if (p < 0.45) {
      const t = p / 0.45;
      this.rig.pelvisNode.position.y = 1.05 + 0.3 * t; // High levitation
      this.rig.leftArm.rotation.set(-1.6 * t, 0.4 * t, 0.8 * t);
      this.rig.rightArm.rotation.set(-1.6 * t, -0.4 * t, -0.8 * t);
      this.rig.chestNode.rotation.x = -0.25 * t;
      this.rig.headNode.rotation.x = -0.35 * t;
    } else if (p < 0.7) {
      const t = (p - 0.45) / 0.25;
      // Strike forward with talons / dark burst
      this.rig.pelvisNode.position.y = 1.35 - 0.2 * t;
      this.rig.leftArm.rotation.set(-1.6 + 2.4 * t, 0.2, 0.2);
      this.rig.rightArm.rotation.set(-1.6 + 2.4 * t, -0.2, -0.2);
      this.rig.chestNode.rotation.x = -0.25 + 0.5 * t;
      this.rig.headNode.rotation.x = 0.25;
    } else {
      const t = (p - 0.7) / 0.3;
      this.rig.pelvisNode.position.y = 1.15 - 0.1 * t;
      this.rig.leftArm.rotation.set(0.8 * (1 - t), 0.2 * (1 - t), 0.25);
      this.rig.rightArm.rotation.set(0.8 * (1 - t), -0.2 * (1 - t), -0.25);
      this.rig.chestNode.rotation.x = 0.25 * (1 - t);
      this.rig.headNode.rotation.x = 0.25 * (1 - t);
    }
  }
}
