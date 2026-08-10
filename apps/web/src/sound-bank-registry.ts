import type {
  ProceduralInstrumentRole,
} from './procedural-music.ts';
import type {
  SoundBankInstrumentDefinition,
} from './procedural-music-sound-bank.ts';

export type SoundBankInstrumentRegistryWarning = Readonly<{
  instrumentId: string;
  sourcePlugin: string;
  message: string;
}>;

export type SoundBankInstrumentRegistryEntry = Readonly<
  SoundBankInstrumentDefinition & {
    sourcePlugin: string;
    isValid: boolean;
    validationMessages: readonly string[];
  }
>;

export type SoundBankInstrumentRegistration = Readonly<{
  definition: SoundBankInstrumentDefinition;
  sourcePlugin: string;
}>;

export type SoundBankInstrumentRegistry = Readonly<{
  entries: readonly SoundBankInstrumentRegistryEntry[];
  warnings: readonly SoundBankInstrumentRegistryWarning[];
}>;

const VALID_ROLES: readonly ProceduralInstrumentRole[] = [
  'lead',
  'harmony',
  'bass',
  'percussion',
];

export function createSoundBankInstrumentRegistry(
  registrations: readonly SoundBankInstrumentRegistration[]
): SoundBankInstrumentRegistry {
  const entries = registrations.map(({ definition, sourcePlugin }) => ({
    ...definition,
    sourcePlugin,
    isValid: true,
    validationMessages: [] as string[],
  }));

  const entriesById = new Map<string, number[]>();
  const entriesByProgramNumber = new Map<number, number[]>();

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    const validationMessages = validateSoundBankInstrumentDefinition(entry);
    if (validationMessages.length > 0) {
      entry.isValid = false;
      entry.validationMessages.push(...validationMessages);
    }

    const indexesWithId = entriesById.get(entry.id) ?? [];
    indexesWithId.push(index);
    entriesById.set(entry.id, indexesWithId);

    if (entry.generalMidiProgramNumber !== null) {
      const indexesWithProgram =
        entriesByProgramNumber.get(entry.generalMidiProgramNumber) ?? [];
      indexesWithProgram.push(index);
      entriesByProgramNumber.set(
        entry.generalMidiProgramNumber,
        indexesWithProgram
      );
    }
  }

  for (const indexes of entriesById.values()) {
    if (indexes.length < 2) {
      continue;
    }
    for (const index of indexes) {
      entries[index]!.isValid = false;
      entries[index]!.validationMessages.push('Duplicate instrument ID.');
    }
  }

  for (const indexes of entriesByProgramNumber.values()) {
    if (indexes.length < 2) {
      continue;
    }
    for (const index of indexes) {
      entries[index]!.isValid = false;
      entries[index]!.validationMessages.push(
        'Duplicate General MIDI program mapping.'
      );
    }
  }

  return {
    entries,
    warnings: entries.flatMap((entry) =>
      entry.validationMessages.map((message) => ({
        instrumentId: entry.id,
        sourcePlugin: entry.sourcePlugin,
        message,
      }))
    ),
  };
}

export function registerSoundBankPluginInstruments(options: {
  pluginName: string;
  definitions: readonly SoundBankInstrumentDefinition[];
}): SoundBankInstrumentRegistration[] {
  return options.definitions.map((definition) => ({
    definition,
    sourcePlugin: options.pluginName,
  }));
}

function validateSoundBankInstrumentDefinition(
  entry: SoundBankInstrumentDefinition
): string[] {
  const messages: string[] = [];

  if (entry.id.trim().length === 0) {
    messages.push('Instrument ID is required.');
  }
  if (entry.generalMidiInstrumentName.trim().length === 0) {
    messages.push('General MIDI instrument name is required.');
  }
  if (entry.generalMidiFamilyName.trim().length === 0) {
    messages.push('General MIDI family name is required.');
  }
  if (
    entry.generalMidiProgramNumber !== null &&
    (!Number.isInteger(entry.generalMidiProgramNumber) ||
      entry.generalMidiProgramNumber < 0 ||
      entry.generalMidiProgramNumber > 127)
  ) {
    messages.push('General MIDI program number must be null or 0-127.');
  }
  if (
    entry.supportedRoles.length === 0 ||
    !entry.supportedRoles.every((role) => VALID_ROLES.includes(role))
  ) {
    messages.push('Supported roles must contain one or more valid roles.');
  }
  if (!entry.supportedRoles.includes(entry.role)) {
    messages.push('Supported roles must include the primary role.');
  }
  pushRangeValidation(
    messages,
    'recommended MIDI range',
    entry.recommendedMidiRange.minMidiNote,
    entry.recommendedMidiRange.maxMidiNote
  );
  pushRangeValidation(
    messages,
    'preferred MIDI range',
    entry.preferredMidiRange.minMidiNote,
    entry.preferredMidiRange.maxMidiNote
  );
  if (
    entry.preferredMidiRange.minMidiNote <
      entry.recommendedMidiRange.minMidiNote ||
    entry.preferredMidiRange.maxMidiNote >
      entry.recommendedMidiRange.maxMidiNote
  ) {
    messages.push(
      'Preferred MIDI range must stay inside the recommended range.'
    );
  }
  if (
    !Number.isInteger(entry.defaultVelocity) ||
    entry.defaultVelocity < 1 ||
    entry.defaultVelocity > 127
  ) {
    messages.push('Default velocity must be an integer from 1 to 127.');
  }
  if (
    !Number.isFinite(entry.defaultNoteDurationMs) ||
    entry.defaultNoteDurationMs <= 0
  ) {
    messages.push('Default note duration must be greater than zero.');
  }

  return messages;
}

function pushRangeValidation(
  messages: string[],
  label: string,
  minMidiNote: number,
  maxMidiNote: number
): void {
  if (
    !Number.isInteger(minMidiNote) ||
    !Number.isInteger(maxMidiNote) ||
    minMidiNote < 0 ||
    maxMidiNote > 127 ||
    minMidiNote > maxMidiNote
  ) {
    messages.push(`${label} must stay within 0-127 and use min <= max.`);
  }
}
