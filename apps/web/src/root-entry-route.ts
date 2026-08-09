export const ROOT_ENTRY_PAGE_PATHS = [
  '/debug/',
  '/debug/music/',
  '/debug/trees/',
] as const;

export type RootEntryPagePath = (typeof ROOT_ENTRY_PAGE_PATHS)[number];

const ROOT_ENTRY_PAGE_PATH_SET = new Set<string>(ROOT_ENTRY_PAGE_PATHS);

const ROOT_ENTRY_PAGE_PATH_ALIASES = new Map<string, RootEntryPagePath>([
  ['/debug', '/debug/'],
  ['/debug/', '/debug/'],
  ['/debug.html', '/debug/'],
  ['/debug/index.html', '/debug/'],
  ['/debug/music', '/debug/music/'],
  ['/debug/music/', '/debug/music/'],
  ['/debug/music.html', '/debug/music/'],
  ['/debug/music/index.html', '/debug/music/'],
  ['/debug/trees', '/debug/trees/'],
  ['/debug/trees/', '/debug/trees/'],
  ['/debug/trees.html', '/debug/trees/'],
  ['/debug/trees/index.html', '/debug/trees/'],
]);

export function resolveRootEntryPagePath(
  pathname: string
): RootEntryPagePath | null {
  if (ROOT_ENTRY_PAGE_PATH_SET.has(pathname)) {
    return pathname as RootEntryPagePath;
  }

  return ROOT_ENTRY_PAGE_PATH_ALIASES.get(pathname) ?? null;
}
