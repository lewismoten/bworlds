import * as THREE from 'three';
import {
  getMilkyWayBandSamples,
  type OrreryBodyLike,
  type getDaylightCycleState,
} from '@bworlds/core';
import {
  compactThreeMaterialOptions,
  resolveThreeColor,
} from './three-material-options.ts';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;
type SolarSystemSceneSignatures = {
  stars: string;
  orbits: string;
  bodies: string;
  shell: string;
  events: string;
  labels: string;
};
type SolarSystemPreviewController = {
  resize(): void;
  render(cycle?: DaylightCycleLike): void;
  isInteracting(): boolean;
};
type SolarSystemEventMarkerState = ReturnType<
  typeof getSolarSystemEventMarkerStates
>[number];
type ConstellationStarLike = NonNullable<
  NonNullable<DaylightCycleLike['constellations']>[number]
>['stars'][number];
type BackgroundStarState = {
  color: string;
  opacity: number;
  radius: number;
  x: number;
  y: number;
  z: number;
};
type SolarSystemEventGlowState = {
  position: THREE.Vector3;
  color: string;
  opacity: number;
  scale: number;
  visible: boolean;
};
type SolarSystemEventTrailState = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  opacity: number;
  visible: boolean;
};
type SolarSystemEventRenderState = {
  glows: SolarSystemEventGlowState[];
  trails: SolarSystemEventTrailState[];
};
type SolarSystemBodyMarkerState = {
  position: THREE.Vector3;
  color: string;
  opacity: number;
  scale: number;
  visible: boolean;
};
type SolarSystemBodyTrailState = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  opacity: number;
  visible: boolean;
};
type SolarSystemBodyRenderState = {
  markers: SolarSystemBodyMarkerState[];
  glows: SolarSystemBodyMarkerState[];
  trails: SolarSystemBodyTrailState[];
  sunLightPosition: THREE.Vector3 | null;
};
const BACKGROUND_STAR_COUNT = 56;
const BACKGROUND_STAR_GEOMETRIES = [
  new THREE.SphereGeometry(0.04, 8, 8),
  new THREE.SphereGeometry(0.06, 8, 8),
  new THREE.SphereGeometry(0.08, 8, 8),
] as const;
const SOLAR_SYSTEM_BODY_GEOMETRY = new THREE.SphereGeometry(1, 18, 18);
const scratchBackgroundStarState: BackgroundStarState = {
  color: '#d8e9ff',
  opacity: 0,
  radius: 0.04,
  x: 0,
  y: 0,
  z: 0,
};

export function createSolarSystemPreviewRenderer(
  host: HTMLElement | null,
  options: {
    onRenderRequested?: () => void;
  } = {}
): SolarSystemPreviewController {
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
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 220);
  camera.position.set(0, 18, 30);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight('#bfd8ff', 1.05);
  scene.add(ambient);
  const sunLight = new THREE.PointLight('#ffd48a', 2.4, 120, 1.8);
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight('#8ebcff', 0.42);
  fill.position.set(-16, 14, -12);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);
  const starRoot = new THREE.Group();
  root.add(starRoot);
  const orbitRoot = new THREE.Group();
  root.add(orbitRoot);
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);
  const shellRoot = new THREE.Group();
  root.add(shellRoot);
  const eventRoot = new THREE.Group();
  root.add(eventRoot);
  const labelRoot = new THREE.Group();
  root.add(labelRoot);
  const sceneSignatureState = {
    lastStars: '',
    lastOrbits: '',
    lastBodies: '',
    lastShell: '',
    lastEvents: '',
    lastLabels: '',
  };
  const renderState = {
    dirty: true,
    lastFrameSignature: '',
  };

  const interaction = {
    yaw: 0,
    pitch: -0.26,
    dragging: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
  };

  host.addEventListener('pointerdown', (event) => {
    interaction.dragging = true;
    interaction.pointerId = event.pointerId;
    interaction.lastX = event.clientX;
    interaction.lastY = event.clientY;
    host.classList.add('is-dragging');
    host.setPointerCapture(event.pointerId);
    options.onRenderRequested?.();
  });

  host.addEventListener('pointermove', (event) => {
    if (!interaction.dragging || event.pointerId !== interaction.pointerId) {
      return;
    }
    const deltaX = event.clientX - interaction.lastX;
    const deltaY = event.clientY - interaction.lastY;
    interaction.lastX = event.clientX;
    interaction.lastY = event.clientY;
    interaction.yaw += deltaX * 0.008;
    interaction.pitch = clamp(interaction.pitch + deltaY * 0.005, -1.1, 0.2);
    options.onRenderRequested?.();
  });

  const releasePointer = (event: PointerEvent) => {
    if (event.pointerId !== interaction.pointerId) {
      return;
    }
    interaction.dragging = false;
    interaction.pointerId = -1;
    host.classList.remove('is-dragging');
    if (host.hasPointerCapture(event.pointerId)) {
      host.releasePointerCapture(event.pointerId);
    }
    options.onRenderRequested?.();
  };

  host.addEventListener('pointerup', releasePointer);
  host.addEventListener('pointercancel', releasePointer);
  host.addEventListener('pointerleave', (event) => {
    if (interaction.dragging) {
      releasePointer(event);
    }
  });

  function resize() {
    const rect = host.getBoundingClientRect();
    const width = Math.max(220, rect.width || 320);
    const height = Math.max(220, rect.height || 320);
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderState.dirty = true;
  }

  function render(cycle: DaylightCycleLike) {
    if (host.hidden) {
      return;
    }
    const frameSignature = getSolarSystemRenderSignature(
      cycle,
      interaction.yaw,
      interaction.pitch
    );
    if (
      !interaction.dragging &&
      !renderState.dirty &&
      frameSignature === renderState.lastFrameSignature
    ) {
      return;
    }
    root.rotation.y = interaction.yaw;
    root.rotation.x = interaction.pitch;
    const signatures = getSolarSystemSceneSignatures(cycle);
    if (signatures.stars !== sceneSignatureState.lastStars) {
      syncBackgroundStars(starRoot, cycle);
      sceneSignatureState.lastStars = signatures.stars;
    }
    if (signatures.orbits !== sceneSignatureState.lastOrbits) {
      syncSolarSystemOrbits(orbitRoot, cycle);
      sceneSignatureState.lastOrbits = signatures.orbits;
    }
    if (signatures.bodies !== sceneSignatureState.lastBodies) {
      syncSolarSystemBodies(bodyRoot, cycle, sunLight);
      sceneSignatureState.lastBodies = signatures.bodies;
    }
    if (signatures.shell !== sceneSignatureState.lastShell) {
      syncSolarSystemShell(shellRoot, cycle);
      sceneSignatureState.lastShell = signatures.shell;
    }
    if (signatures.events !== sceneSignatureState.lastEvents) {
      syncSolarSystemEvents(eventRoot, cycle);
      sceneSignatureState.lastEvents = signatures.events;
    }
    if (signatures.labels !== sceneSignatureState.lastLabels) {
      syncSolarSystemLabels(labelRoot, cycle);
      sceneSignatureState.lastLabels = signatures.labels;
    }
    renderer.render(scene, camera);
    renderState.dirty = false;
    renderState.lastFrameSignature = frameSignature;
  }

  resize();

  return {
    resize,
    render,
    isInteracting() {
      return interaction.dragging;
    },
  };
}

export function getSolarSystemBodyPositions(
  bodies: OrreryBodyLike[]
) {
  return bodies.map((body) => ({
    id: body.id,
    position: createSolarSystemBodyPosition(body),
  }));
}

export function getSolarSystemRenderSignature(
  cycle: DaylightCycleLike,
  yaw = 0,
  pitch = 0
): string {
  const scene = getSolarSystemSceneSignatures(cycle);
  return [
    scene.stars,
    scene.orbits,
    scene.bodies,
    scene.shell,
    scene.events,
    scene.labels,
    Math.round(yaw * 40),
    Math.round(pitch * 40),
  ].join('|');
}

export function getSolarSystemEventMarkerStates(
  cycle: DaylightCycleLike,
  shellRadius = 15.4
) {
  const markers: Array<{
    type: 'aurora' | 'meteor-shower' | 'comet';
    position: THREE.Vector3;
    intensity: number;
    color: string;
    trailLength?: number;
  }> = [];

  (cycle.auroraBands ?? []).forEach((band) => {
    markers.push({
      type: 'aurora',
      position: createShellAltitudePoint(
        band.azimuthCenter,
        band.altitude + band.height * 0.55,
        shellRadius - 0.28
      ),
      intensity: band.intensity,
      color: band.colorA,
    });
  });

  (cycle.visibleEvents ?? []).forEach((event) => {
    if (
      event.type !== 'meteor-shower' &&
      event.type !== 'comet'
    ) {
      return;
    }
    markers.push({
      type: event.type,
      position: createShellAltitudePoint(
        event.azimuth,
        event.altitude,
        shellRadius - 0.18
      ),
      intensity: event.visibility * event.intensity,
      color: event.color,
      trailLength: event.trailLength,
    });
  });

  return markers;
}

export function getSolarSystemSceneSignatures(
  cycle: DaylightCycleLike
): SolarSystemSceneSignatures {
  return {
    stars: [
      Math.round((cycle.yearProgress ?? 0) * 24),
      Math.round((cycle.starsOpacity ?? 0) * 10),
    ].join('|'),
    orbits: (cycle.orreryBodies ?? [])
      .map((body) =>
        [
          body.id,
          Math.round((body.orbitRadius ?? 0) * 10),
          Math.round((body.orbitTilt ?? 0) * 20),
          Math.round((body.orbitHeight ?? 0) * 20),
          Math.round((body.orbitEccentricity ?? 0) * 20),
          Math.round((body.orbitRotation ?? 0) * 20),
        ].join(':')
      )
      .join('|'),
    bodies: (cycle.orreryBodies ?? [])
      .map((body) =>
        [
          body.id,
          Math.round((body.angle ?? 0) * 24),
          Math.round((body.size ?? 0) * 20),
          Math.round((body.trailLength ?? 0) * 10),
        ].join(':')
      )
      .join('|'),
    shell: [
      Math.round((cycle.starsOpacity ?? 0) * 10),
      Math.round((cycle.yearProgress ?? 0) * 24),
      cycle.activeConstellationIndex ?? 0,
      cycle.milkyWay
        ? [
            Math.round(cycle.milkyWay.azimuthOffset * 20),
            Math.round(cycle.milkyWay.inclination * 20),
            Math.round(cycle.milkyWay.opacity * 20),
          ].join(':')
        : 'none',
    ].join('|'),
    events: getSolarSystemEventMarkerStates(cycle)
      .map((marker) =>
        [
          marker.type,
          Math.round(marker.position.x * 10),
          Math.round(marker.position.y * 10),
          Math.round(marker.position.z * 10),
          Math.round((marker.intensity ?? 0) * 10),
          Math.round((marker.trailLength ?? 0) * 10),
        ].join(':')
      )
      .join('|'),
    labels: (cycle.orreryBodies ?? [])
      .filter((body) => body.type !== 'moon')
      .slice(0, 4)
      .map((body) => body.id)
      .join('|'),
  };
}

function syncBackgroundStars(root: THREE.Group, cycle: DaylightCycleLike): void {
  while (root.children.length > BACKGROUND_STAR_COUNT) {
    const child = root.children[root.children.length - 1];
    root.remove(child);
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  }
  while (root.children.length < BACKGROUND_STAR_COUNT) {
    root.add(createBackgroundStarMesh(root.children.length));
  }
  for (let index = 0; index < BACKGROUND_STAR_COUNT; index += 1) {
    const star = getBackgroundStarState(cycle, index, BACKGROUND_STAR_COUNT, scratchBackgroundStarState);
    const mesh = root.children[index];
    if (!(mesh instanceof THREE.Mesh)) {
      return;
    }
    mesh.position.set(star.x, star.y, star.z);
    const material = mesh.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      material.color.set(star.color);
      material.opacity = star.opacity;
    }
  }
}

export function getBackgroundStarStates(
  cycle: DaylightCycleLike,
  starCount = BACKGROUND_STAR_COUNT
): BackgroundStarState[] {
  const stars: BackgroundStarState[] = new Array(starCount);
  for (let index = 0; index < starCount; index += 1) {
    stars[index] = getBackgroundStarState(cycle, index, starCount);
  }
  return stars;
}

function createBackgroundStarMesh(index: number): THREE.Mesh {
  const radiusIndex = index % BACKGROUND_STAR_GEOMETRIES.length;
  return new THREE.Mesh(
    BACKGROUND_STAR_GEOMETRIES[radiusIndex]!,
    new THREE.MeshBasicMaterial({
      color: '#d8e9ff',
      transparent: true,
      opacity: 0,
    })
  );
}

function getBackgroundStarState(
  cycle: DaylightCycleLike,
  index: number,
  starCount: number,
  target?: BackgroundStarState
): BackgroundStarState {
  const opacity = 0.16 + cycle.starsOpacity * 0.34;
  const seasonalOffset = cycle.yearProgress * Math.PI * 2 * 0.1;
  const azimuth = (index / starCount) * Math.PI * 2 + seasonalOffset;
  const radius = 13.2 + ((index * 17) % 5) * 0.9;
  const star = target ?? {
    color: '#d8e9ff',
    opacity: 0,
    radius: 0.04,
    x: 0,
    y: 0,
    z: 0,
  };
  star.color = index % 7 === 0 ? '#fff2ca' : '#d8e9ff';
  star.opacity = opacity;
  star.radius = 0.04 + (index % 3) * 0.02;
  star.x = Math.cos(azimuth) * radius;
  star.y = -3.2 + ((index * 13) % 7) * 1.04;
  star.z = Math.sin(azimuth) * radius;
  return star;
}

function syncSolarSystemOrbits(
  root: THREE.Group,
  cycle: DaylightCycleLike
): void {
  root.clear();
  const bodies = cycle.orreryBodies ?? [];
  bodies.forEach((body) => {
    if (body.orbitRadius <= 0) {
      return;
    }
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        createSolarSystemOrbitRing(body)
      ),
      new THREE.LineBasicMaterial({
        color: body.type === 'moon' ? '#6e8fb8' : '#49617d',
        transparent: true,
        opacity: body.type === 'moon' ? 0.3 : 0.22,
      })
    );
    root.add(ring);
  });
}

function syncSolarSystemBodies(
  root: THREE.Group,
  cycle: DaylightCycleLike,
  sunLight: THREE.PointLight
) {
  const state = getSolarSystemBodyRenderState(cycle);
  const rootState = root.userData as {
    markerPool?: THREE.Mesh[];
    glowPool?: THREE.Mesh[];
    trailPool?: THREE.Line[];
  };
  const markerPool = rootState.markerPool ?? (rootState.markerPool = []);
  const glowPool = rootState.glowPool ?? (rootState.glowPool = []);
  const trailPool = rootState.trailPool ?? (rootState.trailPool = []);

  while (markerPool.length < state.markers.length) {
    const mesh = new THREE.Mesh(
      SOLAR_SYSTEM_BODY_GEOMETRY,
      new THREE.MeshBasicMaterial(
        compactThreeMaterialOptions({
          color: '#8fb7de',
          transparent: true,
          opacity: 0,
        })
      )
    );
    mesh.visible = false;
    markerPool.push(mesh);
    root.add(mesh);
  }

  while (glowPool.length < state.glows.length) {
    const mesh = new THREE.Mesh(
      SOLAR_SYSTEM_BODY_GEOMETRY,
      new THREE.MeshBasicMaterial(
        compactThreeMaterialOptions({
          color: '#8fb7de',
          transparent: true,
          opacity: 0,
        })
      )
    );
    mesh.visible = false;
    glowPool.push(mesh);
    root.add(mesh);
  }

  while (trailPool.length < state.trails.length) {
    const trail = new THREE.Line(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(6, 3)
      ),
      new THREE.LineBasicMaterial({
        color: '#8fb7de',
        transparent: true,
        opacity: 0,
      })
    );
    trail.visible = false;
    trailPool.push(trail);
    root.add(trail);
  }

  markerPool.forEach((mesh, index) => {
    const markerState = state.markers[index];
    if (!markerState) {
      mesh.visible = false;
      return;
    }
    mesh.position.copy(markerState.position);
    mesh.scale.setScalar(markerState.scale);
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.color.set(markerState.color);
    material.opacity = markerState.opacity;
    mesh.visible = markerState.visible;
  });

  glowPool.forEach((mesh, index) => {
    const glowState = state.glows[index];
    if (!glowState) {
      mesh.visible = false;
      return;
    }
    mesh.position.copy(glowState.position);
    mesh.scale.setScalar(glowState.scale);
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.color.set(glowState.color);
    material.opacity = glowState.opacity;
    mesh.visible = glowState.visible;
  });

  trailPool.forEach((trail, index) => {
    const trailState = state.trails[index];
    if (!trailState) {
      trail.visible = false;
      return;
    }
    const positions = trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, trailState.start.x, trailState.start.y, trailState.start.z);
    positions.setXYZ(1, trailState.end.x, trailState.end.y, trailState.end.z);
    positions.needsUpdate = true;
    const material = trail.material as THREE.LineBasicMaterial;
    material.color.set(trailState.color);
    material.opacity = trailState.opacity;
    trail.visible = trailState.visible;
  });

  if (state.sunLightPosition) {
    sunLight.position.copy(state.sunLightPosition);
  }
}

export function getSolarSystemBodyRenderState(
  cycle: DaylightCycleLike
): SolarSystemBodyRenderState {
  const markers: SolarSystemBodyMarkerState[] = [];
  const glows: SolarSystemBodyMarkerState[] = [];
  const trails: SolarSystemBodyTrailState[] = [];
  let sunLightPosition: THREE.Vector3 | null = null;
  const bodies = cycle.orreryBodies ?? [];

  bodies.forEach((body) => {
    const position = createSolarSystemBodyPosition(body);
    const color = resolveThreeColor(body.color, '#8fb7de');
    const markerOpacity = body.type === 'sun' ? 1 : 0.94;
    const markerScale = getSolarSystemBodyScale(body);
    markers.push({
      position,
      color,
      opacity: markerOpacity,
      scale: markerScale,
      visible: markerOpacity > 0.015,
    });

    if (body.type === 'sun') {
      sunLightPosition = position;
      glows.push({
        position,
        color,
        opacity: 0.22,
        scale: markerScale * 1.9,
        visible: true,
      });
    }

    if (body.type === 'comet' && body.trailLength > 0) {
      trails.push({
        start: position.clone().add(
          new THREE.Vector3(-body.trailLength * 0.28, body.trailLength * 0.08, 0)
        ),
        end: position,
        color,
        opacity: 0.36,
        visible: true,
      });
    }
  });

  return { markers, glows, trails, sunLightPosition };
}

function syncSolarSystemShell(root: THREE.Group, cycle: DaylightCycleLike): void {
  root.clear();
  root.position.set(0, 0, 0);
  const shellRadius = 15.4;

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(shellRadius, 26, 26),
    new THREE.MeshBasicMaterial({
      color: '#102034',
      transparent: true,
      opacity: 0.08 + cycle.starsOpacity * 0.06,
      side: THREE.BackSide,
      wireframe: true,
    })
  );
  root.add(shell);

  const belt = cycle.milkyWay;
  if (belt) {
    const samples = getMilkyWayBandSamples(belt, cycle.yearProgress, 40);
    const innerPoints = samples.map((sample) =>
      createShellPoint(sample.azimuth, sample.innerPhi, shellRadius - 0.4)
    );
    const outerPoints = samples.map((sample) =>
      createShellPoint(sample.azimuth, sample.outerPhi, shellRadius - 0.1)
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
          color: '#7ea1d4',
          transparent: true,
          opacity: belt.opacity * 0.28,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );
  }

  const constellations = cycle.constellations ?? [];
  const activeIndex = cycle.activeConstellationIndex ?? 0;
  const focusIndices = [
    activeIndex,
    (activeIndex + 1) % Math.max(1, constellations.length),
    (activeIndex + constellations.length - 1) % Math.max(1, constellations.length),
  ];
  focusIndices.forEach((constellationIndex, slotIndex) => {
    const constellation = constellations[constellationIndex];
    if (!constellation) {
      return;
    }
    const azimuth =
      cycle.sunriseAzimuth +
      (slotIndex - 1) * 0.92 +
      cycle.yearProgress * Math.PI * 2 * 0.06;
    const anchor = createShellPoint(azimuth, 1.08 + slotIndex * 0.05, shellRadius - 0.8);
    constellation.connections.forEach(([startIndex, endIndex]) => {
      const start = constellation.stars[startIndex];
      const end = constellation.stars[endIndex];
      if (!start || !end) {
        return;
      }
      root.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            createShellConstellationPoint(anchor, start),
            createShellConstellationPoint(anchor, end),
          ]),
          new THREE.LineBasicMaterial({
            color: '#a7c8ff',
            transparent: true,
            opacity: 0.16 + cycle.starsOpacity * 0.22,
          })
        )
      );
    });
  });
}

function syncSolarSystemLabels(root: THREE.Group, cycle: DaylightCycleLike): void {
  root.clear();
  const topBodies = (cycle.orreryBodies ?? []).filter((body) => body.type !== 'moon').slice(0, 4);
  topBodies.forEach((body, index) => {
    const position = createSolarSystemBodyPosition(body).clone();
    position.y += 5.8 - index * 0.82;
    position.x = -9.2;
    root.add(createTextSprite(`${formatSolarSystemLabel(body)}`, position));
  });
}

function syncSolarSystemEvents(root: THREE.Group, cycle: DaylightCycleLike): void {
  const state = getSolarSystemEventRenderState(cycle);
  const rootState = root.userData as {
    glowPool?: THREE.Sprite[];
    trailPool?: THREE.Line[];
  };
  const glowPool = rootState.glowPool ?? (rootState.glowPool = []);
  const trailPool = rootState.trailPool ?? (rootState.trailPool = []);

  while (glowPool.length < state.glows.length) {
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial(compactThreeMaterialOptions({
        color: '#dff4ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }))
    );
    glow.visible = false;
    glowPool.push(glow);
    root.add(glow);
  }

  while (trailPool.length < state.trails.length) {
    const trail = new THREE.Line(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(6, 3)
      ),
      new THREE.LineBasicMaterial({
        color: '#dff4ff',
        transparent: true,
        opacity: 0,
      })
    );
    trail.visible = false;
    trailPool.push(trail);
    root.add(trail);
  }

  glowPool.forEach((glow, index) => {
    const glowState = state.glows[index];
    if (!glowState) {
      glow.visible = false;
      return;
    }
    glow.position.copy(glowState.position);
    glow.scale.set(glowState.scale, glowState.scale, 1);
    const material = glow.material as THREE.SpriteMaterial;
    material.color.set(glowState.color);
    material.opacity = glowState.opacity;
    glow.visible = glowState.visible;
  });

  trailPool.forEach((trail, index) => {
    const trailState = state.trails[index];
    if (!trailState) {
      trail.visible = false;
      return;
    }
    const positions = trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, trailState.start.x, trailState.start.y, trailState.start.z);
    positions.setXYZ(1, trailState.end.x, trailState.end.y, trailState.end.z);
    positions.needsUpdate = true;
    const material = trail.material as THREE.LineBasicMaterial;
    material.color.set(trailState.color);
    material.opacity = trailState.opacity;
    trail.visible = trailState.visible;
  });
}

export function getSolarSystemEventRenderState(
  cycle: DaylightCycleLike
): SolarSystemEventRenderState {
  const markers = getSolarSystemEventMarkerStates(cycle);
  const glows: SolarSystemEventGlowState[] = [];
  const trails: SolarSystemEventTrailState[] = [];

  markers.forEach((marker, index) => {
    const color = resolveThreeColor(marker.color, '#dff4ff');
    const glowOpacity =
      marker.type === 'aurora'
        ? 0.18 + marker.intensity * 0.3
        : 0.26 + marker.intensity * 0.46;
    const scale =
      marker.type === 'aurora'
        ? 1.8 + marker.intensity * 2.2
        : 0.65 + marker.intensity * 1.25;
    glows.push({
      position: marker.position,
      color,
      opacity: glowOpacity,
      scale,
      visible: glowOpacity > 0.015,
    });

    if (marker.type === 'aurora') {
      const points = [
        marker.position.clone().add(new THREE.Vector3(-1.3, 0.18, 0)),
        marker.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
        marker.position.clone().add(new THREE.Vector3(1.3, -0.18, 0)),
      ];
      const opacity = 0.28 + marker.intensity * 0.34;
      for (let index = 1; index < points.length; index += 1) {
        trails.push({
          start: points[index - 1]!,
          end: points[index]!,
          color: '#c7f8ff',
          opacity,
          visible: opacity > 0.015,
        });
      }
      return;
    }

    const opacity = 0.24 + marker.intensity * 0.42;
    trails.push({
      start: marker.position.clone().add(
        new THREE.Vector3(
          (marker.type === 'meteor-shower' ? 1 : -1) *
            Math.max(0.7, (marker.trailLength ?? 1.4) * 0.42),
          marker.type === 'meteor-shower' ? 0.28 : -0.14,
          index % 2 === 0 ? 0.2 : -0.2
        )
      ),
      end: marker.position,
      color,
      opacity,
      visible: opacity > 0.015,
    });
  });

  return { glows, trails };
}

function createSolarSystemOrbitRing(body: OrreryBodyLike): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 56; index += 1) {
    const angle = (index / 56) * Math.PI * 2;
    points.push(createSolarSystemBodyPosition(body, angle));
  }
  return points;
}

function createSolarSystemBodyPosition(
  body: OrreryBodyLike,
  angle = body.angle * Math.PI * 2 - Math.PI / 2
): THREE.Vector3 {
  const orbitRadius = body.orbitRadius * 1.36;
  const minorRadius = orbitRadius * (1 - clamp(body.orbitEccentricity, 0, 0.82));
  const localX = Math.cos(angle) * orbitRadius;
  const localY = Math.sin(angle) * minorRadius;
  const rotation = body.orbitRotation ?? 0;
  const rotatedX = localX * Math.cos(rotation) - localY * Math.sin(rotation);
  const rotatedY = localX * Math.sin(rotation) + localY * Math.cos(rotation);
  return new THREE.Vector3(
    rotatedX,
    rotatedY * Math.cos(body.orbitTilt) + body.orbitHeight * 1.8,
    rotatedY * Math.sin(body.orbitTilt)
  );
}

function createShellPoint(
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

function createShellAltitudePoint(
  azimuth: number,
  altitude: number,
  radius: number
) {
  const phi = ((1 - altitude) * Math.PI) / 2;
  return createShellPoint(azimuth, phi, radius);
}

function createShellConstellationPoint(
  anchor: THREE.Vector3,
  star: ConstellationStarLike
): THREE.Vector3 {
  return new THREE.Vector3(
    anchor.x + (star.x - 0.5) * 2.6,
    anchor.y + (0.5 - star.y) * 1.8,
    anchor.z
  );
}

function createTextSprite(text: string, position: THREE.Vector3): THREE.Object3D {
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 38;
  const context = canvas.getContext('2d');
  if (!context) {
    const fallback = new THREE.Group();
    fallback.position.copy(position);
    return fallback;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(8, 16, 25, 0.74)';
  context.fillRect(0, 6, canvas.width, 24);
  context.strokeStyle = 'rgba(132, 173, 214, 0.3)';
  context.strokeRect(0.5, 6.5, canvas.width - 1, 23);
  context.fillStyle = '#e6f2ff';
  context.font = '600 16px Trebuchet MS';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, 18);

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
  sprite.position.copy(position);
  sprite.scale.set(5.6, 1.15, 1);
  return sprite;
}

function formatSolarSystemLabel(body: OrreryBodyLike): string {
  if (body.id === 'sun') {
    return 'Sun';
  }
  if (body.id === 'moon') {
    return 'Moon';
  }
  const [, name] = body.id.split(':');
  return name ?? body.id;
}

function getSolarSystemBodyScale(body: OrreryBodyLike): number {
  if (body.type === 'sun') {
    return body.size * 1.08;
  }
  if (body.type === 'moon') {
    return body.size * 0.92;
  }
  return Math.max(0.16, body.size * 0.68);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
