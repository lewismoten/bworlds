import type { getDaylightCycleState } from '@bworlds/core';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;

export function getTimeWheelConstellationEntries(cycle: DaylightCycleLike) {
  const constellations = cycle.constellations ?? [];
  return constellations.map((constellation, index) => ({
    name: constellation.name,
    index,
    angle: (index / Math.max(1, constellations.length)) * Math.PI * 2 - Math.PI / 2,
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
  const outerRadius = Math.min(width, height) * 0.43;
  const constellationRadius = outerRadius * 1.16;
  const innerRadius = outerRadius * 0.58;
  const wheelRotation = -cycle.dayProgress * Math.PI * 2;
  const ringEntries = getTimeWheelConstellationEntries(cycle);

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
  context.rotate(cycle.yearProgress * Math.PI * 2);
  context.strokeStyle = 'rgba(175, 215, 255, 0.28)';
  context.lineWidth = 10;
  context.beginPath();
  context.arc(0, 0, constellationRadius, 0, Math.PI * 2);
  context.stroke();

  ringEntries.forEach((entry) => {
    context.save();
    context.rotate(entry.angle);
    context.translate(0, -constellationRadius);
    context.fillStyle = entry.isActive ? '#f6f8ea' : 'rgba(190, 208, 222, 0.74)';
    context.font = entry.isActive ? '600 11px Trebuchet MS' : '10px Trebuchet MS';
    context.textAlign = 'center';
    context.fillText(entry.name, 0, -8);
    context.restore();
  });
  context.restore();

  context.save();
  context.rotate(wheelRotation);

  const ringGradient = context.createLinearGradient(0, -outerRadius, 0, outerRadius);
  ringGradient.addColorStop(0, '#7fd2ff');
  ringGradient.addColorStop(0.48, '#f5bf74');
  ringGradient.addColorStop(0.52, '#10203a');
  ringGradient.addColorStop(1, '#07111d');
  context.fillStyle = ringGradient;
  context.beginPath();
  context.arc(0, 0, outerRadius, 0, Math.PI * 2);
  context.arc(0, 0, innerRadius, Math.PI * 2, 0, true);
  context.closePath();
  context.fill();

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

  const sunAngle = Math.PI * 1.5;
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

  const moonAngle = Math.PI * 0.5;
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

  if (cycle.starsOpacity > 0.05) {
    context.fillStyle = `rgba(255,255,255,${0.18 + cycle.starsOpacity * 0.5})`;
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const radius = innerRadius * 0.78;
      context.fillRect(
        Math.cos(angle) * radius - 1,
        Math.sin(angle) * radius - 1,
        2,
        2
      );
    }
  }

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
  context.fillStyle = ringGradient;
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
