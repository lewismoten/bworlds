export class PluginRegistry {
  constructor() {
    this.plugins = [];
  }

  register(plugin) {
    this.plugins.push(plugin);
  }

  runHook(hookName, payload) {
    for (const plugin of this.plugins) {
      if (typeof plugin[hookName] === 'function') {
        plugin[hookName](payload);
      }
    }
    return payload;
  }
}
