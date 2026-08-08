export function easeAngle(current: number, target: number, factor: number) {
  let delta = getCompassDelta(current, target);
  return current + delta * factor;
}

export function getCompassNeedleRotation(facingAngle: number) {
  return facingAngle + Math.PI / 2;
}

export function getCompassBezelRotation(headingAngle: number) {
  return headingAngle + Math.PI / 2;
}

export function getCompassHeadingDegrees(headingAngle: number) {
  return Math.round(
    (((headingAngle + Math.PI / 2) * 180) / Math.PI + 360) % 360
  );
}

export function formatCompassHeading(headingAngle: number | null) {
  if (typeof headingAngle !== 'number') {
    return 'No heading set';
  }
  const degrees = getCompassHeadingDegrees(headingAngle);
  return `Heading ${degrees.toString().padStart(3, '0')}°`;
}

export function getCompassHeadingLabelState(
  headingAngle: number,
  bezelRadius: number
) {
  const degrees = getCompassHeadingDegrees(headingAngle);
  const labelRadius = bezelRadius + 28;
  return {
    degrees,
    x: Math.cos(headingAngle) * labelRadius,
    y: Math.sin(headingAngle) * labelRadius,
  };
}

export function shouldToggleCompassHeading(
  currentHeadingAngle: number | null,
  nextHeadingAngle: number,
  thresholdRadians = Math.PI / 24
) {
  if (typeof currentHeadingAngle !== 'number') {
    return false;
  }
  return Math.abs(getCompassDelta(currentHeadingAngle, nextHeadingAngle)) <= thresholdRadians;
}

export function isCompassHeadingDragSignificant(
  startHeadingAngle: number,
  nextHeadingAngle: number,
  thresholdRadians = Math.PI / 90
) {
  return Math.abs(getCompassDelta(startHeadingAngle, nextHeadingAngle)) > thresholdRadians;
}

export function getCompassPalette() {
  return {
    northLabel: '#d54343',
    cardinalLabel: '#dbe9ff',
    bezelMarker: '#55d6be',
    northNeedle: '#d54343',
    southNeedle: '#f4f8ff',
    southNeedleOutline: '#0b1016',
  };
}

export function getCompassDelta(current: number, target: number) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export function getCompassWobbleBoost(current: number, target: number) {
  const delta = getCompassDelta(current, target);
  return Math.sign(delta) * Math.min(0.34, Math.abs(delta) * 0.16);
}

export function advanceCompassState(
  state: {
    angle: number;
    velocity: number;
    initialized: boolean;
  },
  target: number
) {
  if (!state.initialized) {
    return {
      angle: target,
      velocity: 0,
      initialized: true,
    };
  }

  const delta = getCompassDelta(state.angle, target);
  let velocity = state.velocity + delta * 0.082;
  velocity *= 0.76;
  let angle = state.angle + velocity;
  angle = easeAngle(angle, target, 0.07);
  if (Math.abs(delta) < 0.012 && Math.abs(velocity) < 0.003) {
    velocity *= 0.6;
  }
  return {
    angle,
    velocity,
    initialized: true,
  };
}

export function getCompassDialFacingAngle(
  pointX: number,
  pointY: number,
  centerX: number,
  centerY: number
) {
  return Math.atan2(pointY - centerY, pointX - centerX);
}

export function getCompassDialRadius(width: number, height: number) {
  return Math.min(width, height) * 0.38;
}

export function getCompassDialInteractionMode(
  pointX: number,
  pointY: number,
  centerX: number,
  centerY: number,
  radius: number
) {
  const distance = Math.hypot(pointX - centerX, pointY - centerY);
  if (distance > radius * 1.18) {
    return 'none';
  }
  return distance >= radius * 0.74 ? 'heading-bug' : 'facing';
}

export function drawCompassDial(
  canvas: HTMLCanvasElement | null,
  facingAngle: number,
  headingAngle: number | null = facingAngle
) {
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    return;
  }

  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = getCompassDialRadius(width, height);
  const bezelRadius = radius * 1.08;
  const palette = getCompassPalette();

  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(centerX, centerY);

  const halo = context.createRadialGradient(0, 0, radius * 0.18, 0, 0, radius * 1.22);
  halo.addColorStop(0, 'rgba(85, 214, 190, 0.18)');
  halo.addColorStop(1, 'rgba(8, 16, 25, 0)');
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, radius * 1.22, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#081019';
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();

  context.lineWidth = 8;
  context.strokeStyle = 'rgba(36, 59, 78, 0.92)';
  context.beginPath();
  context.arc(0, 0, bezelRadius, 0, Math.PI * 2);
  context.stroke();

  context.lineWidth = 2;
  context.strokeStyle = 'rgba(148, 190, 222, 0.32)';
  context.beginPath();
  context.arc(0, 0, bezelRadius, 0, Math.PI * 2);
  context.stroke();

  context.lineWidth = 2;
  context.strokeStyle = 'rgba(171, 205, 255, 0.28)';
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.stroke();

  for (let tick = 0; tick < 24; tick += 1) {
    const angle = (tick / 24) * Math.PI * 2 - Math.PI / 2;
    const outer = radius * 0.96;
    const inner = radius - (tick % 6 === 0 ? 18 : 10);
    context.strokeStyle =
      tick % 6 === 0
        ? 'rgba(220, 233, 255, 0.72)'
        : 'rgba(155, 179, 198, 0.38)';
    context.lineWidth = tick % 6 === 0 ? 2 : 1;
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.stroke();
  }

  const labels = [
    { label: 'N', angle: -Math.PI / 2, color: palette.northLabel },
    { label: 'E', angle: 0, color: palette.cardinalLabel },
    { label: 'S', angle: Math.PI / 2, color: palette.cardinalLabel },
    { label: 'W', angle: Math.PI, color: palette.cardinalLabel },
  ];

  context.font = '600 16px Trebuchet MS';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  labels.forEach(({ label, angle, color }) => {
    context.fillStyle = color;
    context.fillText(
      label,
      Math.cos(angle) * (radius - 28),
      Math.sin(angle) * (radius - 28)
    );
  });

  if (typeof headingAngle === 'number') {
    const headingLabel = getCompassHeadingLabelState(headingAngle, bezelRadius);
    context.save();
    context.rotate(getCompassBezelRotation(headingAngle));
    context.strokeStyle = 'rgba(85, 214, 190, 0.38)';
    context.lineWidth = 5;
    context.beginPath();
    context.arc(0, 0, bezelRadius, -Math.PI / 2 - 0.24, -Math.PI / 2 + 0.24);
    context.stroke();
    context.fillStyle = palette.bezelMarker;
    context.beginPath();
    context.moveTo(0, -bezelRadius - 8);
    context.lineTo(10, -bezelRadius + 5);
    context.lineTo(-10, -bezelRadius + 5);
    context.closePath();
    context.fill();
    context.restore();

    context.fillStyle = 'rgba(8, 16, 25, 0.92)';
    context.beginPath();
    context.arc(headingLabel.x, headingLabel.y, 18, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(85, 214, 190, 0.55)';
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = '#dce8f5';
    context.font = '700 11px Trebuchet MS';
    context.fillText(
      `${headingLabel.degrees.toString().padStart(3, '0')}°`,
      headingLabel.x,
      headingLabel.y
    );
  }

  context.save();
  context.rotate(getCompassNeedleRotation(facingAngle));
  context.fillStyle = palette.northNeedle;
  context.beginPath();
  context.moveTo(0, -radius + 24);
  context.lineTo(10, 10);
  context.lineTo(0, 2);
  context.lineTo(-10, 10);
  context.closePath();
  context.fill();

  context.fillStyle = palette.southNeedle;
  context.beginPath();
  context.moveTo(0, radius - 24);
  context.lineTo(8, -6);
  context.lineTo(0, 8);
  context.lineTo(-8, -6);
  context.closePath();
  context.fill();
  context.strokeStyle = palette.southNeedleOutline;
  context.lineWidth = 1.6;
  context.stroke();
  context.restore();

  context.fillStyle = '#dce8f5';
  context.font = '600 14px Trebuchet MS';
  context.fillText(formatCompassHeading(headingAngle), 0, radius + 18);
  context.fillStyle = '#9bb3c6';
  context.font = '600 12px Trebuchet MS';
  context.fillText(
    'Click center to face, outer bezel to mark or clear a heading',
    0,
    radius + 36
  );
  context.restore();
}
