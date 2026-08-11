import { describe, expect, it } from 'vitest';
import {
  buildMusicDebugMarkup,
  buildMusicDebugPendingSummaryMarkup,
  buildMusicDebugShellMarkup,
  buildMusicDebugSummaryMarkup,
  createMusicDebugSnapshot,
} from './music-debug.ts';

describe('music debug markup', () => {
  it('renders markup and summary content for the laboratory page', () => {
    const snapshot = createMusicDebugSnapshot();
    const markup = buildMusicDebugMarkup(snapshot);
    const summary = buildMusicDebugSummaryMarkup(snapshot);

    expect(markup).toContain('Music Laboratory');
    expect(markup).toContain('/debug/');
    expect(markup).toContain('music-debug-form');
    expect(markup).toContain('music-debug-timeline');
    expect(markup).toContain('music-debug-randomize');
    expect(markup).toContain('Play Full Song');
    expect(markup).toContain('music-debug-playback-variant');
    expect(markup).toContain('music-debug-playback-dry');
    expect(markup).toContain('Full Song</option>');
    expect(markup).toContain('Melody Only</option>');
    expect(markup).toContain('Harmony + Bass</option>');
    expect(markup).toContain('Dry playback');
    expect(markup).toContain('Download MIDI');
    expect(markup).toContain('Download Export ZIP');
    expect(markup).toContain('music-debug-export-variant');
    expect(markup).toContain('Melody Only MIDI');
    expect(markup).toContain('Harmony + Bass MIDI');
    expect(markup).toContain('Loop middle section after full-song preview');
    expect(markup).toContain('music-debug-current-time');
    expect(markup).toContain('music-debug-current-section');
    expect(markup).toContain('music-debug-section-buttons');
    expect(markup).toContain('music-debug-track-visibility');
    expect(markup).toContain('music-debug-timeline-hover');
    expect(markup).toContain('music-debug-instrument-panel');
    expect(markup).toContain('music-debug-instrument-play');
    expect(markup).toContain('music-debug-contour-graph');
    expect(markup).toContain('music-debug-cadence-conflicts');
    expect(markup).toContain('music-debug-percussion-substitutions');
    expect(markup.indexOf('>Melody<')).toBeLessThan(
      markup.indexOf('>Harmony<')
    );
    expect(markup.indexOf('>Harmony<')).toBeLessThan(markup.indexOf('>Bass<'));
    expect(markup.indexOf('id="music-debug-timeline"')).toBeLessThan(
      markup.indexOf('id="music-debug-instrument-panel-root"')
    );
    expect(
      markup.indexOf('id="music-debug-instrument-panel-root"')
    ).toBeLessThan(markup.indexOf('id="music-debug-summary"'));
    expect(markup).toContain('id="music-debug-instrument-panel-root"');
    expect(markup).toContain('music-debug-instrument-panel');
    expect(summary).toContain('Scheduled Notes');
    expect(summary).toContain('Percussion Voice Playback');
    expect(summary).toContain('Audition Drum Kit');
    expect(summary).toContain(
      'data-percussion-playback-action="audition-pattern"'
    );
    expect(summary).toContain('data-percussion-playback-action="solo"');
    expect(summary).toContain('data-percussion-playback-action="mute"');
    expect(summary).toContain('Song Length');
    expect(summary).toContain('Root MIDI');
    expect(summary).toContain('Measures');
    expect(summary).toContain('MIDI Measures');
    expect(summary).toContain('MIDI Sections');
    expect(summary).toContain('Blueprint');
    expect(summary).toContain('Loop Range');
    expect(summary).toContain('Timing Check');
    expect(summary).toContain('Encounter');
    expect(summary).toContain('Combat');
    expect(summary).toContain('Resolved BPM');
    expect(summary).toContain('MIDI BPM');
    expect(summary).toContain('Mode');
    expect(summary).toContain('Mode Offsets');
    expect(summary).toContain('Region');
    expect(summary).toContain('Location');
    expect(summary).toContain('Preferred Intervals');
    expect(summary).toContain('Interval Match');
    expect(summary).toContain('Phrase Similarity');
    expect(summary).toContain('Motif Check');
    expect(summary).toContain('semitones');
    expect(summary).toContain('Vocabulary');
    expect(summary).toContain('SongDNA');
    expect(summary).toContain('Layer Mix');
    expect(summary).toContain('Actual Layers');
    expect(summary).toContain('Layer Check');
    expect(summary).toContain('Chords');
    expect(summary).toContain('Shared Motif');
    expect(summary).toContain('Lead Motif');
    expect(summary).toContain('Location Motif');
    expect(summary).toContain('Faction Motifs');
    expect(summary).toContain('Faction Interaction');
    expect(summary).toContain('NPC Motifs');
    expect(summary).toContain('Lead Contour');
    expect(summary).toContain('Lead Contour Check');
    expect(summary).toContain('Lead Contour Graph');
    expect(summary).toContain('Lead Cadence');
    expect(summary).toContain('Lead Max Leap');
    expect(summary).toContain('Accidentals');
    expect(summary).toContain('Out-of-Mode');
    expect(summary).toContain('Black Keys');
    expect(summary).toContain('Pitch Centers');
    expect(summary).toContain('Accidental Rules');
    expect(summary).toContain('Accidental Notes');
    expect(summary).toContain('Track Pitch');
    expect(summary).toContain('Track Sounding');
    expect(summary).toContain('Track Timing');
    expect(summary).toContain('Melody ');
    expect(summary).toContain('exact repeats');
    expect(summary).toContain('Motif Matches');
    expect(summary).toContain('Motif Validation');
    expect(summary).toContain('Chord-Tone Score');
    expect(summary).toContain('Chord Measures');
    expect(summary).toContain('Harmony Chords');
    expect(summary).toContain('Bass Progression');
    expect(summary).toContain('Section Checks');
    expect(markup).toContain('Section Validation');
    expect(markup).toContain('music-debug-section-validation-card');
    expect(summary).toContain('Cadence Harmony Conflicts');
    expect(summary).toContain('Percussion Substitutions');
    expect(summary).toContain('Drum Counts');
    expect(summary).toContain('Percussion Events');
    expect(summary).toContain('MIDI Audit');
    expect(summary).toContain('avg leap');
    expect(summary).toContain('max leap');
    expect(summary).toContain('out-of-mode');
    expect(summary).toContain('% sounding');
    expect(summary).toContain('avg dur');
    expect(summary).toContain('avg gap');
    expect(summary).toContain('peak poly');
    expect(summary).toContain('Section Measures');
    expect(summary).toContain('Intro ');
    expect(summary).toContain(snapshot.theme.id);
    expect(summary).toContain(snapshot.theme.vocabulary.modeLabel);
    expect(summary).toContain(snapshot.theme.motif.adaptationLabel);
    expect(summary).toContain(snapshot.songDna.identityId);
    expect(summary).toContain(snapshot.songDna.locationIdentityId);
    expect(summary).toContain(snapshot.songDna.recognitionLabel);
    expect(summary).toMatch(/Chord Measures .* m\d/);
    expect(summary).toContain('planned range');
    expect(summary).toContain(
      snapshot.songDna.factionMotifs[0]?.factionName ?? ''
    );
    expect(summary).toContain(
      snapshot.songDna.importantNpcMotifs[0]?.npcName ?? ''
    );
    expect(markup).toContain('Hz</dd>');
  });

  it('renders a lightweight shell before the generated preview is ready', () => {
    const markup = buildMusicDebugShellMarkup();
    const pendingSummary = buildMusicDebugPendingSummaryMarkup();

    expect(markup).toContain('Music Laboratory');
    expect(markup).toContain('Generating preview...');
    expect(markup).toContain('music-debug-summary');
    expect(markup).toContain('music-debug-timeline-hover');
    expect(markup).toContain(pendingSummary.trim());
  });
});
