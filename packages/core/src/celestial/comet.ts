import { fract } from "../math";

export function getCometOrbitProgress(
  elapsedDays: number,
  cycleLengthDays: number,
  phaseOffset: number,
  speedExponent = 0.7
) {
  const localProgress = fract(elapsedDays / cycleLengthDays);
  const curvedProgress = Math.pow(localProgress, speedExponent);
  return fract(curvedProgress + phaseOffset);
}
