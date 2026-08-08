import * as THREE from 'three';
import type { WorldEnvironmentLike } from '@bworlds/plugin-api';
import {
  getMilkyWayBandSamples,
  type OrreryBodyLike,
  type getDaylightCycleState,
} from '@bworlds/core';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;
type OverworldSamplerLike = {
  sampleOverworld(x: number, y: number): {
    kind?: string;
  };
};

const PLANET_SURFACE_COLORS: Record<string, string> = {
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

export function createCelestialPreviewRenderer(host: HTMLElement | null) {
  if (!host) {
    return {
      resize() {},
      render() {},
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
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 14, 28);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight('#b8d4ff', 0.8);
  scene.add(ambient);
  const rim = new THREE.DirectionalLight('#ffdca8', 1);
  rim.position.set(12, 16, 10);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);
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
      color: '#1d3552',
      emissive: '#0a1422',
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  root.add(world);
  const planetTextureState = {
    lastSampler: null as OverworldSamplerLike | null,
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
  const orbitRoot = new THREE.Group();
  root.add(orbitRoot);
  const orreryRoot = new THREE.Group();
  root.add(orreryRoot);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 24, 24),
    new THREE.MeshBasicMaterial({ color: '#ffd06e' })
  );
  root.add(sun);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 20, 20),
    new THREE.MeshBasicMaterial({ color: '#dce8ff' })
  );
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
  }

  function render(
    cycle: DaylightCycleLike,
    environment: WorldEnvironmentLike,
    facingAngle = 0,
    overworldSampler: OverworldSamplerLike | null = null
  ) {
    root.rotation.y = facingAngle + Math.PI + rotationState.yaw;
    root.rotation.z =
      (-cycle.observerLatitudeDegrees / 180) * Math.PI * 0.45 +
      rotationState.pitch;
    world.rotation.y += 0.002;
    world.rotation.z = cycle.solarDeclination * 0.4;
    syncPreviewPlanetTexture(world, overworldSampler, planetTextureState);
    facingArrow.rotation.z = -facingAngle;

    updateBodyPosition(
      sun,
      cycle.sunAzimuth,
      cycle.sunAltitude,
      9.8,
      '#ffd06e'
    );
    updateBodyPosition(
      moon,
      cycle.moonAzimuth,
      cycle.moonAltitude,
      10.8,
      '#dce8ff'
    );
    moon.material.opacity = Math.max(
      0.24,
      (cycle.night * 0.8 + (cycle.moonAltitude > -0.08 ? 0.18 : 0)) *
        (0.24 + cycle.moonIllumination * 0.76)
    );
    moon.material.transparent = true;

    syncPreviewConstellations(constellationRoot, cycle);
    syncPreviewEvents(eventRoot, cycle);
    syncMilkyWayBelt(beltRoot, cycle);
    syncPreviewOrbits(orbitRoot, cycle);
    syncPreviewOrrery(orreryRoot, cycle);

    const skyOpacity = 0.06 + cycle.starsOpacity * 0.12;
    (skyShell.material as THREE.MeshBasicMaterial).opacity = skyOpacity;
    constellationRoot.visible = true;
    beltRoot.visible = cycle.starsOpacity > 0.02;
    eventRoot.visible = (cycle.visibleEvents ?? []).some(
      (event) => event.visibility > 0.02
    );
    orbitRoot.visible = true;
    orreryRoot.visible = true;

    renderer.render(scene, camera);
  }

  resize();

  return {
    resize,
    render,
  };
}

export function getPlanetSurfaceColor(kind: string | undefined) {
  if (!kind) {
    return '#1a3d68';
  }
  return PLANET_SURFACE_COLORS[kind] ?? '#6b7c59';
}

export function buildPlanetTextureGrid(
  sampleOverworld: OverworldSamplerLike['sampleOverworld'],
  width = 64,
  height = 32
) {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const longitude = x / width;
      const latitude = y / height;
      const worldX = Math.round((longitude - 0.5) * 256);
      const worldY = Math.round((0.5 - latitude) * 128);
      return getPlanetSurfaceColor(sampleOverworld(worldX, worldY)?.kind);
    })
  );
}

export function getPreviewSunOrbitSpec(cycle: DaylightCycleLike) {
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
  if (!overworldSampler || overworldSampler === textureState.lastSampler) {
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  const grid = buildPlanetTextureGrid(overworldSampler.sampleOverworld, canvas.width, canvas.height);
  grid.forEach((row, y) => {
    row.forEach((color, x) => {
      context.fillStyle = color;
      context.fillRect(x, y, 1, 1);
    });
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  material.map = texture;
  material.needsUpdate = true;
  textureState.lastSampler = overworldSampler;
}

function updateBodyPosition(
  mesh: THREE.Mesh,
  azimuth: number,
  altitude: number,
  radius: number,
  color: string
) {
  mesh.position.set(
    Math.cos(azimuth) * radius,
    altitude * 5.2,
    Math.sin(azimuth) * radius
  );
  (mesh.material as THREE.MeshBasicMaterial).color.set(color);
}

function syncPreviewConstellations(root: THREE.Group, cycle: DaylightCycleLike) {
  root.clear();
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

    constellation.connections.forEach(([startIndex, endIndex]) => {
      const start = constellation.stars[startIndex];
      const end = constellation.stars[endIndex];
      if (!start || !end) {
        return;
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          previewConstellationPoint(anchor, start),
          previewConstellationPoint(anchor, end),
        ]),
        new THREE.LineBasicMaterial({
          color: '#86aef5',
          transparent: true,
          opacity: 0.14 + cycle.starsOpacity * 0.26,
        })
      );
      root.add(line);
    });

    constellation.stars.forEach((star) => {
      const point = previewConstellationPoint(anchor, star);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          color: '#f3f8ff',
          transparent: true,
          opacity: 0.12 + (0.18 + star.brightness * 0.44) * cycle.starsOpacity,
          depthWrite: false,
        })
      );
      sprite.position.copy(point);
      const scale = 0.16 + star.brightness * 0.18;
      sprite.scale.set(scale, scale, 1);
      root.add(sprite);
    });
  });
}

function syncPreviewEvents(root: THREE.Group, cycle: DaylightCycleLike) {
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
      new THREE.MeshBasicMaterial({
        color: event.color,
        transparent: true,
        opacity: (0.34 + event.intensity * 0.38) * event.visibility,
      })
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
          color: event.color,
          transparent: true,
          opacity: (0.2 + event.intensity * 0.24) * event.visibility,
        })
      );
      tail.visible = (tail.material as THREE.LineBasicMaterial).opacity > 0.015;
      root.add(tail);
    }

    if (event.type === 'meteor-shower') {
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
          color: event.color,
          transparent: true,
          opacity: (0.18 + event.intensity * 0.24) * event.visibility,
        })
      );
      streak.visible = (streak.material as THREE.LineBasicMaterial).opacity > 0.015;
      root.add(streak);
    }
  });
}

function syncMilkyWayBelt(root: THREE.Group, cycle: DaylightCycleLike) {
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

function syncPreviewOrbits(root: THREE.Group, cycle: DaylightCycleLike) {
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

function syncPreviewOrrery(root: THREE.Group, cycle: DaylightCycleLike) {
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
      new THREE.MeshBasicMaterial({
        color: body.color,
        transparent: true,
        opacity: body.type === 'sun' ? 1 : 0.92,
      })
    );
    marker.position.copy(position);
    root.add(marker);

    if (body.type === 'sun') {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(body.size * 1.9, 14, 14),
        new THREE.MeshBasicMaterial({
          color: body.color,
          transparent: true,
          opacity: 0.18,
        })
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
            color: body.color,
            transparent: true,
            opacity: 0.34,
          })
        )
      );
    }
  });
}

function createPreviewPoint(azimuth: number, phi: number, radius: number) {
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

function createOrreryLabel(body: OrreryBodyLike, position: THREE.Vector3) {
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
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.82,
    })
  );
  sprite.position.copy(position.clone().add(new THREE.Vector3(0, 0.72, 0)));
  sprite.scale.set(2.8, 0.72, 1);
  return sprite;
}

function formatOrreryLabel(body: OrreryBodyLike) {
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
