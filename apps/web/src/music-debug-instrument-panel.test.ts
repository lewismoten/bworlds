import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  buildMusicDebugInstrumentPanelMarkup,
  resolveMusicDebugInstrumentPreviewNote,
} from './music-debug-instrument-panel.ts';

describe('music debug instrument panel', () => {
  it('renders instrument cards with waveform previews and play buttons', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
    });
    const markup = buildMusicDebugInstrumentPanelMarkup(snapshot);

    expect(markup).toContain('music-debug-instrument-panel');
    expect(markup).toContain('music-debug-instrument-card');
    expect(markup).toContain('music-debug-instrument-waveform');
    expect(markup).toContain('music-debug-instrument-play');
    expect(markup).toContain('data-preview-id="lead"');
    expect(markup).toContain('data-preview-id="harmony"');
    expect(markup).toContain('data-preview-id="bass"');
    expect(markup).toContain('data-preview-id="percussion:');
    expect(markup).toContain('percussion / ');
    expect(markup).toContain('>Melody<');
    expect(markup).toContain('>Harmony<');
    expect(markup).toContain('>Bass<');
    expect(markup.indexOf('>Melody<')).toBeLessThan(markup.indexOf('>Harmony<'));
    expect(markup.indexOf('>Harmony<')).toBeLessThan(markup.indexOf('>Bass<'));
    expect(markup).toContain('<svg viewBox=');
  });

  it('derives a short solo-preview note from a role in the song', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
    });

    const note = resolveMusicDebugInstrumentPreviewNote(
      snapshot,
      'lead',
      5_000
    );

    expect(note).toEqual(
      expect.objectContaining({
        role: 'lead',
        instrumentId: snapshot.instrumentBank.instruments.lead.id,
        startMs: 5_004,
      })
    );
    expect(note?.durationMs).toBeGreaterThanOrEqual(140);
    expect(note?.durationMs).toBeLessThanOrEqual(420);
    expect(note?.attackMs).toBeLessThanOrEqual(14);
    expect(note?.releaseMs).toBeLessThanOrEqual(140);
  });

  it('derives a solo-preview note for a specific percussion voice', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
    });
    const percussionNote = snapshot.notes.find(
      (note) =>
        note.role === 'percussion' && note.instrumentId.includes(':perc-')
    )!;
    const voiceId = percussionNote.instrumentId.match(/:perc-([a-z-]+-\d+):/)?.[1]!;

    const note = resolveMusicDebugInstrumentPreviewNote(
      snapshot,
      `percussion:${voiceId}`,
      7_000
    );

    expect(note).toEqual(
      expect.objectContaining({
        role: 'percussion',
        instrumentId: percussionNote.instrumentId,
        startMs: 7_004,
      })
    );
  });
});
