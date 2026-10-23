import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as fflate from 'fflate';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isolateTurnaroundFigure, geometryTo3MF, convertGlbTo3mf } = require('../scripts/tripo-converter.cjs');

test('Tripo Converter - isolateTurnaroundFigure extracts requested figure from multi-character geometry', () => {
  const geo = new THREE.BufferGeometry();
  // 3 triangles along Z:
  // Fig 1: z = -0.3
  // Fig 2: z = 0.0
  // Fig 3: z = +0.3
  const pos = new Float32Array([
    0, 0, -0.4,   0, 1, -0.4,   0, 0, -0.3, // Fig 1
    0, 0, -0.05,  0, 1, 0.0,    0, 0, 0.05, // Fig 2
    0, 0, 0.25,   0, 1, 0.35,   0, 0, 0.45, // Fig 3
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8]);

  // Extract Figure 3
  const fig3Geo = isolateTurnaroundFigure(geo.clone(), 3);
  assert.equal(fig3Geo.index!.count, 3, 'Retained 1 triangle for Fig 3');
  assert.equal(fig3Geo.attributes.position.count, 3);

  // Extract Figure 1
  const fig1Geo = isolateTurnaroundFigure(geo.clone(), 1);
  assert.equal(fig1Geo.index!.count, 3, 'Retained 1 triangle for Fig 1');

  // Keep all
  const allGeo = isolateTurnaroundFigure(geo.clone(), 'all');
  assert.equal(allGeo.index!.count, 9, 'Retained all triangles');
});

test('Tripo Converter - geometryTo3MF produces compliant OPC/ZIP 3MF package', () => {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex([0, 1, 2]);

  const zipData = geometryTo3MF(geo, { targetHeightMm: 100, title: 'TestModel', zUp: true });
  assert.ok(zipData instanceof Uint8Array, 'Returns Uint8Array binary buffer');
  assert.ok(zipData.length > 100, 'Buffer has non-trivial size');

  // Unzip and verify internal 3MF files
  const unzipped = fflate.unzipSync(zipData);
  assert.ok(unzipped['[Content_Types].xml'], 'Has [Content_Types].xml');
  assert.ok(unzipped['_rels/.rels'], 'Has _rels/.rels');
  assert.ok(unzipped['3D/3dmodel.model'], 'Has 3D/3dmodel.model');

  const modelXml = fflate.strFromU8(unzipped['3D/3dmodel.model']);
  assert.ok(modelXml.includes('unit="millimeter"'), 'Specifies millimeter unit');
  assert.ok(modelXml.includes('<vertex x="'), 'Contains vertex definitions');
  assert.ok(modelXml.includes('<triangle v1="0" v2="1" v3="2" />'), 'Contains triangle definition');
  assert.ok(modelXml.includes('<item objectid="1" />'), 'Contains build item');
});


test('Tripo Converter - convertGlbTo3mf converts real model file', async () => {
  const fs = require('fs');
  if (fs.existsSync('public/models/mage_tripo.glb')) {
    const glbBuf = fs.readFileSync('public/models/mage_tripo.glb');
    const res = await convertGlbTo3mf(glbBuf, { figure: 3, scale: 120, fileHint: 'mage.glb' });
    assert.ok(res.data instanceof Uint8Array, 'Returns Uint8Array binary buffer');
    assert.ok(res.verticesCount > 1000, 'Parsed vertices');
    assert.ok(res.trianglesCount > 1000, 'Parsed triangles');
  }
});
