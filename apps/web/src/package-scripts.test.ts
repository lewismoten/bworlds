import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const packageJsonPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../package.json'
);

describe('package scripts', () => {
  it('keeps normal and watch test commands on the fast suite by default', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf8')
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      test: 'node ./scripts/vitest-supervisor.mjs --suite-mode fast',
      'test:fast': 'node ./scripts/vitest-supervisor.mjs --suite-mode fast',
      'test:hang-debug':
        'npm exec -- vitest run --reporter=verbose --maxWorkers=1',
      'test:watch': 'BWORLDS_VITEST_SUITE_MODE=fast vitest',
      'test:watch:all': 'BWORLDS_VITEST_SUITE_MODE=all vitest',
      'test:watch:long': 'BWORLDS_VITEST_SUITE_MODE=long vitest',
      'client-error-snapshots:remove':
        'node ./scripts/client-error-snapshot-cleanup.mjs remove',
      'client-error-snapshots:clear':
        'node ./scripts/client-error-snapshot-cleanup.mjs clear',
    });
  });

  it('keeps npm run check on the fast supervised test suite', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf8')
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.check).toContain('npm run test');
    expect(packageJson.scripts?.check).not.toContain('npm run test:all');
    expect(packageJson.scripts?.check).not.toContain('npm run test:long');
  });

  it('keeps the hang-debug script compatible with the current Vitest worker flags', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, 'utf8')
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['test:hang-debug']).toBe(
      'npm exec -- vitest run --reporter=verbose --maxWorkers=1'
    );
    expect(packageJson.scripts?.['test:hang-debug']).not.toContain(
      '--minWorkers'
    );
  });
});
