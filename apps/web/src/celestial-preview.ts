import * as THREE from 'three';
import type { WorldEnvironmentLike } from '@bworlds/plugin-api';
import type { getDaylightCycleState } from '@bworlds/core';

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

    const skyOpacity = 0.06 + cycle.starsOpacity * 0.12;
    (skyShell.material as THREE.MeshBasicMaterial).opacity = skyOpacity;
    constellationRoot.visible = cycle.starsOpacity > 0.02;
    beltRoot.visible = cycle.starsOpacity > 0.02;
    eventRoot.visible = true;

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
          opacity: 0.1 + cycle.starsOpacity * 0.28,
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
          opacity: (0.22 + star.brightness * 0.5) * cycle.starsOpacity,
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
    const azimuth = cycle.yearProgress * Math.PI * 2 + event.progress * Math.PI * 2;
    const altitude = 0.22 + Math.sin(event.progress * Math.PI * 2 + index) * 0.28;
    const point = createPreviewPoint(azimuth, 0.9 - altitude * 0.35, 10.6);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(event.type === 'planet' ? 0.28 : 0.2, 12, 12),
      new THREE.MeshBasicMaterial({
        color:
          event.type === 'planet'
            ? '#f9d39b'
            : event.type === 'comet'
              ? '#dff5ff'
              : '#f0f6ff',
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
            point.clone().add(new THREE.Vector3(-0.9, -0.1, 0)),
            point,
          ]),
          new THREE.LineBasicMaterial({
            color: '#dff5ff',
            transparent: true,
            opacity: 0.2 + event.intensity * 0.24,
          })
        )
      );
    }
  });
}

function syncMilkyWayBelt(root: THREE.Group, cycle: DaylightCycleLike) {
  root.clear();
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 60; index += 1) {
    const azimuth = (index / 60) * Math.PI * 2 + cycle.yearProgress * Math.PI * 2 * 0.2;
    const latitudeWave = 0.18 * Math.sin(azimuth * 2 + cycle.yearProgress * Math.PI * 2);
    points.push(createPreviewPoint(azimuth, 1.08 + latitudeWave, 11.8));
  }

  root.add(
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: '#7da0d5',
        transparent: true,
        opacity: 0.04 + cycle.starsOpacity * 0.12,
      })
    )
  );
}

function createPreviewPoint(azimuth: number, phi: number, radius: number) {
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    Math.cos(azimuth) * sinPhi * radius,
    Math.cos(phi) * radius,
    Math.sin(azimuth) * sinPhi * radius
  );
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
