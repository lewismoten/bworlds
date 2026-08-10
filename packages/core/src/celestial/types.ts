
export interface CelestialEventLike {
  type: 'planet' | 'meteor-shower' | 'comet';
  name: string;
  progress: number;
  intensity: number;
  visibility: number;
  azimuth: number;
  altitude: number;
  color: string;
  size: number;
  trailLength: number;
}
