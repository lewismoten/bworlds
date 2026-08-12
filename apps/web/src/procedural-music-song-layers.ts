import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSectionContext } from './procedural-music-song-section-context.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

export type ProceduralSongLayerTreatment = {
  muted: boolean;
  volumeMultiplier: number;
  velocityMultiplier: number;
  durationMultiplier: number;
  releaseMultiplier: number;
};

type HarmonyLeadSpaceConfig = {
  muteEvery: number;
  durationMultiplier: number;
  volumeMultiplier: number;
};

export function describeSongSectionLayerArrangement(
  section: Pick<ProceduralMusicSongSection, 'id' | 'label'>
): string {
  switch (section.id) {
    case 'intro':
      return `${section.label}: no percussion, thin bass`;
    case 'a-prime':
      return `${section.label}: lead-forward reprise`;
    case 'b':
      return `${section.label}: lighter harmony, thinner percussion`;
    case 'variation':
      return `${section.label}: thinner percussion, stretched lead`;
    case 'return':
      return `${section.label}: full layer return`;
    case 'outro':
      return `${section.label}: no percussion, fading lead`;
    case 'a':
    default:
      return `${section.label}: full layer stack`;
  }
}

export function resolveSongSectionLayerTreatment(
  context: Pick<
    ProceduralMusicSongSectionContext,
    | 'section'
    | 'note'
    | 'noteIndexInSection'
    | 'measureIndex'
    | 'sectionProgress'
    | 'phrasePosition'
  >
): ProceduralSongLayerTreatment {
  const harmonyLeadSpace = resolveHarmonyLeadSpaceConfig(
    context.section.id,
    context.note.role
  );
  const sectionVolumeCurveMultiplier = resolveSectionVolumeCurveMultiplier({
    sectionId: context.section.id,
    role: context.note.role,
    sectionProgress: context.sectionProgress,
  });
  const accompanimentDuckMultiplier = resolveAccompanimentDuckMultiplier({
    sectionId: context.section.id,
    role: context.note.role,
    phrasePosition: context.phrasePosition,
  });

  switch (context.section.id) {
    case 'intro':
      return {
        muted:
          context.note.role === 'percussion' ||
          (context.note.role === 'bass' &&
            context.noteIndexInSection % 2 === 1),
        volumeMultiplier:
          (context.note.role === 'lead' ? 0.84 : 0.68) *
          sectionVolumeCurveMultiplier *
          accompanimentDuckMultiplier,
        velocityMultiplier: context.note.role === 'percussion' ? 0.78 : 1,
        durationMultiplier:
          context.note.role === 'harmony'
            ? 1.14 * harmonyLeadSpace.durationMultiplier
            : 1,
        releaseMultiplier: 1.12,
      };
    case 'a-prime':
      return {
        muted: shouldMuteHarmonyForLeadSpace(
          harmonyLeadSpace,
          context.noteIndexInSection
        ),
        volumeMultiplier:
          (context.note.role === 'lead'
            ? 1.06
            : context.note.role === 'harmony'
              ? harmonyLeadSpace.volumeMultiplier
              : 1) *
          sectionVolumeCurveMultiplier *
          accompanimentDuckMultiplier,
        velocityMultiplier: context.note.role === 'percussion' ? 1.08 : 1,
        durationMultiplier:
          context.note.role === 'lead'
            ? 1.08
            : context.note.role === 'harmony'
              ? 1.08 * harmonyLeadSpace.durationMultiplier
              : 1,
        releaseMultiplier: 1,
      };
    case 'b':
      return {
        muted:
          shouldMuteHarmonyForLeadSpace(
            harmonyLeadSpace,
            context.noteIndexInSection
          ) ||
          (context.note.role === 'percussion' &&
            context.measureIndex % 2 === 1) ||
          (context.note.role === 'harmony' &&
            context.noteIndexInSection % 2 === 0),
        volumeMultiplier:
          (context.note.role === 'lead'
            ? 1.08
            : context.note.role === 'percussion'
              ? 0.68
              : context.note.role === 'harmony'
                ? harmonyLeadSpace.volumeMultiplier
                : 1) *
          sectionVolumeCurveMultiplier *
          accompanimentDuckMultiplier,
        velocityMultiplier: context.note.role === 'percussion' ? 0.84 : 1,
        durationMultiplier:
          context.note.role === 'bass'
            ? 1.06
            : context.note.role === 'harmony'
              ? harmonyLeadSpace.durationMultiplier
              : 1,
        releaseMultiplier: 1,
      };
    case 'variation':
      return {
        muted:
          (context.note.role === 'percussion' &&
            (context.noteIndexInSection % 4 === 0 ||
              context.noteIndexInSection % 5 === 4)) ||
          shouldMuteHarmonyForLeadSpace(
            harmonyLeadSpace,
            context.noteIndexInSection
          ),
        volumeMultiplier:
          (context.note.role === 'harmony'
            ? harmonyLeadSpace.volumeMultiplier
            : 1) *
          sectionVolumeCurveMultiplier *
          accompanimentDuckMultiplier,
        velocityMultiplier: context.note.role === 'percussion' ? 1.18 : 1,
        durationMultiplier:
          context.note.role === 'lead'
            ? 1.78
            : context.note.role === 'harmony'
              ? 1.1 * harmonyLeadSpace.durationMultiplier
              : 1,
        releaseMultiplier: context.note.role === 'lead' ? 1.18 : 1,
      };
    case 'return':
      return {
        muted: false,
        volumeMultiplier:
          (context.note.role === 'lead'
            ? 0.94
            : context.note.role === 'harmony'
              ? harmonyLeadSpace.volumeMultiplier
              : 1.02) *
          sectionVolumeCurveMultiplier *
          accompanimentDuckMultiplier,
        velocityMultiplier: context.note.role === 'percussion' ? 1.1 : 1,
        durationMultiplier:
          context.note.role === 'harmony'
            ? harmonyLeadSpace.durationMultiplier
            : context.note.role === 'bass'
              ? 1.06
              : 1,
        releaseMultiplier:
          context.note.role === 'harmony'
            ? 1.08
            : context.note.role === 'lead'
              ? 1.02
              : 1,
      };
    case 'outro':
      return {
        muted:
          context.note.role === 'percussion' ||
          (context.note.role === 'lead' &&
            context.noteIndexInSection % 2 === 1),
        volumeMultiplier:
          0.72 * sectionVolumeCurveMultiplier * accompanimentDuckMultiplier,
        velocityMultiplier: context.note.role === 'percussion' ? 0.76 : 1,
        durationMultiplier:
          context.note.role === 'harmony'
            ? 1.2 * harmonyLeadSpace.durationMultiplier
            : 1.08,
        releaseMultiplier: 1.24,
      };
    case 'a':
    default:
      return {
        muted: false,
        volumeMultiplier:
          (context.note.role === 'harmony'
            ? harmonyLeadSpace.volumeMultiplier
            : 1) *
          sectionVolumeCurveMultiplier *
          accompanimentDuckMultiplier,
        velocityMultiplier: 1,
        durationMultiplier:
          context.note.role === 'harmony'
            ? harmonyLeadSpace.durationMultiplier
            : 1,
        releaseMultiplier: 1,
      };
  }
}

function resolveHarmonyLeadSpaceConfig(
  sectionId: ProceduralMusicSongSection['id'],
  role: ProceduralMusicNote['role']
): HarmonyLeadSpaceConfig {
  if (role !== 'harmony') {
    return {
      muteEvery: 0,
      durationMultiplier: 1,
      volumeMultiplier: 1,
    };
  }

  switch (sectionId) {
    case 'intro':
      return {
        muteEvery: 0,
        durationMultiplier: 0.94,
        volumeMultiplier: 0.96,
      };
    case 'a':
      return {
        muteEvery: 0,
        durationMultiplier: 0.88,
        volumeMultiplier: 0.9,
      };
    case 'a-prime':
      return {
        muteEvery: 4,
        durationMultiplier: 0.64,
        volumeMultiplier: 0.9,
      };
    case 'b':
      return {
        muteEvery: 2,
        durationMultiplier: 0.5,
        volumeMultiplier: 0.74,
      };
    case 'variation':
      return {
        muteEvery: 4,
        durationMultiplier: 0.62,
        volumeMultiplier: 0.84,
      };
    case 'return':
      return {
        muteEvery: 0,
        durationMultiplier: 1.02,
        volumeMultiplier: 1.04,
      };
    case 'outro':
      return {
        muteEvery: 0,
        durationMultiplier: 0.92,
        volumeMultiplier: 0.94,
      };
    default:
      return {
        muteEvery: 0,
        durationMultiplier: 1,
        volumeMultiplier: 1,
      };
  }
}

function shouldMuteHarmonyForLeadSpace(
  config: HarmonyLeadSpaceConfig,
  noteIndexInSection: number
): boolean {
  return config.muteEvery > 0 && noteIndexInSection % config.muteEvery === 0;
}

function resolveSectionVolumeCurveMultiplier(options: {
  sectionId: ProceduralMusicSongSection['id'];
  role: ProceduralMusicNote['role'];
  sectionProgress: number;
}): number {
  const progress = clampUnit(options.sectionProgress);
  switch (options.sectionId) {
    case 'intro':
      return interpolateSectionCurve(
        progress,
        options.role === 'lead' ? 0.9 : 0.84,
        options.role === 'lead' ? 1 : 0.94,
        options.role === 'lead' ? 0.98 : 0.92
      );
    case 'a':
      return interpolateSectionCurve(
        progress,
        options.role === 'lead' ? 0.99 : 0.97,
        options.role === 'lead' ? 1.04 : 1.01,
        options.role === 'lead' ? 1 : 0.98
      );
    case 'a-prime':
      return interpolateSectionCurve(
        progress,
        options.role === 'lead' ? 1.01 : 0.97,
        options.role === 'lead' ? 1.08 : 1.02,
        options.role === 'lead' ? 1.03 : 0.99
      );
    case 'b':
      return interpolateSectionCurve(
        progress,
        options.role === 'lead' ? 0.98 : 0.95,
        options.role === 'lead' ? 1.04 : 0.99,
        options.role === 'lead' ? 1 : 0.96
      );
    case 'variation':
      return interpolateSectionCurve(
        progress,
        options.role === 'lead' ? 0.98 : 0.94,
        options.role === 'lead' ? 1.12 : 1.04,
        options.role === 'lead' ? 1.04 : 0.97
      );
    case 'return':
      return interpolateSectionCurve(
        progress,
        options.role === 'lead' ? 0.97 : 0.99,
        options.role === 'lead' ? 1.04 : 1.03,
        options.role === 'lead' ? 1 : 1.01
      );
    case 'outro':
      return interpolateSectionCurve(
        progress,
        options.role === 'lead' ? 0.98 : 0.94,
        options.role === 'lead' ? 0.92 : 0.88,
        options.role === 'lead' ? 0.8 : 0.76
      );
    default:
      return 1;
  }
}

function resolveAccompanimentDuckMultiplier(options: {
  sectionId: ProceduralMusicSongSection['id'];
  role: ProceduralMusicNote['role'];
  phrasePosition: number;
}): number {
  if (options.role === 'lead') {
    return 1;
  }

  const normalizedPhrasePosition = options.phrasePosition % 8;
  const leadForwardWindow = normalizedPhrasePosition <= 5;
  if (!leadForwardWindow) {
    return 1;
  }

  switch (options.role) {
    case 'harmony':
      return options.sectionId === 'variation' ? 0.84 : 0.9;
    case 'bass':
      return options.sectionId === 'variation' ? 0.9 : 0.95;
    case 'percussion':
      return options.sectionId === 'variation' ? 0.94 : 0.97;
    default:
      return 1;
  }
}

function interpolateSectionCurve(
  progress: number,
  start: number,
  peak: number,
  end: number
): number {
  if (progress <= 0.5) {
    return lerp(start, peak, progress / 0.5);
  }
  return lerp(peak, end, (progress - 0.5) / 0.5);
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * clampUnit(amount);
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}
