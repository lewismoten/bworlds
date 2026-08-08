import { hash2D } from '@bworlds/core';

export type TownLevel = 1 | 2 | 3 | 4;
export type TownBuildingRole = 'residential' | 'professional';

export type TownProfile = {
  level: TownLevel;
  residentialBuildings: number;
  professionalBuildings: number;
  buildingCount: number;
  population: number;
};

export type TownBuildingPlot = {
  x: number;
  y: number;
  role: TownBuildingRole;
};

const BUILDING_ROW_Y = 5;
const SLOT_X_ORDER = [0, -2, 2, -4, 4, -6, 6, -8, 8] as const;
const SLOT_ORDER: ReadonlyArray<{ x: number; y: number }> = [
  ...SLOT_X_ORDER.flatMap((x) => [
    { x, y: -BUILDING_ROW_Y },
    { x, y: BUILDING_ROW_Y },
  ]),
];

export function getTownProfile(tileX: number, tileY: number): TownProfile {
  const level = (1 + Math.floor(hash2D('town-level', tileX, tileY) * 4)) as TownLevel;
  const residentialBuildings =
    2 + level * 2 + Math.floor(hash2D('town-residential', tileX, tileY) * 2);
  const professionalBuildings =
    1 + level + Math.floor(hash2D('town-professional', tileX, tileY) * 2);
  const buildingCount = Math.min(
    SLOT_ORDER.length,
    residentialBuildings + professionalBuildings
  );
  const householdSize =
    2 + Math.floor(hash2D('town-household-size', tileX, tileY) * 3);
  const staffSize = 2 + level;
  const population =
    residentialBuildings * householdSize + professionalBuildings * staffSize;

  return {
    level,
    residentialBuildings,
    professionalBuildings,
    buildingCount,
    population,
  };
}

export function getTownBuildingPlots(tileX: number, tileY: number): TownBuildingPlot[] {
  const profile = getTownProfile(tileX, tileY);
  const plots = SLOT_ORDER.slice(0, profile.buildingCount);
  return plots.map((slot, index) => ({
    ...slot,
    role: index < profile.professionalBuildings ? 'professional' : 'residential',
  }));
}
