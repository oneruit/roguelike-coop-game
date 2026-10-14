import fs from 'fs';
import path from 'path';

interface SymbolEntry {
  name: string;
  kind: 'interface' | 'type' | 'class' | 'enum' | 'function' | 'const';
  file: string;
  line: number;
}

const TARGET_DIRS = ['game/src', 'admin/src', 'server'];
const OUTPUT_DIR = path.resolve('.agents/cache');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'codebase-index.md');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'codebase-index.json');

const EXPORT_REGEX = /^\s*export\s+(?:declare\s+)?(?:default\s+)?(interface|type|class|enum|function|const|async\s+function|abstract\s+class)\s+([A-Za-z0-9_$]+)/;

function getSourceFiles(dir: string): string[] {
  const fullDir = path.resolve(dir);
  if (!fs.existsSync(fullDir)) return [];

  const files: string[] = [];

  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(fullDir);
  return files;
}

function parseFileSymbols(filePath: string, repoRoot: string): SymbolEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const relPath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  const entries: SymbolEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(EXPORT_REGEX);
    if (match) {
      let rawKind = match[1];
      const name = match[2];

      let kind: SymbolEntry['kind'] = 'const';
      if (rawKind.includes('interface')) kind = 'interface';
      else if (rawKind.includes('type')) kind = 'type';
      else if (rawKind.includes('class')) kind = 'class';
      else if (rawKind.includes('enum')) kind = 'enum';
      else if (rawKind.includes('function')) kind = 'function';
      else if (rawKind.includes('const')) kind = 'const';

      entries.push({
        name,
        kind,
        file: relPath,
        line: i + 1,
      });
    }
  }

  return entries;
}

function run() {
  const startTime = Date.now();
  const repoRoot = process.cwd();

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const allFiles: string[] = [];
  for (const dir of TARGET_DIRS) {
    allFiles.push(...getSourceFiles(dir));
  }

  const allSymbols: SymbolEntry[] = [];
  for (const file of allFiles) {
    allSymbols.push(...parseFileSymbols(file, repoRoot));
  }

  // Sort symbols alphabetically
  allSymbols.sort((a, b) => a.name.localeCompare(b.name));

  // Write JSON index
  const jsonPayload = {
    generatedAt: new Date().toISOString(),
    totalFiles: allFiles.length,
    totalSymbols: allSymbols.length,
    symbols: allSymbols,
  };
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(jsonPayload, null, 2), 'utf-8');

  // Group by module/category
  const byModule: Record<string, SymbolEntry[]> = {};
  for (const sym of allSymbols) {
    const parts = sym.file.split('/');
    const mod = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    if (!byModule[mod]) byModule[mod] = [];
    byModule[mod].push(sym);
  }

  // Generate Markdown index
  let md = `# Codebase Symbol Index\n\n`;
  md += `> Automatically generated index of all exported classes, interfaces, types, functions, and constants.\n`;
  md += `> **Generated:** ${jsonPayload.generatedAt} | **Source Files:** ${allFiles.length} | **Total Symbols:** ${allSymbols.length}\n\n`;
  md += `Run \`npm run index\` to refresh this cache.\n\n`;

  md += `## Modules Overview\n\n`;
  md += `| Module | Symbols Count |\n`;
  md += `| :--- | :--- |\n`;
  for (const [mod, syms] of Object.entries(byModule)) {
    md += `| \`${mod}\` | ${syms.length} |\n`;
  }
  md += `\n---\n\n`;

  md += `## Alphabetical Symbol Registry\n\n`;
  md += `| Symbol | Kind | File & Line |\n`;
  md += `| :--- | :--- | :--- |\n`;
  for (const s of allSymbols) {
    md += `| \`${s.name}\` | \`${s.kind}\` | [\`${s.file}:${s.line}\`](../../${s.file}#L${s.line}) |\n`;
  }

  fs.writeFileSync(OUTPUT_MD, md, 'utf-8');

  const elapsed = Date.now() - startTime;
  console.log(`[Codebase Indexer] Indexed ${allSymbols.length} symbols across ${allFiles.length} files in ${elapsed}ms.`);
  console.log(`[Codebase Indexer] Outputs generated:`);
  console.log(`  - Markdown: ${OUTPUT_MD}`);
  console.log(`  - JSON:     ${OUTPUT_JSON}`);
}

run();
