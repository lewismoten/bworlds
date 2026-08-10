export interface CelestialCalendarLike {
  month: string;
  week: string;
  label: string;
}

export function formatCelestialDate(
  constellationName: string,
  moonPhaseName: string
): CelestialCalendarLike {
  return {
    month: constellationName,
    week: moonPhaseName,
    label: `${constellationName} / ${moonPhaseName}`,
  };
}
