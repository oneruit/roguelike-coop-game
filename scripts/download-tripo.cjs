const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Universal Tripo3D model downloader.
 * Usage:
 *   node scripts/download-tripo.cjs <url-or-model-id> [outputPath]
 *
 * Example:
 *   node scripts/download-tripo.cjs 256a044c-15eb-408d-806a-841b0b764c07 public/models/mage_tripo.glb
 */

async function main() {
  const input = process.argv[2] || '256a044c-15eb-408d-806a-841b0b764c07';
  const outPath = path.resolve(process.argv[3] || 'public/models/mage_tripo.glb');

  // Extract model ID from URL or bare ID
  const idMatch = input.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  if (!idMatch) {
    console.error('Error: Could not find a valid UUID model ID in input:', input);
    process.exit(1);
  }
  const modelId = idMatch[0];
  const pageUrl = `https://studio.tripo3d.ai/3d-model/${modelId}?invite_code=KI9BWY`;

  console.log(`Fetching Tripo3D model page for ID: ${modelId}...`);

  https.get(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', async () => {
      // Unescape unicode slashes
      const cleanBody = body.replace(/\\u002F/g, '/');

      // Find all GLB URLs
      const regex = /https:\/\/tripo-data[^\s"'<>]+\.glb[^\s"'<>]*/g;
      const matches = Array.from(new Set(cleanBody.match(regex) || []));

      if (matches.length === 0) {
        console.error('Error: No GLB models found on page. It might still be processing or expired.');
        process.exit(1);
      }

      console.log(`Found ${matches.length} candidate GLB URLs.`);

      // Priority ranking:
      // 1. PBR model matching modelId
      // 2. Any GLB matching modelId
      // 3. Any pbr_model
      // 4. Fallback to first GLB
      let chosenUrl = matches.find(u => u.includes(modelId) && u.includes('pbr_model')) ||
                      matches.find(u => u.includes(modelId) && !u.includes('point_cloud')) ||
                      matches.find(u => u.includes('pbr_model')) ||
                      matches[0];

      console.log('Downloading chosen GLB URL:', chosenUrl.split('?')[0]);

      const dir = path.dirname(outPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const file = fs.createWriteStream(outPath);
      https.get(chosenUrl, (dlRes) => {
        if (dlRes.statusCode !== 200) {
          console.error(`Download failed with status: ${dlRes.statusCode}`);
          process.exit(1);
        }
        dlRes.pipe(file);
        file.on('finish', () => {
          file.close();
          const stat = fs.statSync(outPath);
          console.log(`\nSUCCESS! Saved to: ${outPath}`);
          console.log(`File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB (${stat.size} bytes)\n`);
        });
      }).on('error', err => {
        console.error('Download stream error:', err);
      });
    });
  }).on('error', err => {
    console.error('Page fetch error:', err);
  });
}

main();
