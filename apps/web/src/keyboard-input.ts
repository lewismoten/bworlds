const GAMEPLAY_PREVENT_DEFAULT_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  ' ',
]);

const GAMEPLAY_VIEWPORT_FOCUS_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'w',
  'a',
  's',
  'd',
  'q',
  'e',
  ' ',
]);

type EventTargetLike = {
  tagName?: string | null;
  isContentEditable?: boolean;
  closest?: (selector: string) => EventTargetLike | null;
} | null;

export function normalizeKeyboardKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

export function shouldPreventDefaultGameplayKey(key: string): boolean {
  return GAMEPLAY_PREVENT_DEFAULT_KEYS.has(key);
}

export function shouldRestoreViewportFocusForGameplayKey(key: string): boolean {
  return GAMEPLAY_VIEWPORT_FOCUS_KEYS.has(key);
}

export function isEditableKeyboardTarget(target: EventTarget | EventTargetLike): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }

  const candidate = target as EventTargetLike;
  if (candidate.isContentEditable) {
    return true;
  }

  const tagName = candidate.tagName?.toLowerCase();
  if (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'option'
  ) {
    return true;
  }

  return candidate.closest?.('[contenteditable="true"]') != null;
}

