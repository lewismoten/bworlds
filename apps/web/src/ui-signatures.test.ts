import { describe, expect, it } from 'vitest';
import {
  buildEventSummaryMarkup,
  buildStatusMarkup,
  buildViewportHudMarkup,
  getDetailLabels,
  getEventSummarySignature,
  getStatusSignature,
  getViewportHudSignature,
} from './ui-signatures.ts';
import type { EventDetail } from './ui-signatures.ts';
import type { ViewMode } from '@bworlds/plugin-api';

describe('ui signature helpers', () => {
  it('keeps identical status payloads on the same signature and changes when content changes', () => {
    const base = {
      viewMode: '3d' as ViewMode,
      contextLabel: 'Overworld',
      tileLabel: 'Grassland',
      facing: 'N',
      playerX: 1.25,
      playerY: -2.5,
      gridX: 1,
      gridY: -3,
      latitude: 24.12345,
      longitude: -80.98765,
      timeLabel: '06:00',
      dateLabel: 'Nova Crown / Waxing',
      cycleLabel: 'Running',
      seasonLabel: 'Nova Crown',
      moonLabel: 'Waxing',
      eventModeLabel: 'Auto',
      eventsLabel: 'No active events',
      sunriseLabel: 'E',
      depth: 0,
      hint: 'Explore.',
    };

    expect(getStatusSignature(base)).toBe(getStatusSignature({ ...base }));
    expect(getStatusSignature({ ...base, facing: 'E' })).not.toBe(
      getStatusSignature(base)
    );
    expect(buildStatusMarkup(base)).toContain('Grassland');
  });

  it('tracks viewport hud and event summary changes without needing DOM writes for stable content', () => {
    const hud = {
      timeLabel: '06:00',
      facing: 'N',
      headingLabel: 'Heading 000°',
      showCompass: true,
    };
    const details: EventDetail[] = [
      { kind: 'aurora', label: '2 aurora bands' },
      { kind: 'meteor-shower', label: '1 meteor stream' },
    ];

    expect(getViewportHudSignature(hud)).toBe(getViewportHudSignature({ ...hud }));
    expect(getViewportHudSignature({ ...hud, facing: 'E' })).not.toBe(
      getViewportHudSignature(hud)
    );
    expect(
      getEventSummarySignature({
        modeLabel: 'Aurora',
        activeEventsLabel: 'Aurora active',
        detailLabels: getDetailLabels(details),
      })
    ).toBe(
      getEventSummarySignature({
        modeLabel: 'Aurora',
        activeEventsLabel: 'Aurora active',
        detailLabels: getDetailLabels(details),
      })
    );
    const hudMarkup = buildViewportHudMarkup({
      ...hud,
      compassMarkup: '<span>N</span>',
    });
    expect(hudMarkup).toContain('Heading 000');
    expect(hudMarkup).not.toContain('Nova Crown');
    expect(
      buildEventSummaryMarkup({
        modeLabel: 'Aurora',
        activeEventsLabel: 'Aurora active',
        details,
      })
    ).toContain('event-summary-chip-aurora');
  });
});
