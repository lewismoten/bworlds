import type { installClientErrorSnapshotReporter } from './client-error-snapshot.ts';

type ClientErrorSnapshotReporterInstallOptions = Parameters<
  typeof installClientErrorSnapshotReporter
>[0];

type ClientErrorSnapshotReporterModule = Pick<
  typeof import('./client-error-snapshot.ts'),
  'installClientErrorSnapshotReporter'
>;

type LoadClientErrorSnapshotReporterModule =
  () => Promise<ClientErrorSnapshotReporterModule>;

const defaultLoadClientErrorSnapshotReporterModule: LoadClientErrorSnapshotReporterModule =
  () => import('./client-error-snapshot.ts');

export function installDeferredClientErrorSnapshotReporter(
  options: ClientErrorSnapshotReporterInstallOptions,
  {
    consoleRef = console,
    loadModule = defaultLoadClientErrorSnapshotReporterModule,
  }: {
    consoleRef?: Pick<typeof console, 'error'>;
    loadModule?: LoadClientErrorSnapshotReporterModule;
  } = {}
): () => void {
  let cleanedUp = false;
  let installedCleanup: (() => void) | null = null;

  void loadModule()
    .then((module) => {
      if (cleanedUp) {
        return;
      }
      installedCleanup = module.installClientErrorSnapshotReporter(options);
    })
    .catch((error) => {
      if (cleanedUp) {
        return;
      }
      consoleRef.error('Failed to load client error snapshot reporter.', error);
    });

  return () => {
    cleanedUp = true;
    installedCleanup?.();
  };
}
