export const PLUGIN_EVENT_TYPES = {
  ERROR: 'error',
} as const;

export const PLUGIN_EVENT_SEVERITIES = ['error', 'warning', 'info'] as const;

export type PluginEventType = string;

export type PluginEventSeverity =
  (typeof PLUGIN_EVENT_SEVERITIES)[number] | string;

export type PluginEventDetails =
  | null
  | boolean
  | number
  | string
  | readonly PluginEventDetails[]
  | {
      readonly [key: string]: PluginEventDetails;
    };

export type PluginEvent = Readonly<{
  type: PluginEventType;
  source: string;
  message: string;
  details?: PluginEventDetails;
  timestamp?: string;
  severity?: PluginEventSeverity;
}>;

export type PublishPluginEventInput = {
  type: PluginEventType;
  source: string;
  message: string;
  details?: unknown;
  timestamp?: string;
  severity?: PluginEventSeverity;
};

export type PublishPluginErrorInput = {
  source: string;
  message: string;
  error?: unknown;
  details?: unknown;
  timestamp?: string;
  severity?: PluginEventSeverity;
};

export type PluginEventListener = (event: PluginEvent) => void;

export type PluginEventHistoryFilter = {
  type?: string;
  source?: string;
  limit?: number;
};

export type PluginEventDetailsSerializationOptions = {
  maxDepth?: number;
  maxEntriesPerLevel?: number;
  maxStringLength?: number;
};

export type CreatePluginEventChannelOptions =
  PluginEventDetailsSerializationOptions & {
    maxHistory?: number;
    now?: () => Date;
    onListenerError?: (
      error: unknown,
      event: PluginEvent,
      listener: PluginEventListener
    ) => void;
  };

export type PluginEventChannel = {
  publish(event: PublishPluginEventInput): PluginEvent;
  publishError(input: PublishPluginErrorInput): PluginEvent;
  subscribe(listener: PluginEventListener): () => void;
  subscribeByType(type: string, listener: PluginEventListener): () => void;
  subscribeBySource(source: string, listener: PluginEventListener): () => void;
  getRecentEvents(filter?: PluginEventHistoryFilter): readonly PluginEvent[];
  clearHistory(): void;
};

const DEFAULT_MAX_HISTORY = 100;
const DEFAULT_MAX_DETAIL_DEPTH = 4;
const DEFAULT_MAX_DETAIL_ENTRIES_PER_LEVEL = 24;
const DEFAULT_MAX_STRING_LENGTH = 240;
const MAX_PLUGIN_EVENT_MESSAGE_LENGTH = 80;
const TRUNCATED_DETAILS_KEY = '__truncated';
const UNSUPPORTED_DETAILS_KEY = '__unsupported';
const OMITTED_VALUE = Symbol('omitted-plugin-event-detail');

type PluginEventRegistration = {
  listener: PluginEventListener;
  type: string | null;
  source: string | null;
};

export function createPluginEventChannel(
  options: CreatePluginEventChannelOptions = {}
): PluginEventChannel {
  const registrations: PluginEventRegistration[] = [];
  const history: PluginEvent[] = [];
  const activePublishKeys = new Set<string>();
  const maxHistory = normalizePositiveInteger(
    options.maxHistory,
    DEFAULT_MAX_HISTORY
  );

  return {
    publish(eventInput) {
      const event = normalizePluginEvent(eventInput, options);
      const publishKey = createPluginEventPublishKey(event);
      if (activePublishKeys.has(publishKey)) {
        return event;
      }

      history.unshift(event);
      if (history.length > maxHistory) {
        history.length = maxHistory;
      }

      activePublishKeys.add(publishKey);
      try {
        for (const registration of registrations) {
          if (
            (registration.type && registration.type !== event.type) ||
            (registration.source && registration.source !== event.source)
          ) {
            continue;
          }
          try {
            registration.listener(event);
          } catch (error) {
            options.onListenerError?.(error, event, registration.listener);
          }
        }
      } finally {
        activePublishKeys.delete(publishKey);
      }

      return event;
    },
    publishError(input) {
      const details =
        input.error === undefined
          ? input.details
          : {
              error: input.error,
              details: input.details,
            };

      return this.publish({
        type: PLUGIN_EVENT_TYPES.ERROR,
        source: input.source,
        message: input.message,
        details,
        timestamp: input.timestamp,
        severity: input.severity ?? PLUGIN_EVENT_TYPES.ERROR,
      });
    },
    subscribe(listener) {
      return registerPluginEventListener(registrations, {
        listener,
        type: null,
        source: null,
      });
    },
    subscribeByType(type, listener) {
      validatePluginEventType(type);
      return registerPluginEventListener(registrations, {
        listener,
        type,
        source: null,
      });
    },
    subscribeBySource(source, listener) {
      validatePluginEventSource(source);
      return registerPluginEventListener(registrations, {
        listener,
        type: null,
        source,
      });
    },
    getRecentEvents(filter = {}) {
      const limit = normalizePositiveInteger(filter.limit, history.length);
      const type =
        typeof filter.type === 'string' && filter.type.trim().length > 0
          ? filter.type.trim()
          : null;
      const source =
        typeof filter.source === 'string' && filter.source.trim().length > 0
          ? filter.source.trim()
          : null;

      return history
        .filter(
          (event) =>
            (type === null || event.type === type) &&
            (source === null || event.source === source)
        )
        .slice(0, limit);
    },
    clearHistory() {
      history.length = 0;
    },
  };
}

export function serializePluginEventDetails(
  value: unknown,
  options: PluginEventDetailsSerializationOptions = {}
): PluginEventDetails | undefined {
  const result = serializePluginEventDetailsValue(
    value,
    {
      maxDepth: normalizePositiveInteger(
        options.maxDepth,
        DEFAULT_MAX_DETAIL_DEPTH
      ),
      maxEntriesPerLevel: normalizePositiveInteger(
        options.maxEntriesPerLevel,
        DEFAULT_MAX_DETAIL_ENTRIES_PER_LEVEL
      ),
      maxStringLength: normalizePositiveInteger(
        options.maxStringLength,
        DEFAULT_MAX_STRING_LENGTH
      ),
    },
    0,
    new WeakSet<object>()
  );

  return result === OMITTED_VALUE ? undefined : result;
}

function normalizePluginEvent(
  input: PublishPluginEventInput,
  options: CreatePluginEventChannelOptions
): PluginEvent {
  validatePluginEventType(input.type);
  validatePluginEventSource(input.source);
  validatePluginEventMessage(input.message);

  const timestamp =
    typeof input.timestamp === 'string' && input.timestamp.trim().length > 0
      ? input.timestamp.trim()
      : options.now
        ? options.now().toISOString()
        : undefined;
  const severity =
    typeof input.severity === 'string' && input.severity.trim().length > 0
      ? input.severity.trim()
      : undefined;
  const serializedDetails = serializePluginEventDetails(input.details, options);

  const event: PluginEvent = {
    type: input.type.trim(),
    source: input.source.trim(),
    message: input.message.trim(),
    ...(timestamp ? { timestamp } : {}),
    ...(severity ? { severity } : {}),
    ...(serializedDetails !== undefined ? { details: serializedDetails } : {}),
  };

  return freezePluginEvent(event);
}

function registerPluginEventListener(
  registrations: PluginEventRegistration[],
  next: PluginEventRegistration
): () => void {
  const existingIndex = registrations.findIndex(
    (registration) =>
      registration.listener === next.listener &&
      registration.type === next.type &&
      registration.source === next.source
  );
  if (existingIndex >= 0) {
    return () => {};
  }

  registrations.push(next);
  let active = true;

  return () => {
    if (!active) {
      return;
    }
    active = false;
    const index = registrations.indexOf(next);
    if (index >= 0) {
      registrations.splice(index, 1);
    }
  };
}

function validatePluginEventType(type: string): void {
  if (!isValidPluginEventToken(type)) {
    throw new Error(
      'Plugin event type must be a non-empty stable token using letters, numbers, "-", "_", ".", ":", or "/".'
    );
  }
}

function validatePluginEventSource(source: string): void {
  if (!isValidPluginEventToken(source)) {
    throw new Error(
      'Plugin event source must be a non-empty stable token using letters, numbers, "-", "_", ".", ":", or "/".'
    );
  }
}

function validatePluginEventMessage(message: string): void {
  const normalized = message.trim();
  if (normalized.length === 0) {
    throw new Error('Plugin event message must be a non-empty string.');
  }
  if (normalized.length > MAX_PLUGIN_EVENT_MESSAGE_LENGTH) {
    throw new Error(
      `Plugin event message must not exceed ${MAX_PLUGIN_EVENT_MESSAGE_LENGTH} characters.`
    );
  }
}

function isValidPluginEventToken(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9._:/-]*[a-z0-9])?$/iu.test(value.trim());
}

function freezePluginEvent(event: PluginEvent): PluginEvent {
  if (event.details !== undefined) {
    freezePluginEventDetails(event.details);
  }
  return Object.freeze(event);
}

function createPluginEventPublishKey(event: PluginEvent): string {
  return `${event.type}\u0000${event.source}\u0000${event.message}`;
}

function freezePluginEventDetails(value: PluginEventDetails): void {
  if (!value || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(freezePluginEventDetails);
    Object.freeze(value);
    return;
  }
  Object.values(value).forEach((entry) => {
    if (entry !== undefined) {
      freezePluginEventDetails(entry);
    }
  });
  Object.freeze(value);
}

function serializePluginEventDetailsValue(
  value: unknown,
  options: Required<PluginEventDetailsSerializationOptions>,
  depth: number,
  seen: WeakSet<object>
): PluginEventDetails | typeof OMITTED_VALUE {
  if (
    value == null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value as null | boolean | number;
  }
  if (typeof value === 'string') {
    return truncatePluginEventString(value, options.maxStringLength);
  }
  if (typeof value === 'bigint') {
    return truncatePluginEventString(String(value), options.maxStringLength);
  }
  if (
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'undefined'
  ) {
    return OMITTED_VALUE;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    const errorDetails: Record<string, PluginEventDetails> = {
      name: truncatePluginEventString(value.name, options.maxStringLength),
      message: truncatePluginEventString(
        value.message,
        options.maxStringLength
      ),
    };
    if (value.stack) {
      errorDetails.stack = truncatePluginEventString(
        value.stack,
        options.maxStringLength
      );
    }
    if ('cause' in value && value.cause !== undefined) {
      const cause = serializePluginEventDetailsValue(
        value.cause,
        options,
        depth + 1,
        seen
      );
      if (cause !== OMITTED_VALUE) {
        errorDetails.cause = cause;
      }
    }
    return errorDetails;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    try {
      if (depth >= options.maxDepth) {
        return {
          [TRUNCATED_DETAILS_KEY]: true,
        };
      }
      if (Array.isArray(value)) {
        const next: PluginEventDetails[] = [];
        const limit = Math.min(value.length, options.maxEntriesPerLevel);
        for (let index = 0; index < limit; index += 1) {
          const entry = serializePluginEventDetailsValue(
            value[index],
            options,
            depth + 1,
            seen
          );
          if (entry !== OMITTED_VALUE) {
            next.push(entry);
          }
        }
        if (value.length > limit) {
          next.push({
            [TRUNCATED_DETAILS_KEY]: true,
          });
        }
        return next;
      }

      const constructorName =
        (value as { constructor?: { name?: string } }).constructor?.name ??
        'Object';
      if (constructorName !== 'Object') {
        return {
          [UNSUPPORTED_DETAILS_KEY]: constructorName,
        };
      }

      const entries = Object.entries(value as Record<string, unknown>);
      const next: Record<string, PluginEventDetails> = {};
      const limit = Math.min(entries.length, options.maxEntriesPerLevel);
      for (let index = 0; index < limit; index += 1) {
        const [key, entryValue] = entries[index]!;
        const entry = serializePluginEventDetailsValue(
          entryValue,
          options,
          depth + 1,
          seen
        );
        if (entry !== OMITTED_VALUE) {
          next[key] = entry;
        }
      }
      if (entries.length > limit) {
        next[TRUNCATED_DETAILS_KEY] = true;
      }
      return next;
    } finally {
      seen.delete(value);
    }
  }

  return truncatePluginEventString(String(value), options.maxStringLength);
}

function truncatePluginEventString(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 1))}\u2026`
    : value;
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number
): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}
