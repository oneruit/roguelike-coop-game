import {
  Vector3,
  Group,
  Mesh,
  CylinderGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  OctahedronGeometry,
  TorusGeometry,
  RingGeometry,
  DoubleSide,
  type Scene
} from 'three';
import { RIFT_ITEMS, type ItemRarity, type RiftItemId, type RiftItemDef } from '../items/RiftItemSystem';
import type { PassiveBuffId } from '../drops/PassiveBuffs';
import { Player } from '../entities/Player';
import { BiomeManager } from './BiomeManager';
import { BalanceManager } from '../balance/BalanceManager';

export interface MerchantItemStock {
  id: string;
  type: 'rift_item' | 'passive';
  name: string;
  rarity: ItemRarity;
  icon: string;
  color: string;
  description: string;
  price: number;
}

export class MerchantManager {
  private scene: Scene;
  private biomeManager: BiomeManager;
  public position: Vector3 = new Vector3(0, 0, 0);
  public isActive: boolean = false;
  public timer: number = 0; // seconds remaining in current state
  public stock: MerchantItemStock[] = [];
  public boughtItemIds: Set<string> = new Set();

  public mesh: Group;
  private coreMesh!: Mesh;
  private ringMesh!: Mesh;
  private beamMesh!: Mesh;
  private groundRingMesh!: Mesh;
  private animTimer: number = 0;

  public onMerchantSpawn?: () => void;
  public onMerchantDespawn?: () => void;

  constructor(scene: Scene, biomeManager: BiomeManager) {
    this.scene = scene;
    this.biomeManager = biomeManager;
    this.mesh = new Group();
    this.mesh.visible = false;
    this.createVisuals();
    this.scene.add(this.mesh);

    // Initial countdown until first appearance on the final stage
    const cfg = BalanceManager.getGlobalConfig();
    this.timer = cfg.merchantSpawnInterval ?? 180;
  }

  private createVisuals() {
    // 1. Pedestal base
    const baseGeom = new CylinderGeometry(1.8, 2.2, 0.6, 8);
    const baseMat = new MeshStandardMaterial({
      color: 0x1e1b4b,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x312e81,
      emissiveIntensity: 0.3
    });
    const base = new Mesh(baseGeom, baseMat);
    base.position.y = 0.3;
    base.castShadow = true;
    this.mesh.add(base);

    // 2. Floating glowing amber/gold core
    const coreGeom = new OctahedronGeometry(0.8, 0);
    const coreMat = new MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.2,
      roughness: 0.1,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8
    });
    this.coreMesh = new Mesh(coreGeom, coreMat);
    this.coreMesh.position.y = 2.2;
    this.mesh.add(this.coreMesh);

    // 3. Rotating energy ring
    const ringGeom = new TorusGeometry(1.6, 0.08, 8, 32);
    const ringMat = new MeshBasicMaterial({
      color: 0xfbbf24,
      wireframe: true
    });
    this.ringMesh = new Mesh(ringGeom, ringMat);
    this.ringMesh.position.y = 2.2;
    this.mesh.add(this.ringMesh);

    // 4. Skyward beacon beam (amber) so player sees merchant from afar
    const beamGeom = new CylinderGeometry(0.35, 0.9, 120, 12);
    beamGeom.translate(0, 60, 0);
    const beamMat = new MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.4,
      side: DoubleSide
    });
    this.beamMesh = new Mesh(beamGeom, beamMat);
    this.mesh.add(this.beamMesh);

    // 5. Interaction circle on ground (radius 4.5m)
    const groundGeom = new RingGeometry(4.2, 4.5, 48);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.5,
      side: DoubleSide
    });
    this.groundRingMesh = new Mesh(groundGeom, groundMat);
    this.groundRingMesh.position.y = 0.08;
    this.mesh.add(this.groundRingMesh);
  }

  public update(dt: number, getElevation?: (x: number, z: number) => number) {
    // Only active on the final stage
    if (!this.biomeManager.isFinalStage()) {
      if (this.isActive) {
        this.despawn();
      }
      return;
    }

    const cfg = BalanceManager.getGlobalConfig();
    const spawnInterval = cfg.merchantSpawnInterval ?? 180;
    const stayDuration = cfg.merchantStayDuration ?? 120;

    this.timer -= dt;

    if (this.isActive) {
      // Animate floating crystal and rings
      this.animTimer += dt;
      if (this.coreMesh) {
        this.coreMesh.rotation.y += dt * 1.5;
        this.coreMesh.rotation.x = Math.sin(this.animTimer * 1.8) * 0.2;
        this.coreMesh.position.y = 2.2 + Math.sin(this.animTimer * 2.5) * 0.15;
      }
      if (this.ringMesh) {
        this.ringMesh.rotation.x += dt * 1.0;
        this.ringMesh.rotation.z -= dt * 1.2;
      }

      if (this.timer <= 0) {
        this.despawn();
        this.timer = spawnInterval;
      }
    } else {
      if (this.timer <= 0) {
        this.spawn(getElevation);
        this.timer = stayDuration;
      }
    }
  }

  public spawn(getElevation?: (x: number, z: number) => number) {
    // Random position within 120m radius, avoiding extreme borders
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 90;
    const x = Math.round(Math.cos(angle) * dist);
    const z = Math.round(Math.sin(angle) * dist);
    const y = getElevation ? getElevation(x, z) : 0;

    this.position.set(x, y, z);
    this.mesh.position.copy(this.position);
    this.mesh.visible = true;
    this.isActive = true;
    this.boughtItemIds.clear();

    // Roll new stock
    this.stock = this.generateStock();

    if (this.onMerchantSpawn) {
      this.onMerchantSpawn();
    }
  }

  public despawn() {
    this.isActive = false;
    this.mesh.visible = false;
    this.boughtItemIds.clear();

    if (this.onMerchantDespawn) {
      this.onMerchantDespawn();
    }
  }

  public generateStock(): MerchantItemStock[] {
    const cfg = BalanceManager.getGlobalConfig();
    const prices: Record<ItemRarity, number> = {
      common: cfg.merchantPriceCommon ?? 40,
      uncommon: cfg.merchantPriceUncommon ?? 80,
      rare: cfg.merchantPriceRare ?? 150,
      legendary: cfg.merchantPriceLegendary ?? 300,
      boss: cfg.merchantPriceBoss ?? 500
    };

    const items: MerchantItemStock[] = [];

    // Helper to get random item from list
    const pickRandomDef = (candidates: RiftItemId[]): RiftItemDef => {
      const id = candidates[Math.floor(Math.random() * candidates.length)];
      return RIFT_ITEMS[id];
    };

    // 1. Two Common items
    const commonPool = ['kinetic_injector', 'nanite_plating', 'adrenaline_dart', 'pulse_rounds', 'health_vial'] as RiftItemId[];
    const c1 = pickRandomDef(commonPool);
    const c2 = pickRandomDef(commonPool.filter(id => id !== c1.id));
    items.push({
      id: c1.id,
      type: 'rift_item',
      name: c1.name,
      rarity: c1.rarity,
      icon: c1.icon,
      color: c1.color,
      description: c1.description,
      price: prices[c1.rarity]
    });
    items.push({
      id: c2.id,
      type: 'rift_item',
      name: c2.name,
      rarity: c2.rarity,
      icon: c2.icon,
      color: c2.color,
      description: c2.description,
      price: prices[c2.rarity]
    });

    // 2. Two Uncommon items
    const uncommonPool = ['chain_lightning', 'plasma_detonator', 'crit_visor', 'aegis_battery', 'bio_leech', 'overclock_module'] as RiftItemId[];
    const u1 = pickRandomDef(uncommonPool);
    const u2 = pickRandomDef(uncommonPool.filter(id => id !== u1.id));
    items.push({
      id: u1.id,
      type: 'rift_item',
      name: u1.name,
      rarity: u1.rarity,
      icon: u1.icon,
      color: u1.color,
      description: u1.description,
      price: prices[u1.rarity]
    });
    items.push({
      id: u2.id,
      type: 'rift_item',
      name: u2.name,
      rarity: u2.rarity,
      icon: u2.icon,
      color: u2.color,
      description: u2.description,
      price: prices[u2.rarity]
    });

    // 3. One Rare item
    const rarePool = ['crit_lens', 'heavy_hollowpoint', 'energy_amplifier'] as RiftItemId[];
    const r1 = pickRandomDef(rarePool);
    items.push({
      id: r1.id,
      type: 'rift_item',
      name: r1.name,
      rarity: r1.rarity,
      icon: r1.icon,
      color: r1.color,
      description: r1.description,
      price: prices[r1.rarity]
    });

    // 4. One Legendary or Boss item
    const highPool = ['titan_heart', 'void_catalyst', 'chronos_phylactery', 'singularity_core', 'orbital_strike', 'golem_core'] as RiftItemId[];
    const h1 = pickRandomDef(highPool);
    items.push({
      id: h1.id,
      type: 'rift_item',
      name: h1.name,
      rarity: h1.rarity,
      icon: h1.icon,
      color: h1.color,
      description: h1.description,
      price: prices[h1.rarity]
    });

    return items;
  }

  public getInteraction(playerPos: Vector3): { canInteract: boolean; prompt: string } {
    if (!this.isActive || !this.mesh.visible) {
      return { canInteract: false, prompt: '' };
    }
    const distSq = playerPos.distanceToSquared(this.position);
    if (distSq <= 4.8 * 4.8) {
      const minutes = Math.floor(Math.max(0, this.timer) / 60);
      const seconds = Math.floor(Math.max(0, this.timer) % 60);
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      return {
        canInteract: true,
        prompt: `[E] Торговец Разлома (Осталось: ${timeStr})`
      };
    }
    return { canInteract: false, prompt: '' };
  }

  public isSold(item: MerchantItemStock, player: Player): boolean {
    if (this.boughtItemIds.has(item.id)) return true;
    if (player.isStatMaxedForItem(item.id)) return true;
    return false;
  }

  public buyItem(item: MerchantItemStock, player: Player): { success: boolean; error?: string } {
    if (!this.isActive) {
      return { success: false, error: 'Торговец уже покинул сектор' };
    }
    if (this.boughtItemIds.has(item.id)) {
      return { success: false, error: 'Этот предмет уже куплен в текущий визит' };
    }
    if (player.isStatMaxedForItem(item.id)) {
      return { success: false, error: 'Характеристика для этого предмета уже максимальна' };
    }
    if (player.credits < item.price) {
      return { success: false, error: `Недостаточно кредитов (нужно ${item.price} ⬡, у вас ${player.credits} ⬡)` };
    }

    // Deduct credits
    player.credits -= item.price;
    this.boughtItemIds.add(item.id);

    // Apply item / passive
    if (item.type === 'rift_item') {
      const def = RIFT_ITEMS[item.id as RiftItemId];
      if (def) {
        player.addRiftItem(def);
      }
    } else {
      player.applyPassiveBuff(item.id as PassiveBuffId);
    }

    player.recalculateStats();
    return { success: true };
  }

  public reset() {
    this.despawn();
    const cfg = BalanceManager.getGlobalConfig();
    this.timer = cfg.merchantSpawnInterval ?? 180;
  }
}
