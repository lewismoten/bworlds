import type { getDaylightCycleState } from '@bworlds/core';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;

export function getTimeWheelConstellationEntries(cycle: DaylightCycleLike) {
  const ring = cycle.celestialRing ?? [];
  return ring.map((entry, index) => ({
    name: entry.name,
    index,
    angle: entry.visualAzimuth - Math.PI / 2,
    isActive: index === cycle.activeConstellationIndex,
  }));
}

export function getCelestialDateLabel(cycle: DaylightCycleLike) {
  return cycle.calendar?.label ?? `${cycle.activeConstellation?.name ?? 'Unknown'} / ${cycle.moonPhaseName}`;
}

export function getMoonPhaseSymbol(phaseIndex: number) {
  return ['●', '◔', '◑', '◕', '○', '◕', '◑', '◔'][phaseIndex] ?? '●';
}

export function getMoonPhaseLabel(phaseIndex: number) {
  if (phaseIndex === 0) {
    return 'New';
  }
  if (phaseIndex === 4) {
    return 'Full';
  }
  if (phaseIndex > 0 && phaseIndex < 4) {
    return 'Waxing';
  }
  return 'Waning';
}

export function getMoonOrbitProgress(cycle: DaylightCycleLike) {
  return ((cycle.moonAngle + Math.PI / 2) / (Math.PI * 2) + 1) % 1;
}

export function getMoonMidnightOrbitProgress(cycle: DaylightCycleLike) {
  if (typeof cycle.moonMidnightOrbitProgress === 'number') {
    return cycle.moonMidnightOrbitProgress;
  }
  return getMoonOrbitProgress(cycle);
}

export function getDialAngle(progress: number, referenceProgress: number) {
  return (progress - referenceProgress) * Math.PI * 2 - Math.PI / 2;
}

export function getDaylightRingLayout(cycle: DaylightCycleLike) {
  const dawnAngle = getDialAngle(cycle.sunriseProgress, cycle.dayProgress);
  const duskAngle = getDialAngle(cycle.sunsetProgress, cycle.dayProgress);
  return {
    dawnAngle,
    duskAngle,
    dayCenterAngle: getDialAngle(
      (cycle.sunriseProgress + cycle.daylightDuration * 0.5) % 1,
      cycle.dayProgress
    ),
    nightCenterAngle: getDialAngle(
      (cycle.sunsetProgress + (1 - cycle.daylightDuration) * 0.5) % 1,
      cycle.dayProgress
    ),
  };
}

export function getNightRingStars(
  innerRadius: number,
  outerRadius: number,
  dawnAngle: number,
  duskAngle: number,
  count = 36
) {
  const baseRadius = (innerRadius + outerRadius) * 0.5;
  const nightStart = duskAngle;
  const nightEnd = dawnAngle + Math.PI * 2;
  return Array.from({ length: count }, (_, starIndex) => {
    const progress = pseudoRandom(starIndex * 17.37, 0.23);
    const angle = nightStart + (nightEnd - nightStart) * progress;
    const radialJitter = (pseudoRandom(starIndex * 2.91, 0.61) - 0.5) * 9;
    const size = 0.22 + pseudoRandom(starIndex * 8.4, 0.42) * 0.95;
    const opacity = 0.12 + pseudoRandom(starIndex * 5.17, 0.12) * 0.22;
    return {
      angle,
      radius: baseRadius + radialJitter,
      size,
      color:
        starIndex % 6 === 0
          ? `rgba(255, 241, 196, ${opacity})`
          : `rgba(235, 244, 255, ${opacity})`,
    };
  });
}

export function getCelestialRingStars(
  innerRadius: number,
  outerRadius: number,
  count = 28
) {
  const span = outerRadius - innerRadius;
  return Array.from({ length: count }, (_, starIndex) => {
    const angle = pseudoRandom(starIndex * 9.13, 0.47) * Math.PI * 2;
    const radius =
      innerRadius + span * (0.12 + pseudoRandom(starIndex * 3.27, 0.81) * 0.76);
    const size = 0.28 + pseudoRandom(starIndex * 5.71, 0.11) * 0.82;
    const opacity = 0.08 + pseudoRandom(starIndex * 4.03, 0.19) * 0.16;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      size,
      color:
        starIndex % 9 === 0
          ? `rgba(255, 238, 196, ${opacity})`
          : `rgba(224, 238, 255, ${opacity})`,
    };
  });
}

export function getTimeWheelWindowLayout(daylightInnerRadius: number, windowWidth: number) {
  return {
    timeY: daylightInnerRadius * -0.09,
    constellationGlyphX: -windowWidth * 0.29,
    constellationGlyphY: daylightInnerRadius * 0.09,
    constellationNameX: -windowWidth * 0.15,
    constellationNameY: daylightInnerRadius * 0.12,
    moonPhaseSymbolX: -windowWidth * 0.29,
    moonPhaseSymbolY: daylightInnerRadius * 0.31,
    moonPhaseLabelX: -windowWidth * 0.15,
    moonPhaseLabelY: daylightInnerRadius * 0.31,
  };
}

export function drawTimeWheel(canvas: HTMLCanvasElement | null, cycle: DaylightCycleLike) {
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    return;
  }

  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const daylightOuterRadius = Math.min(width, height) * 0.295;
  const daylightInnerRadius = daylightOuterRadius * 0.58;
  const moonOuterRadius = daylightOuterRadius * 1.28;
  const moonInnerRadius = daylightOuterRadius * 1.04;
  const constellationOuterRadius = daylightOuterRadius * 1.72;
  const constellationInnerRadius = daylightOuterRadius * 1.36;
  const seasonRotation = -cycle.yearProgress * Math.PI * 2;
  const ringEntries = getTimeWheelConstellationEntries(cycle);

  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(centerX, centerY);

  const halo = context.createRadialGradient(
    0,
    0,
    daylightInnerRadius * 0.2,
    0,
    0,
    constellationOuterRadius * 1.04
  );
  halo.addColorStop(0, 'rgba(255, 191, 105, 0.12)');
  halo.addColorStop(1, 'rgba(85, 214, 190, 0)');
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, constellationOuterRadius * 1.04, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.rotate(seasonRotation);
  drawConstellationRing(
    context,
    ringEntries,
    cycle,
    constellationInnerRadius,
    constellationOuterRadius
  );
  context.restore();

  drawTopMarker(context, constellationOuterRadius + 10, '#f6f8ea');

  context.save();
  context.rotate(-getMoonMidnightOrbitProgress(cycle) * Math.PI * 2);
  drawMoonRing(context, cycle, moonInnerRadius, moonOuterRadius);
  context.restore();

  drawTopMarker(context, moonOuterRadius + 8, '#dce9ff');

  drawDaylightRing(context, cycle, daylightOuterRadius, daylightInnerRadius);

  for (let hour = 0; hour < 24; hour += 1) {
    const angle = getDialAngle(hour / 24, cycle.dayProgress);
    const tickOuter = daylightOuterRadius + (hour % 6 === 0 ? 6 : 2);
    const tickInner = daylightOuterRadius - (hour % 6 === 0 ? 16 : 9);
    context.strokeStyle =
      hour < 12 ? 'rgba(255,255,255,0.5)' : 'rgba(159,196,255,0.4)';
    context.lineWidth = hour % 6 === 0 ? 2 : 1;
    context.beginPath();
    context.moveTo(Math.cos(angle) * tickInner, Math.sin(angle) * tickInner);
    context.lineTo(Math.cos(angle) * tickOuter, Math.sin(angle) * tickOuter);
    context.stroke();
  }

  const dayCenterProgress = (cycle.sunriseProgress + cycle.daylightDuration * 0.5) % 1;
  const sunAngle = getDialAngle(dayCenterProgress, cycle.dayProgress);
  context.fillStyle = '#ffcf6b';
  context.beginPath();
  context.arc(
    Math.cos(sunAngle) * ((daylightOuterRadius + daylightInnerRadius) * 0.5),
    Math.sin(sunAngle) * ((daylightOuterRadius + daylightInnerRadius) * 0.5),
    11,
    0,
    Math.PI * 2
  );
  context.fill();
  context.fillStyle = 'rgba(255, 245, 196, 0.4)';
  context.beginPath();
  context.arc(
    Math.cos(sunAngle) * ((daylightOuterRadius + daylightInnerRadius) * 0.5),
    Math.sin(sunAngle) * ((daylightOuterRadius + daylightInnerRadius) * 0.5),
    18,
    0,
    Math.PI * 2
  );
  context.fill();

  const moonCenterProgress =
    (cycle.sunsetProgress + (1 - cycle.daylightDuration) * 0.5) % 1;
  const moonAngle = getDialAngle(moonCenterProgress, cycle.dayProgress);
  context.fillStyle = '#d9e8ff';
  context.beginPath();
  context.arc(
    Math.cos(moonAngle) * ((daylightOuterRadius + daylightInnerRadius) * 0.5),
    Math.sin(moonAngle) * ((daylightOuterRadius + daylightInnerRadius) * 0.5),
    9,
    0,
    Math.PI * 2
  );
  context.fill();
  context.fillStyle = '#09111a';
  context.beginPath();
  context.arc(
    Math.cos(moonAngle) * ((daylightOuterRadius + daylightInnerRadius) * 0.5) +
      (1 - cycle.moonIllumination) * 7,
    Math.sin(moonAngle) * ((daylightOuterRadius + daylightInnerRadius) * 0.5),
    8,
    0,
    Math.PI * 2
  );
  context.fill();

  drawTopMarker(context, daylightOuterRadius + 12, '#ffcf6b');
  drawTopMarker(context, daylightOuterRadius - 8, '#f1d088', true);

  context.fillStyle = '#081019';
  context.beginPath();
  context.arc(0, 0, daylightInnerRadius - 3, 0, Math.PI * 2);
  context.fill();

  const windowWidth = daylightInnerRadius * 1.4;
  const windowHeight = daylightInnerRadius * 0.88;
  const windowY = -daylightInnerRadius * 0.06;
  const windowLayout = getTimeWheelWindowLayout(daylightInnerRadius, windowWidth);

  context.save();
  context.beginPath();
  roundedRectPath(
    context,
    -windowWidth / 2,
    windowY - windowHeight / 2,
    windowWidth,
    windowHeight,
    18
  );
  context.clip();
  drawDaylightWindowPreview(context, cycle, daylightOuterRadius, daylightInnerRadius);
  context.restore();

  context.strokeStyle = 'rgba(255,255,255,0.22)';
  context.lineWidth = 3;
  roundedRectPath(
    context,
    -windowWidth / 2,
    windowY - windowHeight / 2,
    windowWidth,
    windowHeight,
    18
  );
  context.stroke();

  context.fillStyle = '#ecf4f7';
  context.font = '600 14px Trebuchet MS';
  context.textAlign = 'center';
  context.fillText(formatCycleTime(cycle.dayProgress), 0, windowLayout.timeY);
  drawConstellationGlyph(
    context,
    cycle.activeConstellation,
    windowLayout.constellationGlyphX,
    windowLayout.constellationGlyphY,
    28,
    20,
    cycle.activeConstellation?.symbolRotation ?? 0
  );
  context.fillStyle = '#dce8f5';
  context.font = '600 11px Trebuchet MS';
  context.textAlign = 'left';
  context.fillText(
    cycle.activeConstellation?.name ?? 'Unknown',
    windowLayout.constellationNameX,
    windowLayout.constellationNameY
  );
  context.fillStyle = '#dfe9ff';
  context.font = '600 12px Trebuchet MS';
  context.fillText(
    getMoonPhaseSymbol(cycle.moonPhaseIndex),
    windowLayout.moonPhaseSymbolX,
    windowLayout.moonPhaseSymbolY
  );
  context.fillStyle = '#9fb4c7';
  context.font = '11px Trebuchet MS';
  context.fillText(
    getMoonPhaseLabel(cycle.moonPhaseIndex),
    windowLayout.moonPhaseLabelX,
    windowLayout.moonPhaseLabelY
  );
  context.restore();
}

function drawConstellationRing(
  context: CanvasRenderingContext2D,
  ringEntries: ReturnType<typeof getTimeWheelConstellationEntries>,
  cycle: DaylightCycleLike,
  innerRadius: number,
  outerRadius: number
) {
  const segmentSize = (Math.PI * 2) / Math.max(1, ringEntries.length);

  drawCelestialRingStars(context, innerRadius, outerRadius);

  ringEntries.forEach((entry, index) => {
    const segmentCenter = (index / ringEntries.length) * Math.PI * 2 - Math.PI / 2;
    const startAngle = segmentCenter - segmentSize * 0.5;
    const endAngle = segmentCenter + segmentSize * 0.5;
    context.fillStyle = 'rgba(39, 61, 92, 0.72)';
    context.beginPath();
    context.arc(0, 0, outerRadius, startAngle, endAngle);
    context.arc(0, 0, innerRadius, endAngle, startAngle, true);
    context.closePath();
    context.fill();

    if (entry.isActive) {
      context.strokeStyle = 'rgba(220, 238, 255, 0.62)';
      context.lineWidth = 2.4;
      context.beginPath();
      context.arc(
        0,
        0,
        outerRadius - 4,
        startAngle + 0.05,
        endAngle - 0.05
      );
      context.stroke();
    }

    context.strokeStyle = 'rgba(183, 214, 255, 0.28)';
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(Math.cos(startAngle) * innerRadius, Math.sin(startAngle) * innerRadius);
    context.lineTo(Math.cos(startAngle) * outerRadius, Math.sin(startAngle) * outerRadius);
    context.stroke();
    if (index === ringEntries.length - 1) {
      context.beginPath();
      context.moveTo(Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius);
      context.lineTo(Math.cos(endAngle) * outerRadius, Math.sin(endAngle) * outerRadius);
      context.stroke();
    }

    context.save();
    context.rotate(entry.angle);
    context.translate(0, -((innerRadius + outerRadius) * 0.5));
    drawConstellationGlyph(
      context,
      cycle.constellations[entry.index],
      0,
      1,
      outerRadius - innerRadius - 10,
      20,
      cycle.constellations[entry.index]?.symbolRotation ?? 0
    );
    context.restore();
  });
}

function drawDaylightRing(
  context: CanvasRenderingContext2D,
  cycle: DaylightCycleLike,
  outerRadius: number,
  innerRadius: number
) {
  drawDaylightBand(context, cycle, outerRadius, innerRadius, true);
}

function drawDaylightWindowPreview(
  context: CanvasRenderingContext2D,
  cycle: DaylightCycleLike,
  outerRadius: number,
  innerRadius: number
) {
  drawDaylightBand(context, cycle, outerRadius, innerRadius, false);
}

function drawDaylightBand(
  context: CanvasRenderingContext2D,
  cycle: DaylightCycleLike,
  outerRadius: number,
  innerRadius: number,
  includeBodies: boolean
) {
  const { dawnAngle, duskAngle, dayCenterAngle, nightCenterAngle } =
    getDaylightRingLayout(cycle);
  const ringGradient = context.createLinearGradient(0, -outerRadius, 0, outerRadius);
  ringGradient.addColorStop(0, '#3b4f73');
  ringGradient.addColorStop(1, '#07111d');
  context.fillStyle = ringGradient;
  context.beginPath();
  context.arc(0, 0, outerRadius, 0, Math.PI * 2);
  context.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
  context.closePath();
  context.fill();

  drawNightRingStars(context, cycle, innerRadius, outerRadius, dawnAngle, duskAngle);
  const daylightGradient = context.createRadialGradient(0, 0, innerRadius, 0, 0, outerRadius);
  daylightGradient.addColorStop(0, '#dff4ff');
  daylightGradient.addColorStop(0.5, '#9fd8ff');
  daylightGradient.addColorStop(1, '#6eb9f4');
  context.fillStyle = daylightGradient;
  context.beginPath();
  context.arc(0, 0, outerRadius, dawnAngle, duskAngle);
  context.arc(0, 0, innerRadius, duskAngle, dawnAngle, true);
  context.closePath();
  context.fill();
  drawNoonSkyBlend(context, cycle, innerRadius, outerRadius);
  drawDayRingClouds(context, cycle, innerRadius, outerRadius, dawnAngle, duskAngle);
  drawDayNightTransitionBlend(context, outerRadius, innerRadius, dawnAngle, '#ffe6bf');
  drawDayNightTransitionBlend(context, outerRadius, innerRadius, duskAngle, '#ffb37a');

  drawDayNightDividerGlow(context, outerRadius, innerRadius, dawnAngle, '#ffe6b8');
  drawDayNightDividerGlow(context, outerRadius, innerRadius, duskAngle, '#f7b98a');
  drawDayNightDividerMark(context, outerRadius, innerRadius, dawnAngle);
  drawDayNightDividerMark(context, outerRadius, innerRadius, duskAngle);

  if (!includeBodies) {
    return;
  }

  const moonRadius = (innerRadius + outerRadius) * 0.5;
  drawMoonPhaseGlyph(
    context,
    Math.cos(nightCenterAngle) * moonRadius,
    Math.sin(nightCenterAngle) * moonRadius,
    8.5,
    cycle.moonPhaseIndex,
    false,
    cycle.moonIllumination,
    {
      x: Math.cos(-Math.PI / 2) * outerRadius,
      y: Math.sin(-Math.PI / 2) * outerRadius,
    }
  );

  const sunRadius = (innerRadius + outerRadius) * 0.5;
  const sunX = Math.cos(dayCenterAngle) * sunRadius;
  const sunY = Math.sin(dayCenterAngle) * sunRadius;
  context.fillStyle = 'rgba(255, 222, 142, 0.34)';
  context.beginPath();
  context.arc(sunX, sunY, 12, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ffd061';
  context.beginPath();
  context.arc(sunX, sunY, 6.5, 0, Math.PI * 2);
  context.fill();
}

function drawMoonRing(
  context: CanvasRenderingContext2D,
  cycle: DaylightCycleLike,
  innerRadius: number,
  outerRadius: number
) {
  context.fillStyle = 'rgba(25, 42, 76, 0.5)';
  context.beginPath();
  context.arc(0, 0, outerRadius, 0, Math.PI * 2);
  context.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
  context.closePath();
  context.fill();

  for (let phase = 0; phase < 8; phase += 1) {
    const angle = (phase / 8) * Math.PI * 2 - Math.PI / 2;
    const radius = (innerRadius + outerRadius) * 0.5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    drawMoonPhaseGlyph(
      context,
      x,
      y,
      7,
      phase,
      phase === cycle.moonPhaseIndex,
      [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25][phase],
      {
        x: 0,
        y: -(outerRadius + 14),
      }
    );
  }
}

function drawMoonPhaseGlyph(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  phase: number,
  isActive: boolean,
  illumination = [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25][phase] ?? 0,
  lightSource = { x: 0, y: -1 }
) {
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = isActive ? '#f2f7ff' : 'rgba(214, 228, 248, 0.86)';
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();

  const lightVectorX = lightSource.x - x;
  const lightVectorY = lightSource.y - y;
  const lightLength = Math.hypot(lightVectorX, lightVectorY) || 1;
  const shadowOffset = (1 - illumination) * radius * 0.88;
  context.fillStyle = '#09111a';
  context.beginPath();
  context.arc(
    x - (lightVectorX / lightLength) * shadowOffset,
    y - (lightVectorY / lightLength) * shadowOffset,
    radius - 1,
    0,
    Math.PI * 2
  );
  context.fill();
  context.restore();

  if (isActive) {
    context.strokeStyle = 'rgba(8, 16, 25, 0.7)';
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(x, y, radius + 1, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawConstellationGlyph(
  context: CanvasRenderingContext2D,
  constellation: DaylightCycleLike['constellations'][number],
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotation = 0
) {
  if (!constellation) {
    return;
  }

  context.save();
  context.translate(centerX, centerY);
  context.rotate(rotation);
  context.strokeStyle = 'rgba(171, 205, 255, 0.48)';
  context.lineWidth = 1;
  constellation.connections.forEach(([startIndex, endIndex]) => {
    const start = constellation.stars[startIndex];
    const end = constellation.stars[endIndex];
    if (!start || !end) {
      return;
    }
    context.beginPath();
    context.moveTo((start.x - 0.5) * width, (start.y - 0.5) * height);
    context.lineTo((end.x - 0.5) * width, (end.y - 0.5) * height);
    context.stroke();
  });
  constellation.stars.forEach((star) => {
    context.fillStyle = `rgba(243, 249, 255, ${0.5 + star.brightness * 0.45})`;
    context.beginPath();
    context.arc(
      (star.x - 0.5) * width,
      (star.y - 0.5) * height,
      0.9 + star.brightness * 1.1,
      0,
      Math.PI * 2
    );
    context.fill();
  });
  context.restore();
}

function drawTopMarker(
  context: CanvasRenderingContext2D,
  radius: number,
  color: string,
  pointDown = false
) {
  context.save();
  context.translate(0, -radius);
  if (pointDown) {
    context.strokeStyle = 'rgba(5, 8, 12, 0.9)';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, 10);
    context.lineTo(7, -4);
    context.lineTo(-7, -4);
    context.closePath();
    context.stroke();
  }
  context.fillStyle = color;
  context.beginPath();
  if (pointDown) {
    context.moveTo(0, 10);
    context.lineTo(7, -4);
    context.lineTo(-7, -4);
  } else {
    context.moveTo(0, -8);
    context.lineTo(7, 6);
    context.lineTo(-7, 6);
  }
  context.closePath();
  context.fill();
  context.restore();
}

function drawDayNightDividerGlow(
  context: CanvasRenderingContext2D,
  outerRadius: number,
  innerRadius: number,
  angle: number,
  color: string
) {
  context.save();
  context.rotate(angle);
  const feather = context.createLinearGradient(0, -outerRadius, 0, -innerRadius);
  feather.addColorStop(0, 'rgba(0, 0, 0, 0)');
  feather.addColorStop(0.2, 'rgba(255, 255, 255, 0.03)');
  feather.addColorStop(0.5, color);
  feather.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = feather;
  context.beginPath();
  context.moveTo(-24, -outerRadius);
  context.lineTo(24, -outerRadius);
  context.lineTo(34, -innerRadius);
  context.lineTo(-34, -innerRadius);
  context.closePath();
  context.globalAlpha = 0.3;
  context.fill();
  context.restore();
}

function drawDayNightTransitionBlend(
  context: CanvasRenderingContext2D,
  outerRadius: number,
  innerRadius: number,
  angle: number,
  color: string
) {
  context.save();
  context.rotate(angle);
  const feather = context.createLinearGradient(-34, 0, 34, 0);
  feather.addColorStop(0, 'rgba(255, 255, 255, 0)');
  feather.addColorStop(0.24, 'rgba(255, 255, 255, 0.08)');
  feather.addColorStop(0.5, color);
  feather.addColorStop(0.76, 'rgba(255, 255, 255, 0.08)');
  feather.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.globalAlpha = 0.22;
  context.fillStyle = feather;
  context.beginPath();
  context.moveTo(-34, -outerRadius);
  context.lineTo(34, -outerRadius);
  context.lineTo(46, -innerRadius);
  context.lineTo(-46, -innerRadius);
  context.closePath();
  context.fill();
  context.restore();
}

function drawDayNightDividerMark(
  context: CanvasRenderingContext2D,
  outerRadius: number,
  innerRadius: number,
  angle: number
) {
  context.save();
  context.rotate(angle);
  context.strokeStyle = 'rgba(4, 8, 14, 0.9)';
  context.lineWidth = 2.4;
  context.beginPath();
  context.moveTo(0, -outerRadius + 2);
  context.lineTo(0, -innerRadius - 2);
  context.stroke();
  context.restore();
}

function drawNightRingStars(
  context: CanvasRenderingContext2D,
  cycle: DaylightCycleLike,
  innerRadius: number,
  outerRadius: number,
  dawnAngle: number,
  duskAngle: number
) {
  getNightRingStars(innerRadius, outerRadius, dawnAngle, duskAngle).forEach((star) => {
    const x = Math.cos(star.angle) * star.radius;
    const y = Math.sin(star.angle) * star.radius;
    context.fillStyle = star.color;
    context.beginPath();
    context.arc(x, y, star.size, 0, Math.PI * 2);
    context.fill();
  });
}

function drawCelestialRingStars(
  context: CanvasRenderingContext2D,
  innerRadius: number,
  outerRadius: number
) {
  getCelestialRingStars(innerRadius, outerRadius).forEach((star) => {
    context.fillStyle = star.color;
    context.beginPath();
    context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    context.fill();
  });
}

function drawDayRingClouds(
  context: CanvasRenderingContext2D,
  cycle: DaylightCycleLike,
  innerRadius: number,
  outerRadius: number,
  dawnAngle: number,
  duskAngle: number
) {
  const radius = (innerRadius + outerRadius) * 0.5;
  const cloudCenters = [0.2, 0.46, 0.72];
  cloudCenters.forEach((progress, index) => {
    const angle = dawnAngle + (duskAngle - dawnAngle) * progress;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const puff = 4.5 + index;
    context.save();
    context.globalAlpha = 0.34 + cycle.daylight * 0.22;
    context.fillStyle = 'rgba(245, 250, 255, 0.85)';
    context.beginPath();
    context.arc(x - puff, y + 1, puff, 0, Math.PI * 2);
    context.arc(x, y - 2, puff * 1.12, 0, Math.PI * 2);
    context.arc(x + puff, y + 1, puff * 0.92, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawNoonSkyBlend(
  context: CanvasRenderingContext2D,
  cycle: DaylightCycleLike,
  innerRadius: number,
  outerRadius: number
) {
  const { dayCenterAngle } = getDaylightRingLayout(cycle);
  const centerRadius = (innerRadius + outerRadius) * 0.5;
  const centerX = Math.cos(dayCenterAngle) * centerRadius;
  const centerY = Math.sin(dayCenterAngle) * centerRadius;
  const skyBlend = context.createRadialGradient(
    centerX,
    centerY,
    2,
    centerX,
    centerY,
    Math.max(24, outerRadius - innerRadius + 18)
  );
  skyBlend.addColorStop(0, 'rgba(110, 198, 255, 0.58)');
  skyBlend.addColorStop(0.34, 'rgba(128, 210, 255, 0.5)');
  skyBlend.addColorStop(0.74, 'rgba(128, 210, 255, 0.22)');
  skyBlend.addColorStop(1, 'rgba(132, 206, 255, 0)');
  context.save();
  context.fillStyle = skyBlend;
  context.beginPath();
  context.arc(0, 0, outerRadius, 0, Math.PI * 2);
  context.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
  context.closePath();
  context.fill();
  context.restore();
}

function pseudoRandom(seed: number, offset: number) {
  return ((Math.sin(seed + offset) + 1) * 0.5) % 1;
}

function formatCycleTime(dayProgress: number) {
  const totalMinutes = Math.floor(dayProgress * 24 * 60);
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
