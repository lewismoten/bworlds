import {
  clearClientErrorSnapshots,
  removeClientErrorSnapshot,
} from '../apps/web/client-error-snapshot-store.mjs';

export function parseClientErrorSnapshotCleanupArgs(argv) {
  const [command, snapshotId] = argv;
  if (command === 'remove') {
    if (typeof snapshotId !== 'string' || snapshotId.trim().length === 0) {
      throw new Error(
        'Expected a client error snapshot id or file name for the remove command.'
      );
    }
    return {
      command,
      snapshotId: snapshotId.trim(),
    };
  }

  if (command === 'clear') {
    return {
      command,
    };
  }

  throw new Error('Expected one of: remove <snapshot-id>, clear');
}

export function runClientErrorSnapshotCleanup(argv = process.argv.slice(2)) {
  const parsed = parseClientErrorSnapshotCleanupArgs(argv);
  if (parsed.command === 'remove') {
    const removed = removeClientErrorSnapshot(parsed.snapshotId);
    if (!removed) {
      console.error(`Client error snapshot not found: ${parsed.snapshotId}`);
      return 1;
    }
    console.log(`Removed client error snapshot ${parsed.snapshotId}.`);
    return 0;
  }

  const removedCount = clearClientErrorSnapshots();
  console.log(`Removed ${removedCount} client error snapshot(s).`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = runClientErrorSnapshotCleanup();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
