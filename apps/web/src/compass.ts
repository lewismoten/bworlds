export function easeAngle(current: number, target: number, factor: number) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * factor;
}

export function drawCompassDial(
  canvas: HTMLCanvasElement | null,
  facingAngle: number
) {
  const context = canvas?.getContext('2d');
  if (!canvas || !context) {
    return;
  }

  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.38;

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
    { label: 'N', angle: -Math.PI / 2, color: '#55d6be' },
    { label: 'E', angle: 0, color: '#dbe9ff' },
    { label: 'S', angle: Math.PI / 2, color: '#dbe9ff' },
    { label: 'W', angle: Math.PI, color: '#dbe9ff' },
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

  context.save();
  context.rotate(facingAngle - Math.PI / 2);
  context.fillStyle = '#d54343';
  context.beginPath();
  context.moveTo(0, -radius + 24);
  context.lineTo(10, 10);
  context.lineTo(0, 2);
  context.lineTo(-10, 10);
  context.closePath();
  context.fill();

  context.fillStyle = '#0b1016';
  context.beginPath();
  context.moveTo(0, radius - 24);
  context.lineTo(8, -6);
  context.lineTo(0, 8);
  context.lineTo(-8, -6);
  context.closePath();
  context.fill();
  context.restore();

  context.fillStyle = '#dce8f5';
  context.font = '600 14px Trebuchet MS';
  context.fillText('North settles at the top', 0, radius + 28);
  context.restore();
}
