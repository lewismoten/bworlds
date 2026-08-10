import {
  createProceduralInstrumentBank as createRuntimeProceduralInstrumentBank,
  type ProceduralInstrument as RuntimeProceduralInstrument,
  type ProceduralInstrumentBank as RuntimeProceduralInstrumentBank,
  type ProceduralInstrumentRole,
  type SoundBankInstrumentDefinition,
  type SoundBankInstrumentNoteRange,
} from './procedural-music.ts';
import {
  compareInstrumentPatchToKnownGoodRolePatch,
  type KnownGoodInstrumentPatchComparison,
} from './music-instrument-timbres.ts';
import { resolveGeneralMidiMetadataForRole } from './general-midi.ts';

export type ProceduralInstrument = RuntimeProceduralInstrument &
  SoundBankInstrumentDefinition & {
    knownGoodPatchComparison: KnownGoodInstrumentPatchComparison;
  };

export type {
  SoundBankInstrumentDefinition,
  SoundBankInstrumentNoteRange,
} from './procedural-music.ts';

export type ProceduralInstrumentBank = Omit<
  RuntimeProceduralInstrumentBank,
  'instruments'
> & {
  instruments: Record<ProceduralInstrumentRole, ProceduralInstrument>;
};

export function createProceduralInstrumentBank(
  ...args: Parameters<typeof createRuntimeProceduralInstrumentBank>
): ProceduralInstrumentBank {
  const [theme] = args;
  const bank = createRuntimeProceduralInstrumentBank(...args);

  return {
    ...bank,
    instruments: {
      lead: enrichProceduralInstrument(bank.instruments.lead, theme),
      harmony: enrichProceduralInstrument(bank.instruments.harmony, theme),
      bass: enrichProceduralInstrument(bank.instruments.bass, theme),
      percussion: enrichProceduralInstrument(bank.instruments.percussion, theme),
    },
  };
}

function enrichProceduralInstrument(
  instrument: RuntimeProceduralInstrument,
  theme: { noteDurationMs: number }
): ProceduralInstrument {
  return {
    ...instrument,
    ...createSoundBankInstrumentDefinition(theme, instrument.role),
    knownGoodPatchComparison: compareInstrumentPatchToKnownGoodRolePatch({
      role: instrument.role,
      patch: instrument,
    }),
  };
}

function createSoundBankInstrumentDefinition(
  theme: { noteDurationMs: number },
  role: ProceduralInstrumentRole
): Omit<SoundBankInstrumentDefinition, 'id' | 'role'> {
  const generalMidiMetadata = resolveGeneralMidiMetadataForRole(role);
  return {
    generalMidiProgramNumber: generalMidiMetadata.programNumber,
    generalMidiInstrumentName: generalMidiMetadata.instrumentName,
    generalMidiFamilyName: generalMidiMetadata.familyName,
    supportedRoles: [role],
    recommendedMidiRange: resolveSoundBankRecommendedMidiRange(role),
    preferredMidiRange: resolveSoundBankPreferredMidiRange(role),
    defaultVelocity: resolveSoundBankDefaultVelocity(role),
    defaultNoteDurationMs: resolveSoundBankDefaultNoteDurationMs(theme, role),
  };
}

function resolveSoundBankRecommendedMidiRange(
  role: ProceduralInstrumentRole
): SoundBankInstrumentNoteRange {
  if (role === 'lead') {
    return { minMidiNote: 60, maxMidiNote: 84 };
  }
  if (role === 'harmony') {
    return { minMidiNote: 52, maxMidiNote: 76 };
  }
  if (role === 'bass') {
    return { minMidiNote: 36, maxMidiNote: 60 };
  }
  return { minMidiNote: 35, maxMidiNote: 81 };
}

function resolveSoundBankPreferredMidiRange(
  role: ProceduralInstrumentRole
): SoundBankInstrumentNoteRange {
  if (role === 'lead') {
    return { minMidiNote: 64, maxMidiNote: 79 };
  }
  if (role === 'harmony') {
    return { minMidiNote: 55, maxMidiNote: 72 };
  }
  if (role === 'bass') {
    return { minMidiNote: 40, maxMidiNote: 52 };
  }
  return { minMidiNote: 36, maxMidiNote: 54 };
}

function resolveSoundBankDefaultVelocity(role: ProceduralInstrumentRole): number {
  if (role === 'lead') {
    return 108;
  }
  if (role === 'harmony') {
    return 90;
  }
  if (role === 'bass') {
    return 96;
  }
  return 100;
}

function resolveSoundBankDefaultNoteDurationMs(
  theme: { noteDurationMs: number },
  role: ProceduralInstrumentRole
): number {
  const roleDurationMultiplier =
    role === 'lead'
      ? 1
      : role === 'harmony'
        ? 1.18
        : role === 'bass'
          ? 1.28
          : 0.5;
  return Math.max(
    120,
    Math.round(theme.noteDurationMs * roleDurationMultiplier)
  );
}
