import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// SessionDirector imports Vite environment settings and browser PeerJS code.
// Bundle the real game modules so tests can exercise reward flow under Node.
const dir = await mkdtemp(join(tmpdir(), 'rift-reward-tests-'));
try {
  const outfile = join(dir, 'rewardFlow.test.cjs');
  await build({
    entryPoints: ['tests/rewardFlow.test.ts'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    define: { 'import.meta.env': '{}' }
  });
  const result = spawnSync(process.execPath, ['--test', outfile], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(dir, { recursive: true, force: true });
}
