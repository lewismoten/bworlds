import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BUILD_BUNDLE_BUDGETS,
  createBundleBudgetReport,
  loadBundleBudgetBaseline,
  resolveInitialMainRouteBundle,
  resolveMajorChunkSizes,
  resolveWorkerBundleBytes,
} from '../build-bundle-budgets.mjs';

function createFixtureDist(files: Record<string, number>) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'bworlds-bundle-budget-'));
  for (const [relativePath, size] of Object.entries(files)) {
    const absolutePath = path.join(dir, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, new Uint8Array(size));
  }
  return dir;
}

const fixtureManifest = {
  '_app-entry-abc.js': {
    file: 'assets/app-entry.js',
    name: 'app-entry',
    dynamicImports: ['src/main.ts'],
  },
  '_shared-small.js': {
    file: 'assets/shared-small.js',
    name: 'shared-small',
  },
  '_index-large.js': {
    file: 'assets/index-large.js',
    name: 'index',
    imports: ['_shared-small.js'],
  },
  '_worker-demo.js': {
    file: 'assets/worker-demo.js',
    name: 'worker-demo',
    src: 'src/demo.worker.ts',
  },
  'src/main.ts': {
    file: 'assets/main.js',
    name: 'main',
    src: 'src/main.ts',
    imports: ['_index-large.js'],
    css: ['assets/main.css'],
  },
};

describe('build bundle budgets', () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('measures the main route initial javascript and css bundle from manifest relationships', () => {
    const distDir = createFixtureDist({
      'assets/app-entry.js': 5_000,
      'assets/main.js': 100_000,
      'assets/index-large.js': 20_000,
      'assets/shared-small.js': 3_000,
      'assets/main.css': 8_000,
      'assets/worker-demo.js': 10_000,
    });
    tmpDirs.push(distDir);

    expect(resolveInitialMainRouteBundle(fixtureManifest, distDir)).toEqual({
      jsFiles: [
        'assets/app-entry.js',
        'assets/main.js',
        'assets/index-large.js',
        'assets/shared-small.js',
      ],
      cssFiles: ['assets/main.css'],
      javaScriptBytes: 128_000,
      cssBytes: 8_000,
    });
  });

  it('aggregates worker bytes and major chunks by logical chunk name', () => {
    const distDir = createFixtureDist({
      'assets/app-entry.js': 5_000,
      'assets/main.js': 100_000,
      'assets/index-large.js': 70_000,
      'assets/shared-small.js': 3_000,
      'assets/main.css': 8_000,
      'assets/worker-demo.js': 10_000,
    });
    tmpDirs.push(distDir);

    expect(resolveWorkerBundleBytes(fixtureManifest, distDir)).toBe(10_000);
    expect([
      ...resolveMajorChunkSizes(fixtureManifest, distDir).entries(),
    ]).toEqual(
      expect.arrayContaining([
        ['main', 100_000],
        ['index', 70_000],
      ])
    );
  });

  it('fails when a large chunk grows past its configured budget or a new major chunk appears', () => {
    const distDir = createFixtureDist({
      'assets/app-entry.js': 5_000,
      'assets/main.js': 1_650_000,
      'assets/index-large.js': 120_000,
      'assets/shared-small.js': 3_000,
      'assets/main.css': 20_000,
      'assets/worker-demo.js': 30_000,
    });
    tmpDirs.push(distDir);

    const report = createBundleBudgetReport(fixtureManifest, distDir, {
      ...BUILD_BUNDLE_BUDGETS,
      majorChunks: {
        ...BUILD_BUNDLE_BUDGETS.majorChunks,
        maxBytesByName: {
          ...BUILD_BUNDLE_BUDGETS.majorChunks.maxBytesByName,
          'shared-small': 1_000,
        },
      },
    });

    expect(report.violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Initial JavaScript bundle'),
        expect.stringContaining('Initial CSS bundle'),
        expect.stringContaining('Worker JavaScript totals'),
        expect.stringContaining('Major chunk "main"'),
        expect.stringContaining('Major chunk "index"'),
      ])
    );
  });

  it('allows sub-kib major-chunk jitter before failing the hard budget', () => {
    const distDir = createFixtureDist({
      'assets/app-entry.js': 5_000,
      'assets/main.js': 100_000,
      'assets/index-large.js': 65_500,
      'assets/shared-small.js': 3_000,
      'assets/main.css': 8_000,
      'assets/worker-demo.js': 10_000,
    });
    tmpDirs.push(distDir);

    const report = createBundleBudgetReport(fixtureManifest, distDir, {
      ...BUILD_BUNDLE_BUDGETS,
      majorChunks: {
        ...BUILD_BUNDLE_BUDGETS.majorChunks,
        hardLimitToleranceBytes: 1_024,
        maxBytesByName: {
          ...BUILD_BUNDLE_BUDGETS.majorChunks.maxBytesByName,
          index: 65_000,
        },
      },
    });

    expect(
      report.violations.some((violation) => violation.includes('index'))
    ).toBe(false);
  });

  it('fails when tracked bundles grow significantly beyond the committed baseline', () => {
    const distDir = createFixtureDist({
      'assets/app-entry.js': 5_000,
      'assets/main.js': 112_000,
      'assets/index-large.js': 72_000,
      'assets/shared-small.js': 3_000,
      'assets/main.css': 8_500,
      'assets/worker-demo.js': 2_500,
    });
    tmpDirs.push(distDir);

    const report = createBundleBudgetReport(
      fixtureManifest,
      distDir,
      BUILD_BUNDLE_BUDGETS,
      {
        initialJavaScript: {
          baselineBytes: 120_000,
          maxIncreaseBytes: 4_000,
        },
        initialCss: {
          baselineBytes: 6_000,
          maxIncreaseBytes: 1_000,
        },
        workers: {
          baselineBytes: 0,
          maxIncreaseBytes: 1_000,
        },
        majorChunks: {
          minimumTrackedBytes: 64_000,
          baselineBytesByName: {
            main: 100_000,
            index: 65_000,
          },
          maxIncreaseBytesByName: {
            main: 4_000,
            index: 2_000,
          },
        },
      }
    );

    expect(report.regressionViolations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Initial JavaScript bundle grew by'),
        expect.stringContaining('Initial CSS bundle grew by'),
        expect.stringContaining('Worker JavaScript total grew by'),
        expect.stringContaining('Major chunk "main" grew by'),
        expect.stringContaining('Major chunk "index" grew by'),
      ])
    );
  });

  it('loads the committed baseline snapshot for CI regression checks', () => {
    expect(loadBundleBudgetBaseline()).toMatchObject({
      initialJavaScript: {
        baselineBytes: expect.any(Number),
        maxIncreaseBytes: expect.any(Number),
      },
      initialCss: {
        baselineBytes: expect.any(Number),
        maxIncreaseBytes: expect.any(Number),
      },
      workers: {
        baselineBytes: expect.any(Number),
        maxIncreaseBytes: expect.any(Number),
      },
      majorChunks: {
        minimumTrackedBytes: expect.any(Number),
        baselineBytesByName: expect.objectContaining({
          main: expect.any(Number),
          'sound-bank-debug-page': expect.any(Number),
        }),
        maxIncreaseBytesByName: expect.objectContaining({
          main: expect.any(Number),
          'sound-bank-debug-page': expect.any(Number),
        }),
      },
    });
  });
});
