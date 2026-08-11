import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  buildMusicDebugInstrumentPanelMarkup,
  resolveMusicDebugInstrumentPreviewPhraseNotes,
  resolveMusicDebugInstrumentPreviewNote,
} from './music-debug-instrument-panel.ts';

const FOREST_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
});
const FOREST_MARKUP = buildMusicDebugInstrumentPanelMarkup(FOREST_SNAPSHOT);
const PERCUSSION_NOTE = FOREST_SNAPSHOT.notes.find(
  (note) => note.role === 'percussion' && note.instrumentId.includes(':perc-')
)!;
const PERCUSSION_VOICE_ID =
  PERCUSSION_NOTE.instrumentId.match(/:perc-([a-z-]+-\d+):/)?.[1] ?? null;

describe('music debug instrument panel', () => {
  it('renders instrument cards with waveform previews and play buttons', () => {
    expect(FOREST_MARKUP).toContain('music-debug-instrument-panel');
    expect(FOREST_MARKUP).toContain('music-debug-instrument-card');
    expect(FOREST_MARKUP).toContain('music-debug-instrument-waveform');
    expect(FOREST_MARKUP).toContain('music-debug-instrument-play');
    expect(FOREST_MARKUP).toContain('music-debug-instrument-play-phrase');
    expect(FOREST_MARKUP).toContain('data-preview-id="lead"');
    expect(FOREST_MARKUP).toContain('data-preview-id="harmony"');
    expect(FOREST_MARKUP).toContain('data-preview-id="bass"');
    expect(FOREST_MARKUP).toContain('data-preview-id="percussion:');
    expect(FOREST_MARKUP).toContain('Play Phrase');
    expect(FOREST_MARKUP).toContain('percussion / ');
    expect(FOREST_MARKUP).toContain('>Melody<');
    expect(FOREST_MARKUP).toContain('>Harmony<');
    expect(FOREST_MARKUP).toContain('>Bass<');
    expect(FOREST_MARKUP.indexOf('>Melody<')).toBeLessThan(
      FOREST_MARKUP.indexOf('>Harmony<')
    );
    expect(FOREST_MARKUP.indexOf('>Harmony<')).toBeLessThan(
      FOREST_MARKUP.indexOf('>Bass<')
    );
    expect(FOREST_MARKUP).toContain('<svg viewBox=');
  });

  it('derives a short solo-preview note from a role in the song', () => {
    const note = resolveMusicDebugInstrumentPreviewNote(
      FOREST_SNAPSHOT,
      'lead',
      5_000
    );

    expect(note).toEqual(
      expect.objectContaining({
        role: 'lead',
        instrumentId: FOREST_SNAPSHOT.instrumentBank.instruments.lead.id,
        startMs: 5_004,
      })
    );
    expect(note?.durationMs).toBeGreaterThanOrEqual(140);
    expect(note?.durationMs).toBeLessThanOrEqual(420);
    expect(note?.attackMs).toBeLessThanOrEqual(14);
    expect(note?.releaseMs).toBeLessThanOrEqual(140);
  });

  it('derives a solo-preview note for a specific percussion voice', () => {
    expect(PERCUSSION_VOICE_ID).toBeTruthy();

    const note = resolveMusicDebugInstrumentPreviewNote(
      FOREST_SNAPSHOT,
      `percussion:${PERCUSSION_VOICE_ID!}`,
      7_000
    );

    expect(note).toEqual(
      expect.objectContaining({
        role: 'percussion',
        instrumentId: PERCUSSION_NOTE.instrumentId,
        startMs: 7_004,
      })
    );
  });

  it('derives a short phrase preview from the current role notes', () => {
    const notes = resolveMusicDebugInstrumentPreviewPhraseNotes(
      FOREST_SNAPSHOT,
      'lead',
      9_000
    );

    expect(notes.length).toBeGreaterThan(1);
    expect(notes.length).toBeLessThanOrEqual(8);
    expect(notes[0]?.instrumentId).toBe(
      FOREST_SNAPSHOT.instrumentBank.instruments.lead.id
    );
    expect(notes[0]?.startMs).toBe(9_004);
    expect(
      notes.every((note) => note.role === 'lead' && note.startMs >= 9_004)
    ).toBe(true);
  });
});
