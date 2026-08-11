/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUILD_BUNDLE_BUDGETS = {
  initialJavaScript: {
    maxBytes: 1_620_000,
  },
  initialCss: {
    maxBytes: 15_000,
  },
  workers: {
    maxBytes: 24_000,
  },
  majorChunks: {
    minimumTrackedBytes: 64_000,
    hardLimitToleranceBytes: 1_024,
    maxBytesByName: {
      src: 110_000,
      main: 1_325_000,
      'music-debug-instrument-preview': 169_000,
      'procedural-music-audio-sink': 140_000,
      'sound-effects': 160_000,
    },
  },
};

export const DEFAULT_BUILD_BUNDLE_BASELINE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'build-bundle-budgets-baseline.json'
);

function unique(values) {
  return [...new Set(values)];
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

function formatSignedKiB(bytes) {
  const prefix = bytes >= 0 ? '+' : '-';
  return `${prefix}${formatKiB(Math.abs(bytes))}`;
}

function isJavaScriptAsset(fileName) {
  return fileName.endsWith('.js');
}

function fileSize(distDir, fileName) {
  return fs.statSync(path.join(distDir, fileName)).size;
}

export function collectImportedChunkFiles(manifest, key, seenKeys = new Set()) {
  if (seenKeys.has(key)) {
    return [];
  }
  seenKeys.add(key);
  const item = manifest[key];
  if (!item) {
    return [];
  }
  return unique([
    item.file,
    ...(item.imports ?? []).flatMap((importKey) =>
      collectImportedChunkFiles(manifest, importKey, seenKeys)
    ),
  ]);
}

export function collectImportedCssFiles(manifest, key, seenKeys = new Set()) {
  if (seenKeys.has(key)) {
    return [];
  }
  seenKeys.add(key);
  const item = manifest[key];
  if (!item) {
    return [];
  }
  return unique([
    ...(item.css ?? []),
    ...(item.imports ?? []).flatMap((importKey) =>
      collectImportedCssFiles(manifest, importKey, seenKeys)
    ),
  ]);
}

export function resolveInitialMainRouteBundle(manifest, distDir) {
  const appEntryKey = Object.keys(manifest).find(
    (key) => manifest[key]?.name === 'app-entry'
  );
  if (!appEntryKey) {
    throw new Error('Could not find the app-entry chunk in the Vite manifest.');
  }

  if (!manifest['src/main.ts']) {
    throw new Error('Could not find src/main.ts in the Vite manifest.');
  }

  const jsFiles = unique([
    manifest[appEntryKey].file,
    ...collectImportedChunkFiles(manifest, 'src/main.ts'),
  ]).filter(isJavaScriptAsset);
  const cssFiles = collectImportedCssFiles(manifest, 'src/main.ts');

  return {
    jsFiles,
    cssFiles,
    javaScriptBytes: jsFiles.reduce(
      (total, fileName) => total + fileSize(distDir, fileName),
      0
    ),
    cssBytes: cssFiles.reduce(
      (total, fileName) => total + fileSize(distDir, fileName),
      0
    ),
  };
}

function isWorkerManifestEntry(key, entry) {
  const workerPattern = /(^|[./?-])worker([./?-]|$)/i;
  return workerPattern.test(key) ||
    workerPattern.test(entry.file) ||
    workerPattern.test(entry.name ?? '') ||
    workerPattern.test(entry.src ?? '')
    ? true
    : false;
}

export function resolveWorkerBundleBytes(manifest, distDir) {
  const seenFiles = new Set();
  let totalBytes = 0;

  for (const [key, entry] of Object.entries(manifest)) {
    if (!entry?.file || !isJavaScriptAsset(entry.file)) {
      continue;
    }
    if (!isWorkerManifestEntry(key, entry) || seenFiles.has(entry.file)) {
      continue;
    }
    seenFiles.add(entry.file);
    totalBytes += fileSize(distDir, entry.file);
  }

  return totalBytes;
}

export function resolveMajorChunkSizes(manifest, distDir) {
  const sizesByName = new Map();
  const seenFiles = new Set();

  for (const entry of Object.values(manifest)) {
    if (!entry?.file || !entry.name || !isJavaScriptAsset(entry.file)) {
      continue;
    }
    if (seenFiles.has(entry.file)) {
      continue;
    }
    seenFiles.add(entry.file);
    const size = fileSize(distDir, entry.file);
    sizesByName.set(entry.name, (sizesByName.get(entry.name) ?? 0) + size);
  }

  return sizesByName;
}

export function loadBundleBudgetBaseline(
  baselinePath = DEFAULT_BUILD_BUNDLE_BASELINE_PATH
) {
  return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
}

function buildRegressionViolation({
  label,
  currentBytes,
  baselineBytes,
  maxIncreaseBytes,
}) {
  const increaseBytes = currentBytes - baselineBytes;
  if (increaseBytes <= maxIncreaseBytes) {
    return null;
  }

  return (
    `${label} grew by ${formatSignedKiB(increaseBytes)} ` +
    `from baseline ${formatKiB(baselineBytes)} to ${formatKiB(currentBytes)} ` +
    `(allowed ${formatSignedKiB(maxIncreaseBytes)}).`
  );
}

export function createBundleBudgetReport(
  manifest,
  distDir,
  budgets = BUILD_BUNDLE_BUDGETS,
  regressionBaseline = null
) {
  const budgetViolations = [];
  const regressionViolations = [];
  const initialBundle = resolveInitialMainRouteBundle(manifest, distDir);
  const workerBytes = resolveWorkerBundleBytes(manifest, distDir);
  const majorChunkSizes = resolveMajorChunkSizes(manifest, distDir);

  if (initialBundle.javaScriptBytes > budgets.initialJavaScript.maxBytes) {
    budgetViolations.push(
      `Initial JavaScript bundle is ${formatKiB(initialBundle.javaScriptBytes)} ` +
        `(limit ${formatKiB(budgets.initialJavaScript.maxBytes)}).`
    );
  }

  if (initialBundle.cssBytes > budgets.initialCss.maxBytes) {
    budgetViolations.push(
      `Initial CSS bundle is ${formatKiB(initialBundle.cssBytes)} ` +
        `(limit ${formatKiB(budgets.initialCss.maxBytes)}).`
    );
  }

  if (workerBytes > budgets.workers.maxBytes) {
    budgetViolations.push(
      `Worker JavaScript totals ${formatKiB(workerBytes)} ` +
        `(limit ${formatKiB(budgets.workers.maxBytes)}).`
    );
  }

  for (const [name, bytes] of majorChunkSizes.entries()) {
    const configuredLimit = budgets.majorChunks.maxBytesByName[name];
    if (configuredLimit === undefined) {
      if (bytes >= budgets.majorChunks.minimumTrackedBytes) {
        budgetViolations.push(
          `Major chunk "${name}" is ${formatKiB(bytes)} but has no configured budget.`
        );
      }
      continue;
    }
    const toleratedLimit =
      configuredLimit + (budgets.majorChunks.hardLimitToleranceBytes ?? 0);
    if (bytes > toleratedLimit) {
      budgetViolations.push(
        `Major chunk "${name}" is ${formatKiB(bytes)} ` +
          `(limit ${formatKiB(configuredLimit)}, tolerance ${formatKiB(
            budgets.majorChunks.hardLimitToleranceBytes ?? 0
          )}).`
      );
    }
  }

  if (regressionBaseline) {
    const initialJavaScriptRegression = buildRegressionViolation({
      label: 'Initial JavaScript bundle',
      currentBytes: initialBundle.javaScriptBytes,
      baselineBytes: regressionBaseline.initialJavaScript.baselineBytes,
      maxIncreaseBytes: regressionBaseline.initialJavaScript.maxIncreaseBytes,
    });
    if (initialJavaScriptRegression) {
      regressionViolations.push(initialJavaScriptRegression);
    }

    const initialCssRegression = buildRegressionViolation({
      label: 'Initial CSS bundle',
      currentBytes: initialBundle.cssBytes,
      baselineBytes: regressionBaseline.initialCss.baselineBytes,
      maxIncreaseBytes: regressionBaseline.initialCss.maxIncreaseBytes,
    });
    if (initialCssRegression) {
      regressionViolations.push(initialCssRegression);
    }

    const workersRegression = buildRegressionViolation({
      label: 'Worker JavaScript total',
      currentBytes: workerBytes,
      baselineBytes: regressionBaseline.workers.baselineBytes,
      maxIncreaseBytes: regressionBaseline.workers.maxIncreaseBytes,
    });
    if (workersRegression) {
      regressionViolations.push(workersRegression);
    }

    for (const [name, bytes] of majorChunkSizes.entries()) {
      if (bytes < regressionBaseline.majorChunks.minimumTrackedBytes) {
        continue;
      }

      const baselineBytes =
        regressionBaseline.majorChunks.baselineBytesByName[name];
      const maxIncreaseBytes =
        regressionBaseline.majorChunks.maxIncreaseBytesByName[name];

      if (baselineBytes === undefined || maxIncreaseBytes === undefined) {
        regressionViolations.push(
          `Major chunk "${name}" is ${formatKiB(bytes)} but has no committed regression baseline.`
        );
        continue;
      }

      const majorChunkRegression = buildRegressionViolation({
        label: `Major chunk "${name}"`,
        currentBytes: bytes,
        baselineBytes,
        maxIncreaseBytes,
      });
      if (majorChunkRegression) {
        regressionViolations.push(majorChunkRegression);
      }
    }
  }

  return {
    initialBundle,
    workerBytes,
    majorChunkSizes,
    budgetViolations,
    regressionViolations,
    violations: [...budgetViolations, ...regressionViolations],
  };
}

export function loadManifestFromDist(distDir) {
  const manifestPath = path.join(distDir, '.vite', 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

export function runBundleBudgetCheck(options = {}) {
  const distDir = options.distDir ?? path.resolve('dist');
  const manifest = options.manifest ?? loadManifestFromDist(distDir);
  const regressionBaseline =
    options.regressionBaseline ?? loadBundleBudgetBaseline();
  const report = createBundleBudgetReport(
    manifest,
    distDir,
    options.budgets ?? BUILD_BUNDLE_BUDGETS,
    regressionBaseline
  );

  const lines = [
    `Initial JavaScript: ${formatKiB(report.initialBundle.javaScriptBytes)}`,
    `Initial CSS: ${formatKiB(report.initialBundle.cssBytes)}`,
    `Workers: ${formatKiB(report.workerBytes)}`,
    'Major chunks:',
    ...[...report.majorChunkSizes.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([name, bytes]) => `  ${name}: ${formatKiB(bytes)}`),
  ];

  if (report.violations.length > 0) {
    throw new Error(
      [
        'Build bundle budget exceeded.',
        ...report.violations,
        '',
        ...lines,
      ].join('\n')
    );
  }

  console.log(['Bundle budgets OK.', ...lines].join('\n'));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBundleBudgetCheck();
}
