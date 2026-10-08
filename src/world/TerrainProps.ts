import {
  MeshStandardMaterial,
  MeshBasicMaterial,
  CanvasTexture,
  RepeatWrapping,
  DoubleSide,
  Group,
  CylinderGeometry,
  SphereGeometry,
  ConeGeometry,
  DodecahedronGeometry,
  PlaneGeometry,
  BoxGeometry,
  TorusGeometry,
  CircleGeometry,
  RingGeometry,
  Mesh
} from 'three';

// Reusable shared materials for high performance and low draw overhead
export class TerrainMaterials {
  public static sandMaterial: MeshStandardMaterial;
  public static cactusMaterial: MeshStandardMaterial;
  public static cactusRibMaterial: MeshStandardMaterial;
  public static cactusFlowerMaterial: MeshBasicMaterial;
  public static barkMaterial: MeshStandardMaterial;
  public static foliageMaterial: MeshStandardMaterial;
  public static rockMaterial: MeshStandardMaterial;
  public static scrubMaterial: MeshStandardMaterial;
  public static boneMaterial: MeshStandardMaterial;
  public static woodMaterial: MeshStandardMaterial;
  public static ironMaterial: MeshStandardMaterial;
  public static waterMaterial: MeshStandardMaterial;
  public static wetSandMaterial: MeshStandardMaterial;
  public static palmBarkMaterial: MeshStandardMaterial;
  public static palmLeafMaterial: MeshStandardMaterial;
  public static coconutMaterial: MeshStandardMaterial;

  private static initialized = false;

  public static init() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. High Quality Procedural Desert Sand Texture
    const sandCanvas = document.createElement('canvas');
    sandCanvas.width = 512;
    sandCanvas.height = 512;
    const ctx = sandCanvas.getContext('2d')!;

    // Rich warm desert sand gradient base
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#c78446');
    grad.addColorStop(0.35, '#b97538');
    grad.addColorStop(0.7, '#cc8b4c');
    grad.addColorStop(1, '#ab682d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Wind dune ripples (flowing undulating ridges)
    ctx.strokeStyle = 'rgba(235, 175, 115, 0.28)';
    ctx.lineWidth = 4;
    for (let y = 12; y < 512; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 16) {
        const wave = Math.sin((x / 512) * Math.PI * 4 + (y / 50)) * 6 +
                     Math.sin((x / 512) * Math.PI * 8) * 2;
        ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    // Shadow undertones under dune ripples
    ctx.strokeStyle = 'rgba(100, 50, 20, 0.22)';
    ctx.lineWidth = 3;
    for (let y = 16; y < 512; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 16) {
        const wave = Math.sin((x / 512) * Math.PI * 4 + (y / 50)) * 6 +
                     Math.sin((x / 512) * Math.PI * 8) * 2;
        ctx.lineTo(x, y + wave + 3);
      }
      ctx.stroke();
    }

    // Desert pebbles & fine mineral flecks
    for (let i = 0; i < 900; i++) {
      const px = Math.floor(Math.random() * 512);
      const py = Math.floor(Math.random() * 512);
      const size = Math.random() < 0.85 ? 1.5 : 2.8;
      const shade = Math.random();
      if (shade < 0.45) {
        ctx.fillStyle = 'rgba(255, 230, 180, 0.45)'; // Quartz/sunlit grains
      } else if (shade < 0.75) {
        ctx.fillStyle = 'rgba(85, 40, 18, 0.4)'; // Iron oxide pebble
      } else {
        ctx.fillStyle = 'rgba(180, 100, 50, 0.35)'; // Terracotta grit
      }
      ctx.fillRect(px, py, size, size);
    }

    const sandTexture = new CanvasTexture(sandCanvas);
    sandTexture.wrapS = RepeatWrapping;
    sandTexture.wrapT = RepeatWrapping;
    sandTexture.repeat.set(6, 6);

    this.sandMaterial = new MeshStandardMaterial({
      map: sandTexture,
      roughness: 0.92,
      metalness: 0.04
    });

    // 2. Cactus Material (Saguaro Green)
    this.cactusMaterial = new MeshStandardMaterial({
      color: 0x2d5e37,
      roughness: 0.75,
      metalness: 0.05
    });

    this.cactusRibMaterial = new MeshStandardMaterial({
      color: 0x22492a,
      roughness: 0.8
    });

    this.cactusFlowerMaterial = new MeshBasicMaterial({
      color: 0xf43f5e // Crimson desert bloom
    });

    // 3. Tree Bark Material (Weathered Desert Mesquite / Deadwood)
    this.barkMaterial = new MeshStandardMaterial({
      color: 0x3d2719,
      roughness: 0.9,
      metalness: 0.02
    });

    // 4. Dry Olive Foliage for Desert Acacia
    this.foliageMaterial = new MeshStandardMaterial({
      color: 0x5a6336,
      roughness: 0.85,
      metalness: 0.0
    });

    // 5. Sandstone Boulder Material
    this.rockMaterial = new MeshStandardMaterial({
      color: 0x8a5433,
      roughness: 0.88,
      metalness: 0.08
    });

    // 6. Desert Scrub / Dried Sagebrush
    this.scrubMaterial = new MeshStandardMaterial({
      color: 0x937848,
      roughness: 0.95,
      side: DoubleSide
    });

    // 7. Animal Bone / Skull Material
    this.boneMaterial = new MeshStandardMaterial({
      color: 0xd8d2c4,
      roughness: 0.65,
      metalness: 0.05
    });

    // 8. Weathered Wood Material (Wagon Wheel, Posts)
    this.woodMaterial = new MeshStandardMaterial({
      color: 0x543926,
      roughness: 0.85
    });

    // 9. Rusted Iron Material (Wheel Band)
    this.ironMaterial = new MeshStandardMaterial({
      color: 0x3a251e,
      roughness: 0.7,
      metalness: 0.35
    });

    // 10. Oasis Shimmering Water Material
    this.waterMaterial = new MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88
    });

    // 11. Wet Dark Sand (Oasis Shoreline)
    this.wetSandMaterial = new MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.85,
      metalness: 0.04
    });

    // 12. Palm Tree Materials
    this.palmBarkMaterial = new MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.82,
      metalness: 0.05
    });

    this.palmLeafMaterial = new MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.6,
      metalness: 0.05,
      side: DoubleSide
    });

    this.coconutMaterial = new MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.7,
      metalness: 0.05
    });
  }
}

export class TerrainProps {
  /**
   * Builds an authentic 3D Saguaro Cactus with fluting and 0-2 curved arms.
   */
  public static createCactus(rng: () => number): Group {
    TerrainMaterials.init();
    const group = new Group();

    const height = 3.6 + rng() * 2.2;
    const radius = 0.36 + rng() * 0.1;

    // Main Trunk (ribbed cylinder)
    const trunkGeom = new CylinderGeometry(radius * 0.92, radius, height, 8);
    const trunk = new Mesh(trunkGeom, TerrainMaterials.cactusMaterial);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Domed Cap
    const capGeom = new SphereGeometry(radius * 0.92, 8, 6);
    capGeom.scale(1, 0.7, 1);
    const cap = new Mesh(capGeom, TerrainMaterials.cactusMaterial);
    cap.position.y = height;
    cap.castShadow = true;
    group.add(cap);

    // Occasional desert flower bud on top
    if (rng() < 0.45) {
      const flowerGeom = new ConeGeometry(0.14, 0.25, 5);
      const flower = new Mesh(flowerGeom, TerrainMaterials.cactusFlowerMaterial);
      flower.position.y = height + 0.3;
      group.add(flower);
    }

    // Arms (0, 1, or 2 arms)
    const armConfig = rng();
    if (armConfig > 0.2) {
      // Left Arm
      const armHeight = height * (0.42 + rng() * 0.18);
      const armLength = 0.8 + rng() * 0.4;
      const armUp = 1.0 + rng() * 0.8;
      const armRad = radius * 0.78;

      const armGroup = new Group();
      armGroup.position.set(-radius * 0.7, armHeight, 0);

      // Horizontal branch
      const horizGeom = new CylinderGeometry(armRad, armRad, armLength, 6);
      horizGeom.rotateZ(Math.PI / 2);
      const horiz = new Mesh(horizGeom, TerrainMaterials.cactusMaterial);
      horiz.position.x = -armLength / 2;
      horiz.castShadow = true;
      armGroup.add(horiz);

      // Vertical branch pointing up
      const vertGeom = new CylinderGeometry(armRad * 0.9, armRad, armUp, 6);
      const vert = new Mesh(vertGeom, TerrainMaterials.cactusMaterial);
      vert.position.set(-armLength, armUp / 2, 0);
      vert.castShadow = true;
      armGroup.add(vert);

      // Arm cap
      const armCapGeom = new SphereGeometry(armRad * 0.9, 6, 5);
      const armCap = new Mesh(armCapGeom, TerrainMaterials.cactusMaterial);
      armCap.position.set(-armLength, armUp, 0);
      armCap.castShadow = true;
      armGroup.add(armCap);

      armGroup.rotation.y = rng() * Math.PI * 2;
      group.add(armGroup);
    }

    if (armConfig > 0.6) {
      // Right Arm (staggered height)
      const armHeight = height * (0.55 + rng() * 0.18);
      const armLength = 0.75 + rng() * 0.35;
      const armUp = 0.9 + rng() * 0.7;
      const armRad = radius * 0.75;

      const armGroup2 = new Group();
      armGroup2.position.set(radius * 0.7, armHeight, 0);

      const horizGeom2 = new CylinderGeometry(armRad, armRad, armLength, 6);
      horizGeom2.rotateZ(-Math.PI / 2);
      const horiz2 = new Mesh(horizGeom2, TerrainMaterials.cactusMaterial);
      horiz2.position.x = armLength / 2;
      horiz2.castShadow = true;
      armGroup2.add(horiz2);

      const vertGeom2 = new CylinderGeometry(armRad * 0.9, armRad, armUp, 6);
      const vert2 = new Mesh(vertGeom2, TerrainMaterials.cactusMaterial);
      vert2.position.set(armLength, armUp / 2, 0);
      vert2.castShadow = true;
      armGroup2.add(vert2);

      const armCapGeom2 = new SphereGeometry(armRad * 0.9, 6, 5);
      const armCap2 = new Mesh(armCapGeom2, TerrainMaterials.cactusMaterial);
      armCap2.position.set(armLength, armUp, 0);
      armCap2.castShadow = true;
      armGroup2.add(armCap2);

      armGroup2.rotation.y = rng() * Math.PI * 2;
      group.add(armGroup2);
    }

    // Natural random rotation
    group.rotation.y = rng() * Math.PI * 2;
    return group;
  }

  /**
   * Builds a twisted desert deadwood tree or dry desert acacia.
   */
  public static createTree(rng: () => number): Group {
    TerrainMaterials.init();
    const group = new Group();

    const isAcacia = rng() < 0.45;
    const trunkHeight1 = 2.0 + rng() * 0.8;
    const trunkHeight2 = 1.8 + rng() * 0.8;
    const trunkRad = 0.38 + rng() * 0.12;

    // Segment 1 (Leaning base trunk)
    const seg1Geom = new CylinderGeometry(trunkRad * 0.8, trunkRad, trunkHeight1, 6);
    const leanAngle = 0.12 + rng() * 0.18;
    const leanDir = rng() * Math.PI * 2;
    seg1Geom.rotateZ(leanAngle);
    seg1Geom.rotateY(leanDir);

    const seg1 = new Mesh(seg1Geom, TerrainMaterials.barkMaterial);
    seg1.position.y = trunkHeight1 / 2;
    seg1.castShadow = true;
    seg1.receiveShadow = true;
    group.add(seg1);

    // Mid joint point
    const midX = Math.sin(leanAngle) * (trunkHeight1 / 2) * -Math.cos(leanDir);
    const midZ = Math.sin(leanAngle) * (trunkHeight1 / 2) * Math.sin(leanDir);
    const midY = trunkHeight1 * Math.cos(leanAngle);

    // Segment 2 (Crooked upper trunk)
    const seg2Geom = new CylinderGeometry(trunkRad * 0.55, trunkRad * 0.8, trunkHeight2, 6);
    const leanAngle2 = 0.2 + rng() * 0.25;
    const leanDir2 = leanDir + Math.PI * 0.6 + (rng() - 0.5) * 0.5;
    seg2Geom.rotateZ(leanAngle2);
    seg2Geom.rotateY(leanDir2);

    const seg2 = new Mesh(seg2Geom, TerrainMaterials.barkMaterial);
    seg2.position.set(midX, midY + trunkHeight2 * 0.4, midZ);
    seg2.castShadow = true;
    group.add(seg2);

    // Branches spreading outwards
    const branchCount = 3 + Math.floor(rng() * 3);
    for (let b = 0; b < branchCount; b++) {
      const bLen = 1.8 + rng() * 1.4;
      const bRad = trunkRad * 0.38;
      const bGeom = new CylinderGeometry(bRad * 0.5, bRad, bLen, 5);

      const bAngle = (b / branchCount) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      const bElevation = 0.45 + rng() * 0.4; // Tilted upward

      bGeom.rotateX(Math.PI / 2 - bElevation);
      bGeom.rotateY(bAngle);

      const branch = new Mesh(bGeom, TerrainMaterials.barkMaterial);
      const attachY = midY + (rng() * 0.6 + 0.3) * trunkHeight2;
      branch.position.set(midX, attachY, midZ);
      branch.castShadow = true;
      group.add(branch);

      // Tip foliage clumps if Acacia variant
      if (isAcacia) {
        const foliageGeom = new DodecahedronGeometry(0.75 + rng() * 0.45, 0);
        foliageGeom.scale(1.4, 0.45, 1.2);
        const foliage = new Mesh(foliageGeom, TerrainMaterials.foliageMaterial);

        const tipDist = bLen * 0.9;
        const tipX = midX + Math.sin(bAngle) * Math.cos(bElevation) * tipDist;
        const tipY = attachY + Math.sin(bElevation) * tipDist;
        const tipZ = midZ + Math.cos(bAngle) * Math.cos(bElevation) * tipDist;

        foliage.position.set(tipX, tipY, tipZ);
        foliage.rotation.y = rng() * Math.PI;
        foliage.castShadow = true;
        group.add(foliage);
      }
    }

    group.rotation.y = rng() * Math.PI * 2;
    return group;
  }

  /**
   * Builds an earthy sandstone boulder formation.
   */
  public static createBoulder(rng: () => number): Group {
    TerrainMaterials.init();
    const group = new Group();

    const baseRadius = 0.7 + rng() * 0.8;
    const geom = new DodecahedronGeometry(baseRadius, 0);

    // Irregular non-uniform scale for natural flat rock look
    const sx = 1.0 + rng() * 0.7;
    const sy = 0.6 + rng() * 0.4;
    const sz = 1.0 + rng() * 0.6;
    geom.scale(sx, sy, sz);

    const boulder = new Mesh(geom, TerrainMaterials.rockMaterial);
    boulder.position.y = (baseRadius * sy) * 0.65; // Partially sunken into sand
    boulder.rotation.set(rng() * 0.3, rng() * Math.PI * 2, rng() * 0.3);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    group.add(boulder);

    // 40% chance of a smaller accent rock nearby
    if (rng() < 0.4) {
      const smallRad = baseRadius * (0.35 + rng() * 0.25);
      const smallGeom = new DodecahedronGeometry(smallRad, 0);
      smallGeom.scale(1.2, 0.7, 1.1);
      const smallRock = new Mesh(smallGeom, TerrainMaterials.rockMaterial);
      const ang = rng() * Math.PI * 2;
      const dist = (baseRadius * sx * 0.7) + smallRad;
      smallRock.position.set(Math.cos(ang) * dist, smallRad * 0.4, Math.sin(ang) * dist);
      smallRock.rotation.set(rng() * 0.5, rng() * Math.PI * 2, rng() * 0.4);
      smallRock.castShadow = true;
      group.add(smallRock);
    }

    return group;
  }

  /**
   * Builds dry desert grass / sagebrush tuft.
   */
  public static createScrub(rng: () => number): Group {
    TerrainMaterials.init();
    const group = new Group();

    const bladeCount = 4 + Math.floor(rng() * 3);
    const height = 0.6 + rng() * 0.5;
    const width = 0.5 + rng() * 0.4;

    for (let i = 0; i < bladeCount; i++) {
      const geom = new PlaneGeometry(width * 0.4, height);
      geom.translate(0, height / 2, 0);
      const mesh = new Mesh(geom, TerrainMaterials.scrubMaterial);
      mesh.rotation.y = (i / bladeCount) * Math.PI + (rng() - 0.5) * 0.3;
      mesh.rotation.x = (rng() - 0.5) * 0.3;
      mesh.rotation.z = (rng() - 0.5) * 0.3;
      mesh.castShadow = true;
      group.add(mesh);
    }

    return group;
  }

  /**
   * Builds a steer skull landmark (western desert cow skull with horns).
   */
  public static createSteerSkull(rng: () => number): Group {
    TerrainMaterials.init();
    const group = new Group();

    // Cranium
    const craniumGeom = new ConeGeometry(0.24, 0.6, 5);
    craniumGeom.scale(1.1, 1.0, 0.65);
    craniumGeom.rotateX(-Math.PI / 2.2);
    const cranium = new Mesh(craniumGeom, TerrainMaterials.boneMaterial);
    cranium.position.y = 0.16;
    cranium.castShadow = true;
    group.add(cranium);

    // Eye Sockets (dark recesses)
    const eyeMat = new MeshBasicMaterial({ color: 0x1a120c });
    const eyeGeom = new BoxGeometry(0.06, 0.06, 0.04);

    const eyeL = new Mesh(eyeGeom, eyeMat);
    eyeL.position.set(-0.1, 0.22, 0.08);
    group.add(eyeL);

    const eyeR = new Mesh(eyeGeom, eyeMat);
    eyeR.position.set(0.1, 0.22, 0.08);
    group.add(eyeR);

    // Left Horn (curving outward and up)
    const hornLGeom = new CylinderGeometry(0.02, 0.07, 0.55, 5);
    hornLGeom.rotateZ(Math.PI / 3);
    hornLGeom.rotateY(-0.3);
    const hornL = new Mesh(hornLGeom, TerrainMaterials.boneMaterial);
    hornL.position.set(-0.32, 0.3, 0.18);
    hornL.castShadow = true;
    group.add(hornL);

    // Right Horn
    const hornRGeom = new CylinderGeometry(0.02, 0.07, 0.55, 5);
    hornRGeom.rotateZ(-Math.PI / 3);
    hornRGeom.rotateY(0.3);
    const hornR = new Mesh(hornRGeom, TerrainMaterials.boneMaterial);
    hornR.position.set(0.32, 0.3, 0.18);
    hornR.castShadow = true;
    group.add(hornR);

    group.rotation.y = rng() * Math.PI * 2;
    return group;
  }

  /**
   * Builds an abandoned wooden wagon wheel half-buried in the sand.
   */
  public static createWagonWheel(rng: () => number): Group {
    TerrainMaterials.init();
    const group = new Group();

    const radius = 1.0;
    const tube = 0.08;

    // Rim
    const rimGeom = new TorusGeometry(radius, tube, 6, 16);
    const rim = new Mesh(rimGeom, TerrainMaterials.woodMaterial);
    rim.castShadow = true;
    group.add(rim);

    // Outer iron band
    const ironGeom = new TorusGeometry(radius + 0.015, tube * 0.35, 4, 16);
    const iron = new Mesh(ironGeom, TerrainMaterials.ironMaterial);
    group.add(iron);

    // Center Hub
    const hubGeom = new CylinderGeometry(0.2, 0.2, 0.25, 8);
    hubGeom.rotateX(Math.PI / 2);
    const hub = new Mesh(hubGeom, TerrainMaterials.woodMaterial);
    hub.castShadow = true;
    group.add(hub);

    // Spokes (6 crossing spokes)
    const spokeCount = 6;
    for (let s = 0; s < spokeCount; s++) {
      const angle = (s / spokeCount) * Math.PI;
      const spokeGeom = new CylinderGeometry(0.04, 0.04, radius * 2 - 0.1, 5);
      spokeGeom.rotateZ(angle);
      const spoke = new Mesh(spokeGeom, TerrainMaterials.woodMaterial);
      spoke.castShadow = true;
      group.add(spoke);
    }

    // Tilted and sunk into sand
    group.rotation.x = -Math.PI / 4 + (rng() - 0.5) * 0.3;
    group.rotation.y = rng() * Math.PI * 2;
    group.position.y = 0.45;

    return group;
  }

  /**
   * Builds a weathered wooden trail marker post.
   */
  public static createTrailPost(rng: () => number): Group {
    TerrainMaterials.init();
    const group = new Group();

    // Vertical post
    const postGeom = new CylinderGeometry(0.14, 0.16, 2.5, 5);
    const post = new Mesh(postGeom, TerrainMaterials.woodMaterial);
    post.position.y = 1.25;
    post.castShadow = true;
    group.add(post);

    // Cross directional board
    const boardGeom = new BoxGeometry(1.2, 0.25, 0.08);
    const board = new Mesh(boardGeom, TerrainMaterials.woodMaterial);
    board.position.set(0.15, 2.0, 0);
    board.rotation.z = (rng() - 0.5) * 0.2;
    board.castShadow = true;
    group.add(board);

    group.rotation.y = rng() * Math.PI * 2;
    return group;
  }

  /**
   * Builds an authentic desert palm tree with curved segmented trunk, radiating fronds and coconuts.
   */
  public static createPalmTree(rng: () => number): Group {
    TerrainMaterials.init();
    const group = new Group();

    // Curved trunk consisting of 4 slightly leaning segments
    const segHeight = 1.1;
    let currY = 0;
    let currX = 0;
    let currZ = 0;
    const leanAngle = (rng() - 0.5) * 0.25;
    const leanDir = rng() * Math.PI * 2;
    const dx = Math.cos(leanDir) * leanAngle;
    const dz = Math.sin(leanDir) * leanAngle;

    for (let s = 0; s < 4; s++) {
      const bottomR = 0.22 - s * 0.025;
      const topR = 0.20 - s * 0.025;
      const geom = new CylinderGeometry(topR, bottomR, segHeight, 6);
      const mesh = new Mesh(geom, TerrainMaterials.palmBarkMaterial);
      mesh.position.set(currX + dx * 0.5, currY + segHeight * 0.5, currZ + dz * 0.5);
      mesh.rotation.x = dz;
      mesh.rotation.z = -dx;
      mesh.castShadow = true;
      group.add(mesh);

      currY += segHeight;
      currX += dx;
      currZ += dz;
    }

    // Crown of spreading palm fronds (8 fronds radiating outwards and drooping)
    const frondCount = 8;
    for (let f = 0; f < frondCount; f++) {
      const angle = (f / frondCount) * Math.PI * 2 + (rng() - 0.5) * 0.2;
      const frondGeom = new PlaneGeometry(0.7, 2.4, 2, 4);
      frondGeom.translate(0, 1.2, 0);

      // Droop the tip downwards
      const posAttr = frondGeom.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        if (y > 1.2) {
          posAttr.setZ(i, -Math.pow((y - 1.2) / 1.2, 2) * 0.6);
        }
      }
      frondGeom.computeVertexNormals();

      const frondMesh = new Mesh(frondGeom, TerrainMaterials.palmLeafMaterial);
      frondMesh.position.set(currX, currY, currZ);
      frondMesh.rotation.y = angle;
      frondMesh.rotation.x = Math.PI / 3.2; // drooping tilt
      frondMesh.castShadow = true;
      group.add(frondMesh);
    }

    // Small cluster of coconuts
    const coconutCount = 3 + Math.floor(rng() * 2);
    for (let c = 0; c < coconutCount; c++) {
      const cAngle = (c / coconutCount) * Math.PI * 2;
      const coconutGeom = new SphereGeometry(0.14, 5, 5);
      const coconutMesh = new Mesh(coconutGeom, TerrainMaterials.coconutMaterial);
      coconutMesh.position.set(
        currX + Math.cos(cAngle) * 0.22,
        currY - 0.15,
        currZ + Math.sin(cAngle) * 0.22
      );
      coconutMesh.castShadow = true;
      group.add(coconutMesh);
    }

    return group;
  }

  /**
   * Builds an expansive desert oasis landmark with turquoise pool, wet sand shoreline,
   * perimeter palm trees, smooth river stones and reeds.
   * Player and enemies cannot enter the water (solid collision registered via ObstacleManager).
   */
  public static createOasis(rng: () => number): { group: Group; radius: number } {
    TerrainMaterials.init();
    const group = new Group();
    const radius = 5.0; // 5 meter radius water pool

    // 1. Shimmering turquoise water disc
    const waterGeom = new CircleGeometry(radius, 32);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMesh = new Mesh(waterGeom, TerrainMaterials.waterMaterial);
    waterMesh.position.y = 0.03;
    waterMesh.receiveShadow = true;
    group.add(waterMesh);

    // 2. Wet damp dark sand shoreline ring
    const shoreGeom = new RingGeometry(radius - 0.2, radius + 1.2, 32);
    shoreGeom.rotateX(-Math.PI / 2);
    const shoreMesh = new Mesh(shoreGeom, TerrainMaterials.wetSandMaterial);
    shoreMesh.position.y = 0.02;
    shoreMesh.receiveShadow = true;
    group.add(shoreMesh);

    // 3. Palm trees lining the shoreline (4-5 palms around the perimeter)
    const palmCount = 4 + (rng() < 0.5 ? 1 : 0);
    for (let p = 0; p < palmCount; p++) {
      const palmAngle = (p / palmCount) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const dist = radius + rng() * 0.6;
      const px = Math.cos(palmAngle) * dist;
      const pz = Math.sin(palmAngle) * dist;

      const palm = TerrainProps.createPalmTree(rng);
      palm.position.set(px, 0, pz);
      const scale = 0.9 + rng() * 0.35;
      palm.scale.set(scale, scale, scale);
      group.add(palm);
    }

    // 4. Smooth shoreline river stones & desert bushes
    for (let s = 0; s < 10; s++) {
      const stoneAngle = rng() * Math.PI * 2;
      const dist = radius + 0.2 + rng() * 0.9;
      const sx = Math.cos(stoneAngle) * dist;
      const sz = Math.sin(stoneAngle) * dist;

      const stoneGeom = new DodecahedronGeometry(0.35 + rng() * 0.3, 0);
      const stoneMesh = new Mesh(stoneGeom, TerrainMaterials.rockMaterial);
      stoneMesh.position.set(sx, 0.15, sz);
      stoneMesh.scale.set(1.4, 0.7, 1.1);
      stoneMesh.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      stoneMesh.castShadow = true;
      group.add(stoneMesh);
    }

    // 5. Desert reeds / green shrubs
    for (let r = 0; r < 8; r++) {
      const reedAngle = rng() * Math.PI * 2;
      const dist = radius + 0.1 + rng() * 0.7;
      const rx = Math.cos(reedAngle) * dist;
      const rz = Math.sin(reedAngle) * dist;

      const reed = TerrainProps.createScrub(rng);
      reed.position.set(rx, 0, rz);
      reed.scale.set(1.2, 1.5, 1.2);
      group.add(reed);
    }

    return { group, radius };
  }
}
