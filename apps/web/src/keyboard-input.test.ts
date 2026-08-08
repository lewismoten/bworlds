import { describe, expect, it } from 'vitest';
import {
  isEditableKeyboardTarget,
  normalizeKeyboardKey,
  shouldPreventDefaultGameplayKey,
  shouldRestoreViewportFocusForGameplayKey,
} from './keyboard-input.ts';

describe('keyboard input helpers', () => {
  it('normalizes single-character gameplay keys', () => {
    expect(normalizeKeyboardKey('A')).toBe('a');
    expect(normalizeKeyboardKey(' ')).toBe(' ');
    expect(normalizeKeyboardKey('ArrowLeft')).toBe('ArrowLeft');
  });

  it('prevents native scrolling for arrow and jump keys', () => {
    expect(shouldPreventDefaultGameplayKey('ArrowUp')).toBe(true);
    expect(shouldPreventDefaultGameplayKey(' ')).toBe(true);
    expect(shouldPreventDefaultGameplayKey('Enter')).toBe(false);
  });

  it('restores viewport focus for movement and camera keys', () => {
    expect(shouldRestoreViewportFocusForGameplayKey('ArrowLeft')).toBe(true);
    expect(shouldRestoreViewportFocusForGameplayKey('w')).toBe(true);
    expect(shouldRestoreViewportFocusForGameplayKey('q')).toBe(true);
    expect(shouldRestoreViewportFocusForGameplayKey('Enter')).toBe(false);
  });

  it('ignores editable fields but keeps gameplay active for ordinary controls', () => {
    expect(isEditableKeyboardTarget({ tagName: 'INPUT', type: 'text' })).toBe(
      true
    );
    expect(isEditableKeyboardTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditableKeyboardTarget({ isContentEditable: true })).toBe(true);
    expect(isEditableKeyboardTarget({ tagName: 'INPUT', type: 'checkbox' })).toBe(
      false
    );
    expect(isEditableKeyboardTarget({ tagName: 'INPUT', type: 'radio' })).toBe(
      false
    );
    expect(isEditableKeyboardTarget({ tagName: 'SELECT' })).toBe(false);
    expect(isEditableKeyboardTarget({ tagName: 'BUTTON' })).toBe(false);
  });

  it('detects nested contenteditable containers', () => {
    expect(
      isEditableKeyboardTarget({
        tagName: 'SPAN',
        closest: (selector: string) =>
          selector === '[contenteditable="true"]'
            ? { tagName: 'DIV', isContentEditable: true }
            : null,
      })
    ).toBe(true);
  });
});
