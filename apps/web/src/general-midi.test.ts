import { describe, expect, it } from 'vitest';
import {
  listGeneralMidiPrograms,
  listGeneralMidiProgramsByFamily,
  resolveGeneralMidiProgram,
} from './general-midi.ts';

describe('general midi catalog', () => {
  it('defines all 128 General MIDI program names in ascending program order', () => {
    const programs = listGeneralMidiPrograms();

    expect(programs).toHaveLength(128);
    expect(programs[0]).toEqual({
      programNumber: 0,
      instrumentName: 'Acoustic Grand Piano',
      familyName: 'Piano',
    });
    expect(programs[127]).toEqual({
      programNumber: 127,
      instrumentName: 'Gunshot',
      familyName: 'Sound Effects',
    });
    expect(programs.map((program) => program.programNumber)).toEqual(
      Array.from({ length: 128 }, (_, index) => index)
    );
  });

  it('groups programs into the standard sixteen General MIDI families', () => {
    const families = listGeneralMidiProgramsByFamily();

    expect(families).toHaveLength(16);
    expect(families[0]?.familyName).toBe('Piano');
    expect(families[0]?.programs).toHaveLength(8);
    expect(families[10]?.familyName).toBe('Synth Lead');
    expect(families[15]?.familyName).toBe('Sound Effects');
    expect(families.every((family) => family.programs.length === 8)).toBe(true);
  });

  it('resolves individual programs by program number', () => {
    expect(resolveGeneralMidiProgram(33)).toEqual({
      programNumber: 33,
      instrumentName: 'Electric Bass (finger)',
      familyName: 'Bass',
    });
    expect(resolveGeneralMidiProgram(80)).toEqual({
      programNumber: 80,
      instrumentName: 'Lead 1 (square)',
      familyName: 'Synth Lead',
    });
    expect(resolveGeneralMidiProgram(128)).toBeNull();
  });
});
