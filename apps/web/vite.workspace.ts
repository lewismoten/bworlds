import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type WorkspacePackageManifest = {
  name?: string;
  exports?: string | Record<string, string>;
};

const APP_DIR = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = path.resolve(APP_DIR, '../..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

export function buildWorkspaceAliases() {
  const aliases: Record<string, string> = {
    '@bworlds/app': path.join(APP_DIR, 'src', 'main.ts'),
  };

  for (const packageDir of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!packageDir.isDirectory()) continue;
    const manifestPath = path.join(PACKAGES_DIR, packageDir.name, 'package.json');
    if (!existsSync(manifestPath)) continue;

    const manifest = JSON.parse(
      readFileSync(manifestPath, 'utf8')
    ) as WorkspacePackageManifest;
    if (!manifest.name?.startsWith('@bworlds/')) continue;

    const exportPath = resolvePackageExportPath(manifest.exports);
    if (!exportPath) continue;

    aliases[manifest.name] = path.resolve(
      path.dirname(manifestPath),
      exportPath
    );
  }

  return aliases;
}

function resolvePackageExportPath(exportsField: WorkspacePackageManifest['exports']) {
  if (typeof exportsField === 'string') {
    return exportsField;
  }
  if (exportsField && typeof exportsField['.'] === 'string') {
    return exportsField['.'];
  }
  return null;
}
