import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const WEB_APP_DIR = path.join(ROOT_DIR, 'apps', 'web');
const DEFAULT_PORT = 5173;
const PID_FILE_PATH = path.join(tmpdir(), 'bworlds-web-vite-dev.pid');

export function parseListeningPidList(stdout) {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('p'))
    .map((line) => Number.parseInt(line.slice(1), 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

export function parsePathField(stdout) {
  const pathLine = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.startsWith('n'));
  return pathLine ? path.normalize(pathLine.slice(1)) : null;
}

export function resolveRestartTargets({
  appDir,
  listeningPids,
  managedPid,
  processInfoByPid,
}) {
  const restartablePids = [];
  const blockingPids = [];

  for (const pid of listeningPids) {
    if (pid === managedPid) {
      restartablePids.push(pid);
      continue;
    }

    const info = processInfoByPid.get(pid);
    if (info?.cwd && path.normalize(info.cwd) === path.normalize(appDir)) {
      restartablePids.push(pid);
      continue;
    }

    blockingPids.push({
      pid,
      command: info?.command ?? null,
      cwd: info?.cwd ?? null,
    });
  }

  return {
    restartablePids,
    blockingPids,
  };
}

function runCommand(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function readManagedPid(pidFilePath = PID_FILE_PATH) {
  try {
    const pid = Number.parseInt(
      process.getBuiltinModule('node:fs').readFileSync(pidFilePath, 'utf8'),
      10
    );
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function writeManagedPid(pid, pidFilePath = PID_FILE_PATH) {
  process
    .getBuiltinModule('node:fs')
    .writeFileSync(pidFilePath, `${pid}\n`, 'utf8');
}

function removeManagedPid(pidFilePath = PID_FILE_PATH) {
  try {
    process.getBuiltinModule('node:fs').unlinkSync(pidFilePath);
  } catch {
    return;
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function findListeningPids(port) {
  const result = runCommand('lsof', [
    '-nP',
    `-iTCP:${port}`,
    '-sTCP:LISTEN',
    '-Fp',
  ]);
  if (result.status !== 0) {
    return [];
  }
  return parseListeningPidList(result.stdout);
}

function readProcessCommand(pid) {
  const result = runCommand('ps', ['-o', 'command=', '-p', `${pid}`]);
  if (result.status !== 0) {
    return null;
  }
  const command = result.stdout.trim();
  return command.length > 0 ? command : null;
}

function readProcessCwd(pid) {
  const result = runCommand('lsof', ['-a', '-p', `${pid}`, '-d', 'cwd', '-Fn']);
  if (result.status !== 0) {
    return null;
  }
  return parsePathField(result.stdout);
}

function waitForProcessExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return true;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
  return !isProcessAlive(pid);
}

function killProcessGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
    return true;
  } catch {
    return false;
  }
}

function killProcess(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

function stopPid(pid) {
  if (!isProcessAlive(pid)) {
    return;
  }

  if (!killProcessGroup(pid, 'SIGTERM')) {
    killProcess(pid, 'SIGTERM');
  }
  if (waitForProcessExit(pid, 2_000)) {
    return;
  }

  if (!killProcessGroup(pid, 'SIGKILL')) {
    killProcess(pid, 'SIGKILL');
  }
  waitForProcessExit(pid, 1_000);
}

function ensureRestartablePort(port, appDir) {
  const managedPid = readManagedPid();
  const listeningPids = findListeningPids(port);
  const processInfoByPid = new Map(
    listeningPids.map((pid) => [
      pid,
      {
        command: readProcessCommand(pid),
        cwd: readProcessCwd(pid),
      },
    ])
  );
  const { restartablePids, blockingPids } = resolveRestartTargets({
    appDir,
    listeningPids,
    managedPid,
    processInfoByPid,
  });

  for (const pid of new Set([managedPid, ...restartablePids].filter(Boolean))) {
    stopPid(pid);
  }

  if (blockingPids.length === 0) {
    return;
  }

  const details = blockingPids
    .map(({ pid, command, cwd }) => {
      const commandDetail = command ? ` command=${command}` : '';
      const cwdDetail = cwd ? ` cwd=${cwd}` : '';
      return `PID ${pid}${commandDetail}${cwdDetail}`;
    })
    .join('; ');
  throw new Error(
    `Port ${port} is already in use by a process outside ${appDir}. ${details}`
  );
}

async function main(argv = process.argv.slice(2)) {
  const port = Number.parseInt(process.env.PORT ?? '', 10) || DEFAULT_PORT;
  ensureRestartablePort(port, WEB_APP_DIR);

  const child = spawn(
    'npm',
    ['exec', '--', 'vite', '--strictPort', '--port', `${port}`, ...argv],
    {
      cwd: WEB_APP_DIR,
      detached: true,
      stdio: 'inherit',
    }
  );

  writeManagedPid(child.pid);

  const cleanExit = () => {
    removeManagedPid();
  };
  const forwardSignal = (exitCode) => {
    stopPid(child.pid);
    cleanExit();
    process.exit(exitCode);
  };

  process.on('SIGINT', () => {
    forwardSignal(130);
  });
  process.on('SIGTERM', () => {
    forwardSignal(143);
  });
  process.on('exit', cleanExit);

  child.on('exit', (code, signal) => {
    cleanExit();
    if (signal) {
      process.exit(1);
      return;
    }
    process.exit(code ?? 0);
  });
}

const executedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executedDirectly) {
  try {
    await main();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to start dev server.';
    console.error(message);
    process.exit(1);
  }
}
