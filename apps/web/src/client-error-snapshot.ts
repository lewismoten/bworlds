import {
  normalizeRuntimePerformanceTrackingPreferences,
  type RuntimePerformanceTrackingPreferences,
} from './runtime-performance-tracking.ts';

export const CLIENT_ERROR_SNAPSHOT_API_PATH = '/api/client-error-snapshots';

export type ClientErrorSnapshot = {
  schemaVersion: 1;
  createdAt: string;
  message: string;
  stack: string | null;
  source: string | null;
  pageUrl: string;
  details: string | null;
  messageHash: string;
};

type ClientErrorSnapshotBuildOptions = {
  error: unknown;
  source?: string | null;
  pageUrl: string;
  createdAt?: Date;
};

type ClientErrorSnapshotReporterOptions = {
  tracking:
    | RuntimePerformanceTrackingPreferences
    | { runtimePerformanceTrackingEnabled?: boolean }
    | boolean
    | null
    | undefined
    | (() =>
        RuntimePerformanceTrackingPreferences | boolean | null | undefined);
  fetchImpl?: typeof fetch | null;
  endpoint?: string;
  eventTarget?: {
    addEventListener: (
      type: string,
      listener: (event: unknown) => void,
      options?: { capture?: boolean; signal?: AbortSignal }
    ) => void;
    removeEventListener?: (
      type: string,
      listener: (event: unknown) => void
    ) => void;
  } | null;
  consoleRef?: Pick<typeof console, 'error'>;
  getPageUrl?: () => string;
  abortSignal?: AbortSignal | null;
  scheduleRethrow?: (value: unknown) => void;
};

type NormalizedClientErrorValue = {
  message: string;
  stack: string | null;
  details: string | null;
};

export function buildClientErrorSnapshot(
  options: ClientErrorSnapshotBuildOptions
): ClientErrorSnapshot {
  const normalized = normalizeClientErrorValue(options.error);
  return {
    schemaVersion: 1,
    createdAt: (options.createdAt ?? new Date()).toISOString(),
    message: normalized.message,
    stack: normalized.stack,
    source: options.source ?? null,
    pageUrl: options.pageUrl,
    details: normalized.details,
    messageHash: createClientErrorSnapshotMessageHash(normalized.message),
  };
}

function normalizeClientErrorValue(value: unknown): NormalizedClientErrorValue {
  if (value instanceof Error) {
    return {
      message: value.message || value.name || 'Error',
      stack: value.stack ?? null,
      details: value.name && value.name !== 'Error' ? value.name : null,
    };
  }

  if (typeof value === 'string') {
    return {
      message: value,
      stack: null,
      details: 'Thrown non-Error string value.',
    };
  }

  const detail = safeSerializeClientErrorValue(value);
  return {
    message: `Non-Error value: ${detail}`,
    stack: null,
    details: detail,
  };
}

export function createClientErrorSnapshotMessageHash(message: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < message.length; index += 1) {
    hash ^= message.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export async function postClientErrorSnapshot(
  snapshot: ClientErrorSnapshot,
  options: {
    endpoint?: string;
    fetchImpl?: typeof fetch | null;
  } = {}
): Promise<boolean> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch ?? null;
  if (!fetchImpl) {
    return false;
  }

  try {
    const response = await fetchImpl(
      options.endpoint ?? CLIENT_ERROR_SNAPSHOT_API_PATH,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snapshot),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export function installClientErrorSnapshotReporter(
  options: ClientErrorSnapshotReporterOptions
): () => void {
  const eventTarget = options.eventTarget ?? null;
  const consoleRef = options.consoleRef ?? console;
  const getPageUrl =
    options.getPageUrl ?? (() => globalThis.location?.href ?? 'about:blank');
  const scheduleRethrow =
    options.scheduleRethrow ??
    ((value: unknown) => {
      queueMicrotask(() => {
        throw value;
      });
    });
  const originalConsoleError = consoleRef.error.bind(consoleRef);
  let cleanedUp = false;
  let reporting = false;
  let reportQueue = Promise.resolve();
  const suppressedRethrowObjects = new WeakSet<object>();
  const suppressedRethrowPrimitives: unknown[] = [];

  const resolveTracking = (): RuntimePerformanceTrackingPreferences => {
    const trackingValue =
      typeof options.tracking === 'function'
        ? options.tracking()
        : options.tracking;
    if (
      trackingValue &&
      typeof trackingValue === 'object' &&
      'enabled' in trackingValue &&
      typeof trackingValue.enabled === 'boolean'
    ) {
      return {
        enabled: trackingValue.enabled,
      };
    }
    let normalizedTrackingValue:
      | boolean
      | { runtimePerformanceTrackingEnabled?: boolean }
      | null
      | undefined;
    if (
      typeof trackingValue === 'boolean' ||
      typeof trackingValue === 'undefined' ||
      trackingValue === null
    ) {
      normalizedTrackingValue = trackingValue as boolean | null | undefined;
    } else if (
      typeof trackingValue === 'object' &&
      'runtimePerformanceTrackingEnabled' in trackingValue
    ) {
      normalizedTrackingValue = {
        runtimePerformanceTrackingEnabled:
          trackingValue.runtimePerformanceTrackingEnabled,
      };
    } else {
      normalizedTrackingValue = undefined;
    }
    return normalizeRuntimePerformanceTrackingPreferences(
      normalizedTrackingValue
    );
  };

  const reportErrorValue = async (
    value: unknown,
    source: string | null
  ): Promise<void> => {
    if (cleanedUp || !resolveTracking().enabled) {
      return;
    }

    const run = async (): Promise<void> => {
      if (cleanedUp || reporting || !resolveTracking().enabled) {
        return;
      }

      reporting = true;
      try {
        const snapshot = buildClientErrorSnapshot({
          error: value,
          source,
          pageUrl: getPageUrl(),
        });
        await postClientErrorSnapshot(snapshot, {
          endpoint: options.endpoint,
          fetchImpl: options.fetchImpl,
        });
      } finally {
        reporting = false;
      }
    };

    const queued = reportQueue.then(run, run);
    reportQueue = queued.catch(() => {});
    await queued;
  };

  const isSuppressibleRethrowValue = (
    value: unknown
  ): value is object | ((...args: never[]) => unknown) =>
    (typeof value === 'object' && value !== null) ||
    typeof value === 'function';

  const suppressNextRethrow = (value: unknown): void => {
    if (isSuppressibleRethrowValue(value)) {
      suppressedRethrowObjects.add(value);
      return;
    }
    suppressedRethrowPrimitives.push(value);
  };

  const consumeSuppressedRethrow = (value: unknown): boolean => {
    if (isSuppressibleRethrowValue(value)) {
      if (!suppressedRethrowObjects.has(value)) {
        return false;
      }
      suppressedRethrowObjects.delete(value);
      return true;
    }

    const index = suppressedRethrowPrimitives.findIndex((entry) =>
      Object.is(entry, value)
    );
    if (index < 0) {
      return false;
    }
    suppressedRethrowPrimitives.splice(index, 1);
    return true;
  };

  const scheduleUnhandledRethrow = (value: unknown): void => {
    suppressNextRethrow(value);
    scheduleRethrow(value);
  };

  const handleErrorEvent = (event: unknown): void => {
    const errorEvent = event as {
      error?: unknown;
      message?: unknown;
      filename?: unknown;
      lineno?: unknown;
      colno?: unknown;
      preventDefault?: () => void;
    };
    const errorValue =
      typeof errorEvent.error !== 'undefined'
        ? errorEvent.error
        : errorEvent.message;
    if (consumeSuppressedRethrow(errorValue)) {
      return;
    }
    if (!resolveTracking().enabled) {
      return;
    }
    const location =
      typeof errorEvent.filename === 'string' && errorEvent.filename.length > 0
        ? `${errorEvent.filename}:${typeof errorEvent.lineno === 'number' ? errorEvent.lineno : 0}:${typeof errorEvent.colno === 'number' ? errorEvent.colno : 0}`
        : 'window.error';
    errorEvent.preventDefault?.();
    void reportErrorValue(errorValue, location).finally(() => {
      scheduleUnhandledRethrow(errorValue);
    });
  };

  const handleUnhandledRejection = (event: unknown): void => {
    const rejectionEvent = event as {
      reason?: unknown;
      preventDefault?: () => void;
    };
    if (consumeSuppressedRethrow(rejectionEvent.reason)) {
      return;
    }
    if (!resolveTracking().enabled) {
      return;
    }
    rejectionEvent.preventDefault?.();
    void reportErrorValue(rejectionEvent.reason, 'unhandledrejection').finally(
      () => {
        scheduleUnhandledRethrow(rejectionEvent.reason);
      }
    );
  };

  consoleRef.error = ((...args: unknown[]) => {
    originalConsoleError(...args);
    if (cleanedUp || reporting) {
      return;
    }

    const errorValue =
      args.find((value) => value instanceof Error) ??
      args[0] ??
      'console.error called without arguments';
    void reportErrorValue(errorValue, 'console.error');
  }) as typeof consoleRef.error;

  if (eventTarget) {
    eventTarget.addEventListener('error', handleErrorEvent, {
      capture: true,
      ...(options.abortSignal ? { signal: options.abortSignal } : {}),
    });
    eventTarget.addEventListener(
      'unhandledrejection',
      handleUnhandledRejection,
      {
        ...(options.abortSignal ? { signal: options.abortSignal } : {}),
      }
    );
  }

  const cleanup = (): void => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    consoleRef.error = originalConsoleError as typeof consoleRef.error;
    if (!options.abortSignal && eventTarget?.removeEventListener) {
      eventTarget.removeEventListener('error', handleErrorEvent);
      eventTarget.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    }
  };

  options.abortSignal?.addEventListener('abort', cleanup, { once: true });
  return cleanup;
}

function safeSerializeClientErrorValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'undefined') {
    return 'undefined';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'bigint') {
    return `${value.toString()}n`;
  }
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (typeof value === 'function') {
    return `[function ${value.name || 'anonymous'}]`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
