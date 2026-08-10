export function blendLeadMotifWithRecognition(options: {
  baseDegreeOffsets: readonly number[];
  recognitionDegreeOffsets?: readonly number[] | null;
}): readonly number[] {
  const base = options.baseDegreeOffsets.filter((degree) =>
    Number.isFinite(degree)
  );
  const recognition = (options.recognitionDegreeOffsets ?? []).filter(
    (degree) => Number.isFinite(degree)
  );

  if (base.length === 0) {
    return recognition;
  }
  if (recognition.length === 0) {
    return base;
  }

  const motifLength = Math.max(base.length, recognition.length);
  const preservedLeadLength = Math.min(4, base.length);
  const blended: number[] = [];

  for (let index = 0; index < motifLength; index += 1) {
    if (index < preservedLeadLength) {
      blended.push(base[index] ?? 0);
      continue;
    }

    const baseDegree = base[index % base.length] ?? base[base.length - 1] ?? 0;
    const recognitionDegree =
      recognition[index % recognition.length] ??
      recognition[recognition.length - 1] ??
      baseDegree;
    blended.push(index % 2 === 0 ? recognitionDegree : baseDegree);
  }

  return blended;
}
