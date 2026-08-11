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
      'test:watch': 'BWORLDS_VITEST_SUITE_MODE=fast vitest',
      'test:watch:all': 'BWORLDS_VITEST_SUITE_MODE=all vitest',
      'test:watch:long': 'BWORLDS_VITEST_SUITE_MODE=long vitest',
    });
  });
});
