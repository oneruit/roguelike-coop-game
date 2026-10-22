import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CharacterRig } from '../game/src/character-lab/CharacterRig';
import { CharacterModularSystem } from '../game/src/character-lab/CharacterModularSystem';
import { CharacterAnimator } from '../game/src/character-lab/CharacterAnimator';
import { MageTexturedSystem } from '../game/src/character-lab/MageTexturedSystem';
import { MageCutoutRig } from '../game/src/character-lab/MageCutoutRig';
import { MageReal3DSystem } from '../game/src/character-lab/MageReal3DSystem';
import { VampireCutoutRig } from '../game/src/character-lab/VampireCutoutRig';
import { DEFAULT_CLASS_CONFIGS } from '../game/src/character-lab/CharacterSandboxApp';

test('CharacterRig - creates anatomical hierarchy and sockets', () => {
  const warriorCfg = DEFAULT_CLASS_CONFIGS.warrior;
  const rig = new CharacterRig(warriorCfg.colors, warriorCfg.materials);

  assert.ok(rig.root, 'Rig root should exist');
  assert.ok(rig.sockets.head, 'Head socket should exist');
  assert.ok(rig.sockets.chest, 'Chest socket should exist');
  assert.ok(rig.sockets.leftHand, 'LeftHand socket should exist');
  assert.ok(rig.sockets.rightHand, 'RightHand socket should exist');
  assert.ok(rig.sockets.back, 'Back socket should exist');

  // Verify bone/joint nodes exist
  assert.equal(rig.pelvisNode.name, 'Pelvis');
  assert.equal(rig.chestNode.name, 'Chest');
  assert.equal(rig.headNode.name, 'Head');
});

test('CharacterModularSystem - applies Warrior equipment correctly', () => {
  const warriorCfg = DEFAULT_CLASS_CONFIGS.warrior;
  const rig = new CharacterRig(warriorCfg.colors, warriorCfg.materials);
  const modularSystem = new CharacterModularSystem(rig, warriorCfg.colors, warriorCfg.materials);

  modularSystem.applyClass('warrior', warriorCfg.equipment);

  assert.equal(modularSystem.currentClass, 'warrior');
  // Right hand should have sword
  const sword = rig.sockets.rightHand.getObjectByName('KnightSword');
  assert.ok(sword, 'Warrior should hold KnightSword in right hand');

  // Left hand should have shield
  const shield = rig.sockets.leftHand.getObjectByName('HeaterShield');
  assert.ok(shield, 'Warrior should hold HeaterShield in left hand');

  // Head should have helmet
  const helm = rig.sockets.head.getObjectByName('KnightHelmet');
  assert.ok(helm, 'Warrior should wear KnightHelmet');
});

test('CharacterModularSystem - applies Archer equipment correctly', () => {
  const archerCfg = DEFAULT_CLASS_CONFIGS.archer;
  const rig = new CharacterRig(archerCfg.colors, archerCfg.materials);
  const modularSystem = new CharacterModularSystem(rig, archerCfg.colors, archerCfg.materials);

  modularSystem.applyClass('archer', archerCfg.equipment);

  assert.equal(modularSystem.currentClass, 'archer');
  // Left hand has bow
  const bow = rig.sockets.leftHand.getObjectByName('RecurveBow');
  assert.ok(bow, 'Archer should hold RecurveBow in left hand');

  // Right hand has arrow
  const arrow = rig.sockets.rightHand.getObjectByName('Arrow');
  assert.ok(arrow, 'Archer should hold Arrow in right hand');

  // Back has quiver
  const quiver = rig.sockets.back.getObjectByName('Quiver');
  assert.ok(quiver, 'Archer should wear Quiver on back');
});

test('CharacterModularSystem - applies Mage equipment correctly and initializes crystal VFX', () => {
  const mageCfg = DEFAULT_CLASS_CONFIGS.mage;
  const rig = new CharacterRig(mageCfg.colors, mageCfg.materials);
  const modularSystem = new CharacterModularSystem(rig, mageCfg.colors, mageCfg.materials);

  modularSystem.applyClass('mage', mageCfg.equipment);

  assert.equal(modularSystem.currentClass, 'mage');
  // Staff in right hand
  const staff = rig.sockets.rightHand.getObjectByName('ArchmageStaff');
  assert.ok(staff, 'Mage should hold ArchmageStaff');

  // Hat on head
  const hat = rig.sockets.head.getObjectByName('WizardHat');
  assert.ok(hat, 'Mage should wear WizardHat');

  // Flowing robe on pelvis
  const robe = rig.pelvisNode.getObjectByName('FlowingRobe');
  assert.ok(robe, 'Mage should wear FlowingRobe');

  // Crystal light and particles exist
  assert.ok(modularSystem.mageCrystalLight, 'Mage staff should have point light');
  assert.ok(modularSystem.mageCrystalMesh, 'Mage staff should have crystal mesh');

  // VFX update should not throw
  modularSystem.updateVFX(1.0);
  assert.ok(modularSystem.mageCrystalMesh.rotation.y !== 0);
});

test('CharacterAnimator - switches states and triggers attacks', () => {
  const warriorCfg = DEFAULT_CLASS_CONFIGS.warrior;
  const rig = new CharacterRig(warriorCfg.colors, warriorCfg.materials);
  const animator = new CharacterAnimator(rig);

  assert.equal(animator.currentState, 'idle');

  // Step idle animation
  animator.update(0.016);
  assert.ok(rig.pelvisNode.position.y > 0);

  // Switch to walk
  animator.setState('walk');
  assert.equal(animator.currentState, 'walk');
  animator.update(0.016);

  // Switch to run
  animator.setState('run');
  assert.equal(animator.currentState, 'run');
  animator.update(0.016);

  // Trigger attack
  animator.triggerAttack();
  assert.equal(animator.isAttacking, true);
  assert.equal(animator.currentState, 'attack');

  // Advance time past attack duration
  for (let i = 0; i < 60; i++) {
    animator.update(0.02);
  }
  assert.equal(animator.isAttacking, false);
  assert.equal(animator.currentState, 'idle');
});

test('CharacterRig & ModularSystem - color and material updates propagate', () => {
  const warriorCfg = DEFAULT_CLASS_CONFIGS.warrior;
  const rig = new CharacterRig(warriorCfg.colors, warriorCfg.materials);
  const modularSystem = new CharacterModularSystem(rig, warriorCfg.colors, warriorCfg.materials);

  const newColors = {
    ...warriorCfg.colors,
    skin: '#ffeedd',
    primaryArmor: '#ff0000',
  };

  rig.updateColors(newColors);
  modularSystem.updateColors(newColors);

  assert.equal(rig.skinMaterial.color.getHexString(), 'ffeedd');
  assert.equal(modularSystem.primaryMaterial.color.getHexString(), 'ff0000');

  modularSystem.updateMaterials({ metalness: 0.99, roughness: 0.05 });
  assert.equal(modularSystem.primaryMaterial.metalness, 0.99);
  assert.equal(modularSystem.primaryMaterial.roughness, 0.05);
});

test('MageTexturedSystem - initializes staff, loads textures and switches angle modes', () => {
  const mageCfg = DEFAULT_CLASS_CONFIGS.mage;
  const rig = new CharacterRig(mageCfg.colors, mageCfg.materials);
  const mageTextured = new MageTexturedSystem(rig);

  assert.ok(mageTextured.root, 'MageTexturedSystem root exists');
  assert.ok(mageTextured.staffGroup, 'Staff group exists');
  assert.ok(mageTextured.crystalLight, 'Crystal light exists');
  assert.equal(mageTextured.angleMode, 'auto');

  // Toggle visibility
  mageTextured.setVisible(true);
  assert.equal(mageTextured.isVisible, true);
  assert.equal(mageTextured.root.visible, true);
  assert.ok(rig.sockets.rightHand.getObjectByName('Mage3DStaff'));

  // Switch angle modes
  mageTextured.setAngleMode('front');
  assert.equal(mageTextured.angleMode, 'front');
  mageTextured.setAngleMode('back');
  assert.equal(mageTextured.angleMode, 'back');
  mageTextured.setAngleMode('side');
  assert.equal(mageTextured.angleMode, 'side');
  mageTextured.setAngleMode('cross3d');
  assert.equal(mageTextured.angleMode, 'cross3d');

  // Run update loop with dummy camera
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.5, 4);
  mageTextured.update(camera, 1.5);

  mageTextured.setVisible(false);
  assert.equal(mageTextured.isVisible, false);
});

test('MageCutoutRig - mounts 9 anatomical cutout planes to skeleton joints and animates', () => {
  const mageCfg = DEFAULT_CLASS_CONFIGS.mage;
  const rig = new CharacterRig(mageCfg.colors, mageCfg.materials);
  const cutoutRig = new MageCutoutRig(rig);

  assert.ok(cutoutRig.root, 'Cutout rig root exists');
  assert.ok(cutoutRig.crystalLight, 'Crystal light exists');
  assert.ok(cutoutRig.particlesGroup, 'Particles group exists');

  // Verify meshes were constructed
  assert.ok(cutoutRig.hatMesh, 'Hat mesh exists');
  assert.ok(cutoutRig.headMesh, 'Head mesh exists');
  assert.ok(cutoutRig.torsoMesh, 'Torso mesh exists');
  assert.ok(cutoutRig.skirtMesh, 'Skirt mesh exists');
  assert.ok(cutoutRig.capeMesh, 'Cape mesh exists');
  assert.ok(cutoutRig.leftArmMesh, 'Left arm mesh exists');
  assert.ok(cutoutRig.staffArmMesh, 'Staff arm mesh exists');
  assert.ok(cutoutRig.leftLegMesh, 'Left leg mesh exists');
  assert.ok(cutoutRig.rightLegMesh, 'Right leg mesh exists');

  // Mount to joints
  cutoutRig.setVisible(true);
  assert.equal(cutoutRig.isVisible, true);

  // Check parent nodes
  assert.equal(cutoutRig.hatMesh.parent, rig.headNode);
  assert.equal(cutoutRig.headMesh.parent, rig.headNode);
  assert.equal(cutoutRig.torsoMesh.parent, rig.chestNode);
  assert.equal(cutoutRig.skirtMesh.parent, rig.pelvisNode);
  assert.equal(cutoutRig.capeMesh.parent, rig.sockets.back);
  assert.equal(cutoutRig.leftArmMesh.parent, rig.leftArm);
  assert.equal(cutoutRig.staffArmMesh.parent, rig.rightArm);
  assert.equal(cutoutRig.leftLegMesh.parent, rig.leftThigh);
  assert.equal(cutoutRig.rightLegMesh.parent, rig.rightThigh);

  // Run update for secondary motion
  cutoutRig.update(1.25);
  assert.ok(cutoutRig.crystalLight.intensity > 0);

  // Unmount
  cutoutRig.setVisible(false);
  assert.equal(cutoutRig.isVisible, false);
  assert.equal(cutoutRig.hatMesh.parent, null);
  assert.equal(cutoutRig.staffArmMesh.parent, null);
});

test('MageReal3DSystem - loads authentic 3D model with PBR, turnaround figure isolation and kinematic motion', () => {
  const mageCfg = DEFAULT_CLASS_CONFIGS.mage;
  const rig = new CharacterRig(mageCfg.colors, mageCfg.materials);
  const real3D = new MageReal3DSystem(rig);

  assert.ok(real3D.root, 'Real 3D root exists');
  assert.ok(real3D.crystalLight, 'Crystal light exists');
  assert.ok(real3D.particlesGroup, 'Particles group exists');
  assert.equal(real3D.currentAnimState, 'idle');
  assert.equal(real3D.currentFigureIndex, 3, 'Default figure is 3 (front)');

  // Test rotation and figure switching methods
  real3D.rotate90();
  assert.ok(Math.abs(real3D.facingRotation - Math.PI) < 0.01);
  real3D.toggleRotate180();
  assert.ok(Math.abs(real3D.facingRotation - 0) < 0.01);

  real3D.setFigureIndex(1);
  assert.equal(real3D.currentFigureIndex, 1);
  real3D.setFigureIndex(3);
  assert.equal(real3D.currentFigureIndex, 3);

  // Test isolateFigure algorithm on synthetic multi-figure geometry
  const testGeo = new THREE.BufferGeometry();
  // 3 triangles: fig1 (z = -0.3), fig2 (z = 0), fig3 (z = 0.3)
  const pos = new Float32Array([
    0, 0, -0.4,   0, 1, -0.4,   0, 0, -0.3, // Fig 1
    0, 0, -0.05,  0, 1, 0.0,    0, 0, 0.05, // Fig 2
    0, 0, 0.25,   0, 1, 0.35,   0, 0, 0.45, // Fig 3
  ]);
  testGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  testGeo.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const testMesh = new THREE.Mesh(testGeo, new THREE.MeshBasicMaterial());

  real3D.isolateFigure(testMesh, 3);
  assert.equal(testMesh.geometry.index!.count, 3, 'Retained exactly 1 triangle for Fig 3');
  const posFig3 = testMesh.geometry.attributes.position;
  assert.equal(posFig3.count, 3);

  // Toggle visibility
  real3D.setVisible(true);
  assert.equal(real3D.isVisible, true);
  assert.equal(real3D.root.visible, true);
  assert.equal(real3D.root.parent, rig.root);

  // Switch animation states
  real3D.setAnimationState('walk');
  assert.equal(real3D.currentAnimState, 'walk');
  real3D.update(0.016);

  real3D.setAnimationState('run');
  assert.equal(real3D.currentAnimState, 'run');
  real3D.update(0.016);

  real3D.setAnimationState('attack');
  assert.equal(real3D.currentAnimState, 'attack');
  real3D.update(0.016);

  real3D.setVisible(false);
  assert.equal(real3D.isVisible, false);
  assert.equal(real3D.root.parent, null);
});

test('VampireCutoutRig - mounts 8 paper-doll parts, supports toggles, palettes, and animations', () => {
  const vampireCfg = DEFAULT_CLASS_CONFIGS.vampire;
  assert.ok(vampireCfg, 'DEFAULT_CLASS_CONFIGS should include vampire');
  const rig = new CharacterRig(vampireCfg.colors, vampireCfg.materials);
  const vampire = new VampireCutoutRig(rig);

  assert.ok(vampire.isLoaded, 'Headless mode should initialize meshes synchronously');
  assert.ok(vampire.headMesh, 'Head mesh should exist');
  assert.ok(vampire.torsoMesh, 'Torso mesh should exist');
  assert.ok(vampire.skirtMesh, 'Skirt mesh should exist');
  assert.ok(vampire.legsMesh, 'Legs mesh should exist');
  assert.ok(vampire.leftArmMesh, 'Left arm mesh should exist');
  assert.ok(vampire.rightArmMesh, 'Right arm mesh should exist');
  assert.ok(vampire.leftWingMesh, 'Left wing mesh should exist');
  assert.ok(vampire.rightWingMesh, 'Right wing mesh should exist');
  assert.ok(vampire.bloodLight, 'Aura light should exist');
  assert.ok(vampire.motesGroup, 'Blood motes should exist');

  // Test setVisible
  vampire.setVisible(true);
  assert.equal(vampire.isVisible, true);
  assert.equal(vampire.headMesh.parent, rig.headNode);
  assert.equal(vampire.torsoMesh.parent, rig.chestNode);
  assert.equal(vampire.skirtMesh.parent, rig.pelvisNode);
  assert.equal(vampire.legsMesh.parent, rig.pelvisNode);
  assert.equal(vampire.leftArmMesh.parent, rig.leftArm);
  assert.equal(vampire.rightArmMesh.parent, rig.rightArm);
  assert.equal(vampire.leftWingPivot.parent, rig.chestNode);
  assert.equal(vampire.rightWingPivot.parent, rig.chestNode);

  // Test Part Toggles
  vampire.setToggle('wings', false);
  assert.equal(vampire.toggles.wings, false);
  assert.equal(vampire.leftWingPivot.parent, null);
  vampire.setToggle('wings', true);
  assert.equal(vampire.leftWingPivot.parent, rig.chestNode);

  vampire.setToggle('skirt', false);
  assert.equal(vampire.skirtMesh.parent, null);
  vampire.setToggle('skirt', true);
  assert.equal(vampire.skirtMesh.parent, rig.pelvisNode);

  // Test Palettes
  vampire.setPalette('violet');
  assert.equal(vampire.currentPalette, 'violet');
  assert.equal(vampire.bloodLight.color.getHex(), 0xa855f7);

  vampire.setPalette('emerald');
  assert.equal(vampire.currentPalette, 'emerald');
  assert.equal(vampire.bloodLight.color.getHex(), 0x10b981);

  vampire.setPalette('crimson');
  assert.equal(vampire.currentPalette, 'crimson');
  assert.equal(vampire.bloodLight.color.getHex(), 0xef4444);

  // Test procedural update loop
  vampire.update(0.5, 'idle', 1.0);
  const idleWingAngle = vampire.leftWingPivot.rotation.y;
  assert.ok(!Number.isNaN(idleWingAngle), 'Wing angle should be a valid number');

  vampire.update(1.0, 'walk', 1.5);
  const walkWingAngle = vampire.leftWingPivot.rotation.y;
  assert.ok(!Number.isNaN(walkWingAngle), 'Walk wing angle should be a valid number');

  // Test Animator integration
  const animator = new CharacterAnimator(rig);
  animator.setClass('vampire');
  animator.setState('idle');
  animator.update(0.016);
  animator.triggerAttack();
  assert.equal(animator.currentState, 'attack');
  animator.update(0.2);
  animator.update(0.7);

  // Unmount
  vampire.setVisible(false);
  assert.equal(vampire.isVisible, false);
  assert.equal(vampire.headMesh.parent, null);
});

