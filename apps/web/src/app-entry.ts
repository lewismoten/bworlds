import { resolveAppBootstrapRoute } from './app-bootstrap-route.ts';

async function bootstrap(): Promise<void> {
  const route = resolveAppBootstrapRoute(window.location);

  if (route.canonicalUrl) {
    window.history.replaceState(null, '', route.canonicalUrl);
  }

  switch (route.pagePath) {
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
