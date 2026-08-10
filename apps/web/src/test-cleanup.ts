type TestCleanup = () => void | Promise<void>;

type ClosableMethodName =
  'close' | 'destroy' | 'terminate' | 'abort' | 'disconnect';

type ClosableResource = Partial<
  Record<ClosableMethodName, (...args: unknown[]) => unknown>
>;

type TrackClosableResourceOptions = {
  methodName?: ClosableMethodName;
};

const registeredTestCleanups: TestCleanup[] = [];
const closableMethodNames: readonly ClosableMethodName[] = [
  'close',
  'destroy',
  'terminate',
  'abort',
  'disconnect',
];

export function registerTestCleanup(cleanup: TestCleanup): void {
  registeredTestCleanups.push(cleanup);
}

export function trackClosableTestResource<Resource extends ClosableResource>(
  resource: Resource,
  options: TrackClosableResourceOptions = {}
): Resource {
  const methodName =
    options.methodName ?? resolveClosableMethodName(resource) ?? null;
  if (methodName === null) {
    throw new Error(
      'Cannot track test resource cleanup without a close, destroy, terminate, abort, or disconnect method.'
    );
  }

  registerTestCleanup(() => invokeClosableResourceMethod(resource, methodName));
  return resource;
}

export async function runRegisteredTestCleanups(): Promise<void> {
  const cleanups = registeredTestCleanups.splice(0).reverse();
  const errors: unknown[] = [];

  for (const cleanup of cleanups) {
    try {
      await cleanup();
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length === 1) {
    throw errors[0];
  }
  if (errors.length > 1) {
    throw new AggregateError(errors, 'One or more test cleanups failed.');
  }
}

function resolveClosableMethodName(
  resource: ClosableResource
): ClosableMethodName | null {
  for (const methodName of closableMethodNames) {
    if (typeof resource[methodName] === 'function') {
      return methodName;
    }
  }
  return null;
}

async function invokeClosableResourceMethod(
  resource: ClosableResource,
  methodName: ClosableMethodName
): Promise<void> {
  const method = resource[methodName];
  if (typeof method !== 'function') {
    return;
  }

  if (method.length > 0 && methodName === 'close') {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const callback = (error?: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        if (error) {
          reject(error);
          return;
        }
        resolve();
      };

      try {
        method.call(resource, callback);
      } catch (error) {
        reject(error);
      }
    });
    return;
  }

  await method.call(resource);
}
