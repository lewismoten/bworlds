import { describe, expect, it } from 'vitest';
import {
  buildSextantMarkup,
  buildTextViewportMarkup,
  buildEventSummaryMarkup,
  buildStatusMarkup,
  buildViewportHudMarkup,
  getCompassMiniSignature,
  getDetailLabels,
  getEventSummarySignature,
  getMinimapMiniSignature,
  getSextantSignature,
  getStatusSignature,
  getTextViewportSignature,
  getTimekeeperMiniSignature,
  getViewportHudSignature,
} from './ui-signatures.ts';
import type { EventDetail } from './ui-signatures.ts';
import type { ViewMode } from '@bworlds/plugin-api';

describe('ui signature helpers', () => {
  it('keeps identical status payloads on the same signature and changes when content changes', () => {
    const base = {
      viewMode: '3d' as ViewMode,
      playerLevel: 3,
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
      weatherLabel: 'Clouds 64F, light wind from 090',
      forecastLabel: 'Today Clouds 64/51F',
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
    expect(buildStatusMarkup(base)).toContain('Level');
    expect(buildStatusMarkup(base)).toContain('Weather');
    expect(buildStatusMarkup(base)).toContain('Forecast');
  });

  it('tracks viewport hud and event summary changes without needing DOM writes for stable content', () => {
    const hud = {
      timekeeperDisplayMode: 'time-date' as const,
      compassDisplayMode: 'letters' as const,
      timeLabel: '06:00',
      dateLabel: 'Nova Crown / Waxing',
      facing: 'N',
      headingLabel: 'Heading 000°',
      showCompass: true,
      interactionPrompt: '',
    };
    const details: EventDetail[] = [
      { kind: 'aurora', label: '2 aurora bands' },
      { kind: 'meteor-shower', label: '1 meteor stream' },
    ];

    expect(getViewportHudSignature(hud)).toBe(
      getViewportHudSignature({ ...hud })
    );
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
    expect(hudMarkup).toContain('Nova Crown');
    expect(
      buildViewportHudMarkup({
        ...hud,
        timekeeperDisplayMode: 'time',
        compassMarkup: '<span>N</span>',
      })
    ).not.toContain('Nova Crown');
    expect(
      buildViewportHudMarkup({
        ...hud,
        compassDisplayMode: 'graphical',
        compassMarkup: '<span>N</span>',
      })
    ).not.toContain('viewport-hud-compass');
    expect(
      buildViewportHudMarkup({
        ...hud,
        interactionPrompt: 'Press Enter to enter Oakcross',
        compassMarkup: '<span>N</span>',
      })
    ).toContain('viewport-hud-prompt');
    expect(
      buildEventSummaryMarkup({
        modeLabel: 'Aurora',
        activeEventsLabel: 'Aurora active',
        details,
      })
    ).toContain('event-summary-chip-aurora');
  });

  it('builds stable signatures and markup for sextant coordinates', () => {
    const sextant = {
      latitude: 24.12345,
      longitude: -80.98765,
      gridX: 128,
      gridY: -64,
    };

    expect(getSextantSignature(sextant)).toBe(
      getSextantSignature({ ...sextant })
    );
    expect(
      getSextantSignature({ ...sextant, gridX: sextant.gridX + 1 })
    ).not.toBe(getSextantSignature(sextant));
    expect(buildSextantMarkup(sextant)).toContain('GPS');
    expect(buildSextantMarkup(sextant)).toContain('World');
    expect(buildSextantMarkup(sextant)).toContain('24.1234');
  });

  it('builds stable signatures and markup for ascii text viewport content', () => {
    const grid = {
      rows: [
        [
          {
            glyph: '.',
            color: '#84cc16',
            kind: 'plains',
            worldX: 0,
            worldY: 0,
          },
          { glyph: '~', color: '#38bdf8', kind: 'river', worldX: 1, worldY: 0 },
        ],
        [
          {
            glyph: '@',
            color: '#ffbf69',
            kind: 'player',
            worldX: 0,
            worldY: 1,
          },
          {
            glyph: '^',
            color: '#cbd5e1',
            kind: 'mountain',
            worldX: 1,
            worldY: 1,
          },
        ],
      ],
      centerColumn: 0,
      centerRow: 1,
    };

    expect(getTextViewportSignature(grid)).toBe(getTextViewportSignature(grid));
    expect(buildTextViewportMarkup(grid)).toContain('viewport-text-cell');
    expect(buildTextViewportMarkup(grid)).toContain('data-kind="river"');
  });

  it('builds stable signatures for mini viewport canvases', () => {
    const timekeeper = {
      width: 156,
      height: 156,
      dayProgress: 0.25,
      yearProgress: 0.5,
      moonAngle: 1.25,
      moonMidnightAngle: 0.8,
      sunriseAzimuth: 0.1,
      sunsetAzimuth: 3.2,
      daylightDuration: 0.55,
    };
    const compass = {
      width: 156,
      height: 156,
      facingAngle: 1.5,
      headingAngle: 1.7,
    };
    const minimap = {
      width: 192,
      height: 192,
      playerX: 12.5,
      playerY: -6.25,
      facingAngle: 0.4,
      zoom: 1.25,
    };

    expect(getTimekeeperMiniSignature(timekeeper)).toBe(
      getTimekeeperMiniSignature({ ...timekeeper })
    );
    expect(
      getTimekeeperMiniSignature({
        ...timekeeper,
        dayProgress: timekeeper.dayProgress + 0.1,
      })
    ).not.toBe(getTimekeeperMiniSignature(timekeeper));

    expect(getCompassMiniSignature(compass)).toBe(
      getCompassMiniSignature({ ...compass })
    );
    expect(
      getCompassMiniSignature({
        ...compass,
        headingAngle: compass.headingAngle + 0.2,
      })
    ).not.toBe(getCompassMiniSignature(compass));

    expect(getMinimapMiniSignature(minimap)).toBe(
      getMinimapMiniSignature({ ...minimap })
    );
    expect(
      getMinimapMiniSignature({
        ...minimap,
        playerX: minimap.playerX + 1,
      })
    ).not.toBe(getMinimapMiniSignature(minimap));
  });
});
