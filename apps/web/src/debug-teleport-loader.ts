type DebugTeleportModule = typeof import('./debug-teleport.ts');

let debugTeleportModulePromise: Promise<DebugTeleportModule> | null = null;

export function loadDebugTeleportModule(): Promise<DebugTeleportModule> {
  if (!debugTeleportModulePromise) {
    debugTeleportModulePromise = import('./debug-teleport.ts');
  }
  return debugTeleportModulePromise;
}

export async function listTileTeleportOptionsLazy(
  definitions: Parameters<DebugTeleportModule['listTileTeleportOptions']>[0]
): Promise<ReturnType<DebugTeleportModule['listTileTeleportOptions']>> {
  const module = await loadDebugTeleportModule();
  return module.listTileTeleportOptions(definitions);
}

export async function findRandomTileDestinationLazy(
  ...args: Parameters<DebugTeleportModule['findRandomTileDestination']>
): Promise<ReturnType<DebugTeleportModule['findRandomTileDestination']>> {
  const module = await loadDebugTeleportModule();
  return module.findRandomTileDestination(...args);
}
