import { describe, expect, it } from 'vitest';
import {
  buildSoundBankDebugMarkup,
  createSoundBankDebugPercussionRangeAuditionNotes,
  createSoundBankDebugQuietPercussionPatternNotes,
  createSoundBankDebugSnapshot,
  createSoundBankDebugStandardPercussionPatternNotes,
  normalizeSoundBankDebugPercussionBrowserState,
  resolveSoundBankDebugPreviewNoteRole,
} from './sound-bank-debug.ts';

describe('sound bank debug percussion browser', () => {
  it('normalizes percussion browser family filters into supported values', () => {
    expect(
      normalizeSoundBankDebugPercussionBrowserState({
        familyFilter: 'snare',
      })
    ).toEqual({
      familyFilter: 'snare',
    });
    expect(
      normalizeSoundBankDebugPercussionBrowserState({
        familyFilter: 'drums' as 'all',
      })
    ).toEqual({
      familyFilter: 'all',
    });
  });

  it('builds fallback preview notes for percussion voices outside the current song seed', () => {
    const snapshot = createSoundBankDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
    });

    const note = resolveSoundBankDebugPreviewNoteRole(
      snapshot,
      'percussion:cymbals-51',
      9_000
    );

    expect(note).toEqual(
      expect.objectContaining({
        role: 'percussion',
        instrumentId: expect.stringContaining(':perc-cymbals-51:preview'),
        startMs: 9_004,
        waveform: 'square',
      })
    );
    expect(note?.durationMs).toBeGreaterThanOrEqual(96);
    expect(note?.attackMs).toBeGreaterThanOrEqual(4);
    expect(note?.releaseMs).toBeGreaterThanOrEqual(24);
  });

  it('filters the percussion browser to a selected drum family', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const markup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
      percussionBrowserState: {
        familyFilter: 'snare',
      },
    }).replace(/\s+/g, ' ');
    const percussionSection =
      markup.match(
        /<h2>Percussion Browser<\/h2>[\s\S]*?<section class="sound-bank-debug-panel"> <div class="sound-bank-debug-panel-head"> <div> <p class="sound-bank-debug-panel-kicker">General MIDI<\/p>/
      )?.[0] ?? markup;
    const percussionPadGrid =
      markup.match(
        /<div class="sound-bank-debug-percussion-pad-grid"[\s\S]*?<\/div> <div class="sound-bank-debug-percussion-browser">/
      )?.[0] ?? markup;

    expect(percussionSection).toContain('Snare');
    expect(percussionSection).toContain('Snare Main');
    expect(percussionSection).not.toContain('Kick Center');
    expect(percussionSection).not.toContain('Closed Hat');
    expect(percussionPadGrid).toContain('Snare Main');
    expect(percussionPadGrid).not.toContain('Kick Center');
    expect(percussionPadGrid).toContain('data-percussion-key="4"');
  });

  it('renders a compact drum pad grid for percussion previews', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const markup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
      percussionBrowserState: {
        familyFilter: 'kick',
      },
    }).replace(/\s+/g, ' ');
    const percussionPadGrid =
      markup.match(
        /<div class="sound-bank-debug-percussion-pad-grid"[\s\S]*?<\/div> <div class="sound-bank-debug-percussion-browser">/
      )?.[0] ?? markup;

    expect(percussionPadGrid).toContain('sound-bank-debug-percussion-pad-grid');
    expect(percussionPadGrid).toContain('data-preview-id="percussion:kick-36"');
    expect(percussionPadGrid).toContain('data-percussion-key="1"');
    expect(percussionPadGrid).toContain('data-percussion-key="3"');
    expect(percussionPadGrid).toContain('Kick Center');
    expect(percussionPadGrid).toContain('Floor Tom');
    expect(percussionPadGrid).not.toContain('High Floor Tom');
  });

  it('shows missing General MIDI percussion patches as unavailable browser rows', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const markup = buildSoundBankDebugMarkup(snapshot, {
      audioStatus: 'Audio idle',
      percussionBrowserState: {
        familyFilter: 'kick',
      },
    }).replace(/\s+/g, ' ');

    expect(markup).toMatch(
      /High Floor Tom[\s\S]*Missing patch[\s\S]*>Unavailable</
    );
  });

  it('builds a percussion range audition from the visible drum-family filter', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const notes = createSoundBankDebugPercussionRangeAuditionNotes(
      snapshot,
      {
        familyFilter: 'kick',
      },
      12_000
    );

    expect(notes).toHaveLength(3);
    expect(notes.map((note) => note.instrumentId)).toEqual([
      expect.stringContaining(':perc-kick-36:'),
      expect.stringContaining(':perc-kick-35:'),
      expect.stringContaining(':perc-kick-41:'),
    ]);
    expect(notes.map((note) => note.startMs)).toEqual([12_004, 12_184, 12_364]);
  });

  it('builds a standard percussion pattern audition from visible drum voices', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const notes = createSoundBankDebugStandardPercussionPatternNotes(
      snapshot,
      {
        familyFilter: 'all',
      },
      16_000
    );

    expect(notes).toHaveLength(8);
    expect(notes.map((note) => note.instrumentId)).toEqual([
      expect.stringContaining(':perc-kick-36:'),
      expect.stringContaining(':perc-cymbals-42:'),
      expect.stringContaining(':perc-snare-38:'),
      expect.stringContaining(':perc-cymbals-42:'),
      expect.stringContaining(':perc-kick-36:'),
      expect.stringContaining(':perc-cymbals-42:'),
      expect.stringContaining(':perc-snare-38:'),
      expect.stringContaining(':perc-cymbals-46:'),
    ]);
    expect(notes.map((note) => note.startMs)).toEqual([
      16_004, 16_174, 16_344, 16_514, 16_684, 16_854, 17_024, 17_194,
    ]);
  });

  it('builds a quieter percussion pattern audition from visible drum voices', () => {
    const snapshot = createSoundBankDebugSnapshot();
    const standardNotes = createSoundBankDebugStandardPercussionPatternNotes(
      snapshot,
      {
        familyFilter: 'all',
      },
      16_000
    );
    const quietNotes = createSoundBankDebugQuietPercussionPatternNotes(
      snapshot,
      {
        familyFilter: 'all',
      },
      16_000
    );

    expect(quietNotes).toHaveLength(8);
    expect(quietNotes.map((note) => note.instrumentId)).toEqual(
      standardNotes.map((note) => note.instrumentId)
    );
    expect(quietNotes.map((note) => note.startMs)).toEqual(
      standardNotes.map((note) => note.startMs)
    );
    expect(
      quietNotes.every(
        (note, index) => note.volume < standardNotes[index]!.volume
      )
    ).toBe(true);
    expect(
      quietNotes.every(
        (note, index) =>
          (note.velocity ?? 0) < (standardNotes[index]!.velocity ?? 0)
      )
    ).toBe(true);
  });
});
