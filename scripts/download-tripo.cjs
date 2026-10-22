const https = require('https');
const fs = require('fs');
const path = require('path');
const { convertGlbTo3mf } = require('./tripo-converter.cjs');

/**
 * Universal Tripo3D Model Downloader & 3MF Converter.
 *
 * Usage:
 *   node scripts/download-tripo.cjs <model-id-or-url> [format: glb | 3mf | both] [outputPath] [--figure=3|1|2|all] [--scale=120]
 *
 * Examples:
 *   node scripts/download-tripo.cjs 256a044c-15eb-408d-806a-841b0b764c07
 *   node scripts/download-tripo.cjs 256a044c-15eb-408d-806a-841b0b764c07 3mf
 *   node scripts/download-tripo.cjs 256a044c-15eb-408d-806a-841b0b764c07 both public/models/witch --figure=3 --scale=120
 */

async function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function fetchModelUrlFromAPI(modelId) {
  const apiUrl = `https://api.tripo3d.ai/v2/studio/project/detail/v3/${modelId}?locale=en`;
  try {
    const buf = await fetchBuffer(apiUrl);
    const json = JSON.parse(buf.toString('utf8'));
    if (json.data && json.data.model_url) {
      return {
        modelUrl: json.data.model_url,
        projectName: json.data.project_name || 'TripoModel',
        meta: json.data
      };
    }
  } catch (err) {
    console.warn('[Tripo] API fetch failed, falling back to page scraper:', err.message);
  }
  return null;
}

async function scrapeModelUrlFromPage(modelId) {
  const pageUrl = `https://studio.tripo3d.ai/3d-model/${modelId}?invite_code=KI9BWY`;
  const buf = await fetchBuffer(pageUrl);
  const cleanBody = buf.toString('utf8').replace(/\\u002F/g, '/');

  const regex = /https:\/\/tripo-data[^\s"'<>]+\.glb[^\s"'<>]*/g;
  const matches = Array.from(new Set(cleanBody.match(regex) || []));

  if (matches.length === 0) {
    throw new Error('No GLB models found on Tripo page.');
  }

  const chosenUrl = matches.find(u => u.includes(modelId) && u.includes('pbr_model')) ||
                    matches.find(u => u.includes(modelId) && !u.includes('point_cloud')) ||
                    matches.find(u => u.includes('pbr_model')) ||
                    matches[0];

  return { modelUrl: chosenUrl, projectName: 'TripoModel' };
}

async function main() {
  const args = process.argv.slice(2);
  let input = '256a044c-15eb-408d-806a-841b0b764c07';
  let format = 'glb';
  let outPath = null;
  let figure = 3;
  let scaleMm = 120;

  for (const arg of args) {
    if (arg.startsWith('--figure=')) {
      const val = arg.split('=')[1];
      figure = val === 'all' ? 'all' : parseInt(val, 10);
    } else if (arg.startsWith('--scale=')) {
      scaleMm = parseFloat(arg.split('=')[1]) || 120;
    } else if (arg.startsWith('--format=')) {
      format = arg.split('=')[1].toLowerCase();
    } else if (['glb', '3mf', 'both'].includes(arg.toLowerCase())) {
      format = arg.toLowerCase();
    } else if (/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(arg) || arg.includes('tripo3d.ai')) {
      input = arg;
    } else if (!outPath) {
      outPath = arg;
    }
  }

  const idMatch = input.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  if (!idMatch) {
    console.error('Error: Could not find valid model UUID in input:', input);
    process.exit(1);
  }
  const modelId = idMatch[0];

  console.log(`\n======================================================`);
  console.log(` Tripo3D Downloader & 3MF Converter`);
  console.log(` Model ID: ${modelId}`);
  console.log(` Target Format: ${format.toUpperCase()}`);
  console.log(` Figure Extraction: ${figure === 'all' ? 'Entire Model' : `Figure ${figure}`}`);
  if (format === '3mf' || format === 'both') {
    console.log(` 3D Print Scale: ${scaleMm} mm`);
  }
  console.log(`======================================================\n`);

  console.log('Resolving model URL...');
  let modelInfo = await fetchModelUrlFromAPI(modelId);
  if (!modelInfo) {
    modelInfo = await scrapeModelUrlFromPage(modelId);
  }

  console.log(`Found model: "${modelInfo.projectName}"`);
  console.log('Downloading GLB asset from cloud storage...');
  const glbBuffer = await fetchBuffer(modelInfo.modelUrl);
  console.log(`Downloaded GLB asset: ${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  // Default output paths
  const defaultBase = path.resolve('public/models/mage_tripo');
  const baseOut = outPath ? path.resolve(outPath).replace(/\.(glb|3mf)$/i, '') : defaultBase;
  const outDir = path.dirname(baseOut);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Export GLB
  if (format === 'glb' || format === 'both') {
    const glbOut = `${baseOut}.glb`;
    fs.writeFileSync(glbOut, glbBuffer);
    const stat = fs.statSync(glbOut);
    console.log(`\n✔ GLB saved: ${glbOut} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  }

  // 2. Export 3MF
  if (format === '3mf' || format === 'both') {
    console.log(`\nConverting to 3MF format (isolating figure ${figure}, scaling to ${scaleMm}mm)...`);
    const result = await convertGlbTo3mf(glbBuffer, {
      figure,
      scale: scaleMm,
      title: modelInfo.projectName || 'TripoModel',
      zUp: true
    });
    const mfOut = `${baseOut}.3mf`;
    fs.writeFileSync(mfOut, Buffer.from(result.data));
    const stat = fs.statSync(mfOut);
    console.log(`✔ 3MF saved: ${mfOut} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`  - 3MF Vertices: ${result.verticesCount}`);
    console.log(`  - 3MF Triangles: ${result.trianglesCount}`);
    console.log(`  - Orientation: Z-Up (3D Printer build plate ready for Bambu Studio / Prusa / Cura)`);
  }

  console.log('\nAll operations completed successfully!\n');
}

main().catch(err => {
  console.error('\nFatal Error:', err);
  process.exit(1);
});
