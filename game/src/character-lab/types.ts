import type * as THREE from 'three';

export type CharacterClass = 'warrior' | 'archer' | 'mage' | 'vampire' | 'anime_warrior';

export type CharacterAnimationState = 'idle' | 'walk' | 'run' | 'attack' | 'special';

export type LightingPreset = 'studio' | 'dungeon' | 'sunset';

export interface CharacterColors {
  skin: string;
  hair: string;
  primaryArmor: string;
  secondaryArmor: string;
  accent: string;
  emissive: string;
}

export interface CharacterMaterialsConfig {
  metalness: number;
  roughness: number;
}

export interface CharacterEquipmentToggles {
  showHelmet: boolean;
  showShoulders: boolean;
  showCape: boolean;
  showSecondary: boolean; // shield for warrior, quiver for archer, spellbook for mage
}

export interface CharacterConfig {
  classType: CharacterClass;
  colors: CharacterColors;
  materials: CharacterMaterialsConfig;
  equipment: CharacterEquipmentToggles;
}

export interface BoneSocketMap {
  head: THREE.Object3D;
  chest: THREE.Object3D;
  spine: THREE.Object3D;
  leftHand: THREE.Object3D;
  rightHand: THREE.Object3D;
  back: THREE.Object3D;
  leftShoulder: THREE.Object3D;
  rightShoulder: THREE.Object3D;
}
