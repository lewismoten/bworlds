type TerrainPreviewReadoutModule =
  typeof import('./terrain-preview-readout.ts');

let terrainPreviewReadoutModulePromise: Promise<TerrainPreviewReadoutModule> | null =
  null;

export function loadTerrainPreviewReadoutModule(): Promise<TerrainPreviewReadoutModule> {
  if (!terrainPreviewReadoutModulePromise) {
    terrainPreviewReadoutModulePromise = import('./terrain-preview-readout.ts');
  }
  return terrainPreviewReadoutModulePromise;
}
