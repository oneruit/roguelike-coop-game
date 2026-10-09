import {
  AdditiveBlending,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Scene,
} from "three";
import {
  INVOKER_SPELLS,
  isInvokerSpellId,
  type InvokerSpellCast,
} from "../shared/InvokerSpells";
interface EffectSlot {
  root: Group;
  cast: InvokerSpellCast;
  ownerId: string;
  age: number;
  materials: MeshBasicMaterial[];
  geometries: Set<BufferGeometry>;
}
interface EffectPosition {
  x: number;
  y: number;
  z: number;
}
/** Purely visual, bounded effects for local casts and co-op replay. */
export class InvokerSpellEffects {
  private slots: EffectSlot[] = [];
  constructor(
    private scene: Scene,
    private resolvePosition: (id: string) => EffectPosition | undefined = () =>
      undefined,
    private findTarget: (
      position: EffectPosition,
      range: number,
    ) => EffectPosition | undefined = () => undefined,
  ) {}
  public play(cast: InvokerSpellCast, ownerId: string): void {
    if (
      !isInvokerSpellId(cast.spellId) ||
      ![
        cast.x,
        cast.y,
        cast.z,
        cast.targetX,
        cast.targetY,
        cast.targetZ,
        cast.dx,
        cast.dz,
        cast.radius,
        cast.duration,
        cast.delay,
      ].every(Number.isFinite) ||
      cast.radius <= 0 ||
      cast.duration <= 0
    )
      return;
    const matching = this.slots.filter(
      (slot) => slot.cast.spellId === cast.spellId,
    );
    let slot = matching.find((candidate) => !candidate.root.visible);
    if (!slot && matching.length < 8) {
      slot = this.createSlot(cast, ownerId);
      this.slots.push(slot);
    }
    if (!slot)
      slot = matching.reduce((oldest, candidate) =>
        candidate.age > oldest.age ? candidate : oldest,
      );
    slot.cast = {
      ...cast,
      radius: Math.min(16, cast.radius),
      duration: Math.min(12, cast.duration),
    };
    slot.ownerId = ownerId;
    slot.age = 0;
    slot.root.visible = true;
    this.animate(slot);
  }
  public update(dt: number): void {
    for (const slot of this.slots) {
      if (!slot.root.visible) continue;
      slot.age += dt;
      if (slot.age >= slot.cast.duration) slot.root.visible = false;
      else this.animate(slot);
    }
  }
  public clear(): void {
    for (const slot of this.slots) {
      this.scene.remove(slot.root);
      for (const geometry of slot.geometries) geometry.dispose();
      for (const material of slot.materials) material.dispose();
    }
    this.slots = [];
  }
  private animate(slot: EffectSlot): void {
    const c = slot.cast,
      age = slot.age,
      progress = age / c.duration;
    const targeted = [
      "cold_snap",
      "ice_wall",
      "emp",
      "sun_strike",
      "chaos_meteor",
    ].includes(c.spellId);
    slot.root.position.set(
      targeted ? c.targetX : c.x,
      (targeted ? c.targetY : c.y) + 0.1,
      targeted ? c.targetZ : c.z,
    );
    slot.root.rotation.y = Math.atan2(-c.dz, c.dx);
    const scale = ["forge_spirit", "ghost_walk", "alacrity"].includes(c.spellId)
      ? 1
      : Math.min(6, c.radius);
    slot.root.scale.setScalar(scale);
    if (["ghost_walk", "alacrity", "forge_spirit"].includes(c.spellId)) {
      const owner = this.resolvePosition(slot.ownerId);
      if (owner) slot.root.position.set(owner.x, owner.y + 0.1, owner.z);
    } else if (c.spellId === "cold_snap" && c.targetId) {
      const target = this.resolvePosition(c.targetId);
      if (target) slot.root.position.set(target.x, target.y + 0.1, target.z);
    }
    for (const material of slot.materials)
      material.opacity =
        (material.userData.baseOpacity as number) *
        Math.min(1, (1 - progress) * 4);
    if (c.spellId === "tornado" || c.spellId === "deafening_blast") {
      const speed = c.spellId === "tornado" ? 8 : 16;
      slot.root.position.x += c.dx * age * speed;
      slot.root.position.z += c.dz * age * speed;
      if (c.spellId === "tornado") slot.root.rotation.y += age * 10;
    } else if (c.spellId === "chaos_meteor") {
      const travel = Math.max(0, age - c.delay) * 5;
      slot.root.position.x += c.dx * travel;
      slot.root.position.z += c.dz * travel;
      slot.root.position.y += age < c.delay ? (1 - age / c.delay) * 7 : 0.6;
      slot.root.rotation.z = age * 4;
    } else if (c.spellId === "sun_strike") {
      const beam = slot.root.getObjectByName("beam");
      if (beam) beam.visible = age >= c.delay;
    } else if (c.spellId === "emp") {
      const charged = Math.min(1, age / Math.max(0.01, c.delay));
      slot.root.scale.setScalar(
        c.radius * (age < c.delay ? 0.15 + charged * 0.35 : 1),
      );
      slot.root.rotation.y += age * 3;
    } else if (c.spellId === "forge_spirit") {
      const target =
        this.findTarget(slot.root.position, c.radius) ??
        this.resolvePosition(c.targetId ?? "");
      for (let index = 0; index < 2; index++) {
        const spirit = slot.root.getObjectByName("spirit-" + index)!;
        const bolt = slot.root.getObjectByName("spirit-bolt-" + index)!;
        const angle = age * 1.2 + index * Math.PI;
        spirit.position.set(
          Math.cos(angle) * 1.5,
          0.6 + Math.sin(age * 5) * 0.1,
          Math.sin(angle) * 1.5,
        );
        spirit.scale.setScalar(0.85 + Math.sin(age * 9) * 0.15);
        const flight = (age / 0.75) % 1;
        bolt.visible = !!target && flight > 0.08 && flight < 0.8;
        if (target) {
          const wx = target.x - slot.root.position.x,
            wz = target.z - slot.root.position.z;
          const rotation = slot.root.rotation.y;
          const tx = Math.cos(rotation) * wx - Math.sin(rotation) * wz;
          const tz = Math.sin(rotation) * wx + Math.cos(rotation) * wz;
          const progress = Math.min(1, flight / 0.8);
          bolt.position.set(
            spirit.position.x + (tx - spirit.position.x) * progress,
            0.7,
            spirit.position.z + (tz - spirit.position.z) * progress,
          );
        }
      }
    } else if (
      c.spellId === "ghost_walk" ||
      c.spellId === "alacrity" ||
      c.spellId === "cold_snap"
    ) {
      slot.root.rotation.y += age * 3;
    }
  }
  private mesh(
    slot: EffectSlot,
    geometry: BufferGeometry,
    color: number,
    opacity = 0.65,
    parent: Group = slot.root,
  ): Mesh {
    const material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: DoubleSide,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    material.userData.baseOpacity = opacity;
    slot.materials.push(material);
    slot.geometries.add(geometry);
    const mesh = new Mesh(geometry, material);
    parent.add(mesh);
    return mesh;
  }
  private ring(slot: EffectSlot, color: number, radius = 1): Mesh {
    const ring = this.mesh(
      slot,
      new RingGeometry(radius * 0.9, radius, 40),
      color,
    );
    ring.rotation.x = -Math.PI / 2;
    return ring;
  }
  private createSlot(cast: InvokerSpellCast, ownerId: string): EffectSlot {
    const slot: EffectSlot = {
      root: new Group(),
      cast,
      ownerId,
      age: 0,
      materials: [],
      geometries: new Set(),
    };
    slot.root.name = "invoker-effect-" + cast.spellId;
    const color = INVOKER_SPELLS[cast.spellId].color;
    if (cast.spellId === "ice_wall") {
      for (let i = 0; i < 11; i++) {
        const spike = this.mesh(
          slot,
          new ConeGeometry(0.17, 0.7 + (i % 3) * 0.12, 5),
          color,
          0.8,
        );
        spike.position.set(0, 0.4, -1 + i * 0.2);
      }
    } else if (cast.spellId === "tornado") {
      for (let i = 0; i < 5; i++) {
        const ring = this.mesh(
          slot,
          new TorusGeometry(0.25 + i * 0.14, 0.055, 6, 24),
          color,
          0.65,
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.2 + i * 0.4;
      }
    } else if (cast.spellId === "sun_strike") {
      this.ring(slot, color);
      const beam = this.mesh(
        slot,
        new CylinderGeometry(0.14, 0.4, 6, 12),
        color,
        0.8,
      );
      beam.name = "beam";
      beam.position.y = 3;
    } else if (cast.spellId === "emp") {
      this.mesh(slot, new IcosahedronGeometry(1, 1), color, 0.4).position.y =
        0.6;
      this.ring(slot, color);
      const arc = this.mesh(
        slot,
        new TorusGeometry(0.8, 0.035, 6, 30),
        0xffffff,
        0.8,
      );
      arc.position.y = 0.6;
      arc.rotation.y = Math.PI / 2;
    } else if (cast.spellId === "forge_spirit") {
      for (let i = 0; i < 2; i++) {
        const spirit = new Group();
        spirit.name = "spirit-" + i;
        slot.root.add(spirit);
        const bolt = this.mesh(
          slot,
          new IcosahedronGeometry(0.16, 0),
          0xffac44,
          0.9,
        );
        bolt.name = "spirit-bolt-" + i;
        this.mesh(
          slot,
          new ConeGeometry(0.5, 1.2, 6),
          color,
          0.8,
          spirit,
        ).position.y = 0.4;
        this.mesh(slot, new IcosahedronGeometry(0.3, 0), 0xffe27d, 0.9, spirit);
        const eyes = this.mesh(
          slot,
          new BoxGeometry(0.3, 0.08, 0.08),
          0xffffff,
          0.9,
          spirit,
        );
        eyes.position.set(0, 0.2, 0.3);
      }
    } else if (cast.spellId === "chaos_meteor") {
      this.mesh(slot, new IcosahedronGeometry(0.65, 1), 0xff6929, 0.9);
      this.mesh(slot, new IcosahedronGeometry(0.82, 1), 0xffce51, 0.25);
      for (let i = 1; i < 4; i++) {
        const trail = this.mesh(
          slot,
          new IcosahedronGeometry(0.4 / i, 0),
          color,
          0.5,
        );
        trail.position.set(-i * 0.4, 0, 0);
      }
    } else if (cast.spellId === "deafening_blast") {
      const arc = this.mesh(
        slot,
        new RingGeometry(0.65, 1, 32, 1, -Math.PI * 0.45, Math.PI * 0.9),
        color,
        0.8,
      );
      arc.rotation.x = -Math.PI / 2;
      const upper = arc.clone();
      upper.position.y = 0.6;
      slot.root.add(upper);
    } else if (cast.spellId === "cold_snap") {
      this.ring(slot, color);
      for (let i = 0; i < 6; i++) {
        const shard = this.mesh(
          slot,
          new ConeGeometry(0.15, 0.6, 4),
          color,
          0.8,
        );
        const angle = (i * Math.PI) / 3;
        shard.position.set(Math.cos(angle) * 0.6, 0.4, Math.sin(angle) * 0.6);
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const ring = this.ring(slot, color, 1.2 - i * 0.15);
        ring.position.y = 0.2 + i * 0.5;
      }
      for (let i = 0; i < 3; i++) {
        const orb = this.mesh(
          slot,
          new IcosahedronGeometry(0.13, 0),
          color,
          0.85,
        );
        orb.position.set(Math.cos(i * 2.1), 0.8, Math.sin(i * 2.1));
      }
    }
    this.scene.add(slot.root);
    return slot;
  }
}
