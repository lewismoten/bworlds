import type { MusicDebugSectionMotifMatch } from './music-debug-section-analysis.ts';

export type MusicDebugMotifValidation = {
  totalMatchCount: number;
  exactMatchCount: number;
  variedMatchCount: number;
  isValidForMidiExport: boolean;
  messages: string[];
};

export function validateMusicDebugMotifPresence(options: {
  leadMotif: readonly number[];
  sectionMotifMatches: readonly MusicDebugSectionMotifMatch[];
  overallExactMatchCount?: number;
  overallVariedMatchCount?: number;
}): MusicDebugMotifValidation {
  const exactMatchCount =
    options.overallExactMatchCount ??
    options.sectionMotifMatches.reduce(
      (sum, section) => sum + section.exactMatchCount,
      0
    );
  const variedMatchCount =
    options.overallVariedMatchCount ??
    options.sectionMotifMatches.reduce(
      (sum, section) => sum + section.variedMatchCount,
      0
    );
  const totalMatchCount = exactMatchCount + variedMatchCount;
  const messages: string[] = [];

  if (options.leadMotif.length > 0 && totalMatchCount === 0) {
    messages.push(
      `Configured lead motif ${formatLeadMotif(options.leadMotif)} never appears in the generated song.`
    );
  }

  return {
    totalMatchCount,
    exactMatchCount,
    variedMatchCount,
    isValidForMidiExport: messages.length === 0,
    messages,
  };
}

function formatLeadMotif(motif: readonly number[]): string {
  return motif.map((degree) => degree + 1).join('-');
}
