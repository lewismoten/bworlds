import * as THREE from 'three';
import type { Kind, WorldEnvironmentLike } from '@bworlds/plugin-api';
import {
  type AuroraBandLike,
  getMilkyWayBandSamples,
  type OrreryBodyLike,
  type getDaylightCycleState,
} from '@bworlds/core';
import {
  compactThreeMaterialOptions,
  resolveThreeColor,
} from './three-material-options.ts';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;
type OverworldSamplerLike = {
  sampleOverworld(x: number, y: number): {
    kind?: string;
  };
  samplePreviewOverworld?(x: number, y: number): {
    kind?: string;
  };
  samplePreviewSurfaceKind?(x: number, y: number): string | undefined;
};
type PreviewSurfaceKindSampler = (
  x: number,
  y: number
) => PlanetSurfaceKind | undefined;

type PreviewPoint3D = {
  x: number;
  y: number;
  z: number;
};

type PreviewLightingCycleLike = Pick<
  DaylightCycleLike,
  'daylight' | 'night' | 'starsOpacity'
> & {
  solarEclipse?: DaylightCycleLike['solarEclipse'];
};
type PreviewLightingProfile = {
  ambientIntensity: number;
  hemisphereIntensity: number;
  rimIntensity: number;
  sunIntensity: number;
  sunFillIntensity: number;
  bounceFillIntensity: number;
  nightFillIntensity: number;
  emissiveIntensity: number;
  moonEmissiveIntensity: number;
  sunGlowOpacity: number;
  glowOpacity: number;
};
type PreviewFacingArrowState = {
  x: number;
  y: number;
  z: number;
  rotationY: number;
};
type PreviewShadowProfile = {
  sunCastShadow: boolean;
  cameraExtent: number;
  mapSize: number;
  bias: number;
  normalBias: number;
  radius: number;
};
type PreviewPlanetLightBalance = {
  daySideLight: number;
  darkSideLight: number;
  contrastRatio: number;
};
type CelestialPreviewSceneSignatures = {
  constellations: string;
  events: string;
  milkyWay: string;
  aurora: string;
  orbits: string;
};
type PreviewSunShadowCoverageState = {
  shadowProfile: PreviewShadowProfile;
  worldWithinShadow: boolean;
  moonWithinShadow: boolean;
};
type PreviewConstellationLineState = {
  start: PreviewPoint3D;
  end: PreviewPoint3D;
  opacity: number;
  visible: boolean;
};
type PreviewConstellationStarState = {
  position: PreviewPoint3D;
  scale: number;
  opacity: number;
  visible: boolean;
};
type PreviewConstellationRenderState = {
  lines: PreviewConstellationLineState[];
  stars: PreviewConstellationStarState[];
};
type PreviewLightRigState = {
  sun: PreviewPoint3D;
  moon: PreviewPoint3D;
  bounce: PreviewPoint3D;
  lighting: PreviewLightingProfile;
  shadowProfile: PreviewShadowProfile;
};
type PreviewSunOrbitSpec = {
  radius: number;
  altitude: number;
  fullStartAzimuth: number;
  fullEndAzimuth: number;
  daylightStartAzimuth: number;
  daylightEndAzimuth: number;
};

type PlanetSurfaceKind =
  | Kind
  | 'water'
  | 'shallows'
  | 'coast'
  | 'grassland'
  | 'jungle'
  | 'desert'
  | 'dunes'
  | 'peak'
  | 'snow'
  | 'tundra'
  | 'swamp';

const PLANET_SURFACE_COLORS: Partial<Record<PlanetSurfaceKind, string>> = {
  ocean: '#1a3d68',
  water: '#1a3d68',
  river: '#3f78a8',
  shallows: '#2c5f8f',
  coast: '#d6c08b',
  plains: '#6d9954',
  grassland: '#6d9954',
  forest: '#3e6a43',
  jungle: '#2f6b47',
  desert: '#b69258',
  dunes: '#c4a066',
  mountain: '#8d8579',
  peak: '#d9d7d2',
  snow: '#eef3f8',
  tundra: '#93a88b',
  swamp: '#516b47',
  ruins: '#867766',
  road: '#8f7f6a',
  town: '#c9b48a',
};

export function createCelestialPreviewRenderer(
  host: HTMLElement | null,
  options: {
    onRenderRequested?: () => void;
  } = {}
) {
  if (!host) {
    return {
      resize() {},
      render() {},
      isInteracting() {
        return false;
      },
    };
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 14, 28);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight('#b8d4ff', 0.8);
  scene.add(ambient);
  const hemisphere = new THREE.HemisphereLight('#cfe8ff', '#09111a', 0.9);
  scene.add(hemisphere);
  const rim = new THREE.DirectionalLight('#ffdca8', 1);
  rim.position.set(12, 16, 10);
  scene.add(rim);
  const sunLight = new THREE.DirectionalLight('#ffe2ad', 1.2);
  scene.add(sunLight);
  const sunFill = new THREE.PointLight('#ffd38a', 0.8, 48, 1.6);
  scene.add(sunFill);
  const nightFill = new THREE.DirectionalLight('#8ebcff', 0.45);
  scene.add(nightFill);
  const bounceFill = new THREE.PointLight('#8fc5ff', 0.35, 42, 1.8);
  scene.add(bounceFill);

  const root = new THREE.Group();
  scene.add(root);
  const lightTarget = new THREE.Object3D();
  root.add(lightTarget);
  sunLight.target = lightTarget;
  nightFill.target = lightTarget;
  const rotationState = {
    yaw: 0,
    pitch: 0,
    dragging: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
  };
  const world = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 28, 28),
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#15263c',
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  world.castShadow = true;
  world.receiveShadow = true;
  root.add(world);
  const planetTextureState = {
    lastSampler: null as OverworldSamplerLike | null,
  };
  const renderState = {
    dirty: true,
    lastFrameSignature: '',
  };
  const sceneSignatureState = {
    lastConstellation: '',
    lastEvents: '',
    lastMilkyWay: '',
    lastAurora: '',
    lastOrbit: '',
  };

  const worldGlow = new THREE.Mesh(
    new THREE.SphereGeometry(3.15, 28, 28),
    new THREE.MeshBasicMaterial({
      color: '#8ad6ff',
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    })
  );
  root.add(worldGlow);

  const skyShell = new THREE.Mesh(
    new THREE.SphereGeometry(12.6, 40, 40),
    new THREE.MeshBasicMaterial({
      color: '#244462',
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    })
  );
  root.add(skyShell);

  const constellationRoot = new THREE.Group();
  root.add(constellationRoot);
  const eventRoot = new THREE.Group();
  root.add(eventRoot);
  const beltRoot = new THREE.Group();
  root.add(beltRoot);
  const auroraRoot = new THREE.Group();
  root.add(auroraRoot);
  const orbitRoot = new THREE.Group();
  root.add(orbitRoot);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 24, 24),
    new THREE.MeshBasicMaterial({ color: '#ffd06e' })
  );
  root.add(sun);
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(1.42, 24, 24),
    new THREE.MeshBasicMaterial({
      color: '#ffdca2',
      transparent: true,
      opacity: 0.22,
    })
  );
  root.add(sunGlow);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 20, 20),
    new THREE.MeshStandardMaterial({
      color: '#dce8ff',
      emissive: '#203248',
      roughness: 0.9,
      metalness: 0.02,
    })
  );
  moon.castShadow = true;
  moon.receiveShadow = true;
  root.add(moon);

  const facingArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.4, 10),
    new THREE.MeshBasicMaterial({ color: '#55d6be' })
  );
  facingArrow.rotation.x = Math.PI / 2;
  facingArrow.position.set(0, 3.8, 0);
  root.add(facingArrow);

  host.addEventListener('pointerdown', (event) => {
    rotationState.dragging = true;
    rotationState.pointerId = event.pointerId;
    rotationState.lastX = event.clientX;
    rotationState.lastY = event.clientY;
    host.classList.add('is-dragging');
    host.setPointerCapture(event.pointerId);
    options.onRenderRequested?.();
  });

  host.addEventListener('pointermove', (event) => {
    if (!rotationState.dragging || event.pointerId !== rotationState.pointerId) {
      return;
    }
    const deltaX = event.clientX - rotationState.lastX;
    const deltaY = event.clientY - rotationState.lastY;
    rotationState.lastX = event.clientX;
    rotationState.lastY = event.clientY;
    rotationState.yaw += deltaX * 0.008;
    rotationState.pitch = clamp(rotationState.pitch + deltaY * 0.006, -0.9, 0.9);
    options.onRenderRequested?.();
  });

  const releasePointer = (event: PointerEvent) => {
    if (event.pointerId !== rotationState.pointerId) {
      return;
    }
    rotationState.dragging = false;
    rotationState.pointerId = -1;
    host.classList.remove('is-dragging');
    if (host.hasPointerCapture(event.pointerId)) {
      host.releasePointerCapture(event.pointerId);
    }
    options.onRenderRequested?.();
  };

  host.addEventListener('pointerup', releasePointer);
  host.addEventListener('pointercancel', releasePointer);
  host.addEventListener('pointerleave', (event) => {
    if (!rotationState.dragging) {
      return;
    }
    releasePointer(event);
  });

  function resize() {
    const rect = host.getBoundingClientRect();
    const size = Math.max(180, Math.min(rect.width || 300, 360));
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = 1;
    camera.updateProjectionMatrix();
    renderState.dirty = true;
  }

  function render(
    cycle: DaylightCycleLike,
    _environment: WorldEnvironmentLike,
    facingAngle = 0,
    overworldSampler: OverworldSamplerLike | null = null
  ) {
    if (host.hidden) {
      return;
    }
    const sampleOverworld = resolvePreviewSampler(overworldSampler);
    const textureDirty = Boolean(sampleOverworld) && overworldSampler !== planetTextureState.lastSampler;
    const frameSignature = getCelestialPreviewFrameSignature(
      cycle,
      facingAngle,
      Boolean(sampleOverworld)
    );
    if (
      !rotationState.dragging &&
      !renderState.dirty &&
      !textureDirty &&
      frameSignature === renderState.lastFrameSignature
    ) {
      return;
    }
    root.rotation.y = Math.PI + rotationState.yaw;
    root.rotation.z = getPreviewRootPitch(cycle.observerLatitudeDegrees, rotationState.pitch);
    world.rotation.y += 0.002;
    world.rotation.z = cycle.solarDeclination * 0.4;
    syncPreviewPlanetTexture(world, overworldSampler, planetTextureState);
    syncPreviewFacingArrow(facingArrow, facingAngle);

    const sunBody = getPreviewBodyPosition(cycle.sunAzimuth, cycle.sunAltitude, 9.8);
    sun.position.set(sunBody.x, sunBody.y, sunBody.z);
    (sun.material as THREE.MeshBasicMaterial).color.set('#ffd06e');
    sunGlow.position.copy(sun.position);
    const displayedMoon = getDisplayedPreviewMoonPosition(cycle);
    const moonBody = getPreviewBodyPosition(
      displayedMoon.azimuth,
      displayedMoon.altitude,
      10.8
    );
    moon.position.set(moonBody.x, moonBody.y, moonBody.z);
    (moon.material as THREE.MeshStandardMaterial).color.set('#dce8ff');
    const lightRig = getPreviewLightRigState(cycle);
    const { lighting, shadowProfile } = lightRig;
    ambient.intensity = lighting.ambientIntensity;
    hemisphere.intensity = lighting.hemisphereIntensity;
    rim.intensity = lighting.rimIntensity;
    const sunX = lightRig.sun.x;
    const sunY = lightRig.sun.y;
    const sunZ = lightRig.sun.z;
    sunLight.position.set(sunX, sunY, sunZ);
    sunLight.intensity = lighting.sunIntensity;
    sunLight.castShadow = shadowProfile.sunCastShadow;
    sunLight.shadow.mapSize.set(shadowProfile.mapSize, shadowProfile.mapSize);
    sunLight.shadow.bias = shadowProfile.bias;
    sunLight.shadow.normalBias = shadowProfile.normalBias;
    sunLight.shadow.radius = shadowProfile.radius;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 52;
    sunLight.shadow.camera.left = -shadowProfile.cameraExtent;
    sunLight.shadow.camera.right = shadowProfile.cameraExtent;
    sunLight.shadow.camera.top = shadowProfile.cameraExtent;
    sunLight.shadow.camera.bottom = -shadowProfile.cameraExtent;
    sunLight.shadow.camera.updateProjectionMatrix();
    lightTarget.position.set(0, 0, 0);
    lightTarget.updateMatrixWorld();
    sunFill.position.set(sunX, sunY, sunZ);
    sunFill.intensity = lighting.sunFillIntensity;
    sunFill.castShadow = false;
    nightFill.position.set(-sunX * 0.72, 6.5 + cycle.night * 2.8, -sunZ * 0.72);
    nightFill.intensity = lighting.nightFillIntensity;
    bounceFill.position.set(lightRig.bounce.x, lightRig.bounce.y, lightRig.bounce.z);
    bounceFill.intensity = lighting.bounceFillIntensity;
    const worldMaterial = world.material as THREE.MeshStandardMaterial;
    worldMaterial.emissiveIntensity = lighting.emissiveIntensity;
    worldMaterial.emissive.set('#1d3552');
    const moonMaterial = moon.material as THREE.MeshStandardMaterial;
    moonMaterial.emissiveIntensity = lighting.moonEmissiveIntensity;
    moonMaterial.emissive.set('#101a28');
    (worldGlow.material as THREE.MeshBasicMaterial).opacity = lighting.glowOpacity;
    (sunGlow.material as THREE.MeshBasicMaterial).opacity = lighting.sunGlowOpacity;
    moon.material.opacity = Math.max(
      0.24,
      (cycle.night * 0.8 + (displayedMoon.altitude > -0.08 ? 0.18 : 0)) *
        (0.24 + cycle.moonIllumination * 0.76)
    ) + (cycle.solarEclipse?.coverage ?? 0) * 0.44;
    moon.material.transparent = true;

    const signatures = getCelestialPreviewSceneSignatures(cycle);
    if (signatures.constellations !== sceneSignatureState.lastConstellation) {
      syncPreviewConstellations(constellationRoot, cycle);
      sceneSignatureState.lastConstellation = signatures.constellations;
    }
    if (signatures.events !== sceneSignatureState.lastEvents) {
      syncPreviewEvents(eventRoot, cycle);
      sceneSignatureState.lastEvents = signatures.events;
    }
    if (signatures.milkyWay !== sceneSignatureState.lastMilkyWay) {
      syncMilkyWayBelt(beltRoot, cycle);
      sceneSignatureState.lastMilkyWay = signatures.milkyWay;
    }
    if (signatures.aurora !== sceneSignatureState.lastAurora) {
      syncPreviewAuroras(auroraRoot, cycle);
      sceneSignatureState.lastAurora = signatures.aurora;
    }
    if (signatures.orbits !== sceneSignatureState.lastOrbit) {
      syncPreviewOrbits(orbitRoot, cycle);
      sceneSignatureState.lastOrbit = signatures.orbits;
    }

    const skyOpacity = 0.06 + cycle.starsOpacity * 0.12;
    (skyShell.material as THREE.MeshBasicMaterial).opacity = skyOpacity;
    constellationRoot.visible = true;
    beltRoot.visible = cycle.starsOpacity > 0.02;
    auroraRoot.visible = (cycle.auroraBands ?? []).some(
      (band) => band.intensity > 0.03
    );
    eventRoot.visible = (cycle.visibleEvents ?? []).some(
      (event) => event.visibility > 0.02
    );
    orbitRoot.visible = true;

    renderer.render(scene, camera);
    renderState.dirty = false;
    renderState.lastFrameSignature = frameSignature;
  }

  resize();

  return {
    resize,
    render,
    isInteracting() {
      return rotationState.dragging;
    },
  };
}

export function getPlanetSurfaceColor(
  kind: PlanetSurfaceKind | undefined
): string {
  if (!kind) {
    return '#1a3d68';
  }
  return PLANET_SURFACE_COLORS[kind] ?? '#6b7c59';
}

export function brightenPreviewSurfaceColor(
  color: string,
  factor = 0.12
): string {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const brighten = (channel: number) =>
    Math.round(channel + (255 - channel) * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${brighten(red)}${brighten(green)}${brighten(blue)}`;
}

export function getPreviewLightingProfile(
  cycle: PreviewLightingCycleLike
): PreviewLightingProfile {
  const eclipseDim = cycle.solarEclipse?.daylightReduction ?? 0;
  return {
    ambientIntensity: 1.08 + cycle.daylight * 0.46 + cycle.night * 0.16,
    hemisphereIntensity: 0.56 + cycle.daylight * 0.4 + cycle.night * 0.12,
    rimIntensity: 0.96 + cycle.daylight * 0.72,
    sunIntensity: (1.18 + cycle.daylight * 1.88) * (1 - eclipseDim * 0.62),
    sunFillIntensity: (0.38 + cycle.daylight * 0.96) * (1 - eclipseDim * 0.48),
    bounceFillIntensity: 0.24 + cycle.daylight * 0.48 + cycle.night * 0.08,
    nightFillIntensity: 0.34 + cycle.night * 0.38,
    emissiveIntensity: 0.52 + cycle.night * 0.28,
    moonEmissiveIntensity: 0.02 + cycle.night * 0.06,
    sunGlowOpacity:
      (0.14 + cycle.daylight * 0.14 + cycle.starsOpacity * 0.02) *
      (1 - (cycle.solarEclipse?.totality ?? 0) * 0.3),
    glowOpacity: 0.07 + cycle.daylight * 0.06 + cycle.starsOpacity * 0.02,
  };
}

export function getPreviewRootPitch(
  observerLatitudeDegrees: number,
  dragPitch = 0
): number {
  return (-observerLatitudeDegrees / 180) * Math.PI * 0.45 + dragPitch;
}

export function getPreviewBodyPosition(
  azimuth: number,
  altitude: number,
  radius: number
): PreviewPoint3D {
  return {
    x: Math.cos(azimuth) * radius,
    y: altitude * 5.2,
    z: Math.sin(azimuth) * radius,
  };
}

export function getPreviewFacingArrowState(
  facingAngle: number
): PreviewFacingArrowState {
  const radius = 4.55;
  return {
    x: Math.cos(facingAngle) * radius,
    y: 0.9,
    z: Math.sin(facingAngle) * radius,
    rotationY: -facingAngle + Math.PI / 2,
  };
}

export function getPreviewShadowProfile(
  cycle: Pick<DaylightCycleLike, 'daylight' | 'sunAltitude'>
): PreviewShadowProfile {
  return {
    sunCastShadow: cycle.daylight > 0.04 || cycle.sunAltitude > -0.08,
    cameraExtent: cycle.daylight > 0.4 ? 14 : 17,
    mapSize: cycle.daylight > 0.45 ? 1792 : 1536,
    bias: cycle.sunAltitude > 0.12 ? -0.00018 : -0.0003,
    normalBias: cycle.sunAltitude > 0.12 ? 0.016 : 0.028,
    radius: cycle.daylight > 0.3 ? 2.6 : 2.2,
  };
}

export function getPreviewPlanetLightBalance(
  cycle: PreviewLightingCycleLike
): PreviewPlanetLightBalance {
  const lighting = getPreviewLightingProfile(cycle);
  const daySideLight =
    lighting.ambientIntensity +
    lighting.hemisphereIntensity * 0.82 +
    lighting.sunIntensity +
    lighting.sunFillIntensity * 0.72 +
    lighting.bounceFillIntensity * 0.48 +
    lighting.emissiveIntensity * 0.26;
  const darkSideLight =
    lighting.ambientIntensity +
    lighting.hemisphereIntensity * 0.72 +
    lighting.nightFillIntensity * 0.88 +
    lighting.bounceFillIntensity * 0.64 +
    lighting.emissiveIntensity;
  return {
    daySideLight,
    darkSideLight,
    contrastRatio: daySideLight / Math.max(0.001, darkSideLight),
  };
}

export function getCelestialPreviewSceneSignatures(
  cycle: DaylightCycleLike
): CelestialPreviewSceneSignatures {
  return {
    constellations: [
      cycle.activeConstellationIndex ?? 0,
      Math.round((cycle.yearProgress ?? 0) * 48),
      Math.round((cycle.starsOpacity ?? 0) * 10),
    ].join('|'),
    events: (cycle.visibleEvents ?? [])
      .map((event) =>
        [
          event.type,
          event.name,
          Math.round(event.azimuth * 10),
          Math.round(event.altitude * 10),
          Math.round((event.visibility ?? 0) * 10),
          Math.round((event.intensity ?? 0) * 10),
        ].join(':')
      )
      .join('|'),
    milkyWay: cycle.milkyWay
      ? [
          Math.round(cycle.milkyWay.azimuthOffset * 20),
          Math.round(cycle.milkyWay.inclination * 20),
          Math.round(cycle.milkyWay.width * 100),
          Math.round(cycle.milkyWay.opacity * 20),
          Math.round((cycle.yearProgress ?? 0) * 48),
        ].join('|')
      : 'none',
    aurora: (cycle.auroraBands ?? [])
      .map((band) =>
        [
          band.id,
          Math.round(band.azimuthCenter * 10),
          Math.round(band.altitude * 10),
          Math.round(band.height * 20),
          Math.round(band.intensity * 10),
          Math.round(band.wavePhase * 20),
        ].join(':')
      )
      .join('|'),
    orbits: [
      Math.round((cycle.sunAzimuth ?? 0) * 20),
      Math.round((cycle.sunriseAzimuth ?? 0) * 20),
      Math.round((cycle.sunsetAzimuth ?? 0) * 20),
      Math.round((cycle.moonAzimuth ?? 0) * 20),
      ...(cycle.visibleEvents ?? [])
        .filter((event) => event.type === 'planet')
        .map((event) => `${event.name}:${Math.round(event.azimuth * 10)}`),
    ].join('|'),
  };
}

export function getPreviewSunShadowCoverageState(
  cycle: Pick<
    DaylightCycleLike,
    | 'daylight'
    | 'sunAltitude'
    | 'sunAzimuth'
    | 'moonAltitude'
    | 'moonAzimuth'
    | 'solarEclipse'
  >
): PreviewSunShadowCoverageState {
  const shadowProfile = getPreviewShadowProfile(cycle);
  const lightPosition = getPreviewLightRigState({
    daylight: cycle.daylight,
    night: 1 - cycle.daylight,
    starsOpacity: 1 - cycle.daylight,
    sunAzimuth: cycle.sunAzimuth,
    sunAltitude: cycle.sunAltitude,
    moonAzimuth: cycle.moonAzimuth,
    moonAltitude: cycle.moonAltitude,
    solarEclipse: cycle.solarEclipse,
  }).sun;
  const displayedMoon = getDisplayedPreviewMoonPosition(cycle);
  const moon = getPreviewBodyPosition(
    displayedMoon.azimuth,
    displayedMoon.altitude,
    10.8
  );
  const world = { x: 0, y: 0, z: 0 };
  const frustum = describeDirectionalShadowFrustum(
    lightPosition,
    world,
    shadowProfile.cameraExtent,
    1,
    52
  );
  return {
    shadowProfile,
    worldWithinShadow: isPointInsideDirectionalShadowFrustum(frustum, world),
    moonWithinShadow: isPointInsideDirectionalShadowFrustum(frustum, moon),
  };
}

export function getPreviewLightRigState(
  cycle: Pick<
    DaylightCycleLike,
    | 'daylight'
    | 'night'
    | 'starsOpacity'
    | 'sunAzimuth'
    | 'sunAltitude'
    | 'moonAzimuth'
    | 'moonAltitude'
    | 'solarEclipse'
  >
): PreviewLightRigState {
  const lighting = getPreviewLightingProfile(cycle);
  const shadowProfile = getPreviewShadowProfile(cycle);
  const sun = getPreviewBodyPosition(cycle.sunAzimuth, cycle.sunAltitude, 13.5);
  sun.y = 5.8 + Math.max(-0.1, cycle.sunAltitude) * 11;
  const displayedMoon = getDisplayedPreviewMoonPosition(cycle);
  const moon = getPreviewBodyPosition(
    displayedMoon.azimuth,
    displayedMoon.altitude,
    10.8
  );
  const bounce = {
    x: -sun.x * 0.52,
    y: 2.8 + cycle.daylight * 1.8,
    z: -sun.z * 0.52,
  };
  return {
    sun,
    moon,
    bounce,
    lighting,
    shadowProfile,
  };
}

function getDisplayedPreviewMoonPosition(
  cycle: Pick<
    DaylightCycleLike,
    'moonAzimuth' | 'moonAltitude' | 'solarEclipse'
  >
) {
  return {
    azimuth: cycle.solarEclipse?.active
      ? cycle.solarEclipse.moonAzimuth
      : cycle.moonAzimuth,
    altitude: cycle.solarEclipse?.active
      ? cycle.solarEclipse.moonAltitude
      : cycle.moonAltitude,
  };
}

export function buildPlanetTextureGrid(
  sampleSurfaceKind: PreviewSurfaceKindSampler,
  width = 64,
  height = 32
): string[][] {
  const grid = new Array<string[]>(height);
  for (let y = 0; y < height; y += 1) {
    const row = new Array<string>(width);
    const latitude = y / height;
    const worldY = Math.round((0.5 - latitude) * 128);
    for (let x = 0; x < width; x += 1) {
      const longitude = x / width;
      const worldX = Math.round((longitude - 0.5) * 256);
      row[x] = brightenPreviewSurfaceColor(
        getPlanetSurfaceColor(
          samplePreviewSurfaceKind(sampleSurfaceKind, worldX, worldY)
        )
      );
    }
    grid[y] = row;
  }
  return grid;
}

export function getCelestialPreviewFrameSignature(
  cycle: Pick<
    DaylightCycleLike,
    | 'observerLatitudeDegrees'
    | 'solarDeclination'
    | 'sunAzimuth'
    | 'sunAltitude'
    | 'moonAzimuth'
    | 'moonAltitude'
    | 'moonIllumination'
    | 'daylight'
    | 'night'
    | 'starsOpacity'
    | 'solarEclipse'
  >,
  facingAngle = 0,
  hasSampler = false
): string {
  return [
    Math.round((cycle.observerLatitudeDegrees ?? 0) * 2),
    Math.round((cycle.solarDeclination ?? 0) * 100),
    Math.round((cycle.sunAzimuth ?? 0) * 24),
    Math.round((cycle.sunAltitude ?? 0) * 80),
    Math.round((cycle.moonAzimuth ?? 0) * 16),
    Math.round((cycle.moonAltitude ?? 0) * 80),
    Math.round((cycle.moonIllumination ?? 0) * 12),
    Math.round((cycle.daylight ?? 0) * 16),
    Math.round((cycle.night ?? 0) * 16),
    Math.round((cycle.starsOpacity ?? 0) * 16),
    Math.round((cycle.solarEclipse?.coverage ?? 0) * 20),
    Math.round((cycle.solarEclipse?.totality ?? 0) * 20),
    Math.round(facingAngle * 12),
    hasSampler ? 'map' : 'none',
  ].join('|');
}

export function getPreviewSunOrbitSpec(
  cycle: DaylightCycleLike
): PreviewSunOrbitSpec {
  return {
    radius: 10,
    altitude: 0.04,
    fullStartAzimuth: cycle.sunriseAzimuth,
    fullEndAzimuth: cycle.sunriseAzimuth + Math.PI * 2,
    daylightStartAzimuth: cycle.sunriseAzimuth,
    daylightEndAzimuth: cycle.sunsetAzimuth,
  };
}

function syncPreviewPlanetTexture(
  world: THREE.Mesh,
  overworldSampler: OverworldSamplerLike | null,
  textureState: {
    lastSampler: OverworldSamplerLike | null;
  }
) {
  const material = world.material as THREE.MeshStandardMaterial;
  const sampleSurfaceKind = resolvePreviewKindSampler(overworldSampler);
  if (
    !sampleSurfaceKind ||
    overworldSampler === textureState.lastSampler
  ) {
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  paintPlanetTextureCanvas(context, sampleSurfaceKind, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  material.map = texture;
  material.emissiveMap = texture;
  material.needsUpdate = true;
  textureState.lastSampler = overworldSampler;
}

function paintPlanetTextureCanvas(
  context: CanvasRenderingContext2D,
  sampleSurfaceKind: PreviewSurfaceKindSampler,
  width: number,
  height: number
) {
  for (let y = 0; y < height; y += 1) {
    const latitude = y / height;
    const worldY = Math.round((0.5 - latitude) * 128);
    for (let x = 0; x < width; x += 1) {
      const longitude = x / width;
      const worldX = Math.round((longitude - 0.5) * 256);
      context.fillStyle = brightenPreviewSurfaceColor(
        getPlanetSurfaceColor(
          samplePreviewSurfaceKind(sampleSurfaceKind, worldX, worldY)
        )
      );
      context.fillRect(x, y, 1, 1);
    }
  }
}

export function resolvePreviewSampler(
  overworldSampler: OverworldSamplerLike | null
): OverworldSamplerLike['sampleOverworld'] | null {
  if (!overworldSampler) {
    return null;
  }
  if (typeof overworldSampler.samplePreviewOverworld === 'function') {
    return overworldSampler.samplePreviewOverworld.bind(overworldSampler);
  }
  if (typeof overworldSampler.sampleOverworld !== 'function') {
    return null;
  }
  return overworldSampler.sampleOverworld.bind(overworldSampler);
}

export function resolvePreviewKindSampler(
  overworldSampler: OverworldSamplerLike | null
): PreviewSurfaceKindSampler | null {
  if (!overworldSampler) {
    return null;
  }
  if (typeof overworldSampler.samplePreviewSurfaceKind === 'function') {
    return overworldSampler.samplePreviewSurfaceKind.bind(overworldSampler);
  }
  const sampleOverworld = resolvePreviewSampler(overworldSampler);
  if (!sampleOverworld) {
    return null;
  }
  return (x: number, y: number) =>
    samplePreviewOverworldKind(sampleOverworld, x, y);
}

function samplePreviewOverworldKind(
  sampleOverworld: OverworldSamplerLike['sampleOverworld'],
  x: number,
  y: number
): PlanetSurfaceKind | undefined {
  try {
    return sampleOverworld(x, y)?.kind;
  } catch {
    return undefined;
  }
}

function samplePreviewSurfaceKind(
  sampleSurfaceKind: PreviewSurfaceKindSampler,
  x: number,
  y: number
): PlanetSurfaceKind | undefined {
  try {
    return sampleSurfaceKind(x, y);
  } catch {
    return undefined;
  }
}

function syncPreviewFacingArrow(
  mesh: THREE.Mesh,
  facingAngle: number
): void {
  const state = getPreviewFacingArrowState(facingAngle);
  mesh.position.set(state.x, state.y, state.z);
  mesh.rotation.x = Math.PI / 2;
  mesh.rotation.y = state.rotationY;
  mesh.rotation.z = 0;
}

function syncPreviewConstellations(
  root: THREE.Group,
  cycle: DaylightCycleLike
): void {
  const state = getPreviewConstellationRenderState(cycle);
  const rootState = root.userData as {
    linePool?: THREE.Line[];
    starPool?: THREE.Sprite[];
  };
  const linePool = rootState.linePool ?? (rootState.linePool = []);
  const starPool = rootState.starPool ?? (rootState.starPool = []);

  while (linePool.length < state.lines.length) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(6, 3)
      ),
      new THREE.LineBasicMaterial({
        color: '#86aef5',
        transparent: true,
        opacity: 0,
      })
    );
    line.visible = false;
    linePool.push(line);
    root.add(line);
  }

  while (starPool.length < state.stars.length) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: '#f3f8ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    sprite.visible = false;
    starPool.push(sprite);
    root.add(sprite);
  }

  linePool.forEach((line, index) => {
    const lineState = state.lines[index];
    if (!lineState) {
      line.visible = false;
      return;
    }
    const positions = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, lineState.start.x, lineState.start.y, lineState.start.z);
    positions.setXYZ(1, lineState.end.x, lineState.end.y, lineState.end.z);
    positions.needsUpdate = true;
    const material = line.material as THREE.LineBasicMaterial;
    material.opacity = lineState.opacity;
    line.visible = lineState.visible;
  });

  starPool.forEach((sprite, index) => {
    const starState = state.stars[index];
    if (!starState) {
      sprite.visible = false;
      return;
    }
    sprite.position.set(
      starState.position.x,
      starState.position.y,
      starState.position.z
    );
    sprite.scale.set(starState.scale, starState.scale, 1);
    const material = sprite.material as THREE.SpriteMaterial;
    material.opacity = starState.opacity;
    sprite.visible = starState.visible;
  });
}

export function getPreviewConstellationRenderState(
  cycle: DaylightCycleLike
): PreviewConstellationRenderState {
  const lines: PreviewConstellationLineState[] = [];
  const stars: PreviewConstellationStarState[] = [];
  const ring = cycle.celestialRing ?? [];
  const constellations = cycle.constellations ?? [];

  ring.forEach((entry, index) => {
    const constellation = constellations[index];
    if (!constellation) {
      return;
    }
    const anchor = createPreviewPoint(
      entry.visualAzimuth + cycle.yearProgress * Math.PI * 2,
      0.78 + constellation.ringJitter * 0.12,
      11.4
    );
    const lineOpacity = 0.14 + cycle.starsOpacity * 0.26;

    constellation.connections.forEach(([startIndex, endIndex]) => {
      const start = constellation.stars[startIndex];
      const end = constellation.stars[endIndex];
      if (!start || !end) {
        return;
      }
      lines.push({
        start: previewConstellationPoint(anchor, start),
        end: previewConstellationPoint(anchor, end),
        opacity: lineOpacity,
        visible: lineOpacity > 0.015,
      });
    });

    constellation.stars.forEach((star) => {
      stars.push({
        position: previewConstellationPoint(anchor, star),
        scale: 0.16 + star.brightness * 0.18,
        opacity: 0.12 + (0.18 + star.brightness * 0.44) * cycle.starsOpacity,
        visible:
          0.12 + (0.18 + star.brightness * 0.44) * cycle.starsOpacity > 0.015,
      });
    });
  });

  return { lines, stars };
}

function describeDirectionalShadowFrustum(
  lightPosition: PreviewPoint3D,
  targetPosition: PreviewPoint3D,
  extent: number,
  near: number,
  far: number
) {
  const forward = normalizeVector({
    x: targetPosition.x - lightPosition.x,
    y: targetPosition.y - lightPosition.y,
    z: targetPosition.z - lightPosition.z,
  });
  const seedUp = Math.abs(forward.y) > 0.94
    ? { x: 0, y: 0, z: 1 }
    : { x: 0, y: 1, z: 0 };
  const right = normalizeVector(crossVector(seedUp, forward));
  const up = normalizeVector(crossVector(forward, right));
  return {
    lightPosition,
    right,
    up,
    forward,
    extent,
    near,
    far,
  };
}

function isPointInsideDirectionalShadowFrustum(
  frustum: ReturnType<typeof describeDirectionalShadowFrustum>,
  point: PreviewPoint3D
) {
  const relative = {
    x: point.x - frustum.lightPosition.x,
    y: point.y - frustum.lightPosition.y,
    z: point.z - frustum.lightPosition.z,
  };
  const x = dotVector(relative, frustum.right);
  const y = dotVector(relative, frustum.up);
  const z = dotVector(relative, frustum.forward);
  return (
    Math.abs(x) <= frustum.extent &&
    Math.abs(y) <= frustum.extent &&
    z >= frustum.near &&
    z <= frustum.far
  );
}

function dotVector(a: PreviewPoint3D, b: PreviewPoint3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function crossVector(a: PreviewPoint3D, b: PreviewPoint3D): PreviewPoint3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalizeVector(vector: PreviewPoint3D): PreviewPoint3D {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function syncPreviewEvents(root: THREE.Group, cycle: DaylightCycleLike): void {
  root.clear();
  const events = cycle.visibleEvents ?? [];
  events.forEach((event, index) => {
    const point = createPreviewAltitudePoint(
      event.azimuth,
      event.altitude,
      10.4 - Math.min(1, index * 0.06)
    );

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.16, event.size * 0.45), 12, 12),
      new THREE.MeshBasicMaterial(compactThreeMaterialOptions({
        color: resolveThreeColor(event.color, '#dff4ff'),
        transparent: true,
        opacity: (0.34 + event.intensity * 0.38) * event.visibility,
      }))
    );
    mesh.position.copy(point);
    mesh.visible = (mesh.material as THREE.MeshBasicMaterial).opacity > 0.015;
    root.add(mesh);

    if (event.type === 'comet') {
      const tail = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          point.clone().add(
            new THREE.Vector3(-event.trailLength * 0.42, -0.08, 0)
          ),
          point,
        ]),
        new THREE.LineBasicMaterial({
          color: resolveThreeColor(event.color, '#dff4ff'),
          transparent: true,
          opacity: (0.2 + event.intensity * 0.24) * event.visibility,
        })
      );
      tail.visible = (tail.material as THREE.LineBasicMaterial).opacity > 0.015;
      root.add(tail);
    }

    if (event.type === 'meteor-shower') {
      const streakCount = Math.max(3, Math.round(3 + event.intensity * 4));
      for (let streakIndex = 0; streakIndex < streakCount; streakIndex += 1) {
        const streak = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            point.clone().add(
              new THREE.Vector3(
                event.trailLength * (0.12 + streakIndex * 0.03),
                0.14 + (streakIndex % 3) * 0.05,
                -0.14 + ((streakIndex % 5) - 2) * 0.06
              )
            ),
            point.clone().add(
              new THREE.Vector3(
                -event.trailLength * (0.28 + streakIndex * 0.025),
                -0.22 - streakIndex * 0.06,
                0.1 + ((streakIndex % 4) - 1.5) * 0.04
              )
            ),
          ]),
          new THREE.LineBasicMaterial({
            color: resolveThreeColor(event.color, '#dff4ff'),
            transparent: true,
            opacity:
              (0.14 + event.intensity * 0.18) *
              event.visibility *
              (1 - streakIndex / Math.max(1, streakCount + 1)),
          })
        );
        streak.visible = (streak.material as THREE.LineBasicMaterial).opacity > 0.015;
        root.add(streak);
      }

      const streak = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          point.clone().add(
            new THREE.Vector3(event.trailLength * 0.2, 0.12, -0.08)
          ),
          point.clone().add(
            new THREE.Vector3(-event.trailLength * 0.22, -0.2, 0.08)
          ),
        ]),
        new THREE.LineBasicMaterial({
          color: resolveThreeColor(event.color, '#dff4ff'),
          transparent: true,
          opacity: (0.18 + event.intensity * 0.24) * event.visibility,
        })
      );
      streak.visible = (streak.material as THREE.LineBasicMaterial).opacity > 0.015;
      root.add(streak);
    }
  });
}

function syncMilkyWayBelt(root: THREE.Group, cycle: DaylightCycleLike): void {
  root.clear();
  const belt = cycle.milkyWay;
  if (!belt) {
    return;
  }
  const samples = getMilkyWayBandSamples(belt, cycle.yearProgress, 60);
  const innerPoints = samples.map((sample) =>
    createPreviewPoint(sample.azimuth, sample.innerPhi, 11.75)
  );
  const outerPoints = samples.map((sample) =>
    createPreviewPoint(sample.azimuth, sample.outerPhi, 11.95)
  );
  const positions: number[] = [];
  const indices: number[] = [];

  samples.forEach((_, index) => {
    const inner = innerPoints[index];
    const outer = outerPoints[index];
    positions.push(inner.x, inner.y, inner.z, outer.x, outer.y, outer.z);
  });

  for (let index = 0; index < samples.length - 1; index += 1) {
    const start = index * 2;
    indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  root.add(
    new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: '#7da0d5',
        transparent: true,
        opacity: belt.opacity * 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
  );
  root.add(
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        samples.map((sample) => createPreviewPoint(sample.azimuth, sample.centerPhi, 11.85))
      ),
      new THREE.LineBasicMaterial({
        color: '#b7d1f0',
        transparent: true,
        opacity: belt.opacity * 0.34,
      })
    )
  );
}

function syncPreviewAuroras(root: THREE.Group, cycle: DaylightCycleLike): void {
  root.clear();
  const bands = cycle.auroraBands ?? [];
  bands.forEach((band) => {
    const positions: number[] = [];
    const indices: number[] = [];
    const samples = 20;
    const start = band.azimuthCenter - band.span * 0.5;
    const end = band.azimuthCenter + band.span * 0.5;

    for (let index = 0; index <= samples; index += 1) {
      const progress = index / samples;
      const azimuth = start + (end - start) * progress;
      const wave =
        Math.sin(progress * Math.PI * 3 + band.wavePhase * Math.PI * 2) *
        band.height *
        0.18;
      const lower = createPreviewAltitudePoint(
        azimuth,
        band.altitude + wave,
        11.45
      );
      const upper = createPreviewAltitudePoint(
        azimuth,
        band.altitude + band.height + wave,
        11.8
      );
      positions.push(lower.x, lower.y, lower.z, upper.x, upper.y, upper.z);
    }

    for (let index = 0; index < samples; index += 1) {
      const startIndex = index * 2;
      indices.push(
        startIndex,
        startIndex + 1,
        startIndex + 2,
        startIndex + 1,
        startIndex + 3,
        startIndex + 2
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setIndex(indices);
    root.add(
      new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: band.colorA,
          transparent: true,
          opacity: band.intensity * 0.26,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );

    const innerRibbonPositions: number[] = [];
    const innerRibbonIndices: number[] = [];
    for (let index = 0; index <= samples; index += 1) {
      const progress = index / samples;
      const azimuth = start + (end - start) * progress;
      const wave =
        Math.sin(progress * Math.PI * 5 + band.wavePhase * Math.PI * 2) *
        band.height *
        0.12;
      const midLower = createPreviewAltitudePoint(
        azimuth,
        band.altitude + band.height * 0.22 + wave,
        11.6
      );
      const midUpper = createPreviewAltitudePoint(
        azimuth,
        band.altitude + band.height * 0.76 + wave,
        11.92
      );
      innerRibbonPositions.push(
        midLower.x,
        midLower.y,
        midLower.z,
        midUpper.x,
        midUpper.y,
        midUpper.z
      );
    }

    for (let index = 0; index < samples; index += 1) {
      const startIndex = index * 2;
      innerRibbonIndices.push(
        startIndex,
        startIndex + 1,
        startIndex + 2,
        startIndex + 1,
        startIndex + 3,
        startIndex + 2
      );
    }

    const innerRibbonGeometry = new THREE.BufferGeometry();
    innerRibbonGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(innerRibbonPositions, 3)
    );
    innerRibbonGeometry.setIndex(innerRibbonIndices);
    root.add(
      new THREE.Mesh(
        innerRibbonGeometry,
        new THREE.MeshBasicMaterial({
          color: band.colorB,
          transparent: true,
          opacity: band.intensity * 0.16,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );

    root.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: samples + 1 }, (_, index) => {
            const progress = index / samples;
            const azimuth = start + (end - start) * progress;
            const wave =
              Math.sin(
                progress * Math.PI * 3 + band.wavePhase * Math.PI * 2
              ) *
              band.height *
              0.18;
            return createPreviewAltitudePoint(
              azimuth,
              band.altitude + band.height * 0.6 + wave,
              11.86
            );
          })
        ),
        new THREE.LineBasicMaterial({
          color: band.colorB,
          transparent: true,
          opacity: band.intensity * 0.42,
        })
      )
    );

    for (let ribIndex = 0; ribIndex < 5; ribIndex += 1) {
      const progress = ribIndex / 4;
      const azimuth = start + (end - start) * progress;
      const wave =
        Math.sin(progress * Math.PI * 4 + band.wavePhase * Math.PI * 2) *
        band.height *
        0.1;
      root.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            createPreviewAltitudePoint(azimuth, band.altitude + wave, 11.54),
            createPreviewAltitudePoint(
              azimuth,
              band.altitude + band.height + wave,
              11.96
            ),
          ]),
          new THREE.LineBasicMaterial({
            color: ribIndex % 2 === 0 ? band.colorA : band.colorB,
            transparent: true,
            opacity: band.intensity * 0.12,
          })
        )
      );
    }
  });
}

function syncPreviewOrbits(root: THREE.Group, cycle: DaylightCycleLike): void {
  root.clear();
  const sunOrbit = getPreviewSunOrbitSpec(cycle);

  root.add(
    buildPreviewArc(
      sunOrbit.fullStartAzimuth,
      sunOrbit.fullEndAzimuth,
      sunOrbit.altitude,
      sunOrbit.radius,
      '#415c79',
      0.14
    )
  );
  root.add(
    buildPreviewArc(
      sunOrbit.daylightStartAzimuth,
      sunOrbit.daylightEndAzimuth,
      sunOrbit.altitude,
      sunOrbit.radius,
      '#ffbf69',
      0.34
    )
  );
  root.add(
    buildPreviewArc(
      cycle.moonAzimuth - Math.PI * 0.82,
      cycle.moonAzimuth + Math.PI * 0.82,
      -cycle.moonAltitude * 0.08,
      10.8,
      '#9ec5ff',
      0.24
    )
  );

  (cycle.visibleEvents ?? []).forEach((event) => {
    if (event.type !== 'planet') {
      return;
    }
    root.add(
      buildPreviewArc(
        event.azimuth - 0.44,
        event.azimuth + 0.44,
        -event.altitude * 0.08,
        10.2,
        event.color,
        0.18
      )
    );
  });
}

function syncPreviewOrrery(root: THREE.Group, cycle: DaylightCycleLike): void {
  root.clear();
  const bodies = cycle.orreryBodies ?? [];
  root.position.set(0, -7.8, 0);
  root.rotation.x = -Math.PI * 0.42;
  root.rotation.z = cycle.solarDeclination * 0.08;

  const base = new THREE.Mesh(
    new THREE.CircleGeometry(7.3, 40),
    new THREE.MeshBasicMaterial({
      color: '#081019',
      transparent: true,
      opacity: 0.86,
    })
  );
  root.add(base);

  const baseGlow = new THREE.Mesh(
    new THREE.RingGeometry(6.7, 7.4, 40),
    new THREE.MeshBasicMaterial({
      color: '#3e607f',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    })
  );
  root.add(baseGlow);

  const axis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -6.2, 0.08),
      new THREE.Vector3(0, 6.2, 0.08),
    ]),
    new THREE.LineBasicMaterial({
      color: '#5a7da6',
      transparent: true,
      opacity: 0.24,
    })
  );
  root.add(axis);

  bodies.forEach((body) => {
    if (body.orbitRadius > 0) {
      const orbitRing = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          createOrreryRingPoints(
            body.orbitRadius,
            body.orbitTilt,
            body.orbitHeight,
            body.orbitEccentricity,
            body.orbitRotation
          )
        ),
      new THREE.LineBasicMaterial({
        color: body.type === 'moon' ? '#708fbb' : '#4b617a',
        transparent: true,
        opacity: body.type === 'moon' ? 0.28 : 0.2,
      })
      );
      root.add(orbitRing);
    }

    const angle = body.angle * Math.PI * 2 - Math.PI / 2;
    const position = createOrreryPosition(body, angle);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(body.size, 14, 14),
      new THREE.MeshBasicMaterial(compactThreeMaterialOptions({
        color: resolveThreeColor(body.color, '#8fb7de'),
        transparent: true,
        opacity: body.type === 'sun' ? 1 : 0.92,
      }))
    );
    marker.position.copy(position);
    root.add(marker);

    if (body.type === 'sun') {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(body.size * 1.9, 14, 14),
        new THREE.MeshBasicMaterial(compactThreeMaterialOptions({
          color: resolveThreeColor(body.color, '#8fb7de'),
          transparent: true,
          opacity: 0.18,
        }))
      );
      glow.position.copy(position);
      root.add(glow);
    }

    root.add(createOrreryLabel(body, position));

    if (body.type === 'comet' && body.trailLength > 0) {
      root.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            position.clone().add(
              new THREE.Vector3(-body.trailLength * 0.16, -body.trailLength * 0.06, 0)
            ),
            position,
          ]),
          new THREE.LineBasicMaterial({
            color: resolveThreeColor(body.color, '#8fb7de'),
            transparent: true,
            opacity: 0.34,
          })
        )
      );
    }
  });
}

function createPreviewPoint(
  azimuth: number,
  phi: number,
  radius: number
): THREE.Vector3 {
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    Math.cos(azimuth) * sinPhi * radius,
    Math.cos(phi) * radius,
    Math.sin(azimuth) * sinPhi * radius
  );
}

function createPreviewAltitudePoint(
  azimuth: number,
  altitude: number,
  radius: number
) {
  const phi = ((1 - altitude) * Math.PI) / 2;
  return createPreviewPoint(azimuth, phi, radius);
}

function buildPreviewArc(
  startAzimuth: number,
  endAzimuth: number,
  altitude: number,
  radius: number,
  color: string,
  opacity: number
) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 24; index += 1) {
    const progress = index / 24;
    points.push(
      createPreviewAltitudePoint(
        startAzimuth + (endAzimuth - startAzimuth) * progress,
        altitude,
        radius
      )
    );
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
    })
  );
}

function createOrreryRingPoints(
  radius: number,
  orbitTilt: number,
  orbitHeight: number,
  orbitEccentricity = 0,
  orbitRotation = 0
) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 40; index += 1) {
    const angle = (index / 40) * Math.PI * 2;
    points.push(
      createOrreryPosition(
        {
          orbitRadius: radius,
          orbitTilt,
          orbitHeight,
          orbitEccentricity,
          orbitRotation,
        } as OrreryBodyLike,
        angle
      )
    );
  }
  return points;
}

function createOrreryPosition(
  body: Pick<
    OrreryBodyLike,
    'orbitRadius' | 'orbitTilt' | 'orbitHeight' | 'orbitEccentricity' | 'orbitRotation'
  >,
  angle: number
) {
  const minorRadius = body.orbitRadius * (1 - clamp(body.orbitEccentricity, 0, 0.82));
  const localX = Math.cos(angle) * body.orbitRadius;
  const localY = Math.sin(angle) * minorRadius;
  const rotation = body.orbitRotation ?? 0;
  const rotatedX = localX * Math.cos(rotation) - localY * Math.sin(rotation);
  const rotatedY = localX * Math.sin(rotation) + localY * Math.cos(rotation);
  return new THREE.Vector3(
    rotatedX,
    rotatedY * Math.cos(body.orbitTilt) + body.orbitHeight,
    rotatedY * Math.sin(body.orbitTilt) +
      0.12 +
      body.orbitRadius * 0.01
  );
}

function createOrreryLabel(
  body: OrreryBodyLike,
  position: THREE.Vector3
): THREE.Object3D {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 42;
  const context = canvas.getContext('2d');
  if (!context) {
    const fallback = new THREE.Group();
    fallback.position.copy(position);
    return fallback;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(8, 16, 25, 0.76)';
  context.fillRect(0, 8, canvas.width, 26);
  context.strokeStyle = 'rgba(132, 173, 214, 0.35)';
  context.strokeRect(0.5, 8.5, canvas.width - 1, 25);
  context.fillStyle = '#e6f2ff';
  context.font = '600 18px Trebuchet MS';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(formatOrreryLabel(body), canvas.width / 2, 21);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial(compactThreeMaterialOptions({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.82,
    }))
  );
  sprite.position.copy(position.clone().add(new THREE.Vector3(0, 0.72, 0)));
  sprite.scale.set(2.8, 0.72, 1);
  return sprite;
}

export function getPreviewAuroraBandPath(
  band: Pick<
    AuroraBandLike,
    'azimuthCenter' | 'span' | 'altitude' | 'height' | 'wavePhase'
  >,
  samples = 20
) {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const progress = index / samples;
    const azimuth =
      band.azimuthCenter - band.span * 0.5 + band.span * progress;
    const wave =
      Math.sin(progress * Math.PI * 3 + band.wavePhase * Math.PI * 2) *
      band.height *
      0.18;
    const point = createPreviewAltitudePoint(
      azimuth,
      band.altitude + band.height * 0.6 + wave,
      11.86
    );
    return { x: point.x, y: point.y, z: point.z };
  });
}

function formatOrreryLabel(body: OrreryBodyLike): string {
  if (body.id === 'sun') {
    return 'Sun';
  }
  if (body.id === 'moon') {
    return 'Moon';
  }
  const [, name] = body.id.split(':');
  return name ?? body.id;
}

function previewConstellationPoint(
  anchor: THREE.Vector3,
  star: DaylightCycleLike['constellations'][number]['stars'][number]
) {
  return new THREE.Vector3(
    anchor.x + (star.x - 0.5) * 2.4,
    anchor.y + (0.5 - star.y) * 1.5,
    anchor.z
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
