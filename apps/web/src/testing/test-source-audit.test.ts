// test-source-audit-disable-file: fixture strings intentionally contain flagged patterns.
import { describe, expect, it } from 'vitest';

import {
  findSuspiciousTestSourcePatterns,
  TEST_SOURCE_AUDIT_DISABLE_NEXT_LINE,
} from './test-source-audit.ts';

describe('test source audit', () => {
  it('flags unconditional infinite loops in test sources', () => {
    expect(
      findSuspiciousTestSourcePatterns(
        [
          "it('hangs forever', () => {",
          '  while (true) {',
          '    tick();',
          '  }',
          '});',
        ].join('\n'),
        'apps/web/src/example.test.ts'
      )
    ).toEqual([
      {
        filePath: 'apps/web/src/example.test.ts',
        line: 2,
        column: 3,
        code: 'unbounded-loop',
        message:
          'Avoid unconditional infinite loops in test sources. Add an exit condition or annotate the next line when the loop is intentional.',
      },
    ]);
  });

  it('flags oversized static test fixtures', () => {
    expect(
      findSuspiciousTestSourcePatterns(
        [
          "it('builds too much data', () => {",
          '  const fixtures = Array.from({ length: 5001 }, (_, index) => index);',
          '});',
        ].join('\n'),
        'packages/example/src/example.test.ts'
      )
    ).toEqual([
      {
        filePath: 'packages/example/src/example.test.ts',
        line: 2,
        column: 20,
        code: 'oversized-static-collection',
        message:
          'Avoid Array.from({ length: 5001 }) in test sources; keep static fixtures under 5000 items or build them incrementally.',
      },
    ]);
  });

  it('supports per-line suppressions for intentional patterns', () => {
    expect(
      findSuspiciousTestSourcePatterns(
        [
          "it('documents a parser edge case', () => {",
          `  // ${TEST_SOURCE_AUDIT_DISABLE_NEXT_LINE}`,
          '  while (true) {',
          '    break;',
          '  }',
          '});',
        ].join('\n'),
        'apps/web/src/parser.test.ts'
      )
    ).toEqual([]);
  });
});
