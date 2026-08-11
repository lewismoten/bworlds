import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_CLIENT_ERROR_SNAPSHOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '.client-error-snapshots'
);

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
        updatedAtMs: stats.mtimeMs,
      };
    })
    .sort((left, right) => right.updatedAtMs - left.updatedAtMs);
}

export function formatClientErrorSnapshotFileName(snapshot) {
  return `${snapshot.messageHash}.json`;
}

export function saveClientErrorSnapshot(snapshot, options = {}) {
  const snapshotDir = options.snapshotDir ?? DEFAULT_CLIENT_ERROR_SNAPSHOT_DIR;
  ensureSnapshotDirectory(snapshotDir);
  const fileName = formatClientErrorSnapshotFileName(snapshot);
  fs.writeFileSync(
    getSnapshotFilePath(snapshotDir, fileName),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    'utf8'
  );
  return fileName;
}

export function readRecentClientErrorSnapshots(options = {}) {
  const snapshotDir = options.snapshotDir ?? DEFAULT_CLIENT_ERROR_SNAPSHOT_DIR;
  const limit =
    typeof options.limit === 'number' && Number.isFinite(options.limit)
      ? Math.max(1, Math.floor(options.limit))
      : 50;
  return listSnapshotEntries(snapshotDir)
    .slice(0, limit)
    .map((entry) => JSON.parse(fs.readFileSync(entry.absolutePath, 'utf8')));
}
