import * as THREE from 'three';

type ConstellationPointLike = {
  x: number;
  y: number;
};

export function writeConstellationPoint(
  target: THREE.Vector3,
  anchor: THREE.Vector3,
  star: ConstellationPointLike
): THREE.Vector3 {
  return target.set(
    anchor.x + (star.x - 0.5) * 10,
    anchor.y + (0.5 - star.y) * 6,
    anchor.z
  );
}

export function createConstellationPoint(
  anchor: THREE.Vector3,
  star: ConstellationPointLike
): THREE.Vector3 {
  return writeConstellationPoint(new THREE.Vector3(), anchor, star);
}

export function writeSkyPosition(
  target: THREE.Vector3,
  theta: number,
  phi: number,
  radius: number
): THREE.Vector3 {
  const sinPhi = Math.sin(phi);
  return target.set(
    Math.cos(theta) * sinPhi * radius,
    Math.cos(phi) * radius,
    Math.sin(theta) * sinPhi * radius
  );
}

export function createSkyPosition(
  theta: number,
  phi: number,
  radius: number
): THREE.Vector3 {
  return writeSkyPosition(new THREE.Vector3(), theta, phi, radius);
}

export function writeSkyAltitudePosition(
  target: THREE.Vector3,
  azimuth: number,
  altitude: number,
  radius: number
): THREE.Vector3 {
  const phi = ((1 - altitude) * Math.PI) / 2;
  return writeSkyPosition(target, azimuth, phi, radius);
}

export function createSkyAltitudePosition(
  azimuth: number,
  altitude: number,
  radius: number
): THREE.Vector3 {
  return writeSkyAltitudePosition(
    new THREE.Vector3(),
    azimuth,
    altitude,
    radius
  );
}
