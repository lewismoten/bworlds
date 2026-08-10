import { fract } from "../math";

export function getPlanetaryOrbitProgress(
  elapsedDays: number,
  profile: {
    orbitLengthDays: number;
    wobblePeriodDays: number;
    wobbleAmplitude: number;
    wobblePhase: number;
  }
) {
  const baseProgress = elapsedDays / profile.orbitLengthDays;
  const wobble =
    Math.sin(
      (elapsedDays / profile.wobblePeriodDays) * Math.PI * 2 +
        profile.wobblePhase
    ) * profile.wobbleAmplitude;
  const retrogradeBias =
    Math.sin(
      (elapsedDays / (profile.orbitLengthDays * 1.4)) * Math.PI * 2 +
        profile.wobblePhase
    ) *
    profile.wobbleAmplitude *
    0.46;
  return fract(baseProgress + wobble + retrogradeBias);
}
