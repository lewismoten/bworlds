import type { ViewMode } from '@bworlds/plugin-api';

export type QuickControlCard = {
  id: string;
  label: string;
  detail: string;
  title: string;
  disabled?: boolean;
  viewMode?: ViewMode;
  randomKind?: string;
};

export const QUICK_VIEW_MODE_CARDS: readonly QuickControlCard[] = [
  {
    id: 'view-mode-2d',
    label: '2D Map',
    detail: 'Flat atlas-style overworld navigation.',
    title: 'Switch to 2D map view',
    viewMode: '2d',
  },
  {
    id: 'view-mode-3d',
    label: '3D World',
    detail: 'Walk the world with the live sky and terrain.',
    title: 'Switch to 3D world view',
    viewMode: '3d',
  },
  {
    id: 'view-mode-text',
    label: 'Text',
    detail: 'ASCII scouting for fast low-overhead travel.',
    title: 'Switch to text view',
    viewMode: 'text',
  },
  {
    id: 'view-mode-ortho',
    label: 'Ortho',
    detail: 'Coming later.',
    title: 'Orthographic view coming later',
    disabled: true,
  },
  {
    id: 'view-mode-blobber',
    label: 'Blobber',
    detail: 'Coming later.',
    title: 'Blobber view coming later',
    disabled: true,
  },
  {
    id: 'view-mode-zoom-map',
    label: 'Zoom Map',
    detail: 'Coming later.',
    title: 'Zoom map view coming later',
    disabled: true,
  },
];

export const QUICK_RANDOM_DESTINATION_CARDS: readonly QuickControlCard[] = [
  {
    id: 'random-any',
    label: 'Anywhere',
    detail: 'Jump to any safe landing spot.',
    title: 'Jump to a random safe landing spot',
    randomKind: '',
  },
  {
    id: 'random-plains',
    label: 'Plains',
    detail: 'Bias the jump toward open grasslands.',
    title: 'Jump to a random plains destination',
    randomKind: 'plains',
  },
  {
    id: 'random-forest',
    label: 'Forest',
    detail: 'Seek a wooded destination.',
    title: 'Jump to a random forest destination',
    randomKind: 'forest',
  },
  {
    id: 'random-mountain',
    label: 'Mountain',
    detail: 'Seek higher rocky ground.',
    title: 'Jump to a random mountain destination',
    randomKind: 'mountain',
  },
  {
    id: 'random-river',
    label: 'River',
    detail: 'Search for a riverbank landing.',
    title: 'Jump near a random river destination',
    randomKind: 'river',
  },
  {
    id: 'random-ocean',
    label: 'Ocean',
    detail: 'Search for a shoreline near open water.',
    title: 'Jump near a random ocean destination',
    randomKind: 'ocean',
  },
  {
    id: 'random-town',
    label: 'Town',
    detail: 'Look for a settlement to enter.',
    title: 'Jump near a random town destination',
    randomKind: 'town',
  },
  {
    id: 'random-ruins',
    label: 'Ruins',
    detail: 'Hunt for a forgotten landmark.',
    title: 'Jump near a random ruins destination',
    randomKind: 'ruins',
  },
];

export function buildQuickControlCardMarkup(
  cards: readonly QuickControlCard[]
): string {
  return cards
    .map((card) => {
      const attributes: string[] = [
        `id="${card.id}"`,
        'type="button"',
        'class="view-mode-card"',
        `title="${card.title}"`,
      ];
      if (card.viewMode) {
        attributes.push(`data-view-mode="${card.viewMode}"`);
      }
      if (card.randomKind !== undefined) {
        attributes.push(`data-random-kind="${card.randomKind}"`);
      }
      if (card.disabled) {
        attributes.push('disabled');
      }
      return `
          <button ${attributes.join(' ')}>
            <span class="view-mode-card-title">${card.label}</span>
            <span class="view-mode-card-detail">${card.detail}</span>
          </button>
        `;
    })
    .join('');
}
