export type MovementIntent = {
  turnLeft: boolean;
  turnRight: boolean;
  moveForward: boolean;
  moveBackward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
};

export function getMovementIntent(keys: Iterable<string>): MovementIntent {
  const pressed = new Set(keys);
  const shiftHeld = pressed.has('Shift');
  const leftPressed = pressed.has('ArrowLeft') || pressed.has('a');
  const rightPressed = pressed.has('ArrowRight') || pressed.has('d');

  return {
    turnLeft: leftPressed && !shiftHeld,
    turnRight: rightPressed && !shiftHeld,
    moveForward: pressed.has('ArrowUp') || pressed.has('w'),
    moveBackward: pressed.has('ArrowDown') || pressed.has('s'),
    strafeLeft: leftPressed && shiftHeld,
    strafeRight: rightPressed && shiftHeld,
  };
}
