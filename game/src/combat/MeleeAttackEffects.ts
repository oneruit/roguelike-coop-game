import {
  AdditiveBlending, BoxGeometry, type BufferGeometry, ConeGeometry, DoubleSide,
  Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, RingGeometry,
  type Scene, TorusGeometry, Vector3
} from 'three';
import type { MeleeAttackInfo, MeleeWeaponId } from '../shared/types';

interface EffectSlot {
  weaponId: MeleeWeaponId;
  root: Group;
  elapsed: number;
  duration: number;
  angle: number;
  materials: { material: MeshBasicMaterial; opacity: number }[];
  geometries: Set<BufferGeometry>;
  impact?: Mesh;
}

const PROFILES: Record<MeleeWeaponId, { color: number; duration: number; sweep: number }> = {
  katana_slash: { color: 0x9fefff, duration: 0.26, sweep: Math.PI * 1.2 },
  whirlwind_slash: { color: 0xff355d, duration: 0.30, sweep: Math.PI * 2 },
  greatsword: { color: 0xffc45c, duration: 0.40, sweep: Math.PI * 1.3 },
  flail: { color: 0xa6ddff, duration: 0.36, sweep: Math.PI * 1.7 }
};

/** Bounded, reusable effects for both local attacks and relayed co-op attacks. */
export class MeleeAttackEffects {
  private slots: EffectSlot[] = [];
  private static readonly MAX_PER_WEAPON = 8;

  constructor(private scene: Scene) {}

  public play(attack: MeleeAttackInfo): void {
    if (!Object.hasOwn(PROFILES, attack.weaponId)) return;
    const profile = PROFILES[attack.weaponId];
    if (!profile || ![attack.x, attack.y, attack.z, attack.radius, attack.angle].every(Number.isFinite)
      || attack.radius <= 0) return;

    const matching = this.slots.filter(slot => slot.weaponId === attack.weaponId);
    let slot = matching.find(candidate => !candidate.root.visible);
    if (!slot && matching.length < MeleeAttackEffects.MAX_PER_WEAPON) {
      slot = this.createSlot(attack.weaponId);
      this.slots.push(slot);
    }
    if (!slot) {
      slot = matching.reduce((oldest, candidate) => candidate.elapsed > oldest.elapsed ? candidate : oldest);
    }
    slot.elapsed = 0;
    slot.angle = attack.angle;
    slot.root.position.set(attack.x, attack.y + 0.45, attack.z);
    slot.root.scale.setScalar(Math.min(32, attack.radius));
    slot.root.visible = true;
    this.animate(slot);
  }

  public update(dt: number): void {
    for (const slot of this.slots) {
      if (!slot.root.visible) continue;
      slot.elapsed += dt;
      if (slot.elapsed >= slot.duration) {
        slot.root.visible = false;
      } else {
        this.animate(slot);
      }
    }
  }

  public clear(): void {
    for (const slot of this.slots) {
      this.scene.remove(slot.root);
      for (const geometry of slot.geometries) geometry.dispose();
      for (const { material } of slot.materials) material.dispose();
    }
    this.slots = [];
  }

  private animate(slot: EffectSlot): void {
    const progress = slot.elapsed / slot.duration;
    const profile = PROFILES[slot.weaponId];
    const eased = 1 - Math.pow(1 - progress, 2);
    slot.root.rotation.y = slot.angle + (eased - 0.5) * profile.sweep;
    for (const entry of slot.materials) {
      entry.material.opacity = entry.opacity * Math.pow(1 - progress, 0.7);
    }
    if (slot.impact) {
      slot.impact.scale.setScalar(0.45 + progress * 0.65);
      // Keep the circular shockwave horizontal as the blade rotates.
      slot.impact.position.y = -0.03;
    }
  }

  private material(slot: EffectSlot, color: number, opacity: number, glow = false): MeshBasicMaterial {
    const material = new MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false, side: DoubleSide,
      ...(glow ? { blending: AdditiveBlending } : {})
    });
    slot.materials.push({ material, opacity });
    return material;
  }

  private mesh(slot: EffectSlot, geometry: BufferGeometry, material: MeshBasicMaterial, parent = slot.root): Mesh {
    const mesh = new Mesh(geometry, material);
    slot.geometries.add(geometry);
    parent.add(mesh);
    return mesh;
  }

  private arc(slot: EffectSlot, inner: number, outer: number, start: number, length: number, opacity: number): Mesh {
    const arc = this.mesh(slot, new RingGeometry(inner, outer, 48, 1, start, length),
      this.material(slot, PROFILES[slot.weaponId].color, opacity, true));
    arc.rotation.x = -Math.PI / 2;
    return arc;
  }

  private blade(slot: EffectSlot, heavy: boolean): void {
    const steel = this.material(slot, 0xf0fbff, 0.95);
    const gold = this.material(slot, heavy ? 0xffc45c : 0x4dd9ef, 0.95);
    const grip = this.mesh(slot, new BoxGeometry(0.18, 0.045, 0.045), gold);
    grip.position.x = 0.17;
    const guard = this.mesh(slot, new BoxGeometry(0.045, 0.05, heavy ? 0.25 : 0.16), gold);
    guard.position.x = 0.28;
    const blade = this.mesh(slot, new BoxGeometry(0.57, 0.025, heavy ? 0.13 : 0.055), steel);
    blade.position.x = 0.59;
    const tip = this.mesh(slot, new ConeGeometry(heavy ? 0.075 : 0.034, 0.13, 4), steel);
    tip.rotation.z = -Math.PI / 2;
    tip.position.x = 0.93;
  }

  private flail(slot: EffectSlot): void {
    const steel = this.material(slot, 0xd1e5f0, 0.95);
    const gold = this.material(slot, 0xffbd57, 0.95);
    const handle = this.mesh(slot, new BoxGeometry(0.25, 0.045, 0.06), gold);
    handle.position.x = 0.20;
    for (let index = 0; index < 9; index++) {
      const link = this.mesh(slot, new TorusGeometry(0.035, 0.012, 5, 8), steel);
      link.position.set(0.35 + index * 0.058, 0, 0);
      link.rotation.x = index % 2 ? Math.PI / 2 : 0;
    }
    const head = new Group();
    head.position.x = 0.91;
    slot.root.add(head);
    this.mesh(slot, new IcosahedronGeometry(0.10, 0), steel, head);
    for (const direction of [
      new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 1, 0),
      new Vector3(0, -1, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1)
    ]) {
      const spike = this.mesh(slot, new ConeGeometry(0.035, 0.12, 4), gold, head);
      spike.position.copy(direction).multiplyScalar(0.12);
      spike.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction);
    }
  }

  private createSlot(weaponId: MeleeWeaponId): EffectSlot {
    const slot: EffectSlot = {
      weaponId, root: new Group(), elapsed: 0, angle: 0,
      duration: PROFILES[weaponId].duration, materials: [], geometries: new Set()
    };
    slot.root.name = 'melee-effect-' + weaponId;
    slot.root.visible = false;
    if (weaponId === 'whirlwind_slash') {
      this.arc(slot, 0.76, 1, 0, Math.PI * 0.8, 0.80);
      this.arc(slot, 0.55, 0.78, Math.PI, Math.PI * 0.8, 0.65);
      this.arc(slot, 0.94, 1, Math.PI, Math.PI * 0.65, 0.40);
    } else if (weaponId === 'flail') {
      this.arc(slot, 0.82, 1, -Math.PI * 0.8, Math.PI * 0.8, 0.50);
      this.flail(slot);
    } else {
      this.arc(slot, weaponId === 'greatsword' ? 0.68 : 0.85, 1,
        -Math.PI * 0.75, Math.PI * 0.9, 0.75);
      this.blade(slot, weaponId === 'greatsword');
      if (weaponId === 'greatsword') {
        slot.impact = this.arc(slot, 0.95, 1, 0, Math.PI * 2, 0.40);
      }
    }
    this.scene.add(slot.root);
    return slot;
  }
}
