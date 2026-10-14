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
const INDEX_MD_PATH = path.join(CACHE_DIR, 'codebase-index.md');

let symbolCache = [];

function log(...args) {
  process.stderr.write(`[codebase-indexer-mcp] ${args.join(' ')}\n`);
}

function loadSymbolCache() {
  try {
    if (fs.existsSync(INDEX_JSON_PATH)) {
      const data = JSON.parse(fs.readFileSync(INDEX_JSON_PATH, 'utf-8'));
      symbolCache = data.symbols || [];
      log(`Loaded ${symbolCache.length} symbols from cache.`);
    } else {
      log('Cache not found. Generating fresh index...');
      refreshIndex();
    }
  } catch (err) {
    log('Error loading symbol cache:', err?.message || err);
    symbolCache = [];
  }
}

function refreshIndex() {
  const startTime = Date.now();
  const targetDirs = ['game/src', 'admin/src', 'server'];
  const exportRegex = /^\s*export\s+(?:declare\s+)?(?:default\s+)?(interface|type|class|enum|function|const|async\s+function|abstract\s+class)\s+([A-Za-z0-9_$]+)/;

  function walk(current, files) {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
        walk(fullPath, files);
      } else if (entry.isFile()) {
        if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    }
  }

  const allFiles = [];
  for (const d of targetDirs) {
    walk(path.join(WORKSPACE_ROOT, d), allFiles);
  }

  const newSymbols = [];
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split(/\r?\n/);
      const relPath = path.relative(WORKSPACE_ROOT, file).replace(/\\/g, '/');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(exportRegex);
        if (match) {
          const rawKind = match[1];
          const name = match[2];
          let kind = 'const';
          if (rawKind.includes('interface')) kind = 'interface';
          else if (rawKind.includes('type')) kind = 'type';
          else if (rawKind.includes('class')) kind = 'class';
          else if (rawKind.includes('enum')) kind = 'enum';
          else if (rawKind.includes('function')) kind = 'function';
          else if (rawKind.includes('const')) kind = 'const';

          newSymbols.push({
            name,
            kind,
            file: relPath,
            line: i + 1,
          });
        }
      }
    } catch {
      // ignore individual read errors
    }
  }

  newSymbols.sort((a, b) => a.name.localeCompare(b.name));
  symbolCache = newSymbols;

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const jsonPayload = {
    generatedAt: new Date().toISOString(),
    totalFiles: allFiles.length,
    totalSymbols: newSymbols.length,
    symbols: newSymbols,
  };
  fs.writeFileSync(INDEX_JSON_PATH, JSON.stringify(jsonPayload, null, 2), 'utf-8');

  // Also write MD
  const byModule = {};
  for (const s of newSymbols) {
    const parts = s.file.split('/');
    const mod = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    if (!byModule[mod]) byModule[mod] = [];
    byModule[mod].push(s);
  }

  let md = `# Codebase Symbol Index\n\n`;
  md += `> Automatically generated index of all exported classes, interfaces, types, functions, and constants.\n`;
  md += `> **Generated:** ${jsonPayload.generatedAt} | **Source Files:** ${allFiles.length} | **Total Symbols:** ${newSymbols.length}\n\n`;
  md += `Run \`npm run index\` to refresh this cache.\n\n`;
  md += `## Modules Overview\n\n| Module | Symbols Count |\n| :--- | :--- |\n`;
  for (const [mod, syms] of Object.entries(byModule)) {
    md += `| \`${mod}\` | ${syms.length} |\n`;
  }
  md += `\n---\n\n## Alphabetical Symbol Registry\n\n| Symbol | Kind | File & Line |\n| :--- | :--- | :--- |\n`;
  for (const s of newSymbols) {
    md += `| \`${s.name}\` | \`${s.kind}\` | [\`${s.file}:${s.line}\`](../../${s.file}#L${s.line}) |\n`;
  }
  fs.writeFileSync(INDEX_MD_PATH, md, 'utf-8');

  const elapsed = Date.now() - startTime;
  log(`Refreshed index in ${elapsed}ms: ${newSymbols.length} symbols across ${allFiles.length} files.`);
  return { totalSymbols: newSymbols.length, totalFiles: allFiles.length, elapsedMs: elapsed };
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

  const queryLower = query.toLowerCase();
  const matches = symbolCache.filter((s) => {
    if (exact) return s.name === query;
    return s.name.toLowerCase().includes(queryLower);
  });

  if (matches.length === 0) {
    return {
      content: [{ type: 'text', text: `No symbols found matching "${query}".` }],
    };
  }

  // Cap to top 15 matches to keep response fast and clean
  const limited = matches.slice(0, 15);
  let output = `Found ${matches.length} matching symbol(s)${matches.length > 15 ? ' (showing top 15)' : ''}:\n\n`;

  for (const item of limited) {
    output += `### \`${item.name}\` (${item.kind})\n`;
    output += `**File:** \`${item.file}:${item.line}\`\n`;

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
    // Run git grep which takes < 50ms and avoids scanning node_modules/dist/assets
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
    // git grep exits with 1 when no matches found
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
      content: [{ type: 'text', text: `No exported symbols found in "${targetFile}".` }],
    };
  }

  let output = `Outline for \`${targetFile}\` (${fileSymbols.length} exported symbols):\n\n`;
  output += `| Symbol | Kind | Line |\n| :--- | :--- | :--- |\n`;
  for (const s of fileSymbols) {
    output += `| \`${s.name}\` | \`${s.kind}\` | line ${s.line} |\n`;
  }

  return { content: [{ type: 'text', text: output }] };
}

function handleRefreshIndex() {
  const res = refreshIndex();
  return {
    content: [
      {
        type: 'text',
        text: `Successfully re-indexed ${res.totalSymbols} symbols across ${res.totalFiles} files in ${res.elapsedMs}ms.`,
      },
    ],
  };
}

const TOOLS = [
  {
    name: 'find_symbol',
    description: 'Instantly find classes, interfaces, types, functions, or constants from the in-memory codebase index. Returns exact file path, line number, and declaration code snippet.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Symbol name to search for (e.g. "DEFAULT_BALANCE", "CharacterSelectScreen", "HeroData")',
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
    description: 'Get all exported symbols, interfaces, and classes defined in a specific file without reading the entire file.',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Relative file path (e.g. "game/src/balance/BalanceManager.ts")',
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

  // Notifications (no id)
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
          version: '1.0.0',
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
  log('Starting Codebase Indexer MCP Server...');
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
