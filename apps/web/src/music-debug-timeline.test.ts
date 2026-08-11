import { describe, expect, it } from 'vitest';

import { resolveMusicDebugCadenceMarkers } from './music-debug-cadence-markers.ts';
import { resolveMusicDebugChordCueAtOffset } from './music-debug-chord-cues.ts';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { resolveMusicDebugPitchClassLabel } from './music-debug-pitch-class.ts';
import {
  getProceduralScaleDegreeSemitones,
  resolveProceduralMidiNoteFrequency,
} from './procedural-music-scale.ts';
import {
  buildMusicDebugTimelineSvgMarkup,
  resolveMusicDebugTimelineChordLabels,
  resolveMusicDebugTimelineHoverDetail,
  resolveMusicDebugTimelineNoteBarFill,
  resolveMusicDebugTimelineNoteBarColor,
  resolveMusicDebugTimelineLayout,
  resolveMusicDebugTimelinePercussionLaneLabels,
  resolveMusicDebugTimelineNoteBars,
  resolveMusicDebugTimelineOffsetForX,
  resolveMusicDebugTimelineSeekOffset,
  resolveMusicDebugTimelineTrackLabelRoleAtPoint,
  resolveMusicDebugTimelineXForOffset,
} from './music-debug-timeline.ts';

const DEFAULT_LAYOUT = resolveMusicDebugTimelineLayout(960, 320);
const DEFAULT_SNAPSHOT = createMusicDebugSnapshot();
const FOREST_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 4,
  clusterY: -1,
});
const FOREST_WARNING_MARKER = resolveMusicDebugCadenceMarkers(FOREST_SNAPSHOT)[0]!;
const DEFAULT_NOTE_BARS = resolveMusicDebugTimelineNoteBars(
  DEFAULT_SNAPSHOT,
  DEFAULT_LAYOUT
);
const DEFAULT_PERCUSSION_NOTE = DEFAULT_SNAPSHOT.notes.find(
  (note) => note.role === 'percussion'
)!;
const TIMELINE_PERCUSSION_LANES_SNAPSHOT = {
  ...DEFAULT_SNAPSHOT,
  notes: [
    {
      ...DEFAULT_PERCUSSION_NOTE,
      instrumentId: 'debug:perc-kick-36:0',
      startMs: 0,
    },
    {
      ...DEFAULT_PERCUSSION_NOTE,
      instrumentId: 'debug:perc-snare-38:1',
      startMs: 250,
    },
    {
      ...DEFAULT_PERCUSSION_NOTE,
      instrumentId: 'debug:perc-cymbals-49:2',
      startMs: 500,
    },
  ],
  durationMs: 1_000,
};
const TIMELINE_PERCUSSION_HOVER_SNAPSHOT = {
  ...DEFAULT_SNAPSHOT,
  notes: [
    {
      ...DEFAULT_PERCUSSION_NOTE,
      instrumentId: 'debug:perc-cymbals-49:2',
      startMs: 500,
      durationMs: 180,
    },
  ],
  durationMs: 1_000,
};
const OUT_OF_SCALE_TIMELINE_SNAPSHOT = (() => {
  const leadIndex = DEFAULT_SNAPSHOT.notes.findIndex(
    (note) => note.role === 'lead'
  );
  return {
    ...DEFAULT_SNAPSHOT,
    notePitchDiagnostics: DEFAULT_SNAPSHOT.notePitchDiagnostics.map(
      (diagnostic, index) =>
        index === leadIndex
          ? {
              ...diagnostic,
              inMode: false,
              accidentalReason: 'unresolved-chromatic',
            }
          : diagnostic
    ),
  };
})();
const CADENCE_WARNING_TIMELINE_SNAPSHOT = {
  ...FOREST_SNAPSHOT,
  cadenceDetections: [
    ...FOREST_SNAPSHOT.cadenceDetections,
    {
      sectionId: FOREST_WARNING_MARKER.sectionId,
      sectionLabel: FOREST_WARNING_MARKER.sectionLabel,
      kind: FOREST_WARNING_MARKER.kind,
      measureNumber: FOREST_WARNING_MARKER.measureNumber,
      leadPitchLabel: 'F',
      bassPitchLabel: 'C',
      leadNoteLabel: 'F4',
      bassNoteLabel: 'C3',
      harmonyPitchLabels: ['C', 'E', 'G'],
      matchesCadenceTarget: false,
      matchesHarmony: false,
    },
  ],
};
const NON_CHORD_TONE_TIMELINE_SNAPSHOT = (() => {
  const leadIndex = DEFAULT_SNAPSHOT.notes.findIndex(
    (note) => note.role === 'lead'
  );
  const leadNote = DEFAULT_SNAPSHOT.notes[leadIndex]!;
  const chordCue = resolveMusicDebugChordCueAtOffset(
    DEFAULT_SNAPSHOT,
    Math.max(0, leadNote.startMs - DEFAULT_SNAPSHOT.song.startMs)
  )!;
  const scaleLength = DEFAULT_SNAPSHOT.theme.scale.length;
  const normalizedChordDegrees = new Set([
    chordCue.degreeIndex % scaleLength,
    (chordCue.degreeIndex + 2) % scaleLength,
    (chordCue.degreeIndex + 4) % scaleLength,
  ]);
  const nonChordDegreeIndex =
    DEFAULT_SNAPSHOT.theme.scale.findIndex(
      (_, degreeIndex) => !normalizedChordDegrees.has(degreeIndex)
    ) ?? 1;
  const relativeSemitones = getProceduralScaleDegreeSemitones(
    DEFAULT_SNAPSHOT.theme.scale,
    nonChordDegreeIndex
  );
  const midiNote = DEFAULT_SNAPSHOT.scaleMap.rootMidiNote + relativeSemitones;
  const frequency = resolveProceduralMidiNoteFrequency(midiNote);
  const isBlackKey = [1, 3, 6, 8, 10].includes(((midiNote % 12) + 12) % 12);

  return {
    ...DEFAULT_SNAPSHOT,
    notes: DEFAULT_SNAPSHOT.notes.map((note, index) =>
      index === leadIndex
        ? {
            ...note,
            frequency,
          }
        : note
    ),
    notePitchDiagnostics: DEFAULT_SNAPSHOT.notePitchDiagnostics.map(
      (diagnostic, index) =>
        index === leadIndex
          ? {
              ...diagnostic,
              frequency,
              midiNote,
              relativeSemitones,
              scaleDegree: nonChordDegreeIndex + 1,
              scaleDegreeLabel: `degree ${nonChordDegreeIndex + 1}`,
              isBlackKey,
              inMode: true,
              accidentalReason: 'in-mode',
              accidentalRuleLabel: 'In mode',
              accidentalExplanation: 'Matches the active mode.',
            }
          : diagnostic
    ),
  };
})();

describe('music debug timeline', () => {
  it('maps offsets to timeline positions and back', () => {
    const durationMs = 120_000;
    const x = resolveMusicDebugTimelineXForOffset(
      DEFAULT_LAYOUT,
      durationMs,
      60_000
    );

    expect(
      resolveMusicDebugTimelineOffsetForX(DEFAULT_LAYOUT, durationMs, x)
    ).toBe(60_000);
  });

  it('uses the requested visible role order for current generated tracks', () => {
    expect(DEFAULT_LAYOUT.roleOrder).toEqual([
      'lead',
      'harmony',
      'bass',
      'percussion',
    ]);
  });

  it('clamps seek offsets to the visible timeline bounds', () => {
    expect(
      resolveMusicDebugTimelineSeekOffset({
        snapshot: DEFAULT_SNAPSHOT,
        canvas: { width: 960, height: 320 },
        clientX: -400,
        boundsLeft: 0,
        boundsWidth: 960,
      })
    ).toBe(0);
    expect(
      resolveMusicDebugTimelineSeekOffset({
        snapshot: DEFAULT_SNAPSHOT,
        canvas: { width: 960, height: 320 },
        clientX: 2_000,
        boundsLeft: 0,
        boundsWidth: 960,
      })
    ).toBe(DEFAULT_SNAPSHOT.durationMs);
  });

  it('resolves track roles from clicks on the timeline label column', () => {
    expect(
      resolveMusicDebugTimelineTrackLabelRoleAtPoint({
        canvas: { width: 960, height: 320 },
        clientX: 20,
        clientY: 110,
        boundsLeft: 0,
        boundsTop: 0,
        boundsWidth: 960,
        boundsHeight: 320,
      })
    ).toBe('lead');
    expect(
      resolveMusicDebugTimelineTrackLabelRoleAtPoint({
        canvas: { width: 960, height: 320 },
        clientX: 20,
        clientY: 250,
        boundsLeft: 0,
        boundsTop: 0,
        boundsWidth: 960,
        boundsHeight: 320,
      })
    ).toBe('percussion');
    expect(
      resolveMusicDebugTimelineTrackLabelRoleAtPoint({
        canvas: { width: 960, height: 320 },
        clientX: 140,
        clientY: 110,
        boundsLeft: 0,
        boundsTop: 0,
        boundsWidth: 960,
        boundsHeight: 320,
      })
    ).toBeNull();
  });

  it('renders short note bars at pitch lanes instead of full-height track blocks', () => {
    expect(DEFAULT_NOTE_BARS.length).toBe(DEFAULT_SNAPSHOT.notes.length);
    expect(
      DEFAULT_NOTE_BARS.every(
        (bar) => bar.height < DEFAULT_LAYOUT.trackHeight * 0.35
      )
    ).toBe(true);
    expect(
      DEFAULT_NOTE_BARS.some((bar) => {
        if (bar.role === 'percussion') {
          return false;
        }
        const roleIndex = DEFAULT_LAYOUT.roleOrder.indexOf(bar.role);
        const trackTop =
          DEFAULT_LAYOUT.topPad + roleIndex * DEFAULT_LAYOUT.trackHeight + 10;
        return bar.y > trackTop;
      })
    ).toBe(true);
  });

  it('filters hidden roles out of timeline note bars and hover hit testing', () => {
    const leadNoteBar = resolveMusicDebugTimelineNoteBars(
      DEFAULT_SNAPSHOT,
      DEFAULT_LAYOUT,
      {
        visibleRoles: ['lead', 'harmony', 'bass', 'percussion'],
      }
    ).find((bar) => bar.role === 'lead')!;

    const noteBars = resolveMusicDebugTimelineNoteBars(
      DEFAULT_SNAPSHOT,
      DEFAULT_LAYOUT,
      {
        visibleRoles: ['harmony', 'bass', 'percussion'],
      }
    );

    expect(noteBars.some((bar) => bar.role === 'lead')).toBe(false);
    expect(
      resolveMusicDebugTimelineHoverDetail({
        snapshot: DEFAULT_SNAPSHOT,
        canvas: { width: 960, height: 320 },
        clientX: leadNoteBar.x + leadNoteBar.width * 0.5,
        clientY: leadNoteBar.y + leadNoteBar.height * 0.5,
        boundsLeft: 0,
        boundsTop: 0,
        boundsWidth: 960,
        boundsHeight: 320,
        visibleRoles: ['harmony', 'bass', 'percussion'],
      })
    ).toBeNull();
  });

  it('tracks overlapping note bars so dense stacks can render more vividly', () => {
    expect(DEFAULT_NOTE_BARS.every((bar) => bar.overlapCount >= 1)).toBe(true);
    expect(
      DEFAULT_NOTE_BARS.some(
        (bar) => bar.role === 'harmony' && bar.overlapCount > 1
      )
    ).toBe(true);
  });

  it('places different percussion instruments on distinct vertical lanes', () => {
    const noteBars = resolveMusicDebugTimelineNoteBars(
      TIMELINE_PERCUSSION_LANES_SNAPSHOT,
      DEFAULT_LAYOUT
    );
    const percussionBars = noteBars.filter((bar) => bar.role === 'percussion');

    expect(percussionBars).toHaveLength(3);
    expect(new Set(percussionBars.map((bar) => bar.y)).size).toBe(3);
    expect(percussionBars[0]!.y).toBeGreaterThan(percussionBars[1]!.y);
    expect(percussionBars[1]!.y).toBeGreaterThan(percussionBars[2]!.y);
  });

  it('labels visible percussion lanes with readable drum-role names', () => {
    expect(
      resolveMusicDebugTimelinePercussionLaneLabels(
        TIMELINE_PERCUSSION_LANES_SNAPSHOT,
        DEFAULT_LAYOUT
      )
    ).toEqual([
      expect.objectContaining({ key: 'kick-36', label: 'Kick' }),
      expect.objectContaining({ key: 'snare-38', label: 'Snare' }),
      expect.objectContaining({ key: 'cymbals-49', label: 'Cymbals' }),
    ]);
  });

  it('brightens note-bar colors when overlaps increase', () => {
    expect(resolveMusicDebugTimelineNoteBarColor('#4f8cff', 1)).toBe('#4f8cff');
    expect(resolveMusicDebugTimelineNoteBarColor('#4f8cff', 3)).toBe('#6fa1ff');
  });

  it('uses a warning fill for out-of-scale note bars', () => {
    const warningBar = resolveMusicDebugTimelineNoteBars(
      OUT_OF_SCALE_TIMELINE_SNAPSHOT,
      DEFAULT_LAYOUT
    ).find((bar) => bar.role === 'lead');

    expect(warningBar).toEqual(
      expect.objectContaining({
        warningKind: 'out-of-scale',
      })
    );
    expect(resolveMusicDebugTimelineNoteBarFill(warningBar!)).toBe('#ff7b72');
  });

  it('uses a warning fill for in-mode notes that miss the active chord tones', () => {
    const warningBar = resolveMusicDebugTimelineNoteBars(
      NON_CHORD_TONE_TIMELINE_SNAPSHOT,
      DEFAULT_LAYOUT
    ).find((bar) => bar.role === 'lead');

    expect(warningBar).toEqual(
      expect.objectContaining({
        warningKind: 'non-chord-tone',
      })
    );
    expect(resolveMusicDebugTimelineNoteBarFill(warningBar!)).toBe('#ffd166');
  });

  it('thins dense chord labels and abbreviates narrow cue spans', () => {
    const layout = resolveMusicDebugTimelineLayout(320, 320);
    const chordLabels = resolveMusicDebugTimelineChordLabels(layout, 4_000, [
      {
        degreeIndex: 0,
        label: 'Chord 1 major',
        startMeasure: 1,
        endMeasure: 1,
        startOffsetMs: 0,
        endOffsetMs: 900,
      },
      {
        degreeIndex: 4,
        label: 'Chord 5 minor',
        startMeasure: 2,
        endMeasure: 2,
        startOffsetMs: 900,
        endOffsetMs: 1_800,
      },
      {
        degreeIndex: 3,
        label: 'Chord 4 major',
        startMeasure: 3,
        endMeasure: 3,
        startOffsetMs: 1_800,
        endOffsetMs: 2_200,
      },
      {
        degreeIndex: 5,
        label: 'Chord 6 minor',
        startMeasure: 4,
        endMeasure: 4,
        startOffsetMs: 2_200,
        endOffsetMs: 4_000,
      },
    ]);

    expect(chordLabels.map((entry) => entry.label)).toEqual([
      'Ch1 maj',
      'Ch4 maj',
    ]);
  });

  it('resolves pitched note labels and durations when hovering a note bar', () => {
    const noteBar = DEFAULT_NOTE_BARS.find((bar) => bar.role === 'lead')!;

    const hoverDetail = resolveMusicDebugTimelineHoverDetail({
      snapshot: DEFAULT_SNAPSHOT,
      canvas: { width: 960, height: 320 },
      clientX: noteBar.x + noteBar.width * 0.5,
      clientY: noteBar.y + noteBar.height * 0.5,
      boundsLeft: 0,
      boundsTop: 0,
      boundsWidth: 960,
      boundsHeight: 320,
    });

    expect(hoverDetail).toEqual(
      expect.objectContaining({
        role: 'lead',
        hoverLabel: expect.stringMatching(/^Melody [A-G]#?-?\d$/),
        hoverDurationLabel: expect.stringMatching(/(ms|s)$/),
      })
    );
  });

  it('resolves percussion voice labels when hovering percussion notes', () => {
    const noteBar = resolveMusicDebugTimelineNoteBars(
      TIMELINE_PERCUSSION_HOVER_SNAPSHOT,
      DEFAULT_LAYOUT
    )[0]!;

    const hoverDetail = resolveMusicDebugTimelineHoverDetail({
      snapshot: TIMELINE_PERCUSSION_HOVER_SNAPSHOT,
      canvas: { width: 960, height: 320 },
      clientX: noteBar.x + noteBar.width * 0.5,
      clientY: noteBar.y + noteBar.height * 0.5,
      boundsLeft: 0,
      boundsTop: 0,
      boundsWidth: 960,
      boundsHeight: 320,
    });

    expect(hoverDetail).toEqual(
      expect.objectContaining({
        role: 'percussion',
        hoverLabel: 'Percussion Crash',
        hoverDurationLabel: '180 ms',
      })
    );
  });

  it('resolves cadence marker details when hovering question and answer labels', () => {
    const [questionMarker, answerMarker] =
      resolveMusicDebugCadenceMarkers(FOREST_SNAPSHOT);

    const questionHoverDetail = resolveMusicDebugTimelineHoverDetail({
      snapshot: FOREST_SNAPSHOT,
      canvas: { width: 960, height: 320 },
      clientX: resolveMusicDebugTimelineXForOffset(
        DEFAULT_LAYOUT,
        FOREST_SNAPSHOT.durationMs,
        questionMarker!.offsetMs
      ),
      clientY: 48,
      boundsLeft: 0,
      boundsTop: 0,
      boundsWidth: 960,
      boundsHeight: 320,
    });
    const answerHoverDetail = resolveMusicDebugTimelineHoverDetail({
      snapshot: FOREST_SNAPSHOT,
      canvas: { width: 960, height: 320 },
      clientX: resolveMusicDebugTimelineXForOffset(
        DEFAULT_LAYOUT,
        FOREST_SNAPSHOT.durationMs,
        answerMarker!.offsetMs
      ),
      clientY: 48,
      boundsLeft: 0,
      boundsTop: 0,
      boundsWidth: 960,
      boundsHeight: 320,
    });

    expect(questionHoverDetail).toEqual(
      expect.objectContaining({
        noteIndex: null,
        role: null,
        hoverLabel: questionMarker!.label,
        hoverDurationLabel: 'Phrase 1 • Q cadence',
      })
    );
    expect(answerHoverDetail).toEqual(
      expect.objectContaining({
        noteIndex: null,
        role: null,
        hoverLabel: answerMarker!.label,
        hoverDurationLabel: 'Phrase 1 • A cadence',
      })
    );
  });

  it('surfaces cadence warning details when hovering a failed cadence marker', () => {
    const warningMarker = resolveMusicDebugCadenceMarkers(
      CADENCE_WARNING_TIMELINE_SNAPSHOT
    ).find(
      (marker) =>
        marker.sectionId === FOREST_WARNING_MARKER.sectionId &&
        marker.kind === FOREST_WARNING_MARKER.kind &&
        marker.measureNumber === FOREST_WARNING_MARKER.measureNumber
    )!;

    const hoverDetail = resolveMusicDebugTimelineHoverDetail({
      snapshot: CADENCE_WARNING_TIMELINE_SNAPSHOT,
      canvas: { width: 960, height: 320 },
      clientX:
        resolveMusicDebugTimelineXForOffset(
          DEFAULT_LAYOUT,
          CADENCE_WARNING_TIMELINE_SNAPSHOT.durationMs,
          warningMarker.offsetMs
        ) + 10,
      clientY: 48,
      boundsLeft: 0,
      boundsTop: 0,
      boundsWidth: 960,
      boundsHeight: 320,
    });

    expect(hoverDetail).toEqual(
      expect.objectContaining({
        noteIndex: null,
        role: null,
        hoverLabel: expect.stringContaining('failed target and harmony checks'),
        hoverDurationLabel: 'Phrase 1 • Q cadence • target+harmony warning',
      })
    );
  });

  it('renders a standalone svg export for the timeline graph', () => {
    const markup = buildMusicDebugTimelineSvgMarkup(FOREST_SNAPSHOT, {
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
    expect(markup).toContain('class="music-debug-timeline-section-label-pill"');
    expect(markup).toContain('class="music-debug-timeline-section-label"');
    expect(markup).toContain('class="music-debug-timeline-chord-cue"');
    expect(markup).toMatch(/>(Chord 1 minor|Ch1 min)</);
    expect(markup).toContain('<title>Melody');
    expect(markup).toContain('class="music-debug-timeline-cadence-marker"');
    expect(markup).toContain('class="music-debug-timeline-measure-guide"');
    expect(markup).toContain('class="music-debug-timeline-beat-guide"');
    expect(markup).toContain('class="music-debug-timeline-measure-label"');
    expect(markup).toContain('>M1<');
    expect(markup).toContain('>Q<');
    expect(markup).toContain('>A<');
    expect(markup).toContain('class="music-debug-timeline-playhead-chord"');
    expect(markup).toContain(FOREST_SNAPSHOT.theme.vocabulary.modeLabel);
    expect(markup).toContain(
      `Scale ${resolveMusicDebugPitchClassLabel(
        FOREST_SNAPSHOT.scaleMap.rootMidiNote
      )}`
    );
    expect(markup).toMatch(/<path d="M[0-9.]+ 84\.00 V296\.00"/);
    expect(markup).toContain('rgba(85,214,190,0.08)');
    expect(markup).toContain('stroke="#f5f7fb"');
  });

  it('renders percussion lane labels in the standalone svg export', () => {
    const markup = buildMusicDebugTimelineSvgMarkup(
      TIMELINE_PERCUSSION_LANES_SNAPSHOT
    );

    expect(markup).toContain('class="music-debug-timeline-percussion-lane-label"');
    expect(markup).toContain('>Kick<');
    expect(markup).toContain('>Snare<');
    expect(markup).toContain('>Cymbals<');
  });

  it('renders out-of-scale notes with a warning color in svg exports', () => {
    const markup = buildMusicDebugTimelineSvgMarkup(
      OUT_OF_SCALE_TIMELINE_SNAPSHOT
    );

    expect(markup).toContain('fill="#ff7b72"');
  });

  it('renders cadence warning badges in svg exports', () => {
    const markup = buildMusicDebugTimelineSvgMarkup(
      CADENCE_WARNING_TIMELINE_SNAPSHOT
    );

    expect(markup).toContain('class="music-debug-timeline-cadence-warning"');
    expect(markup).toContain('failed target and harmony checks');
  });
});
