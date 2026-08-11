import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  buildMusicDebugTimelineSvgMarkup,
  resolveMusicDebugTimelineNoteBarColor,
  resolveMusicDebugTimelineLayout,
  resolveMusicDebugTimelineNoteBars,
  resolveMusicDebugTimelineOffsetForX,
  resolveMusicDebugTimelineSeekOffset,
  resolveMusicDebugTimelineXForOffset,
} from './music-debug-timeline.ts';

describe('music debug timeline', () => {
  it('maps offsets to timeline positions and back', () => {
    const layout = resolveMusicDebugTimelineLayout(960, 320);
    const durationMs = 120_000;
    const x = resolveMusicDebugTimelineXForOffset(layout, durationMs, 60_000);

    expect(resolveMusicDebugTimelineOffsetForX(layout, durationMs, x)).toBe(
      60_000
    );
  });

  it('uses the requested visible role order for current generated tracks', () => {
    const layout = resolveMusicDebugTimelineLayout(960, 320);

    expect(layout.roleOrder).toEqual(['lead', 'harmony', 'bass', 'percussion']);
  });

  it('clamps seek offsets to the visible timeline bounds', () => {
    const snapshot = createMusicDebugSnapshot();

    expect(
      resolveMusicDebugTimelineSeekOffset({
        snapshot,
        canvas: { width: 960, height: 320 },
        clientX: -400,
        boundsLeft: 0,
        boundsWidth: 960,
      })
    ).toBe(0);
    expect(
      resolveMusicDebugTimelineSeekOffset({
        snapshot,
        canvas: { width: 960, height: 320 },
        clientX: 2_000,
        boundsLeft: 0,
        boundsWidth: 960,
      })
    ).toBe(snapshot.durationMs);
  });

  it('renders short note bars at pitch lanes instead of full-height track blocks', () => {
    const snapshot = createMusicDebugSnapshot();
    const layout = resolveMusicDebugTimelineLayout(960, 320);
    const noteBars = resolveMusicDebugTimelineNoteBars(snapshot, layout);

    expect(noteBars.length).toBe(snapshot.notes.length);
    expect(
      noteBars.every((bar) => bar.height < layout.trackHeight * 0.35)
    ).toBe(true);
    expect(
      noteBars.some((bar) => {
        if (bar.role === 'percussion') {
          return false;
        }
        const roleIndex = layout.roleOrder.indexOf(bar.role);
        const trackTop = layout.topPad + roleIndex * layout.trackHeight + 10;
        return bar.y > trackTop;
      })
    ).toBe(true);
  });

  it('tracks overlapping note bars so dense stacks can render more vividly', () => {
    const snapshot = createMusicDebugSnapshot();
    const layout = resolveMusicDebugTimelineLayout(960, 320);
    const noteBars = resolveMusicDebugTimelineNoteBars(snapshot, layout);

    expect(noteBars.every((bar) => bar.overlapCount >= 1)).toBe(true);
    expect(
      noteBars.some((bar) => bar.role === 'harmony' && bar.overlapCount > 1)
    ).toBe(true);
  });

  it('places different percussion instruments on distinct vertical lanes', () => {
    const baseSnapshot = createMusicDebugSnapshot();
    const snapshot = {
      ...baseSnapshot,
      notes: [
        {
          ...baseSnapshot.notes.find((note) => note.role === 'percussion')!,
          instrumentId: 'debug:perc-kick-36:0',
          startMs: 0,
        },
        {
          ...baseSnapshot.notes.find((note) => note.role === 'percussion')!,
          instrumentId: 'debug:perc-snare-38:1',
          startMs: 250,
        },
        {
          ...baseSnapshot.notes.find((note) => note.role === 'percussion')!,
          instrumentId: 'debug:perc-cymbals-49:2',
          startMs: 500,
        },
      ],
      durationMs: 1_000,
    };
    const layout = resolveMusicDebugTimelineLayout(960, 320);
    const noteBars = resolveMusicDebugTimelineNoteBars(snapshot, layout);
    const percussionBars = noteBars.filter((bar) => bar.role === 'percussion');

    expect(percussionBars).toHaveLength(3);
    expect(new Set(percussionBars.map((bar) => bar.y)).size).toBe(3);
    expect(percussionBars[0]!.y).toBeGreaterThan(percussionBars[1]!.y);
    expect(percussionBars[1]!.y).toBeGreaterThan(percussionBars[2]!.y);
  });

  it('brightens note-bar colors when overlaps increase', () => {
    expect(resolveMusicDebugTimelineNoteBarColor('#4f8cff', 1)).toBe('#4f8cff');
    expect(resolveMusicDebugTimelineNoteBarColor('#4f8cff', 3)).toBe('#6fa1ff');
  });

  it('renders a standalone svg export for the timeline graph', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const markup = buildMusicDebugTimelineSvgMarkup(snapshot, {
      playheadOffsetMs: 1_500,
      activeRegion: {
        startOffsetMs: 0,
        endOffsetMs: 8_000,
      },
    });

    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).toContain('aria-label="Music debug timeline"');
    expect(markup).toContain('fill="#071019"');
    expect(markup).toContain('>MELODY<');
    expect(markup).toContain('class="music-debug-timeline-chord-cue"');
    expect(markup).toContain('>Chord 1 minor<');
    expect(markup).toContain('class="music-debug-timeline-cadence-marker"');
    expect(markup).toContain('>Q<');
    expect(markup).toContain('>A<');
    expect(markup).toContain('class="music-debug-timeline-playhead-chord"');
    expect(markup).toContain('rgba(85,214,190,0.08)');
    expect(markup).toContain('stroke="#f5f7fb"');
  });
});
