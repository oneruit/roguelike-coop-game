import * as THREE from 'three';
import { BoneSocketMap, CharacterColors, CharacterMaterialsConfig } from './types';

/**
 * Procedural stylized humanoid rig and anatomy builder.
 * Uses hierarchical Three.js Object3D nodes representing bones and smooth anatomical geometry.
 */
export class CharacterRig {
  public root: THREE.Group;
  public sockets: BoneSocketMap;

  // Nodes for animation
  public pelvisNode: THREE.Group;
  public spineNode: THREE.Group;
  public chestNode: THREE.Group;
  public headNode: THREE.Group;
  public leftClavicle: THREE.Group;
  public rightClavicle: THREE.Group;
  public leftArm: THREE.Group;
  public rightArm: THREE.Group;
  public leftForearm: THREE.Group;
  public rightForearm: THREE.Group;
  public leftHand: THREE.Group;
  public rightHand: THREE.Group;
  public leftThigh: THREE.Group;
  public rightThigh: THREE.Group;
  public leftShin: THREE.Group;
  public rightShin: THREE.Group;
  public leftFoot: THREE.Group;
  public rightFoot: THREE.Group;

  // Tracked materials for dynamic tinting
  public skinMaterial: THREE.MeshStandardMaterial;
  public hairMaterial: THREE.MeshStandardMaterial;
  public eyesMaterial: THREE.MeshBasicMaterial;

  // Sockets for modular equipment
  public headSocket: THREE.Group;
  public backSocket: THREE.Group;
  public leftHandSocket: THREE.Group;
  public rightHandSocket: THREE.Group;
  public leftShoulderSocket: THREE.Group;
  public rightShoulderSocket: THREE.Group;

  // Debug helpers
  public debugGroup: THREE.Group;
  public isDebugVisible: boolean = false;

  constructor(colors: CharacterColors, _materials?: CharacterMaterialsConfig) {
    this.root = new THREE.Group();
    this.root.name = 'CharacterRigRoot';

    // Materials
    this.skinMaterial = new THREE.MeshStandardMaterial({
      color: colors.skin,
      roughness: 0.7,
      metalness: 0.05,
    });

    this.hairMaterial = new THREE.MeshStandardMaterial({
      color: colors.hair,
      roughness: 0.8,
      metalness: 0.1,
    });

    this.eyesMaterial = new THREE.MeshBasicMaterial({ color: 0x1f2937 });

    // Initialize Hierarchy Nodes
    this.pelvisNode = new THREE.Group();
    this.pelvisNode.name = 'Pelvis';
    this.pelvisNode.position.y = 1.05;
    this.root.add(this.pelvisNode);

    // Spine & Torso
    this.spineNode = new THREE.Group();
    this.spineNode.name = 'Spine';
    this.spineNode.position.y = 0.18;
    this.pelvisNode.add(this.spineNode);

    this.chestNode = new THREE.Group();
    this.chestNode.name = 'Chest';
    this.chestNode.position.y = 0.28;
    this.spineNode.add(this.chestNode);

    // Head
    this.headNode = new THREE.Group();
    this.headNode.name = 'Head';
    this.headNode.position.y = 0.32;
    this.chestNode.add(this.headNode);

    // Arms
    this.leftClavicle = new THREE.Group();
    this.leftClavicle.position.set(0.22, 0.22, 0);
    this.chestNode.add(this.leftClavicle);

    this.rightClavicle = new THREE.Group();
    this.rightClavicle.position.set(-0.22, 0.22, 0);
    this.chestNode.add(this.rightClavicle);

    this.leftArm = new THREE.Group();
    this.leftArm.name = 'LeftArm';
    this.leftArm.position.set(0.08, 0, 0);
    this.leftClavicle.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.name = 'RightArm';
    this.rightArm.position.set(-0.08, 0, 0);
    this.rightClavicle.add(this.rightArm);

    this.leftForearm = new THREE.Group();
    this.leftForearm.name = 'LeftForearm';
    this.leftForearm.position.set(0, -0.32, 0);
    this.leftArm.add(this.leftForearm);

    this.rightForearm = new THREE.Group();
    this.rightForearm.name = 'RightForearm';
    this.rightForearm.position.set(0, -0.32, 0);
    this.rightArm.add(this.rightForearm);

    this.leftHand = new THREE.Group();
    this.leftHand.name = 'LeftHand';
    this.leftHand.position.set(0, -0.28, 0);
    this.leftForearm.add(this.leftHand);

    this.rightHand = new THREE.Group();
    this.rightHand.name = 'RightHand';
    this.rightHand.position.set(0, -0.28, 0);
    this.rightForearm.add(this.rightHand);

    // Legs
    this.leftThigh = new THREE.Group();
    this.leftThigh.name = 'LeftThigh';
    this.leftThigh.position.set(0.16, -0.05, 0);
    this.pelvisNode.add(this.leftThigh);

    this.rightThigh = new THREE.Group();
    this.rightThigh.name = 'RightThigh';
    this.rightThigh.position.set(-0.16, -0.05, 0);
    this.pelvisNode.add(this.rightThigh);

    this.leftShin = new THREE.Group();
    this.leftShin.name = 'LeftShin';
    this.leftShin.position.set(0, -0.46, 0);
    this.leftThigh.add(this.leftShin);

    this.rightShin = new THREE.Group();
    this.rightShin.name = 'RightShin';
    this.rightShin.position.set(0, -0.46, 0);
    this.rightThigh.add(this.rightShin);

    this.leftFoot = new THREE.Group();
    this.leftFoot.name = 'LeftFoot';
    this.leftFoot.position.set(0, -0.48, 0);
    this.leftShin.add(this.leftFoot);

    this.rightFoot = new THREE.Group();
    this.rightFoot.name = 'RightFoot';
    this.rightFoot.position.set(0, -0.48, 0);
    this.rightShin.add(this.rightFoot);

    // Equipment Sockets
    this.headSocket = new THREE.Group();
    this.headSocket.name = 'Socket_Head';
    this.headNode.add(this.headSocket);

    this.backSocket = new THREE.Group();
    this.backSocket.name = 'Socket_Back';
    this.backSocket.position.set(0, 0.05, -0.16);
    this.backSocket.rotation.y = Math.PI;
    this.chestNode.add(this.backSocket);

    this.leftHandSocket = new THREE.Group();
    this.leftHandSocket.name = 'Socket_LeftHand';
    this.leftHandSocket.position.set(0, -0.08, 0.02);
    this.leftHand.add(this.leftHandSocket);

    this.rightHandSocket = new THREE.Group();
    this.rightHandSocket.name = 'Socket_RightHand';
    this.rightHandSocket.position.set(0, -0.08, 0.02);
    this.rightHand.add(this.rightHandSocket);

    this.leftShoulderSocket = new THREE.Group();
    this.leftShoulderSocket.name = 'Socket_LeftShoulder';
    this.leftShoulderSocket.position.set(0.04, 0.02, 0);
    this.leftArm.add(this.leftShoulderSocket);

    this.rightShoulderSocket = new THREE.Group();
    this.rightShoulderSocket.name = 'Socket_RightShoulder';
    this.rightShoulderSocket.position.set(-0.04, 0.02, 0);
    this.rightArm.add(this.rightShoulderSocket);

    this.sockets = {
      head: this.headSocket,
      chest: this.chestNode,
      spine: this.spineNode,
      leftHand: this.leftHandSocket,
      rightHand: this.rightHandSocket,
      back: this.backSocket,
      leftShoulder: this.leftShoulderSocket,
      rightShoulder: this.rightShoulderSocket,
    };

    // Build anatomical geometry
    this.buildAnatomy();

    // Debug skeleton visualizer
    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'SkeletonDebug';
    this.debugGroup.visible = false;
    this.buildDebugAxes();
    this.root.add(this.debugGroup);
  }

  private buildAnatomy() {
    // 1. Pelvis Mesh
    const pelvisGeo = new THREE.CylinderGeometry(0.2, 0.16, 0.18, 12);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, this.skinMaterial);
    pelvisMesh.castShadow = true;
    pelvisMesh.receiveShadow = true;
    this.pelvisNode.add(pelvisMesh);

    // 2. Spine & Chest Mesh
    const spineGeo = new THREE.CylinderGeometry(0.22, 0.19, 0.24, 12);
    const spineMesh = new THREE.Mesh(spineGeo, this.skinMaterial);
    spineMesh.position.y = 0.12;
    spineMesh.castShadow = true;
    this.spineNode.add(spineMesh);

    const chestGeo = new THREE.CylinderGeometry(0.26, 0.22, 0.28, 12);
    chestGeo.scale(1.15, 1, 0.85); // Wider chest, flatter depth
    const chestMesh = new THREE.Mesh(chestGeo, this.skinMaterial);
    chestMesh.position.y = 0.14;
    chestMesh.castShadow = true;
    this.chestNode.add(chestMesh);

    // 3. Neck & Head
    const neckGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.12, 10);
    const neckMesh = new THREE.Mesh(neckGeo, this.skinMaterial);
    neckMesh.position.y = 0.06;
    this.headNode.add(neckMesh);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.24;

    // Stylized Head (heroic rounded chin, stylized jaw)
    const headGeo = new THREE.SphereGeometry(0.22, 16, 14);
    headGeo.scale(0.9, 1.05, 0.95);
    const headMesh = new THREE.Mesh(headGeo, this.skinMaterial);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Stylized Eyes
    const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, this.eyesMaterial);
    leftEye.position.set(0.075, 0.02, 0.18);
    const rightEye = new THREE.Mesh(eyeGeo, this.eyesMaterial);
    rightEye.position.set(-0.075, 0.02, 0.18);
    headGroup.add(leftEye, rightEye);

    // Nose Bridge
    const noseGeo = new THREE.ConeGeometry(0.03, 0.07, 6);
    noseGeo.rotateX(Math.PI / 2.5);
    const noseMesh = new THREE.Mesh(noseGeo, this.skinMaterial);
    noseMesh.position.set(0, -0.01, 0.21);
    headGroup.add(noseMesh);

    // Base Hair
    const hairGeo = new THREE.SphereGeometry(0.235, 12, 10);
    hairGeo.scale(0.94, 0.9, 0.95);
    const hairMesh = new THREE.Mesh(hairGeo, this.hairMaterial);
    hairMesh.position.set(0, 0.05, -0.02);
    headGroup.add(hairMesh);

    this.headNode.add(headGroup);

    // 4. Arms Geometry
    const upperArmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.32, 10);
    const forearmGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.28, 10);
    const handGeo = new THREE.BoxGeometry(0.09, 0.12, 0.06);

    // Left Arm
    const lUpperArm = new THREE.Mesh(upperArmGeo, this.skinMaterial);
    lUpperArm.position.y = -0.16;
    lUpperArm.castShadow = true;
    this.leftArm.add(lUpperArm);

    const lForearm = new THREE.Mesh(forearmGeo, this.skinMaterial);
    lForearm.position.y = -0.14;
    lForearm.castShadow = true;
    this.leftForearm.add(lForearm);

    const lHand = new THREE.Mesh(handGeo, this.skinMaterial);
    lHand.position.y = -0.06;
    lHand.castShadow = true;
    this.leftHand.add(lHand);

    // Right Arm
    const rUpperArm = new THREE.Mesh(upperArmGeo, this.skinMaterial);
    rUpperArm.position.y = -0.16;
    rUpperArm.castShadow = true;
    this.rightArm.add(rUpperArm);

    const rForearm = new THREE.Mesh(forearmGeo, this.skinMaterial);
    rForearm.position.y = -0.14;
    rForearm.castShadow = true;
    this.rightForearm.add(rForearm);

    const rHand = new THREE.Mesh(handGeo, this.skinMaterial);
    rHand.position.y = -0.06;
    rHand.castShadow = true;
    this.rightHand.add(rHand);

    // 5. Legs Geometry
    const thighGeo = new THREE.CylinderGeometry(0.12, 0.095, 0.46, 10);
    const shinGeo = new THREE.CylinderGeometry(0.095, 0.075, 0.48, 10);
    const footGeo = new THREE.BoxGeometry(0.12, 0.1, 0.24);

    // Left Leg
    const lThigh = new THREE.Mesh(thighGeo, this.skinMaterial);
    lThigh.position.y = -0.23;
    lThigh.castShadow = true;
    this.leftThigh.add(lThigh);

    const lShin = new THREE.Mesh(shinGeo, this.skinMaterial);
    lShin.position.y = -0.24;
    lShin.castShadow = true;
    this.leftShin.add(lShin);

    const lFoot = new THREE.Mesh(footGeo, this.skinMaterial);
    lFoot.position.set(0, -0.05, 0.06);
    lFoot.castShadow = true;
    this.leftFoot.add(lFoot);

    // Right Leg
    const rThigh = new THREE.Mesh(thighGeo, this.skinMaterial);
    rThigh.position.y = -0.23;
    rThigh.castShadow = true;
    this.rightThigh.add(rThigh);

    const rShin = new THREE.Mesh(shinGeo, this.skinMaterial);
    rShin.position.y = -0.24;
    rShin.castShadow = true;
    this.rightShin.add(rShin);

    const rFoot = new THREE.Mesh(footGeo, this.skinMaterial);
    rFoot.position.set(0, -0.05, 0.06);
    rFoot.castShadow = true;
    this.rightFoot.add(rFoot);
  }

  private buildDebugAxes() {
    const jointGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const jointMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true });

    const joints = [
      this.pelvisNode,
      this.spineNode,
      this.chestNode,
      this.headNode,
      this.leftArm,
      this.rightArm,
      this.leftForearm,
      this.rightForearm,
      this.leftThigh,
      this.rightThigh,
      this.leftShin,
      this.rightShin,
    ];

    joints.forEach((joint) => {
      const marker = new THREE.Mesh(jointGeo, jointMat);
      joint.add(marker);
      const axes = new THREE.AxesHelper(0.15);
      joint.add(axes);
    });
  }

  public setDebugVisible(visible: boolean) {
    this.isDebugVisible = visible;
    this.debugGroup.visible = visible;
    this.root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            (m as any).wireframe = visible;
          });
        } else if (mesh.material) {
          (mesh.material as any).wireframe = visible;
        }
      }
    });
  }

  public updateColors(colors: CharacterColors) {
    this.skinMaterial.color.set(colors.skin);
    this.hairMaterial.color.set(colors.hair);
  }

  public resetPose() {
    this.pelvisNode.position.set(0, 1.05, 0);
    this.pelvisNode.rotation.set(0, 0, 0);
    this.spineNode.rotation.set(0, 0, 0);
    this.chestNode.rotation.set(0, 0, 0);
    this.headNode.rotation.set(0, 0, 0);

    this.leftArm.rotation.set(0, 0, 0.15);
    this.rightArm.rotation.set(0, 0, -0.15);
    this.leftForearm.rotation.set(0, 0, 0);
    this.rightForearm.rotation.set(0, 0, 0);

    this.leftThigh.rotation.set(0, 0, 0);
    this.rightThigh.rotation.set(0, 0, 0);
    this.leftShin.rotation.set(0, 0, 0);
    this.rightShin.rotation.set(0, 0, 0);
  }
}
