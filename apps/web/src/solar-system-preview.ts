import * as THREE from 'three';
import {
  getMilkyWayBandSamples,
  type OrreryBodyLike,
  type getDaylightCycleState,
} from '@bworlds/core';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;

export function createSolarSystemPreviewRenderer(host: HTMLElement | null) {
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
  }

  function render(cycle: DaylightCycleLike) {
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
  }

  resize();

  return {
    resize,
    render,
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

export function getSolarSystemSceneSignatures(cycle: DaylightCycleLike) {
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

function syncBackgroundStars(root: THREE.Group, cycle: DaylightCycleLike) {
  root.clear();
  const starCount = 56;
  for (let index = 0; index < starCount; index += 1) {
    const azimuth = (index / starCount) * Math.PI * 2 + cycle.yearProgress * Math.PI * 2 * 0.1;
    const radius = 13.2 + ((index * 17) % 5) * 0.9;
    const height = -3.2 + ((index * 13) % 7) * 1.04;
    const sprite = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + (index % 3) * 0.02, 8, 8),
      new THREE.MeshBasicMaterial({
        color: index % 7 === 0 ? '#fff2ca' : '#d8e9ff',
        transparent: true,
        opacity: 0.16 + cycle.starsOpacity * 0.34,
      })
    );
    sprite.position.set(
      Math.cos(azimuth) * radius,
      height,
      Math.sin(azimuth) * radius
    );
    root.add(sprite);
  }
}

function syncSolarSystemOrbits(root: THREE.Group, cycle: DaylightCycleLike) {
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
  root.clear();
  const bodies = cycle.orreryBodies ?? [];
  bodies.forEach((body) => {
    const position = createSolarSystemBodyPosition(body);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(getSolarSystemBodyScale(body), 18, 18),
      new THREE.MeshBasicMaterial({
        color: body.color,
        transparent: true,
        opacity: body.type === 'sun' ? 1 : 0.94,
      })
    );
    marker.position.copy(position);
    root.add(marker);

    if (body.type === 'sun') {
      sunLight.position.copy(position);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(getSolarSystemBodyScale(body) * 1.9, 18, 18),
        new THREE.MeshBasicMaterial({
          color: body.color,
          transparent: true,
          opacity: 0.22,
        })
      );
      glow.position.copy(position);
      root.add(glow);
    }

    if (body.type === 'comet' && body.trailLength > 0) {
      root.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            position.clone().add(
              new THREE.Vector3(-body.trailLength * 0.28, body.trailLength * 0.08, 0)
            ),
            position,
          ]),
          new THREE.LineBasicMaterial({
            color: body.color,
            transparent: true,
            opacity: 0.36,
          })
        )
      );
    }
  });
}

function syncSolarSystemShell(root: THREE.Group, cycle: DaylightCycleLike) {
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

function syncSolarSystemLabels(root: THREE.Group, cycle: DaylightCycleLike) {
  root.clear();
  const topBodies = (cycle.orreryBodies ?? []).filter((body) => body.type !== 'moon').slice(0, 4);
  topBodies.forEach((body, index) => {
    const position = createSolarSystemBodyPosition(body).clone();
    position.y += 5.8 - index * 0.82;
    position.x = -9.2;
    root.add(createTextSprite(`${formatSolarSystemLabel(body)}`, position));
  });
}

function syncSolarSystemEvents(root: THREE.Group, cycle: DaylightCycleLike) {
  root.clear();
  const markers = getSolarSystemEventMarkerStates(cycle);
  markers.forEach((marker, index) => {
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: marker.color,
        transparent: true,
        opacity:
          marker.type === 'aurora'
            ? 0.18 + marker.intensity * 0.3
            : 0.26 + marker.intensity * 0.46,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    glow.position.copy(marker.position);
    const scale =
      marker.type === 'aurora'
        ? 1.8 + marker.intensity * 2.2
        : 0.65 + marker.intensity * 1.25;
    glow.scale.set(scale, scale, 1);
    root.add(glow);

    if (marker.type === 'aurora') {
      root.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            marker.position.clone().add(new THREE.Vector3(-1.3, 0.18, 0)),
            marker.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
            marker.position.clone().add(new THREE.Vector3(1.3, -0.18, 0)),
          ]),
          new THREE.LineBasicMaterial({
            color: '#c7f8ff',
            transparent: true,
            opacity: 0.28 + marker.intensity * 0.34,
          })
        )
      );
      return;
    }

    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        marker.position.clone().add(
          new THREE.Vector3(
            (marker.type === 'meteor-shower' ? 1 : -1) *
              Math.max(0.7, (marker.trailLength ?? 1.4) * 0.42),
            marker.type === 'meteor-shower' ? 0.28 : -0.14,
            index % 2 === 0 ? 0.2 : -0.2
          )
        ),
        marker.position,
      ]),
      new THREE.LineBasicMaterial({
        color: marker.color,
        transparent: true,
        opacity: 0.24 + marker.intensity * 0.42,
      })
    );
    root.add(trail);
  });
}

function createSolarSystemOrbitRing(body: OrreryBodyLike) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 56; index += 1) {
    const angle = (index / 56) * Math.PI * 2;
    points.push(createSolarSystemBodyPosition(body, angle));
  }
  return points;
}

function createSolarSystemBodyPosition(body: OrreryBodyLike, angle = body.angle * Math.PI * 2 - Math.PI / 2) {
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

function createShellPoint(azimuth: number, phi: number, radius: number) {
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
  star: DaylightCycleLike['constellations'][number]['stars'][number]
) {
  return new THREE.Vector3(
    anchor.x + (star.x - 0.5) * 2.6,
    anchor.y + (0.5 - star.y) * 1.8,
    anchor.z
  );
}

function createTextSprite(text: string, position: THREE.Vector3) {
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
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.82,
    })
  );
  sprite.position.copy(position);
  sprite.scale.set(5.6, 1.15, 1);
  return sprite;
}

function formatSolarSystemLabel(body: OrreryBodyLike) {
  if (body.id === 'sun') {
    return 'Sun';
  }
  if (body.id === 'moon') {
    return 'Moon';
  }
  const [, name] = body.id.split(':');
  return name ?? body.id;
}

function getSolarSystemBodyScale(body: OrreryBodyLike) {
  if (body.type === 'sun') {
    return body.size * 1.08;
  }
  if (body.type === 'moon') {
    return body.size * 0.92;
  }
  return Math.max(0.16, body.size * 0.68);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
