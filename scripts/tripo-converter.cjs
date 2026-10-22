const fs = require('fs');
const path = require('path');
const fflate = require('fflate');

function createMockElement() {
  return {
    addEventListener: (event, handler) => {
      if (event === 'load') setTimeout(() => handler({ type: 'load' }), 0);
    },
    removeEventListener: () => {},
    setAttribute: () => {},
    style: {}
  };
}

// In Node environment, setup global polyfills for Three.js loaders
if (typeof global !== 'undefined') {
  if (!global.self) global.self = global;
  if (!global.document) {
    global.document = {
      createElementNS: () => createMockElement(),
      createElement: () => createMockElement(),
    };
  }
}

const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
const { FBXLoader } = require('three/examples/jsm/loaders/FBXLoader.js');
const { MeshoptDecoder } = require('three/examples/jsm/libs/meshopt_decoder.module.js');

/**
 * Isolates a specific figure from a turnaround 3D model:
 * - 1: Left figure (Z < -0.15)
 * - 2: Center figure (-0.15 <= Z <= 0.15)
 * - 3: Right figure (Z > 0.15)
 * - 'all': Keeps entire mesh
 */
function isolateTurnaroundFigure(geometry, figureChoice = 3) {
  if (figureChoice === 'all') return geometry;

  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  const index = geometry.index;

  geometry.computeBoundingBox();
  const origBox = geometry.boundingBox;
  if (!origBox) return geometry;

  const zSpan = origBox.max.z - origBox.min.z;
  // If not a turnaround sheet (small Z span), return as is
  if (zSpan <= 0.6 || origBox.min.z >= -0.3) {
    return geometry;
  }

  const newPositions = [];
  const newNormals = [];
  const newUVs = [];
  const newIndices = [];
  const vertexMap = new Map();

  const getOrAddVertex = (oldIdx) => {
    if (vertexMap.has(oldIdx)) return vertexMap.get(oldIdx);
    const newIdx = newPositions.length / 3;
    newPositions.push(pos.getX(oldIdx), pos.getY(oldIdx), pos.getZ(oldIdx));
    if (norm) newNormals.push(norm.getX(oldIdx), norm.getY(oldIdx), norm.getZ(oldIdx));
    if (uv) newUVs.push(uv.getX(oldIdx), uv.getY(oldIdx));
    vertexMap.set(oldIdx, newIdx);
    return newIdx;
  };

  const isTriangleInFigure = (zA, zB, zC) => {
    if (figureChoice === 1 || figureChoice === '1') {
      return zA < -0.15 && zB < -0.15 && zC < -0.15;
    } else if (figureChoice === 3 || figureChoice === '3') {
      return zA > 0.15 && zB > 0.15 && zC > 0.15;
    } else {
      return zA >= -0.15 && zA <= 0.15 && zB >= -0.15 && zB <= 0.15 && zC >= -0.15 && zC <= 0.15;
    }
  };

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const iA = index.getX(i);
      const iB = index.getX(i + 1);
      const iC = index.getX(i + 2);
      const zA = pos.getZ(iA);
      const zB = pos.getZ(iB);
      const zC = pos.getZ(iC);

      if (isTriangleInFigure(zA, zB, zC)) {
        newIndices.push(getOrAddVertex(iA), getOrAddVertex(iB), getOrAddVertex(iC));
      }
    }
  }

  if (newIndices.length === 0) return geometry;

  const newGeo = new THREE.BufferGeometry();
  newGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  if (newNormals.length) newGeo.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
  if (newUVs.length) newGeo.setAttribute('uv', new THREE.Float32BufferAttribute(newUVs, 2));
  newGeo.setIndex(newIndices);

  // Center figure and align feet to Y=0
  newGeo.computeBoundingBox();
  const b = newGeo.boundingBox;
  const center = new THREE.Vector3();
  b.getCenter(center);
  newGeo.translate(-center.x, -b.min.y, -center.z);

  return newGeo;
}

/**
 * Converts a Three.js BufferGeometry to a 3MF zip container Uint8Array.
 * @param {THREE.BufferGeometry} geometry
 * @param {object} options
 * @param {number} [options.targetHeightMm=120] Target height in millimeters for 3D printing
 * @param {string} [options.title='TripoModel']
 * @param {boolean} [options.zUp=true] In 3D printing, Z is the vertical build axis
 * @returns {Uint8Array} Binary 3MF file buffer
 */
function geometryTo3MF(geometry, options = {}) {
  const targetHeightMm = options.targetHeightMm || 120;
  const title = options.title || 'Tripo3D Model';
  const zUp = options.zUp !== false;

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox || new THREE.Box3();
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Determine scaling factor to match target height in mm
  const modelHeight = size.y || 1;
  const scale = targetHeightMm / modelHeight;

  const pos = geometry.attributes.position;
  const index = geometry.index;

  // Build vertex XML
  const vertices = [];
  for (let i = 0; i < pos.count; i++) {
    const rawX = pos.getX(i) * scale;
    const rawY = pos.getY(i) * scale;
    const rawZ = pos.getZ(i) * scale;

    let x, y, z;
    if (zUp) {
      // 3D printing coordinate system: X is right, Y is depth on bed, Z is vertical height
      x = rawX.toFixed(3);
      y = rawZ.toFixed(3);
      z = rawY.toFixed(3);
    } else {
      x = rawX.toFixed(3);
      y = rawY.toFixed(3);
      z = rawZ.toFixed(3);
    }
    vertices.push(`          <vertex x="${x}" y="${y}" z="${z}" />`);
  }

  // Build triangles XML
  const triangles = [];
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const v1 = index.getX(i);
      const v2 = index.getX(i + 1);
      const v3 = index.getX(i + 2);
      triangles.push(`          <triangle v1="${v1}" v2="${v2}" v3="${v3}" />`);
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      triangles.push(`          <triangle v1="${i}" v2="${i + 1}" v3="${i + 2}" />`);
    }
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${title}</metadata>
  <metadata name="Designer">Tripo3D Downloader &amp; Converter</metadata>
  <metadata name="Application">MyLovelyGame 3D Toolchain</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${vertices.join('\n')}
        </vertices>
        <triangles>
${triangles.join('\n')}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

  const zip = fflate.zipSync({
    '[Content_Types].xml': fflate.strToU8(contentTypesXml),
    '_rels/.rels': fflate.strToU8(relsXml),
    '3D/3dmodel.model': fflate.strToU8(modelXml),
  });

  return zip;
}

/**
 * Universal parser that loads either GLB or FBX buffers into a Three.js Object3D hierarchy.
 */
function parseModelBuffer(buffer, fileHint = '') {
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  // Check magic header or file extension
  const headerStr = buffer.subarray(0, 24).toString('utf8');
  const isFbx = fileHint.toLowerCase().endsWith('.fbx') || headerStr.includes('Kaydara FBX');

  if (isFbx) {
    const loader = new FBXLoader();
    const group = loader.parse(ab, '');
    return Promise.resolve(group);
  } else {
    // GLB / GLTF
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    return new Promise((resolve, reject) => {
      loader.parse(
        ab,
        '',
        (gltf) => resolve(gltf.scene),
        (err) => reject(err)
      );
    });
  }
}

/**
 * Loads a model buffer (GLB or FBX) and converts it to a 3MF buffer.
 */
async function convertGlbTo3mf(modelBuffer, options = {}) {
  const scene = await parseModelBuffer(modelBuffer, options.fileHint || '');

  let mainMesh = null;
  scene.traverse((child) => {
    if (child.isMesh && !mainMesh) {
      mainMesh = child;
    }
  });

  if (!mainMesh) {
    throw new Error('No 3D mesh found in model');
  }

  const figure = options.figure ?? 3;
  const isolatedGeo = isolateTurnaroundFigure(mainMesh.geometry, figure);
  const zip3mf = geometryTo3MF(isolatedGeo, {
    targetHeightMm: options.scale || 120,
    title: options.title || 'TripoModel',
    zUp: options.zUp !== false,
  });

  return {
    data: zip3mf,
    verticesCount: isolatedGeo.attributes.position.count,
    trianglesCount: isolatedGeo.index ? isolatedGeo.index.count / 3 : isolatedGeo.attributes.position.count / 3,
  };
}

module.exports = {
  isolateTurnaroundFigure,
  geometryTo3MF,
  parseModelBuffer,
  convertGlbTo3mf,
};
