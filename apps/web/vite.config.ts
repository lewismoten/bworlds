import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { resolveDebugRouteRedirect } from './src/debug-route-aliases.ts';
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

  return {
    name: 'debug-route-redirect',
    configureServer(server: DebugRouteMiddlewareContainer) {
      server.middlewares.use((req, res, next) => {
        if (!redirect(req.url, res)) {
          next();
        }
      });
    },
    configurePreviewServer(server: DebugRouteMiddlewareContainer) {
      server.middlewares.use((req, res, next) => {
        if (!redirect(req.url, res)) {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [createDebugRouteRedirectPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: path.join(APP_DIR, 'index.html'),
        debug: path.join(APP_DIR, 'debug', 'index.html'),
        debugAlias: path.join(APP_DIR, 'debug.html'),
        debugMusic: path.join(APP_DIR, 'debug', 'music', 'index.html'),
        debugMusicAlias: path.join(APP_DIR, 'debug', 'music.html'),
        debugTrees: path.join(APP_DIR, 'debug', 'trees', 'index.html'),
        debugTreesAlias: path.join(APP_DIR, 'debug', 'trees.html'),
      },
    },
  },
  resolve: {
    alias: buildWorkspaceAliases(),
  },
});
