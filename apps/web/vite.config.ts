import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { resolveDebugRouteRedirect } from './src/debug-route-aliases.ts';
import { resolveRootEntryHtmlPath } from './src/root-entry-route.ts';
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

export default defineConfig({
  appType: 'mpa',
  plugins: [createDebugRouteRedirectPlugin()],
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
