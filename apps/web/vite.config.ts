import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import {
  readRecentClientErrorSnapshots,
  saveClientErrorSnapshot,
} from './client-error-snapshot-store.mjs';
import {
  readRecentRuntimePerformanceIssues,
  readRecentRuntimePerformanceSnapshots,
  saveRuntimePerformanceIssue,
  saveRuntimePerformanceSnapshot,
} from './runtime-performance-snapshot-store.mjs';
import { CLIENT_ERROR_SNAPSHOT_API_PATH } from './src/client-error-snapshot.ts';
import { resolveDebugRouteRedirect } from './src/debug-route-aliases.ts';
import { resolveRootEntryHtmlPath } from './src/root-entry-route.ts';
import { validateRuntimePerformanceSnapshot } from './src/runtime-performance-snapshot-validation.ts';
import { migrateRuntimePerformanceSnapshot } from './src/runtime-performance-snapshot-validation.ts';
import {
  RUNTIME_PERFORMANCE_SNAPSHOT_API_PATH,
  type RuntimePerformanceSnapshot,
} from './src/runtime-performance-tracking.ts';
import { RUNTIME_PERFORMANCE_ISSUE_API_PATH } from './src/runtime-performance-issue.ts';
import { buildWorkspaceAliases } from './vite.workspace.ts';

const APP_DIR = fileURLToPath(new URL('.', import.meta.url));

type DebugRouteResponse = {
  statusCode?: number;
  setHeader: (name: string, value: string) => void;
  end: () => void;
};

type DebugRouteRequest = {
  url?: string;
};

type DebugRouteMiddleware = (
  req: DebugRouteRequest,
  res: DebugRouteResponse,
  next: () => void
) => void;

type DebugRouteMiddlewareContainer = {
  middlewares: {
    use: (handler: DebugRouteMiddleware) => void;
  };
};

type RuntimeSnapshotRequest = IncomingMessage & {
  url?: string;
};

type RuntimeSnapshotResponse = ServerResponse<IncomingMessage>;

function createDebugRouteRedirectPlugin(): Plugin {
  const redirect = (
    url: string | undefined,
    res: DebugRouteResponse
  ): boolean => {
    const pathname = url ? new URL(url, 'http://localhost').pathname : '';
    const location = resolveDebugRouteRedirect(pathname);
    if (!location) {
      return false;
    }

    res.statusCode = 302;
    res.setHeader('Location', location);
    res.end();
    return true;
  };

  const rewrite = (req: DebugRouteRequest): boolean => {
    if (!req.url) {
      return false;
    }

    const requestUrl = new URL(req.url, 'http://localhost');
    const htmlPath = resolveRootEntryHtmlPath(requestUrl.pathname);
    if (!htmlPath) {
      return false;
    }

    requestUrl.pathname = htmlPath;
    req.url = `${requestUrl.pathname}${requestUrl.search}`;
    return true;
  };

  return {
    name: 'debug-route-redirect',
    configureServer(server: DebugRouteMiddlewareContainer) {
      server.middlewares.use((req, res, next) => {
        if (redirect(req.url, res)) {
          return;
        }

        rewrite(req);
        next();
      });
    },
    configurePreviewServer(server: DebugRouteMiddlewareContainer) {
      server.middlewares.use((req, res, next) => {
        if (redirect(req.url, res)) {
          return;
        }

        rewrite(req);
        next();
      });
    },
  };
}

function sendJson(
  res: RuntimeSnapshotResponse,
  statusCode: number,
  body: unknown
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}

function readJsonBody(req: RuntimeSnapshotRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    });
    req.on('end', () => {
      try {
        const trimmed = raw.trim();
        resolve(trimmed.length > 0 ? JSON.parse(trimmed) : null);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function createClientErrorSnapshotApiPlugin(): Plugin {
  const middleware = async (
    req: RuntimeSnapshotRequest,
    res: RuntimeSnapshotResponse,
    next: () => void
  ) => {
    const requestUrl = req.url ? new URL(req.url, 'http://localhost') : null;
    if (!requestUrl) {
      next();
      return;
    }

    if (requestUrl.pathname !== CLIENT_ERROR_SNAPSHOT_API_PATH) {
      next();
      return;
    }

    if (req.method === 'GET') {
      const limitParam = Number(requestUrl.searchParams.get('limit') ?? '50');
      const limit = Number.isFinite(limitParam)
        ? Math.max(1, Math.min(50, Math.floor(limitParam)))
        : 50;
      sendJson(res, 200, {
        snapshots: readRecentClientErrorSnapshots({ limit }),
      });
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, POST');
      res.end();
      return;
    }

    try {
      const snapshot = await readJsonBody(req);
      if (
        !snapshot ||
        typeof snapshot !== 'object' ||
        !('schemaVersion' in snapshot) ||
        !('createdAt' in snapshot) ||
        !('messageHash' in snapshot)
      ) {
        sendJson(res, 400, {
          error: 'Expected a client error snapshot JSON payload.',
        });
        return;
      }

      const fileName = saveClientErrorSnapshot(snapshot);
      sendJson(res, 201, {
        fileName,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown snapshot error.';
      const snapshotDirError =
        error instanceof Error &&
        (error.message.includes('ENOENT') || error.message.includes('EACCES'));
      sendJson(res, snapshotDirError ? 500 : 400, {
        error: message,
      });
    }
  };

  return {
    name: 'client-error-snapshot-api',
    configureServer(server: DebugRouteMiddlewareContainer) {
      server.middlewares.use((req, res, next) => {
        void middleware(
          req as RuntimeSnapshotRequest,
          res as RuntimeSnapshotResponse,
          next
        );
      });
    },
    configurePreviewServer(server: DebugRouteMiddlewareContainer) {
      server.middlewares.use((req, res, next) => {
        void middleware(
          req as RuntimeSnapshotRequest,
          res as RuntimeSnapshotResponse,
          next
        );
      });
    },
  };
}

function createRuntimePerformanceSnapshotApiPlugin(): Plugin {
  const middleware = async (
    req: RuntimeSnapshotRequest,
    res: RuntimeSnapshotResponse,
    next: () => void
  ) => {
    const requestUrl = req.url ? new URL(req.url, 'http://localhost') : null;
    if (!requestUrl) {
      next();
      return;
    }

    if (requestUrl.pathname !== RUNTIME_PERFORMANCE_SNAPSHOT_API_PATH) {
      next();
      return;
    }

    if (req.method === 'GET') {
      const limitParam = Number(requestUrl.searchParams.get('limit') ?? '10');
      const limit = Number.isFinite(limitParam)
        ? Math.max(1, Math.min(10, Math.floor(limitParam)))
        : 10;
      sendJson(res, 200, {
        snapshots: readRecentRuntimePerformanceSnapshots({ limit }),
      });
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, POST');
      res.end();
      return;
    }

    try {
      const snapshot = await readJsonBody(req);
      if (
        !snapshot ||
        typeof snapshot !== 'object' ||
        !('schemaVersion' in snapshot) ||
        !('createdAt' in snapshot)
      ) {
        sendJson(res, 400, {
          error: 'Expected a runtime performance snapshot JSON payload.',
        });
        return;
      }

      const migratedSnapshot = migrateRuntimePerformanceSnapshot(
        snapshot as RuntimePerformanceSnapshot
      );
      const validation = validateRuntimePerformanceSnapshot(migratedSnapshot);
      if (validation.errors.length > 0) {
        sendJson(res, 400, {
          error: validation.errors.join(' '),
        });
        return;
      }

      const fileName = saveRuntimePerformanceSnapshot(migratedSnapshot);
      sendJson(res, 201, {
        fileName,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown snapshot error.';
      const snapshotDirError =
        error instanceof Error &&
        (error.message.includes('ENOENT') || error.message.includes('EACCES'));
      sendJson(res, snapshotDirError ? 500 : 400, {
        error: message,
      });
    }
  };

  return {
    name: 'runtime-performance-snapshot-api',
    configureServer(server: DebugRouteMiddlewareContainer) {
      server.middlewares.use((req, res, next) => {
        void middleware(
          req as RuntimeSnapshotRequest,
          res as RuntimeSnapshotResponse,
          next
        );
      });
    },
    configurePreviewServer(server: DebugRouteMiddlewareContainer) {
      server.middlewares.use((req, res, next) => {
        void middleware(
          req as RuntimeSnapshotRequest,
          res as RuntimeSnapshotResponse,
          next
        );
      });
    },
  };
}

function createRuntimePerformanceIssueApiPlugin(): Plugin {
  const middleware = async (
    req: RuntimeSnapshotRequest,
    res: RuntimeSnapshotResponse,
    next: () => void
  ) => {
    const requestUrl = req.url ? new URL(req.url, 'http://localhost') : null;
    if (!requestUrl) {
      next();
      return;
    }

    if (requestUrl.pathname !== RUNTIME_PERFORMANCE_ISSUE_API_PATH) {
      next();
      return;
    }

    if (req.method === 'GET') {
      const limitParam = Number(requestUrl.searchParams.get('limit') ?? '10');
      const limit = Number.isFinite(limitParam)
        ? Math.max(1, Math.min(25, Math.floor(limitParam)))
        : 10;
      sendJson(res, 200, {
        issues: readRecentRuntimePerformanceIssues({ limit }),
      });
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, POST');
      res.end();
      return;
    }

    try {
      const issue = await readJsonBody(req);
      if (
        !issue ||
        typeof issue !== 'object' ||
        !('schemaVersion' in issue) ||
        !('createdAt' in issue) ||
        !('issueHash' in issue)
      ) {
        sendJson(res, 400, {
          error: 'Expected a runtime performance issue JSON payload.',
        });
        return;
      }

      const fileName = saveRuntimePerformanceIssue(issue);
      sendJson(res, 201, {
        fileName,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown issue error.';
      const snapshotDirError =
        error instanceof Error &&
        (error.message.includes('ENOENT') || error.message.includes('EACCES'));
      sendJson(res, snapshotDirError ? 500 : 400, {
        error: message,
      });
    }
  };

  return {
    name: 'runtime-performance-issue-api',
    configureServer(server: DebugRouteMiddlewareContainer) {
      server.middlewares.use((req, res, next) => {
        void middleware(
          req as RuntimeSnapshotRequest,
          res as RuntimeSnapshotResponse,
          next
        );
      });
    },
    configurePreviewServer(server: DebugRouteMiddlewareContainer) {
      server.middlewares.use((req, res, next) => {
        void middleware(
          req as RuntimeSnapshotRequest,
          res as RuntimeSnapshotResponse,
          next
        );
      });
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [
    createClientErrorSnapshotApiPlugin(),
    createRuntimePerformanceSnapshotApiPlugin(),
    createRuntimePerformanceIssueApiPlugin(),
    createDebugRouteRedirectPlugin(),
  ],
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        main: path.join(APP_DIR, 'index.html'),
        debug: path.join(APP_DIR, 'debug', 'index.html'),
        debugAlias: path.join(APP_DIR, 'debug.html'),
        debugAudio: path.join(APP_DIR, 'debug', 'audio', 'index.html'),
        debugAudioAlias: path.join(APP_DIR, 'debug', 'audio.html'),
        debugAmbience: path.join(APP_DIR, 'debug', 'ambience', 'index.html'),
        debugAmbienceAlias: path.join(APP_DIR, 'debug', 'ambience.html'),
        debugMusic: path.join(APP_DIR, 'debug', 'music', 'index.html'),
        debugMusicAlias: path.join(APP_DIR, 'debug', 'music.html'),
        debugSounds: path.join(APP_DIR, 'debug', 'sounds', 'index.html'),
        debugSoundsAlias: path.join(APP_DIR, 'debug', 'sounds.html'),
        debugTrees: path.join(APP_DIR, 'debug', 'trees', 'index.html'),
        debugTreesAlias: path.join(APP_DIR, 'debug', 'trees.html'),
      },
    },
  },
  resolve: {
    alias: buildWorkspaceAliases(),
  },
});
