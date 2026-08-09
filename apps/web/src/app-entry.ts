import { redirectToCanonicalDebugRoute } from './debug-route-guard.ts';
import { resolveRootEntryPagePath } from './root-entry-route.ts';

async function bootstrap(): Promise<void> {
  if (redirectToCanonicalDebugRoute(window.location)) {
    return;
  }

  const pagePath = resolveRootEntryPagePath(window.location.pathname);
  switch (pagePath) {
    case '/debug/':
      await import('./debug-directory-page.ts');
      return;
    case '/debug/music/':
      await import('./music-debug-page.ts');
      return;
    case '/debug/trees/':
      await import('./tree-debug-page.ts');
      return;
    default:
      break;
  }

  await import('./main.ts');
}

void bootstrap();
