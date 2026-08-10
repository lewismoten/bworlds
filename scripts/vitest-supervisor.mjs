import { execFile, spawn } from 'node:child_process';
import { open, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_SUITE_TIMEOUT_MS = 60_000;
const LOCK_FILE_NAME = '.vitest-full-suite.lock';
const TEST_FILE_PATTERN = /[A-Za-z0-9_./-]+\.test\.[cm]?[jt]sx?/g;

export function parseSupervisorArgs(argv) {
  const passthroughArgs = [];
  let suiteTimeoutMs = DEFAULT_SUITE_TIMEOUT_MS;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--suite-timeout-ms') {
      const value = Number(argv[index + 1] ?? '');
      if (Number.isFinite(value) && value > 0) {
        suiteTimeoutMs = value;
        index += 1;
        continue;
      }
    }
    passthroughArgs.push(arg);
  }

  const positionalArgs = passthroughArgs.filter((arg) => !arg.startsWith('-'));
  return {
    passthroughArgs,
    positionalArgs,
    suiteTimeoutMs,
    isFullSuiteRun: positionalArgs.length === 0,
  };
}

export function createVitestSupervisorState() {
  return {
    recentTestFiles: [],
    lastStartedTest: null,
    workerPids: [],
  };
}

export function updateVitestSupervisorState(state, line) {
  const fileMatches = line.match(TEST_FILE_PATTERN) ?? [];
  for (const match of fileMatches) {
    if (!state.recentTestFiles.includes(match)) {
      state.recentTestFiles.push(match);
      if (state.recentTestFiles.length > 8) {
        state.recentTestFiles.shift();
      }
    }
  }

  const verboseMatch = line.match(
    /^\s*[✓❯×↓]\s+([A-Za-z0-9_./-]+\.test\.[cm]?[jt]sx?)\s*>\s*(.+)$/
  );
  if (verboseMatch) {
    state.lastStartedTest = `${verboseMatch[1]} > ${verboseMatch[2]}`.trim();
    return;
  }

  const indentedTestMatch = line.match(/^\s+[✓❯×↓]\s+(.+?)\s*$/);
  if (indentedTestMatch && !indentedTestMatch[1]?.includes('.test.')) {
    state.lastStartedTest = indentedTestMatch[1] ?? state.lastStartedTest;
  }
}

export function parseProcessTable(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(.*)$/);
      if (!match) {
        return null;
      }
      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        command: match[3] ?? '',
      };
    })
    .filter((entry) => entry !== null);
}

export function collectDescendantProcessIds(processes, rootPid) {
  const parentToChildren = new Map();
  for (const entry of processes) {
    const children = parentToChildren.get(entry.ppid) ?? [];
    children.push(entry.pid);
    parentToChildren.set(entry.ppid, children);
  }

  const visited = new Set();
  const stack = [rootPid];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || visited.has(current)) {
      continue;
    }
    visited.add(current);
    const children = parentToChildren.get(current) ?? [];
    for (const child of children) {
      stack.push(child);
    }
  }

  visited.delete(rootPid);
  return [...visited].sort((left, right) => left - right);
}

export function buildHangDebugCommand(files) {
  const filtered = files.filter((file) => file.length > 0);
  if (filtered.length === 0) {
    return 'npm run test:hang-debug';
  }
  return `npm run test:hang-debug -- ${filtered.join(' ')}`;
}

function createLineBuffer(onLine) {
  let buffer = '';
  return (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      onLine(line);
    }
  };
}

async function acquireFullSuiteLock(lockFilePath) {
  const handle = await open(lockFilePath, 'wx');
  await handle.writeFile(
    JSON.stringify(
      {
        pid: process.pid,
        startedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  return async () => {
    await handle.close();
    await rm(lockFilePath, { force: true });
  };
}

async function readExistingLockMetadata(lockFilePath) {
  try {
    const contents = await readFile(lockFilePath, 'utf8');
    return JSON.parse(contents);
  } catch {
    return null;
  }
}

async function getWorkerPids(rootPid) {
  try {
    const { stdout } = await execFileAsync('ps', ['-Ao', 'pid=,ppid=,command=']);
    return collectDescendantProcessIds(parseProcessTable(stdout), rootPid);
  } catch {
    return [];
  }
}

function printTimeoutSummary(state, suiteTimeoutMs) {
  console.error(
    `Vitest supervisor: suite timeout exceeded after ${Math.round(
      suiteTimeoutMs / 1000
    )}s.`
  );
  console.error(
    `Vitest supervisor: active test files: ${
      state.recentTestFiles.join(', ') || 'none observed yet'
    }.`
  );
  console.error(
    `Vitest supervisor: last started test: ${
      state.lastStartedTest ?? 'none observed yet'
    }.`
  );
  console.error(
    `Vitest supervisor: worker PIDs: ${
      state.workerPids.join(', ') || 'none recorded'
    }.`
  );
  console.error(
    `Vitest supervisor: rerun likely hanging files with ${buildHangDebugCommand(
      state.recentTestFiles
    )}`
  );
}

async function killVitestProcessGroup(child) {
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
}

async function runVitest(argv = process.argv.slice(2)) {
  const args = parseSupervisorArgs(argv);
  const rootDir = process.cwd();
  const lockFilePath = path.join(rootDir, LOCK_FILE_NAME);
  let releaseLock = null;

  if (args.isFullSuiteRun) {
    try {
      releaseLock = await acquireFullSuiteLock(lockFilePath);
    } catch {
      const metadata = await readExistingLockMetadata(lockFilePath);
      const owner = metadata?.pid ? ` by PID ${metadata.pid}` : '';
      console.error(
        `Vitest supervisor: another full-suite run is already active${owner}. Wait for it to finish before starting a new one.`
      );
      return 1;
    }
  }

  const child = spawn('npm', ['exec', '--', 'vitest', 'run', '--reporter=verbose', ...args.passthroughArgs], {
    cwd: rootDir,
    env: process.env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const state = createVitestSupervisorState();
  const handleOutputLine = (line) => {
    updateVitestSupervisorState(state, line);
  };
  const stdoutBuffer = createLineBuffer((line) => {
    console.log(line);
    handleOutputLine(line);
  });
  const stderrBuffer = createLineBuffer((line) => {
    console.error(line);
    handleOutputLine(line);
  });

  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', stdoutBuffer);
  child.stderr?.on('data', stderrBuffer);

  if (args.isFullSuiteRun) {
    setTimeout(async () => {
      state.workerPids = await getWorkerPids(child.pid);
      if (state.workerPids.length > 0) {
        console.error(
          `Vitest supervisor: worker PIDs ${state.workerPids.join(', ')}.`
        );
      }
    }, 1_500).unref();
  }

  let timedOut = false;
  const suiteTimeout = args.isFullSuiteRun
    ? setTimeout(async () => {
      timedOut = true;
      state.workerPids = await getWorkerPids(child.pid);
        printTimeoutSummary(state, args.suiteTimeoutMs);
        await killVitestProcessGroup(child);
      }, args.suiteTimeoutMs)
    : null;
  suiteTimeout?.unref?.();

  const exitCode = await new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      if (signal && code === null) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
    child.on('error', () => resolve(1));
  });

  if (suiteTimeout !== null) {
    clearTimeout(suiteTimeout);
  }
  await releaseLock?.();

  if (timedOut) {
    return 1;
  }
  return exitCode;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runVitest().then((code) => {
    process.exitCode = code;
  });
}

export { runVitest };
