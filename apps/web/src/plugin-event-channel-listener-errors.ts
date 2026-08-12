import type {
  CreatePluginEventChannelOptions,
  PluginEvent,
  PluginEventListener,
} from '@bworlds/plugin-event-channel';

export function createPluginEventChannelListenerErrorHandler(
  consoleRef: Pick<typeof console, 'error'> = console
): NonNullable<CreatePluginEventChannelOptions['onListenerError']> {
  return (
    error: unknown,
    event: PluginEvent,
    listener: PluginEventListener
  ): void => {
    consoleRef.error(
      `Plugin event listener failed for ${event.source} ${event.type} "${event.message}".`,
      {
        event,
        listenerName: listener.name || null,
      },
      error
    );
  };
}
