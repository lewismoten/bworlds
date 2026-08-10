export const ROOT_ENTRY_PAGE_PATHS = [
  '/debug/',
  '/debug/audio/',
  '/debug/ambience/',
  '/debug/sounds/',
  '/debug/sound-bank/',
  '/debug/trees/',
] as const;

export type RootEntryPagePath = (typeof ROOT_ENTRY_PAGE_PATHS)[number];

type RootEntryRouteDefinition = {
  pagePath: RootEntryPagePath;
  aliases: readonly string[];
  entryHtmlPath: string;
};

export type ResolvedRootEntryRoute = {
  pagePath: RootEntryPagePath;
  canonicalPathname: string;
  entryHtmlPathname: string;
  matchedPathname: string;
  isAlias: boolean;
};

const ROOT_ENTRY_ROUTE_DEFINITIONS: readonly RootEntryRouteDefinition[] = [
  {
    pagePath: '/debug/',
    aliases: ['/debug', '/debug/', '/debug.html', '/debug/index.html'],
    entryHtmlPath: '/debug/index.html',
  },
  {
    pagePath: '/debug/audio/',
    aliases: [
      '/debug/audio',
      '/debug/audio/',
      '/debug/audio.html',
      '/debug/audio/index.html',
      '/debug/music',
      '/debug/music/',
      '/debug/music.html',
      '/debug/music/index.html',
    ],
    entryHtmlPath: '/debug/audio/index.html',
  },
  {
    pagePath: '/debug/ambience/',
    aliases: [
      '/debug/ambience',
      '/debug/ambience/',
      '/debug/ambience.html',
      '/debug/ambience/index.html',
    ],
    entryHtmlPath: '/debug/ambience/index.html',
  },
  {
    pagePath: '/debug/sounds/',
    aliases: [
      '/debug/sounds',
      '/debug/sounds/',
      '/debug/sounds.html',
      '/debug/sounds/index.html',
    ],
    entryHtmlPath: '/debug/sounds/index.html',
  },
  {
    pagePath: '/debug/sound-bank/',
    aliases: [
      '/debug/sound-bank',
      '/debug/sound-bank/',
      '/debug/sound-bank.html',
      '/debug/sound-bank/index.html',
    ],
    entryHtmlPath: '/debug/sound-bank/index.html',
  },
  {
    pagePath: '/debug/trees/',
    aliases: [
      '/debug/trees',
      '/debug/trees/',
      '/debug/trees.html',
      '/debug/trees/index.html',
    ],
    entryHtmlPath: '/debug/trees/index.html',
  },
];

function matchRouteSuffix(
  pathname: string,
  suffix: string
): { prefix: string } | null {
  if (pathname === suffix) {
    return { prefix: '' };
  }

  if (!pathname.endsWith(suffix)) {
    return null;
  }

  const prefix = pathname.slice(0, -suffix.length);
  return prefix.startsWith('/') ? { prefix } : null;
}

export function resolveRootEntryRoute(
  pathname: string
): ResolvedRootEntryRoute | null {
  for (const definition of ROOT_ENTRY_ROUTE_DEFINITIONS) {
    for (const alias of definition.aliases) {
      const match = matchRouteSuffix(pathname, alias);
      if (!match) {
        continue;
      }

      return {
        pagePath: definition.pagePath,
        canonicalPathname: `${match.prefix}${definition.pagePath}`,
        entryHtmlPathname: `${match.prefix}${definition.entryHtmlPath}`,
        matchedPathname: `${match.prefix}${alias}`,
        isAlias: alias !== definition.pagePath,
      };
    }
  }

  return null;
}

export function resolveRootEntryPagePath(
  pathname: string
): RootEntryPagePath | null {
  return resolveRootEntryRoute(pathname)?.pagePath ?? null;
}

export function resolveRootEntryHtmlPath(pathname: string): string | null {
  return resolveRootEntryRoute(pathname)?.entryHtmlPathname ?? null;
}
