import * as THREE from 'three';
import type { WorldEnvironmentLike } from '@bworlds/plugin-api';
import type { OrreryBodyLike, getDaylightCycleState } from '@bworlds/core';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;

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
    facingAngle = 0
  ) {
    root.rotation.y = facingAngle + Math.PI + rotationState.yaw;
    root.rotation.z =
      (-cycle.observerLatitudeDegrees / 180) * Math.PI * 0.45 +
      rotationState.pitch;
    world.rotation.y += 0.002;
    world.rotation.z = cycle.solarDeclination * 0.4;
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
    eventRoot.visible = true;
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
        opacity: 0.34 + event.intensity * 0.38,
      })
    );
    mesh.position.copy(point);
    root.add(mesh);

    if (event.type === 'comet') {
      root.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            point.clone().add(
              new THREE.Vector3(-event.trailLength * 0.42, -0.08, 0)
            ),
            point,
          ]),
          new THREE.LineBasicMaterial({
            color: event.color,
            transparent: true,
            opacity: 0.2 + event.intensity * 0.24,
          })
        )
      );
    }

    if (event.type === 'meteor-shower') {
      root.add(
        new THREE.Line(
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
            opacity: 0.18 + event.intensity * 0.24,
          })
        )
      );
    }
  });
}

function syncMilkyWayBelt(root: THREE.Group, cycle: DaylightCycleLike) {
  root.clear();
  const belt = cycle.milkyWay;
  if (!belt) {
    return;
  }
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 60; index += 1) {
    const azimuth = (index / 60) * Math.PI * 2 + belt.azimuthOffset;
    const latitudeWave =
      Math.sin(azimuth * 2 + cycle.yearProgress * Math.PI * 2) * belt.width;
    points.push(
      createPreviewPoint(azimuth, belt.inclination + latitudeWave, 11.8)
    );
  }

  root.add(
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: '#7da0d5',
        transparent: true,
        opacity: belt.opacity,
      })
    )
  );
}

function syncPreviewOrbits(root: THREE.Group, cycle: DaylightCycleLike) {
  root.clear();

  root.add(
    buildPreviewArc(
      cycle.sunriseAzimuth,
      cycle.sunsetAzimuth,
      0.04,
      10,
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

  bodies.forEach((body) => {
    if (body.orbitRadius > 0) {
      root.add(
        new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(
            createOrreryRingPoints(body.orbitRadius)
          ),
          new THREE.LineBasicMaterial({
            color: body.type === 'moon' ? '#708fbb' : '#4b617a',
            transparent: true,
            opacity: body.type === 'moon' ? 0.28 : 0.2,
          })
        )
      );
    }

    const angle = body.angle * Math.PI * 2 - Math.PI / 2;
    const position = new THREE.Vector3(
      Math.cos(angle) * body.orbitRadius,
      Math.sin(angle) * body.orbitRadius,
      0.12 + body.orbitRadius * 0.01
    );
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

function createOrreryRingPoints(radius: number) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 40; index += 1) {
    const angle = (index / 40) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      )
    );
  }
  return points;
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
