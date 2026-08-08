export type WaterTileKind = 'ocean' | 'river';
export type CrossingTileKind = 'bridge' | 'dock';
export type RouteTerminalTileKind =
  | 'sign'
  | 'town'
  | 'cave'
  | 'dungeon'
  | 'quarry'
  | 'lighthouse'
  | 'ship'
  | 'observatory'
  | 'station';
export type KnownTileKind =
  | 'unknown'
  | 'plains'
  | 'shore'
  | 'mountain'
  | 'forest'
  | 'interior'
  | 'floor'
  | 'wall'
  | 'door'
  | 'road'
  | 'rail'
  | 'ruins'
  | 'quarry'
  | 'lighthouse'
  | 'ship'
  | 'observatory'
  | 'station'
  | WaterTileKind
  | CrossingTileKind
  | RouteTerminalTileKind;
export type Kind = KnownTileKind | (string & {});
export type Identity = string;
export type PluginName = string;
export type PointOfInterestName = string;
export type PointOfInterestType = string;
export type PointOfInterstType = string;
export type TileName = string;
export type PointName = string;
export type TileNote = string;
export type PointX = number;
export type PointY = number;
export type TileX = number;
export type TileY = number;
export type WorldX = number;
export type WorldY = number;
export type CardinalDirection = 'E'| 'SE'| 'S'| 'SW'| 'W'| 'NW'| 'N'| 'NE';
export type AngleSnapCardinal = 0 |  45 | 90 | 135| 180 | 225 | 270 | 315;
export type FacingAngle = number;
export type ViewMode = '2d' | '3d' | 'text';
export type Color = string;
export type Seed = string | number;
export type WorldContextType =
  | 'overworld'
  | 'town'
  | 'building'
  | 'depth'
  | (string & {});

type PluginDescription = string;
type PluginTag = string;
type PluginPackId = string;

export interface PointOfInterest {
  type: PointOfInterestType;
  name: PointOfInterestName;
  [key: string]: unknown;
}

export interface Tile {
  kind: Kind;
  note?: TileNote;
  poi?: Partial<PointOfInterest>;
  [key: string]: unknown;
}
export type TileLike = Tile;
export type PoiLike = PointOfInterest;

export interface TileDefinitionLike {
  name: TileName;
  color: Color;
  miniColor: Color;
  walkable: boolean;
  wallHeight: number;
  [key: string]: unknown;
}
export type TileDefinition = TileDefinitionLike;

export interface VariantMotifLike {
  seed: number;
  int(min: number, max: number): number;
}

export interface OverworldSignals {
  continent: number;
  elevation: number;
  moisture: number;
  riverSignal: number;
  roadSignal: number;
}

export interface Point {
  x: PointX;
  y: PointY;
}
export interface NamedPoint extends Point {
  name?: PointName;
}

interface SeededPoint extends Point {
  seed: Seed;
}
interface TiledPoint extends Point, Tile {}
export interface OverworldAnchorLike extends NamedPoint {}
export interface PoiAnchorLike extends OverworldAnchorLike {
  type: PointOfInterestType;
}

export interface OverworldAnchorSet {
  townAnchors?: OverworldAnchorLike[];
  bridgeAnchors?: Point[];
  poiAnchors?: PoiAnchorLike[];
}

export interface WorldContextLike {
  id: Identity;
  depth: number;
  origin?: Point;
  label?: string;
  type?: WorldContextType;
  [key: string]: unknown;
}

export interface RuntimePlayerLike extends Point {
  facing: FacingAngle;
}

export interface WorldEnvironmentCycleLike {
  dayLengthMs?: number;
  offsetMs?: number;
  yearLengthDays?: number;
  constellationCount?: number;
  constellationSeed?: string;
  seasonDaylightAmplitude?: number;
  observerLatitudeDegrees?: number;
}

export interface WorldEnvironmentSkyLike {
  dayColor?: Color;
  dawnColor?: Color;
  duskColor?: Color;
  sunsetColor?: Color;
  nightColor?: Color;
  fogDayColor?: Color;
  fogDawnColor?: Color;
  fogDuskColor?: Color;
  fogNightColor?: Color;
}

export interface WorldEnvironmentLightingLike {
  sunColor?: Color;
  moonColor?: Color;
  ambientDayColor?: Color;
  ambientNightColor?: Color;
  groundDayColor?: Color;
  groundNightColor?: Color;
  shadowStrength?: number;
}

export interface WorldEnvironmentStarsLike {
  density?: number;
}

export type WorldWeatherConditionKind =
  | 'clear'
  | 'clouds'
  | 'wind'
  | 'fog'
  | 'light-rain'
  | 'heavy-rain'
  | 'snow'
  | 'hail';

export type WorldWeatherFrontKind = 'warm' | 'cold' | 'occluded';

export interface WorldEnvironmentWeatherFrontLike {
  id: Identity;
  kind: WorldWeatherFrontKind;
  intensity: number;
  humidityShift: number;
  temperatureShift: number;
  windDirectionDegrees: number;
  speed: number;
}

export interface WorldEnvironmentWeatherConditionLike {
  kind: WorldWeatherConditionKind;
  label: string;
  intensity: number;
  cloudCover: number;
  windStrength: number;
  precipitation: number;
  visibility: number;
  temperature: number;
  front: WorldEnvironmentWeatherFrontLike;
}

export interface WorldEnvironmentWeatherForecastDayLike {
  dayNumber: number;
  label: string;
  summary: string;
  highTemperature: number;
  lowTemperature: number;
  condition: WorldEnvironmentWeatherConditionLike;
}

export interface WorldEnvironmentWeatherLike {
  current?: WorldEnvironmentWeatherConditionLike;
  forecast?: WorldEnvironmentWeatherForecastDayLike[];
}

export interface WorldEnvironmentConstellationStarLike {
  id?: Identity;
  x: number;
  y: number;
  brightness?: number;
}

export interface WorldEnvironmentConstellationLike {
  id?: Identity;
  name: string;
  stars: WorldEnvironmentConstellationStarLike[];
  connections: Array<[number, number]>;
  daylightBias?: number;
}

export interface WorldEnvironmentCelestialEventLike {
  type: 'planet' | 'meteor-shower' | 'comet';
  name: string;
  progress: number;
  intensity: number;
  visibility: number;
  azimuth: number;
  altitude: number;
  color: Color;
  size: number;
  trailLength: number;
}

export interface WorldEnvironmentMilkyWayLike {
  azimuthOffset: number;
  inclination: number;
  width: number;
  opacity: number;
}

export interface WorldEnvironmentAuroraBandLike {
  id: Identity;
  azimuthCenter: number;
  span: number;
  altitude: number;
  height: number;
  intensity: number;
  wavePhase: number;
  colorA: Color;
  colorB: Color;
}

export interface WorldEnvironmentSolarEclipseLike {
  active: boolean;
  coverage: number;
  totality: number;
  daylightReduction: number;
  moonAzimuth: number;
  moonAltitude: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface WorldEnvironmentOrreryBodyLike {
  id: Identity;
  type: 'sun' | 'moon' | 'planet' | 'comet';
  orbitRadius: number;
  angle: number;
  orbitTilt: number;
  orbitHeight: number;
  orbitEccentricity: number;
  orbitRotation: number;
  color: Color;
  size: number;
  trailLength: number;
}

export interface WorldEnvironmentCelestialLike {
  constellations?: WorldEnvironmentConstellationLike[];
  activeConstellationIndex?: number;
  dateLabel?: string;
  visibleEvents?: WorldEnvironmentCelestialEventLike[];
  visibleEventsAppend?: WorldEnvironmentCelestialEventLike[];
  removeVisibleEventTypes?: Array<WorldEnvironmentCelestialEventLike['type']>;
  milkyWay?: WorldEnvironmentMilkyWayLike;
  auroraBands?: WorldEnvironmentAuroraBandLike[];
  solarEclipse?: WorldEnvironmentSolarEclipseLike;
  orreryBodies?: WorldEnvironmentOrreryBodyLike[];
  deriveOrreryFromVisibleEvents?: boolean;
}

export interface WorldEnvironmentLike {
  cycle?: WorldEnvironmentCycleLike;
  sky?: WorldEnvironmentSkyLike;
  lighting?: WorldEnvironmentLightingLike;
  stars?: WorldEnvironmentStarsLike;
  weather?: WorldEnvironmentWeatherLike;
  celestial?: WorldEnvironmentCelestialLike;
}

export interface WorldStateLike {
  player: RuntimePlayerLike;
  timeMs?: number;
  playerLevel?: number;
  playerProfession?: string;
  completedQuestIds?: string[];
  viewMode?: ViewMode;
  getCurrentContext(): WorldContextLike;
  getCurrentMap?(): WorldMapLike;
  getCurrentTile(x?: number, y?: number): TileLike;
  getTileDefinition(kind: Kind): TileDefinitionLike;
  canWalk?(x: number, y: number): boolean;
  interact?(): boolean;
  tryExit?(): boolean;
}

export interface ThreeCoordinateLike {
  x: number;
  y: number;
  z: number;
}

export interface ThreeVectorLike extends ThreeCoordinateLike {
  set(x: number, y: number, z: number): this;
}

export interface ThreeVector3Like extends ThreeVectorLike {
  setY(y: number): this;
  subVectors(left: ThreeCoordinateLike, right: ThreeCoordinateLike): this;
  normalize(): this;
  addScaledVector(vector: ThreeCoordinateLike, scalar: number): this;
  clone(): ThreeVector3Like;
  distanceTo(other: ThreeCoordinateLike): number;
}

export interface ThreeEulerLike {
  x: number;
  y: number;
  z: number;
}

export interface ThreeScaleLike extends ThreeVectorLike {
  setScalar(scalar: number): this;
}

export interface ThreeObject3DLike {
  position: ThreeVectorLike;
  rotation: ThreeEulerLike;
  scale: ThreeScaleLike;
  userData?: Record<string, unknown>;
  visible?: boolean;
  castShadow?: boolean;
  add(...children: ThreeObject3DLike[]): this;
  traverse?(visit: (child: ThreeObject3DLike) => void): void;
}

export type ThreeGeometryLike = object;

export interface ThreeBufferGeometryLike extends ThreeGeometryLike {
  computeVertexNormals(): void;
  setAttribute(name: string, attribute: unknown): this;
  setIndex(index: unknown): this;
}

export interface ThreeTextureRepeatLike {
  set(x: number, y: number): void;
}

export interface ThreeTextureLike {
  colorSpace?: unknown;
  magFilter?: unknown;
  minFilter?: unknown;
  generateMipmaps?: boolean;
  needsUpdate?: boolean;
  wrapS?: unknown;
  wrapT?: unknown;
  repeat?: ThreeTextureRepeatLike;
}

export type ThreeMaterialLike = object;

export interface ThreeMeshLike extends ThreeObject3DLike {
  material?: ThreeMaterialLike;
}

export interface ThreeGroupLike extends ThreeObject3DLike {}

export interface ThreePointLightLike extends ThreeObject3DLike {
  intensity: number;
}

export interface ThreeQuadraticBezierCurve3Like {
  getPoints(segments: number): ThreeVector3Like[];
}

export interface ThreeCubicBezierCurve3Like {
  getPoints(segments: number): ThreeVector3Like[];
}

type ThreeGeometryConstructorLike = new (...args: number[]) => ThreeGeometryLike;

export interface ThreeHostLike {
  BufferGeometry: new () => ThreeBufferGeometryLike;
  BoxGeometry: ThreeGeometryConstructorLike;
  CanvasTexture: new (canvas: HTMLCanvasElement) => ThreeTextureLike;
  CircleGeometry: ThreeGeometryConstructorLike;
  ConeGeometry: ThreeGeometryConstructorLike;
  CubicBezierCurve3: new (
    start: ThreeCoordinateLike,
    controlA: ThreeCoordinateLike,
    controlB: ThreeCoordinateLike,
    end: ThreeCoordinateLike
  ) => ThreeCubicBezierCurve3Like;
  CylinderGeometry: ThreeGeometryConstructorLike;
  Float32BufferAttribute: new (
    values: ArrayLike<number> | number[],
    itemSize: number
  ) => unknown;
  Group: new () => ThreeGroupLike;
  Mesh: new (
    geometry?: ThreeGeometryLike,
    material?: ThreeMaterialLike
  ) => ThreeMeshLike;
  MeshBasicMaterial: new (
    options?: Record<string, unknown>
  ) => ThreeMaterialLike;
  MeshStandardMaterial: new (
    options?: Record<string, unknown>
  ) => ThreeMaterialLike;
  PointLight: new (
    color?: unknown,
    intensity?: number,
    distance?: number,
    decay?: number
  ) => ThreePointLightLike;
  PlaneGeometry: ThreeGeometryConstructorLike;
  QuadraticBezierCurve3: new (
    start: ThreeCoordinateLike,
    control: ThreeCoordinateLike,
    end: ThreeCoordinateLike
  ) => ThreeQuadraticBezierCurve3Like;
  SphereGeometry: ThreeGeometryConstructorLike;
  TorusGeometry: ThreeGeometryConstructorLike;
  Vector3: new (x?: number, y?: number, z?: number) => ThreeVector3Like;
  DoubleSide: unknown;
  NearestFilter: unknown;
  RepeatWrapping: unknown;
  SRGBColorSpace: unknown;
}

export interface CardinalDirectionLike {
  dx: WorldX;
  dy: WorldY;
  rotationY: FacingAngle;
  label: string;
}

export interface ClassifyOverworldTileContext extends SeededPoint {
  tile: TileLike;
  nearLand: boolean;
  townChance?: number;
  caveChance?: number;
  dungeonChance?: number;
  signChance?: number;
  placementChances?: Record<string, number>;
  getPlacementChance?(chanceKey: string): number;
  signals: OverworldSignals;
  sampleTerrainSignals?: (x: number, y: number) => OverworldSignals;
  townAnchors: OverworldAnchorLike[];
  bridgeAnchors: OverworldAnchorLike[];
  poiAnchors?: PoiAnchorLike[];
}
export interface TileCoordinate {
  tile: Pick<Tile, 'kind'>;
  tileX: TileX;
  tileY: TileY;
  state: WorldStateLike;
}

export interface CanOccupy3DContext extends TileCoordinate {
  nextX: number;
  nextY: number;
  playerRadius: number;
}

export interface Dimensions {
  width: number;
  height: number;
}
export interface Paint2DContext extends TiledPoint {
  context: CanvasRenderingContext2D;
  definition: TileDefinition;
  motif: VariantMotifLike;
  tilePixelSize: number;
  fillRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ): void;
  speckle(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    count: number,
    alpha: number,
    motif: VariantMotifLike
  ): void;
}

export interface Paint2DOverlayContext {
  context: CanvasRenderingContext2D;
  tile: TileLike;
  definition: TileDefinition;
  x: number;
  y: number;
  size: number;
  worldX: number;
  worldY: number;
  variant: number;
  timeMs?: number;
}

export interface Create3DModelContext extends TileCoordinate {
  three: ThreeHostLike;
  detailLevel?: 'full' | 'low';
}

export interface Sync3DModelContext extends TileCoordinate {
  three: ThreeHostLike;
  model: unknown;
  timeMs?: number;
  cycle: {
    daylight: number;
    twilight: number;
    night: number;
    isNight?: boolean;
    moonIllumination?: number;
  };
  environment: WorldEnvironmentLike;
}

export type SurfaceBoundaryRole3D = 'sea' | 'channel' | 'crossing';

export interface SurfaceBoundaryTransition3D {
  maxChamferDrop?: number;
  minBankHeight?: number;
  bodyInset?: number;
}

export interface SurfaceProfile3DContext extends TileCoordinate {}

export interface SurfaceProfile3D {
  surfaceHeight?: number;
  boundaryRole?: SurfaceBoundaryRole3D | null;
  underlayKind?: string | null;
  chamferEligible?: boolean;
  boundaryTransition?: SurfaceBoundaryTransition3D | null;
}

export type TravelSlideAxis3D = 'ew' | 'ns';

export interface TraversalProfile3DContext extends TileCoordinate {}

export interface TraversalProfile3D {
  travelGroup?: string | null;
  slideAxis?: TravelSlideAxis3D | null;
}

export interface ResolveFloorKind3DContext extends TileCoordinate {}
export interface ResolveWorldEnvironmentContext {
  state: WorldStateLike;
  timeMs?: number;
}

interface DecoratedSeedTile extends SeededPoint {
  tile: TileLike;
}
export interface DecorateOverworldTileContext extends DecoratedSeedTile {
  signals: OverworldSignals;
}

interface DecoratedContext extends DecoratedSeedTile {
  context: WorldContextLike;
}
export interface DecorateTownTileContext extends DecoratedContext {}
export interface DecorateBuildingTileContext extends DecoratedContext {}
export interface DecorateDepthTileContext extends DecoratedContext {}

export interface SampleTerrainSignalsLike {
  (x: number, y: number): OverworldSignals;
}

interface SeededPointTerrainSignalSamples extends SeededPoint {
  sampleTerrainSignals: SampleTerrainSignalsLike;
}
export interface ResolveOverworldTileContext extends SeededPointTerrainSignalSamples {
  state?: WorldStateLike;
}
export interface ResolveOverworldAnchorsContext extends SeededPointTerrainSignalSamples {
  state?: WorldStateLike;
}

export type OverworldAnchors = {
  townAnchors: OverworldAnchorLike[];
  bridgeAnchors: Point[];
  poiAnchors: PoiAnchorLike[];
};

export interface WorldMapLike {
  getTile(x: number, y: number, state?: WorldStateLike): TileLike;
  getAction?(x: number, y: number, state?: WorldStateLike): unknown;
  getExit?(x?: number, y?: number): unknown;
}

export interface WorldActionLike {
  type: string;
  context?: WorldContextLike;
  spawn?: Point;
  facing?: FacingAngle;
  returnTo?: Point & { facing?: FacingAngle };
  [key: string]: unknown;
}

export interface PluginRegistryLike {
  getTilePlugin(kind: Kind): TilePlugin | null;
  getTileDefinition(kind: Kind): TileDefinitionLike | null;
  getDefaultTileKind(fallback?: Kind): Kind;
  getDefaultTileDefinition(
    fallback?: TileDefinitionLike | null
  ): TileDefinitionLike | null;
  resolveTileDefinition(
    kind: Kind,
    fallback?: TileDefinitionLike | null
  ): TileDefinitionLike | null;
  listTileDefinitions(): [Kind, TileDefinitionLike][];
  listResolvedTileDefinitions(
    fallbackEntries?: Array<[Kind, TileDefinitionLike]>
  ): [Kind, TileDefinitionLike][];
  classifyTerrainTile(payload: ClassifyOverworldTileContext): TileLike | null;
  classifyOverworldTile(
    payload: ClassifyOverworldTileContext
  ): TileLike | undefined;
  canOccupy3D(payload: CanOccupy3DContext): boolean | void;
  getSurfaceProfile3D(
    payload: SurfaceProfile3DContext
  ): void | SurfaceProfile3D;
  getTraversalProfile3D(
    payload: TraversalProfile3DContext
  ): void | TraversalProfile3D;
  paint2DOverlay(payload: Paint2DOverlayContext): boolean | void;
  resolveFloorKind3D(payload: ResolveFloorKind3DContext): void | Kind;
  resolveWorldEnvironment(
    payload: ResolveWorldEnvironmentContext
  ): WorldEnvironmentLike;
  createWorldAction(payload: CreateWorldActionContext): void | WorldActionLike;
  decorateOverworldTile(payload: DecorateOverworldTileContext): TileLike;
  decorateTownTile(payload: DecorateTownTileContext): TileLike;
  decorateBuildingTile(payload: DecorateBuildingTileContext): TileLike;
  decorateDepthTile(payload: DecorateDepthTileContext): TileLike;
  createMap(payload: CreateMapContext): WorldMapLike | null;
  resolveOverworldTile(payload: ResolveOverworldTileContext): TileLike | null;
  resolveOverworldAnchors(
    payload: ResolveOverworldAnchorsContext
  ): OverworldAnchors;
}

export interface CreateMapContext {
  context: WorldContextLike;
  seed: Seed;
  plugins: PluginRegistryLike;
}

export interface CreateWorldActionContext extends SeededPoint {
  tile: TileLike;
  state?: WorldStateLike;
}

export interface TilePlugin extends Pick<TileLike, 'kind'> {
  definition?: TileDefinitionLike;
  isDefaultTile?: boolean;
  classifyTerrainTile?: (
    context: ClassifyOverworldTileContext
  ) => TileLike | null;
  classifyOverworldTile?: (
    context: ClassifyOverworldTileContext
  ) => TileLike | null;
  paint2D?: (context: Paint2DContext) => boolean | void;
  paint2DOverlay?: (context: Paint2DOverlayContext) => boolean | void;
  create3DModel?: (context: Create3DModelContext) => unknown;
  sync3DModel?: (context: Sync3DModelContext) => void;
  canOccupy3D?: (context: CanOccupy3DContext) => boolean | null | void;
  getSurfaceProfile3D?: (
    context: SurfaceProfile3DContext
  ) => SurfaceProfile3D | null | void;
  getTraversalProfile3D?: (
    context: TraversalProfile3DContext
  ) => TraversalProfile3D | null | void;
  resolveFloorKind3D?: (
    context: ResolveFloorKind3DContext
  ) => Kind | null | void;
  createWorldAction?: (
    context: CreateWorldActionContext
  ) => WorldActionLike | null | void;
}

interface OrderPriority {
  priority?: number;
  after?: string[];
  before?: string[];
}

export interface OrderedPluginFactoryLike<TPlugin extends RuntimePlugin = RuntimePlugin> {
  create(): TPlugin;
  order?: OrderPriority;
}

export interface RuntimePlugin {
  name: PluginName;
  order?: OrderPriority;
  tiles?: TilePlugin[];
  createMap?: (context: CreateMapContext) => WorldMapLike | null | void;
  resolveOverworldTile?: (
    context: ResolveOverworldTileContext
  ) => TileLike | null | void;
  resolveOverworldAnchors?: (
    context: ResolveOverworldAnchorsContext
  ) => OverworldAnchorSet | null | void;
  resolveWorldEnvironment?: (
    context: ResolveWorldEnvironmentContext
  ) => WorldEnvironmentLike | null | void;
  decorateOverworldTile?: (context: DecorateOverworldTileContext) => void;
  decorateTownTile?: (context: DecorateTownTileContext) => void;
  decorateBuildingTile?: (context: DecorateBuildingTileContext) => void;
  decorateDepthTile?: (context: DecorateDepthTileContext) => void;
  [key: string]: unknown;
}

export type IndexedPlugin = {
  plugin: RuntimePlugin;
  index: number;
};

export interface PluginPackLike {
  name: PluginName;
  mapPlugins?: RuntimePlugin[];
  runtimePlugins?: RuntimePlugin[];
  tilePlugins?: RuntimePlugin[];
}

export interface PluginPackManifestLike {
  id: Identity;
  name: PluginName;
  description?: PluginDescription;
  tags?: PluginTag[];
}

export interface PluginPackDefinitionLike {
  manifest: PluginPackManifestLike;
  createPack(): PluginPackLike;
}

export interface PluginPackCatalogLike {
  packDefinitions: PluginPackDefinitionLike[];
  defaultPackIds: PluginPackId[];
  list(): PluginPackManifestLike[];
  listSelected(packIds?: PluginPackId[]): PluginPackManifestLike[];
  resolve(packId: PluginPackId): PluginPackDefinitionLike;
  createRegistry(packIds?: PluginPackId[]): PluginRegistryLike;
}
