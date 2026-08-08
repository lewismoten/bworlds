import type { getDaylightCycleState } from '@bworlds/core';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;

export function getTimeWheelConstellationEntries(cycle: DaylightCycleLike) {
  const ring = cycle.celestialRing ?? [];
  return ring.map((entry, index) => ({
    name: entry.name,
    index,
    angle: entry.sunriseAzimuth - Math.PI / 2,
    isActive: index === cycle.activeConstellationIndex,
  }));
}

export function getCelestialDateLabel(cycle: DaylightCycleLike) {
  return cycle.calendar?.label ?? `${cycle.activeConstellation?.name ?? 'Unknown'} / ${cycle.moonPhaseName}`;
}

export function drawTimeWheel(canvas: HTMLCanvasElement | null, cycle: DaylightCycleLike) {
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    return;
  }

  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) * 0.36;
  const constellationOuterRadius = outerRadius * 1.45;
  const constellationInnerRadius = outerRadius * 1.13;
  const innerRadius = outerRadius * 0.56;
  const wheelRotation = -cycle.dayProgress * Math.PI * 2;
  const ringEntries = getTimeWheelConstellationEntries(cycle);
  const windowGradient = context.createLinearGradient(0, -outerRadius, 0, outerRadius);
  windowGradient.addColorStop(0, '#9fe1ff');
  windowGradient.addColorStop(0.45, '#ffe3a2');
  windowGradient.addColorStop(0.52, '#10203a');
  windowGradient.addColorStop(1, '#07111d');

  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(centerX, centerY);

  const halo = context.createRadialGradient(0, 0, innerRadius * 0.2, 0, 0, outerRadius * 1.15);
  halo.addColorStop(0, 'rgba(255, 191, 105, 0.12)');
  halo.addColorStop(1, 'rgba(85, 214, 190, 0)');
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, outerRadius * 1.15, 0, Math.PI * 2);
  context.fill();

  context.save();
  drawConstellationRing(
    context,
    ringEntries,
    cycle,
    constellationInnerRadius,
    constellationOuterRadius
  );
  context.restore();

  context.rotate(wheelRotation);

  drawDaylightRing(context, cycle, outerRadius, innerRadius);

  for (let hour = 0; hour < 24; hour += 1) {
    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
    const tickOuter = outerRadius + (hour % 6 === 0 ? 6 : 2);
    const tickInner = outerRadius - (hour % 6 === 0 ? 16 : 9);
    context.strokeStyle =
      hour < 12 ? 'rgba(255,255,255,0.5)' : 'rgba(159,196,255,0.4)';
    context.lineWidth = hour % 6 === 0 ? 2 : 1;
    context.beginPath();
    context.moveTo(Math.cos(angle) * tickInner, Math.sin(angle) * tickInner);
    context.lineTo(Math.cos(angle) * tickOuter, Math.sin(angle) * tickOuter);
    context.stroke();
  }

  const sunAngle = cycle.sunriseAzimuth - Math.PI / 2;
  context.fillStyle = '#ffcf6b';
  context.beginPath();
  context.arc(
    Math.cos(sunAngle) * ((outerRadius + innerRadius) * 0.5),
    Math.sin(sunAngle) * ((outerRadius + innerRadius) * 0.5),
    11,
    0,
    Math.PI * 2
  );
  context.fill();
  context.fillStyle = 'rgba(255, 245, 196, 0.4)';
  context.beginPath();
  context.arc(
    Math.cos(sunAngle) * ((outerRadius + innerRadius) * 0.5),
    Math.sin(sunAngle) * ((outerRadius + innerRadius) * 0.5),
    18,
    0,
    Math.PI * 2
  );
  context.fill();

  const moonAngle = cycle.sunsetAzimuth - Math.PI / 2;
  context.fillStyle = '#d9e8ff';
  context.beginPath();
  context.arc(
    Math.cos(moonAngle) * ((outerRadius + innerRadius) * 0.5),
    Math.sin(moonAngle) * ((outerRadius + innerRadius) * 0.5),
    9,
    0,
    Math.PI * 2
  );
  context.fill();
  context.fillStyle = '#09111a';
  context.beginPath();
  context.arc(
    Math.cos(moonAngle) * ((outerRadius + innerRadius) * 0.5) + (1 - cycle.moonIllumination) * 7,
    Math.sin(moonAngle) * ((outerRadius + innerRadius) * 0.5),
    8,
    0,
    Math.PI * 2
  );
  context.fill();

  context.restore();

  context.fillStyle = '#081019';
  context.beginPath();
  context.arc(0, 0, innerRadius - 3, 0, Math.PI * 2);
  context.fill();

  const windowWidth = innerRadius * 1.15;
  const windowHeight = innerRadius * 0.52;
  const windowY = -innerRadius * 0.2;

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
  context.rotate(wheelRotation);
  context.fillStyle = windowGradient;
  context.beginPath();
  context.arc(0, 0, outerRadius, 0, Math.PI * 2);
  context.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
  context.closePath();
  context.fill();
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
  context.fillText(formatCycleTime(cycle.dayProgress), 0, innerRadius * 0.12);
  context.fillStyle = '#96afb8';
  context.font = '11px Trebuchet MS';
  context.fillText(getCelestialDateLabel(cycle), 0, innerRadius * 0.32);
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

  ringEntries.forEach((entry) => {
    const centerAngle = entry.angle;
    const startAngle = centerAngle - segmentSize * 0.5;
    const endAngle = centerAngle + segmentSize * 0.5;
    context.fillStyle = entry.isActive
      ? 'rgba(215, 237, 255, 0.26)'
      : 'rgba(73, 102, 145, 0.36)';
    context.beginPath();
    context.arc(0, 0, outerRadius, startAngle, endAngle);
    context.arc(0, 0, innerRadius, endAngle, startAngle, true);
    context.closePath();
    context.fill();

    context.strokeStyle = 'rgba(183, 214, 255, 0.22)';
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(0, 0, outerRadius, startAngle, endAngle);
    context.stroke();

    context.save();
    context.rotate(centerAngle);
    context.translate(0, -((innerRadius + outerRadius) * 0.5));
    context.fillStyle = entry.isActive ? '#f5fbff' : 'rgba(206, 220, 235, 0.86)';
    context.font = entry.isActive ? '600 11px Trebuchet MS' : '10px Trebuchet MS';
    context.textAlign = 'center';
    context.fillText(entry.name, 0, -4);

    if (entry.isActive) {
      context.fillStyle = '#ffcf6b';
      context.beginPath();
      context.arc(0, 12, 4, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  });

  const activeAngle = (cycle.activeConstellation?.daylightBias ?? 0) * 0 + cycle.sunriseAzimuth - Math.PI / 2;
  context.strokeStyle = 'rgba(255, 208, 112, 0.4)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(Math.cos(activeAngle) * innerRadius, Math.sin(activeAngle) * innerRadius);
  context.lineTo(Math.cos(activeAngle) * outerRadius, Math.sin(activeAngle) * outerRadius);
  context.stroke();
}

function drawDaylightRing(
  context: CanvasRenderingContext2D,
  cycle: DaylightCycleLike,
  outerRadius: number,
  innerRadius: number
) {
  const ringGradient = context.createLinearGradient(0, -outerRadius, 0, outerRadius);
  ringGradient.addColorStop(0, '#3b4f73');
  ringGradient.addColorStop(1, '#07111d');
  context.fillStyle = ringGradient;
  context.beginPath();
  context.arc(0, 0, outerRadius, 0, Math.PI * 2);
  context.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
  context.closePath();
  context.fill();

  const dawnAngle = cycle.sunriseProgress * Math.PI * 2 - Math.PI / 2;
  const duskAngle = cycle.sunsetProgress * Math.PI * 2 - Math.PI / 2;
  const daylightGradient = context.createLinearGradient(0, -outerRadius, 0, outerRadius);
  daylightGradient.addColorStop(0, '#9fe1ff');
  daylightGradient.addColorStop(0.5, '#ffe3a2');
  daylightGradient.addColorStop(1, '#f39a63');
  context.fillStyle = daylightGradient;
  context.beginPath();
  context.arc(0, 0, outerRadius, dawnAngle, duskAngle);
  context.arc(0, 0, innerRadius, duskAngle, dawnAngle, true);
  context.closePath();
  context.fill();
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
