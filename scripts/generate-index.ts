import fs from 'fs';
import path from 'path';
import { DEFAULT_BALANCE } from '../game/src/balance/defaultBalance.ts';

interface SymbolEntry {
  name: string;
  kind: 'interface' | 'type' | 'class' | 'enum' | 'function' | 'const' | 'method';
  file: string;
  line: number;
  className?: string;
  methodName?: string;
  doc?: string;
}

const TARGET_DIRS = ['game/src', 'admin/src', 'server'];
const OUTPUT_DIR = path.resolve('.agents/cache');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'codebase-index.md');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'codebase-index.json');
const OUTPUT_REGISTRY_MD = path.join(OUTPUT_DIR, 'game-registry.md');

const EXPORT_REGEX = /^\s*export\s+(?:declare\s+)?(?:default\s+)?(interface|type|class|enum|function|const|async\s+function|abstract\s+class)\s+([A-Za-z0-9_$]+)/;
const METHOD_REGEX = /^\s*(?:(?:public|protected|private|static|async)\s+)*([A-Za-z0-9_$]+)\s*\([^{;]*\)\s*(?::\s*[^{;]+)?\s*\{/;
const IGNORED_METHOD_NAMES = new Set(['if', 'for', 'while', 'switch', 'catch', 'constructor', 'with', 'return']);

function extractPrecedingDoc(lines: string[], targetIndex: number): string | undefined {
  let idx = targetIndex - 1;
  while (idx >= 0 && lines[idx].trim() === '') {
    idx--;
  }
  if (idx < 0) return undefined;

  const trimmed = lines[idx].trim();
  if (trimmed.startsWith('//')) {
    const c = trimmed.replace(/^\/\/\s*/, '').trim();
    return c.length > 2 ? c : undefined;
  }

  if (trimmed.endsWith('*/')) {
    const docParts: string[] = [];
    while (idx >= 0) {
      const l = lines[idx].trim();
      const cleaned = l.replace(/^\/\*\*|\*\/|\*/g, '').trim();
      if (cleaned && !cleaned.startsWith('@')) docParts.unshift(cleaned);
      if (l.startsWith('/**')) break;
      idx--;
    }
    return docParts.length > 0 ? docParts.join(' ') : undefined;
  }

  return undefined;
}

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

  let currentClass: string | null = null;
  let braceDepth = 0;
  let classBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track braces to know if we are inside a class
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    // Check top-level export
    const exportMatch = line.match(EXPORT_REGEX);
    if (exportMatch) {
      const rawKind = exportMatch[1];
      const name = exportMatch[2];

      let kind: SymbolEntry['kind'] = 'const';
      if (rawKind.includes('interface')) kind = 'interface';
      else if (rawKind.includes('type')) kind = 'type';
      else if (rawKind.includes('class')) kind = 'class';
      else if (rawKind.includes('enum')) kind = 'enum';
      else if (rawKind.includes('function')) kind = 'function';
      else if (rawKind.includes('const')) kind = 'const';

      const doc = extractPrecedingDoc(lines, i);
      entries.push({
        name,
        kind,
        file: relPath,
        line: i + 1,
        ...(doc ? { doc } : {}),
      });

      if (kind === 'class') {
        currentClass = name;
        classBraceDepth = braceDepth;
      }
    }

    // Check methods inside class
    if (currentClass) {
      const methodMatch = line.match(METHOD_REGEX);
      if (methodMatch && !line.includes('export ')) {
        const methodName = methodMatch[1];
        if (!IGNORED_METHOD_NAMES.has(methodName) && !methodName.startsWith('_')) {
          const methodDoc = extractPrecedingDoc(lines, i);
          entries.push({
            name: `${currentClass}.${methodName}`,
            kind: 'method',
            file: relPath,
            line: i + 1,
            className: currentClass,
            methodName,
            ...(methodDoc ? { doc: methodDoc } : {}),
          });
        }
      }
    }

    braceDepth += openBraces - closeBraces;
    if (currentClass && braceDepth <= classBraceDepth) {
      currentClass = null;
    }
  }

  return entries;
}

function generateGameRegistry(): { markdown: string; data: Record<string, any> } {
  const heroes = Object.values(DEFAULT_BALANCE.heroes || {}).map((h: any) => ({
    id: h.id,
    name: h.name,
    role: h.role || 'DPS',
    startingWeapon: h.startingWeapon || 'unknown',
    maxHp: h.maxHp,
    baseSpeed: h.baseSpeed,
    damageMultiplier: h.damageMultiplier,
  }));

  const weapons = Object.values(DEFAULT_BALANCE.weapons || {}).map((w: any) => ({
    id: w.id,
    name: w.name,
    icon: w.icon || '⚔️',
    damage: w.damage,
    cooldown: w.cooldown,
    maxLevel: w.maxLevel || 12,
    range: w.range || 20,
    notes: w.notes || '',
  }));

  const monsters = Object.values(DEFAULT_BALANCE.monsters || {}).map((m: any) => ({
    id: m.id || m.type,
    name: m.name,
    hp: m.hp,
    speed: m.speed,
    damage: m.damage,
    exp: m.exp,
  }));

  const bosses = Object.values(DEFAULT_BALANCE.bosses || {}).map((b: any) => ({
    id: b.id || b.type,
    name: b.name,
    hp: b.hp,
    speed: b.speed,
    damage: b.damage,
    description: b.description || '',
  }));

  const items = Object.values(DEFAULT_BALANCE.items || {}).map((item: any) => ({
    id: item.id,
    name: item.name,
    icon: item.icon || '📦',
    description: item.description || '',
  }));

  const passives = Object.values(DEFAULT_BALANCE.passives || {}).map((p: any) => ({
    id: p.id,
    name: p.name,
    icon: p.icon || '✨',
    description: p.description || '',
  }));

  let md = `# Game Entity & Balance Registry\n\n`;
  md += `> Auto-generated semantic registry from \`DEFAULT_BALANCE\`. Instant reference for AI agents and developers.\n\n`;

  md += `## 1. Heroes (${heroes.length})\n\n`;
  md += `| ID | Name | Role | Starting Weapon | Base HP | Speed | Dmg Multiplier |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const h of heroes) {
    md += `| \`${h.id}\` | **${h.name}** | ${h.role} | \`${h.startingWeapon}\` | ${h.maxHp} | ${h.baseSpeed} | ${h.damageMultiplier}x |\n`;
  }

  md += `\n---\n\n## 2. Weapons (${weapons.length})\n\n`;
  md += `| ID | Name | Icon | Damage | Cooldown | Max Lvl | Notes |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const w of weapons) {
    md += `| \`${w.id}\` | **${w.name}** | ${w.icon} | ${w.damage} | ${w.cooldown}s | ${w.maxLevel} | ${w.notes} |\n`;
  }

  md += `\n---\n\n## 3. Bosses (${bosses.length})\n\n`;
  md += `| ID | Name | HP | Speed | Damage | Description |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const b of bosses) {
    md += `| \`${b.id}\` | **${b.name}** | ${b.hp} | ${b.speed} | ${b.damage} | ${b.description} |\n`;
  }

  md += `\n---\n\n## 4. Common Monsters (${monsters.length})\n\n`;
  md += `| ID | Name | HP | Speed | Damage | EXP |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  for (const m of monsters) {
    md += `| \`${m.id}\` | **${m.name}** | ${m.hp} | ${m.speed} | ${m.damage} | ${m.exp} |\n`;
  }

  md += `\n---\n\n## 5. Items & Relics (${items.length})\n\n`;
  md += `| ID | Name | Icon | Description |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const item of items) {
    md += `| \`${item.id}\` | **${item.name}** | ${item.icon} | ${item.description} |\n`;
  }

  md += `\n---\n\n## 6. Passives (${passives.length})\n\n`;
  md += `| ID | Name | Icon | Description |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const p of passives) {
    md += `| \`${p.id}\` | **${p.name}** | ${p.icon} | ${p.description} |\n`;
  }

  return {
    markdown: md,
    data: { heroes, weapons, monsters, bosses, items, passives },
  };
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

  // Extract game domain entities from DEFAULT_BALANCE
  const registry = generateGameRegistry();
  fs.writeFileSync(OUTPUT_REGISTRY_MD, registry.markdown, 'utf-8');

  // Top-level vs methods breakdown
  const topLevelSymbols = allSymbols.filter((s) => s.kind !== 'method');
  const methodSymbols = allSymbols.filter((s) => s.kind === 'method');

  // Write JSON index with symbols + entities
  const jsonPayload = {
    generatedAt: new Date().toISOString(),
    totalFiles: allFiles.length,
    totalSymbols: allSymbols.length,
    topLevelCount: topLevelSymbols.length,
    methodsCount: methodSymbols.length,
    entities: registry.data,
    symbols: allSymbols,
  };
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(jsonPayload, null, 2), 'utf-8');

  // Group by module/category
  const byModule: Record<string, SymbolEntry[]> = {};
  for (const sym of topLevelSymbols) {
    const parts = sym.file.split('/');
    const mod = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    if (!byModule[mod]) byModule[mod] = [];
    byModule[mod].push(sym);
  }

  // Generate Markdown index
  let md = `# Codebase Symbol Index\n\n`;
  md += `> Automatically generated index of all exported classes, interfaces, types, functions, constants, and class methods.\n`;
  md += `> **Generated:** ${jsonPayload.generatedAt} | **Files:** ${allFiles.length} | **Top-level:** ${topLevelSymbols.length} | **Class Methods:** ${methodSymbols.length}\n`;
  md += `> **Entities Registered:** ${registry.data.heroes.length} Heroes, ${registry.data.weapons.length} Weapons, ${registry.data.bosses.length} Bosses, ${registry.data.monsters.length} Monsters\n\n`;
  md += `Run \`npm run index\` to refresh this cache.\n\n`;

  md += `## Modules Overview\n\n`;
  md += `| Module | Top-Level Symbols |\n`;
  md += `| :--- | :--- |\n`;
  for (const [mod, syms] of Object.entries(byModule)) {
    md += `| \`${mod}\` | ${syms.length} |\n`;
  }
  md += `\n---\n\n`;

  md += `## Alphabetical Symbol & Member Registry\n\n`;
  md += `| Symbol / Member | Kind | File & Line | Description |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const s of allSymbols) {
    const docText = s.doc ? s.doc.replace(/\|/g, '\\|').slice(0, 75) + (s.doc.length > 75 ? '...' : '') : '-';
    md += `| \`${s.name}\` | \`${s.kind}\` | [\`${s.file}:${s.line}\`](../../${s.file}#L${s.line}) | ${docText} |\n`;
  }

  fs.writeFileSync(OUTPUT_MD, md, 'utf-8');

  const elapsed = Date.now() - startTime;
  console.log(`[Codebase Indexer] Indexed ${topLevelSymbols.length} symbols and ${methodSymbols.length} class methods across ${allFiles.length} files in ${elapsed}ms.`);
  console.log(`[Codebase Indexer] Outputs generated:`);
  console.log(`  - Codebase Index: ${OUTPUT_MD}`);
  console.log(`  - Game Registry:  ${OUTPUT_REGISTRY_MD}`);
  console.log(`  - JSON Payload:   ${OUTPUT_JSON}`);
}

run();
