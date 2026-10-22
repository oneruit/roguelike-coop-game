import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';
import { CharacterClass, CharacterColors, CharacterEquipmentToggles, CharacterMaterialsConfig } from './types';

/**
 * Modular equipment and class visual identity builder for Warrior, Archer, and Mage.
 */
export class CharacterModularSystem {
  private rig: CharacterRig;

  // Active PBR Materials
  public primaryMaterial: THREE.MeshStandardMaterial;
  public secondaryMaterial: THREE.MeshStandardMaterial;
  public accentMaterial: THREE.MeshStandardMaterial;
  public emissiveMaterial: THREE.MeshStandardMaterial;
  public metallicMaterial: THREE.MeshStandardMaterial;

  // Active Modular Groups
  private helmetGroup?: THREE.Group;
  private chestGroup?: THREE.Group;
  private leftShoulderGroup?: THREE.Group;
  private rightShoulderGroup?: THREE.Group;
  private backGroup?: THREE.Group;
  private weaponGroup?: THREE.Group;
  private secondaryWeaponGroup?: THREE.Group;
  private robeGroup?: THREE.Group;

  // Mage Staff VFX
  public mageCrystalLight?: THREE.PointLight;
  public mageCrystalMesh?: THREE.Mesh;
  public magicParticlesGroup?: THREE.Group;

  // Current state
  public currentClass: CharacterClass = 'warrior';

  constructor(rig: CharacterRig, colors: CharacterColors, materials: CharacterMaterialsConfig) {
    this.rig = rig;

    // Materials
    this.primaryMaterial = new THREE.MeshStandardMaterial({
      color: colors.primaryArmor,
      metalness: materials.metalness,
      roughness: materials.roughness,
    });

    this.secondaryMaterial = new THREE.MeshStandardMaterial({
      color: colors.secondaryArmor,
      metalness: materials.metalness * 0.8,
      roughness: Math.min(1.0, materials.roughness + 0.1),
    });

    this.accentMaterial = new THREE.MeshStandardMaterial({
      color: colors.accent,
      roughness: 0.85,
      metalness: 0.1,
    });

    this.emissiveMaterial = new THREE.MeshStandardMaterial({
      color: colors.emissive,
      emissive: colors.emissive,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.1,
    });

    this.metallicMaterial = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.2,
    });
  }

  public applyClass(classType: CharacterClass, toggles: CharacterEquipmentToggles) {
    this.currentClass = classType;
    this.clearEquipment();

    switch (classType) {
      case 'warrior':
        this.buildWarrior(toggles);
        break;
      case 'archer':
        this.buildArcher(toggles);
        break;
      case 'mage':
        this.buildMage(toggles);
        break;
      case 'vampire':
        // Vampire equipment is handled by VampireCutoutRig
        break;
    }
  }

  public clearEquipment() {
    if (this.helmetGroup) this.rig.sockets.head.remove(this.helmetGroup);
    if (this.chestGroup) this.rig.sockets.chest.remove(this.chestGroup);
    if (this.leftShoulderGroup) this.rig.sockets.leftShoulder.remove(this.leftShoulderGroup);
    if (this.rightShoulderGroup) this.rig.sockets.rightShoulder.remove(this.rightShoulderGroup);
    if (this.backGroup) this.rig.sockets.back.remove(this.backGroup);
    if (this.weaponGroup) this.rig.sockets.rightHand.remove(this.weaponGroup);
    if (this.secondaryWeaponGroup) this.rig.sockets.leftHand.remove(this.secondaryWeaponGroup);
    if (this.robeGroup) this.rig.pelvisNode.remove(this.robeGroup);

    this.helmetGroup = undefined;
    this.chestGroup = undefined;
    this.leftShoulderGroup = undefined;
    this.rightShoulderGroup = undefined;
    this.backGroup = undefined;
    this.weaponGroup = undefined;
    this.secondaryWeaponGroup = undefined;
    this.robeGroup = undefined;
    this.mageCrystalLight = undefined;
    this.mageCrystalMesh = undefined;
    this.magicParticlesGroup = undefined;
  }

  // ==========================================
  // WARRIOR GEAR
  // ==========================================
  private buildWarrior(toggles: CharacterEquipmentToggles) {
    // 1. Knight Barbute Helmet with Gold Visor Ridge
    if (toggles.showHelmet) {
      this.helmetGroup = new THREE.Group();
      this.helmetGroup.name = 'KnightHelmet';
      this.helmetGroup.position.set(0, 0.26, 0);

      const domeGeo = new THREE.SphereGeometry(0.24, 16, 12);
      domeGeo.scale(0.96, 1.1, 1.05);
      const domeMesh = new THREE.Mesh(domeGeo, this.primaryMaterial);
      domeMesh.castShadow = true;
      this.helmetGroup.add(domeMesh);

      // Crest Ridge
      const crestGeo = new THREE.BoxGeometry(0.04, 0.12, 0.32);
      const crestMesh = new THREE.Mesh(crestGeo, this.secondaryMaterial);
      crestMesh.position.set(0, 0.22, 0);
      crestMesh.castShadow = true;
      this.helmetGroup.add(crestMesh);

      // Visor slit
      const slitGeo = new THREE.BoxGeometry(0.26, 0.04, 0.08);
      const slitMesh = new THREE.Mesh(slitGeo, new THREE.MeshBasicMaterial({ color: 0x111827 }));
      slitMesh.position.set(0, 0.02, 0.22);
      this.helmetGroup.add(slitMesh);

      this.rig.sockets.head.add(this.helmetGroup);
    }

    // 2. Steel Pauldrons
    if (toggles.showShoulders) {
      const pauldronGeo = new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
      pauldronGeo.scale(1.2, 0.8, 1.2);

      this.leftShoulderGroup = new THREE.Group();
      const lPauldron = new THREE.Mesh(pauldronGeo, this.primaryMaterial);
      lPauldron.position.set(0.06, 0.08, 0);
      lPauldron.castShadow = true;
      this.leftShoulderGroup.add(lPauldron);
      this.rig.sockets.leftShoulder.add(this.leftShoulderGroup);

      this.rightShoulderGroup = new THREE.Group();
      const rPauldron = new THREE.Mesh(pauldronGeo, this.primaryMaterial);
      rPauldron.position.set(-0.06, 0.08, 0);
      rPauldron.castShadow = true;
      this.rightShoulderGroup.add(rPauldron);
      this.rig.sockets.rightShoulder.add(this.rightShoulderGroup);
    }

    // 3. Steel Cuirass & Belt
    const cuirassGeo = new THREE.CylinderGeometry(0.28, 0.24, 0.32, 14);
    cuirassGeo.scale(1.2, 1, 0.9);
    this.chestGroup = new THREE.Group();
    const cuirassMesh = new THREE.Mesh(cuirassGeo, this.primaryMaterial);
    cuirassMesh.position.y = 0.14;
    cuirassMesh.castShadow = true;
    this.chestGroup.add(cuirassMesh);

    // Gold Trim Cross on Chest
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.04), this.secondaryMaterial);
    crossV.position.set(0, 0.14, 0.24);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.04), this.secondaryMaterial);
    crossH.position.set(0, 0.18, 0.24);
    this.chestGroup.add(crossV, crossH);
    this.rig.sockets.chest.add(this.chestGroup);

    // 4. Red Knight Cloak / Cape
    if (toggles.showCape) {
      this.backGroup = new THREE.Group();
      const capeGeo = new THREE.CylinderGeometry(0.24, 0.42, 1.1, 10, 1, true, 0, Math.PI * 0.9);
      capeGeo.rotateY(Math.PI * 0.55);
      const capeMesh = new THREE.Mesh(capeGeo, this.accentMaterial);
      capeMesh.position.set(0, -0.4, -0.06);
      capeMesh.castShadow = true;
      this.backGroup.add(capeMesh);
      this.rig.sockets.back.add(this.backGroup);
    }

    // 5. Knight Broadsword (Right Hand)
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.name = 'KnightSword';
    this.weaponGroup.rotation.x = Math.PI / 2;

    const bladeGeo = new THREE.BoxGeometry(0.08, 1.0, 0.02);
    const blade = new THREE.Mesh(bladeGeo, this.metallicMaterial);
    blade.position.y = 0.55;
    blade.castShadow = true;

    const guardGeo = new THREE.BoxGeometry(0.3, 0.04, 0.06);
    const guard = new THREE.Mesh(guardGeo, this.secondaryMaterial);
    guard.position.y = 0.06;

    const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8);
    const handle = new THREE.Mesh(handleGeo, this.accentMaterial);
    handle.position.y = -0.04;

    const pommelGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const pommel = new THREE.Mesh(pommelGeo, this.secondaryMaterial);
    pommel.position.y = -0.14;

    this.weaponGroup.add(blade, guard, handle, pommel);
    this.rig.sockets.rightHand.add(this.weaponGroup);

    // 6. Heater Shield (Left Hand)
    if (toggles.showSecondary) {
      this.secondaryWeaponGroup = new THREE.Group();
      this.secondaryWeaponGroup.name = 'HeaterShield';
      this.secondaryWeaponGroup.position.set(0.12, 0, 0);
      this.secondaryWeaponGroup.rotation.y = Math.PI / 2;

      const shieldShape = new THREE.Shape();
      shieldShape.moveTo(-0.22, 0.3);
      shieldShape.lineTo(0.22, 0.3);
      shieldShape.lineTo(0.22, 0.0);
      shieldShape.bezierCurveTo(0.22, -0.2, 0.1, -0.35, 0.0, -0.45);
      shieldShape.bezierCurveTo(-0.1, -0.35, -0.22, -0.2, -0.22, 0.0);
      shieldShape.closePath();

      const extrudeSettings = { depth: 0.04, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
      const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
      shieldGeo.center();
      const shieldMesh = new THREE.Mesh(shieldGeo, this.primaryMaterial);
      shieldMesh.castShadow = true;

      // Shield Rim / Heraldic Emblem
      const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.03), this.secondaryMaterial);
      emblem.position.z = 0.03;
      shieldMesh.add(emblem);

      this.secondaryWeaponGroup.add(shieldMesh);
      this.rig.sockets.leftHand.add(this.secondaryWeaponGroup);
    }
  }

  // ==========================================
  // ARCHER GEAR
  // ==========================================
  private buildArcher(toggles: CharacterEquipmentToggles) {
    // 1. Ranger Cowl / Hood
    if (toggles.showHelmet) {
      this.helmetGroup = new THREE.Group();
      this.helmetGroup.name = 'RangerHood';
      this.helmetGroup.position.set(0, 0.26, 0);

      const hoodGeo = new THREE.ConeGeometry(0.26, 0.42, 10);
      hoodGeo.rotateX(0.15);
      const hoodMesh = new THREE.Mesh(hoodGeo, this.primaryMaterial);
      hoodMesh.position.set(0, 0.08, -0.04);
      hoodMesh.castShadow = true;
      this.helmetGroup.add(hoodMesh);

      // Mask / Collar wrap
      const collarGeo = new THREE.TorusGeometry(0.2, 0.07, 8, 12);
      collarGeo.rotateX(Math.PI / 2);
      const collarMesh = new THREE.Mesh(collarGeo, this.secondaryMaterial);
      collarMesh.position.set(0, -0.14, 0);
      this.helmetGroup.add(collarMesh);

      this.rig.sockets.head.add(this.helmetGroup);
    }

    // 2. Leather Tunic with Straps
    this.chestGroup = new THREE.Group();
    const tunicGeo = new THREE.CylinderGeometry(0.27, 0.23, 0.34, 12);
    tunicGeo.scale(1.15, 1, 0.88);
    const tunicMesh = new THREE.Mesh(tunicGeo, this.primaryMaterial);
    tunicMesh.position.y = 0.14;
    tunicMesh.castShadow = true;
    this.chestGroup.add(tunicMesh);

    // Cross-chest Bandolier Strap
    const strapGeo = new THREE.BoxGeometry(0.08, 0.45, 0.03);
    strapGeo.rotateZ(0.6);
    const strap = new THREE.Mesh(strapGeo, this.secondaryMaterial);
    strap.position.set(0, 0.16, 0.22);
    this.chestGroup.add(strap);
    this.rig.sockets.chest.add(this.chestGroup);

    // 3. Quiver on Back with Arrows
    if (toggles.showSecondary) {
      this.backGroup = new THREE.Group();
      this.backGroup.name = 'Quiver';
      this.backGroup.position.set(0.1, 0.12, 0.08);
      this.backGroup.rotation.z = -0.3;

      const quiverGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.6, 10);
      const quiverMesh = new THREE.Mesh(quiverGeo, this.secondaryMaterial);
      quiverMesh.castShadow = true;
      this.backGroup.add(quiverMesh);

      // Fletched Arrow Tails
      const arrowShaftGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.25, 6);
      const fletchingGeo = new THREE.BoxGeometry(0.04, 0.06, 0.01);
      const fletchMat = this.accentMaterial;

      for (let i = 0; i < 4; i++) {
        const arrow = new THREE.Group();
        const shaft = new THREE.Mesh(arrowShaftGeo, this.secondaryMaterial);
        const fletch = new THREE.Mesh(fletchingGeo, fletchMat);
        fletch.position.y = 0.1;
        arrow.add(shaft, fletch);
        arrow.position.set((Math.random() - 0.5) * 0.05, 0.3 + i * 0.03, (Math.random() - 0.5) * 0.05);
        arrow.rotation.z = (Math.random() - 0.5) * 0.2;
        this.backGroup.add(arrow);
      }

      this.rig.sockets.back.add(this.backGroup);
    }

    // 4. Recurve Bow (Left Hand)
    this.secondaryWeaponGroup = new THREE.Group();
    this.secondaryWeaponGroup.name = 'RecurveBow';
    this.secondaryWeaponGroup.position.set(0, 0, 0.06);

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, -0.65, 0),
      new THREE.Vector3(0.25, 0, 0),
      new THREE.Vector3(0, 0.65, 0)
    );
    const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.025, 8, false);
    const bowMesh = new THREE.Mesh(tubeGeo, this.secondaryMaterial);
    bowMesh.castShadow = true;

    // Bowstring
    const stringGeo = new THREE.CylinderGeometry(0.003, 0.003, 1.3, 4);
    const stringMesh = new THREE.Mesh(stringGeo, new THREE.MeshBasicMaterial({ color: 0xeeeeee }));
    stringMesh.position.set(0.02, 0, 0);

    this.secondaryWeaponGroup.add(bowMesh, stringMesh);
    this.rig.sockets.leftHand.add(this.secondaryWeaponGroup);

    // 5. Arrow in Right Hand (Draw stance ready)
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.name = 'Arrow';
    const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 6), this.secondaryMaterial);
    arrowShaft.rotation.x = Math.PI / 2;
    const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 6), this.metallicMaterial);
    arrowHead.rotation.x = Math.PI / 2;
    arrowHead.position.z = 0.42;
    const arrowFletch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.01), this.accentMaterial);
    arrowFletch.position.z = -0.38;
    this.weaponGroup.add(arrowShaft, arrowHead, arrowFletch);
    this.rig.sockets.rightHand.add(this.weaponGroup);
  }

  // ==========================================
  // MAGE GEAR
  // ==========================================
  private buildMage(toggles: CharacterEquipmentToggles) {
    // 1. Wizard Hat / High Mage Circlet
    if (toggles.showHelmet) {
      this.helmetGroup = new THREE.Group();
      this.helmetGroup.name = 'WizardHat';
      this.helmetGroup.position.set(0, 0.3, 0);

      // Hat Brim
      const brimGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.03, 20);
      const brimMesh = new THREE.Mesh(brimGeo, this.primaryMaterial);
      brimMesh.castShadow = true;
      this.helmetGroup.add(brimMesh);

      // Cone with crooked tip
      const coneGeo = new THREE.ConeGeometry(0.24, 0.55, 14);
      coneGeo.rotateZ(-0.15);
      const coneMesh = new THREE.Mesh(coneGeo, this.primaryMaterial);
      coneMesh.position.set(0.04, 0.28, 0);
      coneMesh.castShadow = true;

      // Gold Hat Band
      const bandGeo = new THREE.CylinderGeometry(0.245, 0.25, 0.06, 16);
      const bandMesh = new THREE.Mesh(bandGeo, this.secondaryMaterial);
      bandMesh.position.set(0, 0.04, 0);

      this.helmetGroup.add(coneMesh, bandMesh);
      this.rig.sockets.head.add(this.helmetGroup);
    }

    // 2. Mystic Robe Mantle
    this.chestGroup = new THREE.Group();
    const robeChestGeo = new THREE.CylinderGeometry(0.28, 0.24, 0.34, 12);
    robeChestGeo.scale(1.15, 1, 0.9);
    const robeChest = new THREE.Mesh(robeChestGeo, this.primaryMaterial);
    robeChest.position.y = 0.14;
    robeChest.castShadow = true;
    this.chestGroup.add(robeChest);

    // High Ornate Collar
    const collarGeo = new THREE.CylinderGeometry(0.22, 0.14, 0.22, 10, 1, true, 0, Math.PI);
    collarGeo.rotateY(Math.PI * 0.5);
    const collar = new THREE.Mesh(collarGeo, this.secondaryMaterial);
    collar.position.set(0, 0.3, -0.06);
    this.chestGroup.add(collar);
    this.rig.sockets.chest.add(this.chestGroup);

    // 3. Flowing Lower Robe (Covering legs naturally)
    this.robeGroup = new THREE.Group();
    this.robeGroup.name = 'FlowingRobe';
    const skirtGeo = new THREE.ConeGeometry(0.38, 0.98, 14, 1, true);
    skirtGeo.scale(1.1, 1, 0.95);
    const skirtMesh = new THREE.Mesh(skirtGeo, this.primaryMaterial);
    skirtMesh.position.set(0, -0.48, 0);
    skirtMesh.castShadow = true;

    // Gold Trim Hem
    const hemGeo = new THREE.TorusGeometry(0.37, 0.02, 6, 16);
    hemGeo.rotateX(Math.PI / 2);
    const hemMesh = new THREE.Mesh(hemGeo, this.secondaryMaterial);
    hemMesh.position.set(0, -0.96, 0);
    this.robeGroup.add(skirtMesh, hemMesh);
    this.rig.pelvisNode.add(this.robeGroup);

    // 4. Arcane Spellbook / Potion vials on hip
    if (toggles.showSecondary) {
      this.secondaryWeaponGroup = new THREE.Group();
      this.secondaryWeaponGroup.name = 'Grimoire';
      this.secondaryWeaponGroup.position.set(-0.28, 0.05, 0.08);
      this.secondaryWeaponGroup.rotation.y = 0.4;

      const bookGeo = new THREE.BoxGeometry(0.18, 0.24, 0.06);
      const bookMesh = new THREE.Mesh(bookGeo, this.secondaryMaterial);
      bookMesh.castShadow = true;

      const runeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.065), this.emissiveMaterial);
      bookMesh.add(runeGlow);

      this.secondaryWeaponGroup.add(bookMesh);
      this.rig.spineNode.add(this.secondaryWeaponGroup);
    }

    // 5. Archmage Staff with Pulsing Crystal & Point Light
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.name = 'ArchmageStaff';
    this.weaponGroup.rotation.x = Math.PI / 2;

    const staffShaftGeo = new THREE.CylinderGeometry(0.025, 0.035, 1.6, 10);
    const staffShaft = new THREE.Mesh(staffShaftGeo, this.secondaryMaterial);
    staffShaft.position.y = 0.45;
    staffShaft.castShadow = true;

    // Crystal Prongs / Head
    const prongsGeo = new THREE.TorusGeometry(0.12, 0.02, 6, 10, Math.PI * 1.5);
    prongsGeo.rotateX(Math.PI / 2);
    const prongs = new THREE.Mesh(prongsGeo, this.secondaryMaterial);
    prongs.position.y = 1.18;

    // Levitating Arcane Crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.1, 0);
    this.mageCrystalMesh = new THREE.Mesh(crystalGeo, this.emissiveMaterial);
    this.mageCrystalMesh.position.y = 1.25;

    // Crystal Point Light
    this.mageCrystalLight = new THREE.PointLight(this.emissiveMaterial.color, 2.5, 3.5);
    this.mageCrystalLight.position.set(0, 1.25, 0);

    // Magic motes / orbiting particles
    this.magicParticlesGroup = new THREE.Group();
    const particleGeo = new THREE.SphereGeometry(0.018, 6, 6);
    for (let i = 0; i < 4; i++) {
      const mote = new THREE.Mesh(particleGeo, this.emissiveMaterial);
      const angle = (i / 4) * Math.PI * 2;
      mote.position.set(Math.cos(angle) * 0.16, 1.25 + (i % 2 === 0 ? 0.04 : -0.04), Math.sin(angle) * 0.16);
      this.magicParticlesGroup.add(mote);
    }

    this.weaponGroup.add(staffShaft, prongs, this.mageCrystalMesh, this.mageCrystalLight, this.magicParticlesGroup);
    this.rig.sockets.rightHand.add(this.weaponGroup);
  }

  // VFX Update loop (spins crystal and particles)
  public updateVFX(time: number) {
    if (this.mageCrystalMesh) {
      this.mageCrystalMesh.rotation.y = time * 2;
      this.mageCrystalMesh.position.y = 1.25 + Math.sin(time * 3) * 0.03;
    }
    if (this.magicParticlesGroup) {
      this.magicParticlesGroup.rotation.y = -time * 1.5;
    }
    if (this.mageCrystalLight) {
      this.mageCrystalLight.intensity = 2.0 + Math.sin(time * 4) * 0.6;
    }
  }

  public updateColors(colors: CharacterColors) {
    this.primaryMaterial.color.set(colors.primaryArmor);
    this.secondaryMaterial.color.set(colors.secondaryArmor);
    this.accentMaterial.color.set(colors.accent);
    this.emissiveMaterial.color.set(colors.emissive);
    this.emissiveMaterial.emissive.set(colors.emissive);
    if (this.mageCrystalLight) {
      this.mageCrystalLight.color.set(colors.emissive);
    }
  }

  public updateMaterials(materials: CharacterMaterialsConfig) {
    this.primaryMaterial.metalness = materials.metalness;
    this.primaryMaterial.roughness = materials.roughness;
    this.secondaryMaterial.metalness = materials.metalness * 0.8;
    this.secondaryMaterial.roughness = Math.min(1.0, materials.roughness + 0.1);
  }
}
