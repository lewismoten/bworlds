export type DebugDirectoryEntry = {
  id: string;
  title: string;
  href: string;
  routeLabel: string;
  category: string;
  description: string;
};

export const DEBUG_DIRECTORY_ENTRIES: DebugDirectoryEntry[] = [
  {
    id: 'world-inspector',
    title: 'World Inspector',
    href: '/?inspector=debug',
    routeLabel: '/?inspector=debug',
    category: 'In-App Debug Panel',
    description:
      'Opens the main Debug tab with performance stats, render budgets, world-seed controls, teleport tools, and snapshot export.',
  },
  {
    id: 'celestial-events',
    title: 'Celestial Event Controls',
    href: '/?inspector=events',
    routeLabel: '/?inspector=events',
    category: 'In-App Debug Panel',
    description:
      'Jumps straight to the Events tab so aurora, meteor shower, comet, and eclipse states can be forced for testing.',
  },
  {
    id: 'sextant-readout',
    title: 'Sextant Readout',
    href: '/?inspector=sextant',
    routeLabel: '/?inspector=sextant',
    category: 'In-App Debug Panel',
    description:
      'Shows the live GPS, world coordinates, and navigation-related values tied to the current player position.',
  },
  {
    id: 'music-laboratory',
    title: 'Music Laboratory',
    href: '/debug/music/',
    routeLabel: '/debug/music/',
    category: 'Dedicated Debug Page',
    description:
      'Generates procedural music previews, shows the chosen instruments and arrangement mix, and draws a note timeline you can audition.',
  },
];

export function buildDebugDirectoryMarkup(
  entries: readonly DebugDirectoryEntry[] = DEBUG_DIRECTORY_ENTRIES
): string {
  const cards = entries
    .map(
      (entry) => `
        <article class="debug-directory-card" id="${entry.id}">
          <p class="debug-directory-category">${entry.category}</p>
          <h2>${entry.title}</h2>
          <p class="debug-directory-description">${entry.description}</p>
          <p class="debug-directory-route">${entry.routeLabel}</p>
          <a class="debug-directory-link" href="${entry.href}">Open</a>
        </article>
      `
    )
    .join('');

  return `
    <main class="debug-directory-shell">
      <section class="debug-directory-hero">
        <p class="debug-directory-kicker">bworlds</p>
        <h1>/debug</h1>
        <p class="debug-directory-lede">
          A directory of the current in-app debug surfaces. These links open the main explorer with the matching inspector tab selected.
        </p>
      </section>
      <section class="debug-directory-grid" aria-label="Debug pages">
        ${cards}
      </section>
    </main>
  `;
}
