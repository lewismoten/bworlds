import { describe, expect, it } from 'vitest';
import {
  buildDebugDirectoryMarkup,
  DEBUG_DIRECTORY_ENTRIES,
} from './debug-directory.ts';

describe('debug directory', () => {
  it('lists the current debug entry points under the /debug landing page', () => {
    expect(DEBUG_DIRECTORY_ENTRIES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: '/?inspector=debug',
          routeLabel: '/?inspector=debug',
        }),
        expect.objectContaining({
          href: '/?inspector=events',
          routeLabel: '/?inspector=events',
        }),
        expect.objectContaining({
          href: '/?inspector=sextant',
          routeLabel: '/?inspector=sextant',
        }),
      ])
    );
  });

  it('renders accessible markup for the debug directory cards', () => {
    const markup = buildDebugDirectoryMarkup();

    expect(markup).toContain('<h1>/debug</h1>');
    expect(markup).toContain('aria-label="Debug pages"');
    expect(markup).toContain('World Inspector');
    expect(markup).toContain('Celestial Event Controls');
    expect(markup).toContain('Sextant Readout');
  });
});
