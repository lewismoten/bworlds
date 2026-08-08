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
  type?: string | null;
  closest?: (selector: string) => EventTargetLike | null;
} | null;

const NON_EDITABLE_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'hidden',
  'image',
  'radio',
  'reset',
  'submit',
]);

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
  if (tagName === 'input') {
    const inputType = candidate.type?.toLowerCase() ?? 'text';
    return !NON_EDITABLE_INPUT_TYPES.has(inputType);
  }

  if (tagName === 'textarea' || tagName === 'option') {
    return true;
  }

  return candidate.closest?.('[contenteditable="true"]') != null;
}
