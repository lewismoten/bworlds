import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_RUNTIME_PERFORMANCE_SNAPSHOT_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '.runtime-performance-snapshots'
);
export const MAX_RUNTIME_PERFORMANCE_SNAPSHOTS = 10;

function ensureSnapshotDirectory(snapshotDir) {
  fs.mkdirSync(snapshotDir, { recursive: true });
}

function getSnapshotFilePath(snapshotDir, fileName) {
  return path.join(snapshotDir, fileName);
}

function listSnapshotEntries(snapshotDir) {
  if (!fs.existsSync(snapshotDir)) {
    return [];
  }

  return fs
    .readdirSync(snapshotDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const absolutePath = getSnapshotFilePath(snapshotDir, entry.name);
      const stats = fs.statSync(absolutePath);
      return {
        fileName: entry.name,
        absolutePath,
        createdAtMs: stats.mtimeMs,
      };
    })
    .sort((left, right) => right.createdAtMs - left.createdAtMs);
}

function trimSnapshots(snapshotDir, maxSnapshots) {
  const entries = listSnapshotEntries(snapshotDir);
  for (const entry of entries.slice(maxSnapshots)) {
    fs.rmSync(entry.absolutePath, { force: true });
  }
}

function sanitizeSnapshotSegment(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function formatRuntimePerformanceSnapshotFileName(snapshot) {
  const timestamp = snapshot.createdAt.replace(/[:.]/g, '-');
  const source = sanitizeSnapshotSegment(snapshot.source ?? 'runtime');
  const trigger = sanitizeSnapshotSegment(snapshot.trigger ?? 'snapshot');
  return `${timestamp}-${source}-${trigger}.json`;
}

export function saveRuntimePerformanceSnapshot(
  snapshot,
  options = {}
) {
  const snapshotDir =
    options.snapshotDir ?? DEFAULT_RUNTIME_PERFORMANCE_SNAPSHOT_DIR;
  const maxSnapshots =
    options.maxSnapshots ?? MAX_RUNTIME_PERFORMANCE_SNAPSHOTS;
  ensureSnapshotDirectory(snapshotDir);
  const fileName = formatRuntimePerformanceSnapshotFileName(snapshot);
  fs.writeFileSync(
    getSnapshotFilePath(snapshotDir, fileName),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    'utf8'
  );
  trimSnapshots(snapshotDir, maxSnapshots);
  return fileName;
}

export function readRecentRuntimePerformanceSnapshots(options = {}) {
  const snapshotDir =
    options.snapshotDir ?? DEFAULT_RUNTIME_PERFORMANCE_SNAPSHOT_DIR;
  const limit = options.limit ?? MAX_RUNTIME_PERFORMANCE_SNAPSHOTS;
  return listSnapshotEntries(snapshotDir)
    .slice(0, limit)
    .map((entry) =>
      JSON.parse(fs.readFileSync(entry.absolutePath, 'utf8'))
    );
}
