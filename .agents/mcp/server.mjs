#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findWorkspaceRoot() {
  if (process.env.WORKSPACE_ROOT && fs.existsSync(process.env.WORKSPACE_ROOT)) {
    return process.env.WORKSPACE_ROOT;
  }
  let current = __dirname;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'package.json')) && fs.existsSync(path.join(current, 'game'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

const WORKSPACE_ROOT = findWorkspaceRoot();
const CACHE_DIR = path.join(WORKSPACE_ROOT, '.agents/cache');
const INDEX_JSON_PATH = path.join(CACHE_DIR, 'codebase-index.json');
const REGISTRY_MD_PATH = path.join(CACHE_DIR, 'game-registry.md');

let symbolCache = [];
let entitiesCache = null;

function log(...args) {
  process.stderr.write(`[codebase-indexer-mcp] ${args.join(' ')}\n`);
}

function loadSymbolCache() {
  try {
    if (fs.existsSync(INDEX_JSON_PATH)) {
      const data = JSON.parse(fs.readFileSync(INDEX_JSON_PATH, 'utf-8'));
      symbolCache = data.symbols || [];
      entitiesCache = data.entities || null;
      log(`Loaded ${symbolCache.length} symbols/methods and entities from cache.`);
    } else {
      log('Cache not found. Running index generator...');
      refreshIndex();
    }
  } catch (err) {
    log('Error loading symbol cache:', err?.message || err);
    symbolCache = [];
  }
}

function refreshIndex() {
  const startTime = Date.now();
  try {
    execSync('npm run index', { cwd: WORKSPACE_ROOT, stdio: 'pipe' });
    if (fs.existsSync(INDEX_JSON_PATH)) {
      const data = JSON.parse(fs.readFileSync(INDEX_JSON_PATH, 'utf-8'));
      symbolCache = data.symbols || [];
      entitiesCache = data.entities || null;
      const elapsed = Date.now() - startTime;
      log(`Refreshed index in ${elapsed}ms: ${symbolCache.length} symbols/methods.`);
      return { totalSymbols: symbolCache.length, totalFiles: data.totalFiles || 0, elapsedMs: elapsed };
    }
  } catch (err) {
    log('Error refreshing index:', err?.message || err);
  }
  return { totalSymbols: 0, totalFiles: 0, elapsedMs: Date.now() - startTime };
}

function levenshteinDistance(s1, s2) {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;
  const d = [];
  for (let i = 0; i <= s1.length; i++) d[i] = [i];
  for (let j = 0; j <= s2.length; j++) d[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[s1.length][s2.length];
}

function calculateFuzzyScore(query, target) {
  if (!query || !target) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // 1. Exact match
  if (t === q) return 1000;

  // 2. Exact word/prefix match
  if (t.startsWith(q)) return 800 + Math.max(0, 50 - t.length);

  // 3. Substring match
  if (t.includes(q)) return 600 + Math.max(0, 50 - t.length);

  // 4. CamelCase / Acronym match (e.g. CSS for CharacterSelectScreen)
  const initials = (target.match(/[A-Z]/g) || []).join('').toLowerCase();
  if (initials === q || initials.startsWith(q)) return 700;

  // 5. Subsequence fuzzy match (fzf style)
  let qIdx = 0;
  let score = 0;
  let prevMatch = -2;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      score += 15;
      if (i === prevMatch + 1) score += 25; // consecutive bonus
      if (i === 0 || /[^a-zA-Z0-9]/.test(target[i - 1]) || target[i] === target[i].toUpperCase()) score += 20; // boundary
      prevMatch = i;
      qIdx++;
    }
  }
  if (qIdx === q.length) {
    return Math.max(150, score - (t.length - q.length) * 2);
  }

  // 6. Typo tolerance (Levenshtein) for queries >= 4 chars
  if (q.length >= 4) {
    const dist = levenshteinDistance(q, t);
    if (dist <= 2) return 350 - dist * 60;

    const words = target.split(/[^a-zA-Z0-9]+|(?=[A-Z])/).map((w) => w.toLowerCase()).filter((w) => w.length >= 3);
    for (const w of words) {
      if (levenshteinDistance(q, w) <= 1) return 320;
    }
  }

  return 0;
}

function handleFindSymbol(args) {
  const query = (args?.name || '').trim();
  const exact = !!args?.exact;
  if (!query) {
    return { isError: true, content: [{ type: 'text', text: 'Error: symbol name is required' }] };
  }

  if (symbolCache.length === 0) {
    loadSymbolCache();
  }

  let matches = [];
  if (exact) {
    matches = symbolCache
      .filter((s) => s.name === query || s.methodName === query)
      .map((item) => ({ item, score: 1000 }));
  } else {
    for (const s of symbolCache) {
      const nameScore = calculateFuzzyScore(query, s.name);
      const methodScore = s.methodName ? calculateFuzzyScore(query, s.methodName) : 0;
      let docScore = 0;
      if (s.doc && s.doc.toLowerCase().includes(query.toLowerCase())) {
        docScore = 200;
      }
      const bestScore = Math.max(nameScore, methodScore, docScore);
      if (bestScore > 120) {
        matches.push({ item: s, score: bestScore });
      }
    }
    matches.sort((a, b) => b.score - a.score);
  }

  if (matches.length === 0) {
    return {
      content: [{ type: 'text', text: `No symbols or methods found matching "${query}".` }],
    };
  }

  // Cap to top 15 matches to keep response fast and clean
  const limited = matches.slice(0, 15);
  let output = `Found ${matches.length} match(es)${matches.length > 15 ? ' (showing top 15 by relevance)' : ''}:\n\n`;

  for (const { item, score } of limited) {
    const scoreBadge = exact ? '' : ` [Score: ${score}]`;
    output += `### \`${item.name}\` (${item.kind})${scoreBadge}\n`;
    output += `**File:** \`${item.file}:${item.line}\`\n`;
    if (item.doc) {
      output += `> **Description:** ${item.doc}\n`;
    }

    // Try reading surrounding code snippet (up to 7 lines)
    try {
      const fullPath = path.join(WORKSPACE_ROOT, item.file);
      if (fs.existsSync(fullPath)) {
        const lines = fs.readFileSync(fullPath, 'utf-8').split(/\r?\n/);
        const start = Math.max(0, item.line - 1);
        const end = Math.min(lines.length, item.line + 6);
        const snippet = lines.slice(start, end).join('\n');
        output += `\`\`\`typescript\n${snippet}\n\`\`\`\n\n`;
      }
    } catch {
      output += '\n';
    }
  }

  return {
    content: [{ type: 'text', text: output.trim() }],
  };
}

function handleGetGameEntities(args) {
  const category = (args?.category || 'all').toLowerCase();
  if (!entitiesCache) {
    loadSymbolCache();
  }
  if (!entitiesCache) {
    return { isError: true, content: [{ type: 'text', text: 'Error: Game entities cache not available.' }] };
  }

  if (category === 'all' && fs.existsSync(REGISTRY_MD_PATH)) {
    return { content: [{ type: 'text', text: fs.readFileSync(REGISTRY_MD_PATH, 'utf-8') }] };
  }

  if (category === 'heroes' && entitiesCache.heroes) {
    let md = `## Heroes (${entitiesCache.heroes.length})\n\n| ID | Name | Role | Starting Weapon | HP | Speed | Dmg Multiplier |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const h of entitiesCache.heroes) {
      md += `| \`${h.id}\` | **${h.name}** | ${h.role} | \`${h.startingWeapon}\` | ${h.maxHp} | ${h.baseSpeed} | ${h.damageMultiplier}x |\n`;
    }
    return { content: [{ type: 'text', text: md.trim() }] };
  }

  if (category === 'weapons' && entitiesCache.weapons) {
    let md = `## Weapons (${entitiesCache.weapons.length})\n\n| ID | Name | Icon | Damage | Cooldown | Max Lvl | Notes |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const w of entitiesCache.weapons) {
      md += `| \`${w.id}\` | **${w.name}** | ${w.icon} | ${w.damage} | ${w.cooldown}s | ${w.maxLevel} | ${w.notes} |\n`;
    }
    return { content: [{ type: 'text', text: md.trim() }] };
  }

  if (category === 'bosses' && entitiesCache.bosses) {
    let md = `## Bosses (${entitiesCache.bosses.length})\n\n| ID | Name | HP | Speed | Damage | Description |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const b of entitiesCache.bosses) {
      md += `| \`${b.id}\` | **${b.name}** | ${b.hp} | ${b.speed} | ${b.damage} | ${b.description} |\n`;
    }
    return { content: [{ type: 'text', text: md.trim() }] };
  }

  if (category === 'monsters' && entitiesCache.monsters) {
    let md = `## Common Monsters (${entitiesCache.monsters.length})\n\n| ID | Name | HP | Speed | Damage | EXP |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const m of entitiesCache.monsters) {
      md += `| \`${m.id}\` | **${m.name}** | ${m.hp} | ${m.speed} | ${m.damage} | ${m.exp} |\n`;
    }
    return { content: [{ type: 'text', text: md.trim() }] };
  }

  if (category === 'items' && entitiesCache.items) {
    let md = `## Items (${entitiesCache.items.length})\n\n| ID | Name | Icon | Description |\n| :--- | :--- | :--- | :--- |\n`;
    for (const i of entitiesCache.items) {
      md += `| \`${i.id}\` | **${i.name}** | ${i.icon} | ${i.description} |\n`;
    }
    return { content: [{ type: 'text', text: md.trim() }] };
  }

  if (category === 'passives' && entitiesCache.passives) {
    let md = `## Passives (${entitiesCache.passives.length})\n\n| ID | Name | Icon | Description |\n| :--- | :--- | :--- | :--- |\n`;
    for (const p of entitiesCache.passives) {
      md += `| \`${p.id}\` | **${p.name}** | ${p.icon} | ${p.description} |\n`;
    }
    return { content: [{ type: 'text', text: md.trim() }] };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(entitiesCache[category] || entitiesCache, null, 2) }],
  };
}

function handleSearchCode(args) {
  const query = (args?.query || '').trim();
  const directory = (args?.directory || '').trim();
  const caseSensitive = !!args?.caseSensitive;
  const maxResults = Math.min(Number(args?.maxResults) || 20, 50);

  if (!query) {
    return { isError: true, content: [{ type: 'text', text: 'Error: search query is required' }] };
  }

  try {
    const flags = caseSensitive ? '-n' : '-n -i';
    const targetDir = directory ? `"${directory}"` : '"game/src" "admin/src" "server"';
    const cmd = `git grep ${flags} -m ${maxResults} -- "${query.replace(/"/g, '\\"')}" -- ${targetDir}`;
    const rawResult = execSync(cmd, {
      cwd: WORKSPACE_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    });

    const lines = rawResult.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) {
      return { content: [{ type: 'text', text: `No occurrences found for "${query}".` }] };
    }

    const output = `Found ${lines.length} match(es):\n\`\`\`text\n${lines.slice(0, maxResults).join('\n')}\n\`\`\``;
    return { content: [{ type: 'text', text: output }] };
  } catch (err) {
    return { content: [{ type: 'text', text: `No occurrences found for "${query}".` }] };
  }
}

function handleGetOutline(args) {
  const targetFile = (args?.file || '').trim().replace(/\\/g, '/');
  if (!targetFile) {
    return { isError: true, content: [{ type: 'text', text: 'Error: file path is required' }] };
  }

  if (symbolCache.length === 0) {
    loadSymbolCache();
  }

  const fileSymbols = symbolCache.filter((s) => s.file === targetFile || s.file.endsWith(targetFile));

  if (fileSymbols.length === 0) {
    return {
      content: [{ type: 'text', text: `No exported symbols or methods found in "${targetFile}".` }],
    };
  }

  const topLevel = fileSymbols.filter((s) => s.kind !== 'method');
  const methods = fileSymbols.filter((s) => s.kind === 'method');

  let output = `Outline for \`${targetFile}\` (${topLevel.length} declarations, ${methods.length} methods):\n\n`;
  output += `### Declarations\n| Symbol | Kind | Line |\n| :--- | :--- | :--- |\n`;
  for (const s of topLevel) {
    output += `| \`${s.name}\` | \`${s.kind}\` | line ${s.line} |\n`;
  }
  if (methods.length > 0) {
    output += `\n### Class Methods\n| Method | Class | Line |\n| :--- | :--- | :--- |\n`;
    for (const m of methods) {
      output += `| \`${m.methodName || m.name}\` | \`${m.className || ''}\` | line ${m.line} |\n`;
    }
  }

  return { content: [{ type: 'text', text: output.trim() }] };
}

function handleRefreshIndex() {
  const res = refreshIndex();
  return {
    content: [
      {
        type: 'text',
        text: `Successfully re-indexed ${res.totalSymbols} symbols and methods across ${res.totalFiles} files in ${res.elapsedMs}ms.`,
      },
    ],
  };
}

const TOOLS = [
  {
    name: 'find_symbol',
    description: 'Instantly find classes, interfaces, types, functions, constants, or class methods from in-memory codebase index. Returns exact file path, line number, and code snippet.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Symbol or method name (e.g. "DEFAULT_BALANCE", "CharacterSelectScreen", "freezeAndKnockbackAll", "signInWithOtp")',
        },
        exact: {
          type: 'boolean',
          description: 'Whether to match exact name only (default: false)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_game_entities',
    description: 'Instantly get live game design & balance data from DEFAULT_BALANCE (heroes, weapons, bosses, monsters, items, passives) without reading large files.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['all', 'heroes', 'weapons', 'bosses', 'monsters', 'items', 'passives'],
          description: 'Category of entities to inspect (default: "all")',
        },
      },
    },
  },
  {
    name: 'search_code',
    description: 'Fast git-indexed code search across game, admin, and server directories (<50ms). Automatically skips node_modules, dist, and media assets.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search string or regex to find in source code',
        },
        directory: {
          type: 'string',
          description: 'Optional directory filter (e.g. "game/src/balance" or "admin/src")',
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Perform case-sensitive search (default: false)',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum matching lines to return (default: 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_file_outline',
    description: 'Get all exported symbols, interfaces, and class methods defined in a specific file without reading the entire file.',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Relative file path (e.g. "game/src/entities/EnemyManager.ts")',
        },
      },
      required: ['file'],
    },
  },
  {
    name: 'refresh_index',
    description: 'Regenerate the codebase symbol index cache immediately on demand.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

function sendResponse(id, result, error = null) {
  const msg = { jsonrpc: '2.0', id };
  if (error) {
    msg.error = error;
  } else {
    msg.result = result;
  }
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function processMessage(line) {
  if (!line || !line.trim()) return;

  let msg;
  try {
    msg = JSON.parse(line);
  } catch (err) {
    log('Failed to parse incoming JSON:', line);
    return;
  }

  const { id, method, params } = msg;

  if (id === undefined || id === null) {
    if (method === 'notifications/initialized') {
      log('Client initialized.');
    }
    return;
  }

  switch (method) {
    case 'initialize': {
      log('Received initialize request.');
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'codebase-indexer',
          version: '1.1.0',
        },
      });
      break;
    }

    case 'ping': {
      sendResponse(id, {});
      break;
    }

    case 'tools/list': {
      sendResponse(id, { tools: TOOLS });
      break;
    }

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      log(`Calling tool: ${toolName}`);

      let toolResult;
      try {
        if (toolName === 'find_symbol') {
          toolResult = handleFindSymbol(toolArgs);
        } else if (toolName === 'get_game_entities') {
          toolResult = handleGetGameEntities(toolArgs);
        } else if (toolName === 'search_code') {
          toolResult = handleSearchCode(toolArgs);
        } else if (toolName === 'get_file_outline') {
          toolResult = handleGetOutline(toolArgs);
        } else if (toolName === 'refresh_index') {
          toolResult = handleRefreshIndex();
        } else {
          toolResult = {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
          };
        }
      } catch (err) {
        log(`Tool execution error: ${err?.message || err}`);
        toolResult = {
          isError: true,
          content: [{ type: 'text', text: `Tool error: ${err?.message || err}` }],
        };
      }

      sendResponse(id, toolResult);
      break;
    }

    default: {
      sendResponse(id, null, {
        code: -32601,
        message: `Method not found: ${method}`,
      });
      break;
    }
  }
}

function main() {
  log('Starting Codebase Indexer MCP Server v1.1.0...');
  loadSymbolCache();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', (line) => {
    processMessage(line);
  });

  rl.on('close', () => {
    log('Stdio stream closed. Exiting server.');
    process.exit(0);
  });
}

main();
