import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_RUNTIME_PERFORMANCE_SNAPSHOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '.runtime-performance-snapshots'
);
const DEFAULT_RUNTIME_PERFORMANCE_ISSUE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '.runtime-performance-issues'
);
const MAX_RUNTIME_PERFORMANCE_SNAPSHOTS = 10;
const MAX_RUNTIME_PERFORMANCE_ISSUES = 25;

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
    .flatMap((entry) => {
      const absolutePath = getSnapshotFilePath(snapshotDir, entry.name);
      try {
        const stats = fs.statSync(absolutePath);
        return [
          {
            fileName: entry.name,
            absolutePath,
            createdAtMs: stats.mtimeMs,
          },
        ];
      } catch (error) {
        if (error?.code === 'ENOENT') {
          return [];
        }
        throw error;
      }
    })
    .sort((left, right) => right.createdAtMs - left.createdAtMs);
}

function readJsonSnapshotFile(absolutePath) {
  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function trimSnapshots(snapshotDir, maxSnapshots) {
  const entries = listSnapshotEntries(snapshotDir);
  for (const entry of entries.slice(maxSnapshots)) {
    fs.rmSync(entry.absolutePath, { force: true });
  }
}

function sanitizeSnapshotSegment(value) {
  return value
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatRuntimePerformanceSnapshotFileName(snapshot) {
  const timestamp = snapshot.createdAt.replace(/[:.]/g, '-');
  const source = sanitizeSnapshotSegment(snapshot.source ?? 'runtime');
  const trigger = sanitizeSnapshotSegment(snapshot.trigger ?? 'snapshot');
  return `${timestamp}-${source}-${trigger}.json`;
}

export function saveRuntimePerformanceSnapshot(snapshot, options = {}) {
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
    .map((entry) => readJsonSnapshotFile(entry.absolutePath))
    .filter((snapshot) => snapshot !== null);
}

export function formatRuntimePerformanceIssueFileName(issue) {
  const timestamp = issue.createdAt.replace(/[:.]/g, '-');
  const source = sanitizeSnapshotSegment(issue.source ?? 'runtime');
  const issueHash = sanitizeSnapshotSegment(issue.issueHash ?? 'issue');
  return `${timestamp}-${source}-${issueHash}.json`;
}

export function saveRuntimePerformanceIssue(issue, options = {}) {
  const snapshotDir =
    options.snapshotDir ?? DEFAULT_RUNTIME_PERFORMANCE_ISSUE_DIR;
  const maxSnapshots = options.maxSnapshots ?? MAX_RUNTIME_PERFORMANCE_ISSUES;
  ensureSnapshotDirectory(snapshotDir);
  const fileName = formatRuntimePerformanceIssueFileName(issue);
  fs.writeFileSync(
    getSnapshotFilePath(snapshotDir, fileName),
    `${JSON.stringify(issue, null, 2)}\n`,
    'utf8'
  );
  trimSnapshots(snapshotDir, maxSnapshots);
  return fileName;
}

export function readRecentRuntimePerformanceIssues(options = {}) {
  const snapshotDir =
    options.snapshotDir ?? DEFAULT_RUNTIME_PERFORMANCE_ISSUE_DIR;
  const limit = options.limit ?? MAX_RUNTIME_PERFORMANCE_ISSUES;
  return listSnapshotEntries(snapshotDir)
    .slice(0, limit)
    .map((entry) => readJsonSnapshotFile(entry.absolutePath))
    .filter((issue) => issue !== null);
}
