import { describe, expect, it } from 'vitest';
import {
  getHmrNoticeText,
  getHmrNoticeVisibleUntil,
  shouldShowHmrNotice,
} from './hmr-notice.ts';

describe('hmr notice helpers', () => {
  it('returns clear before and after update messages', () => {
    expect(getHmrNoticeText('before-update')).toContain('Vite');
    expect(getHmrNoticeText('before-update')).toContain('updating');
    expect(getHmrNoticeText('after-update')).toContain('finished');
  });

  it('keeps the notice visible until the configured expiry time', () => {
    const visibleUntil = getHmrNoticeVisibleUntil(1000, 8000);

    expect(visibleUntil).toBe(9000);
    expect(shouldShowHmrNotice(visibleUntil, 8999)).toBe(true);
    expect(shouldShowHmrNotice(visibleUntil, 9000)).toBe(false);
    expect(shouldShowHmrNotice(null, 2000)).toBe(false);
  });
});
