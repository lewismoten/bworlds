import { describe, expect, it } from 'vitest';
import { getMovementIntent } from './movement-input.ts';

describe('movement input', () => {
  it('maps arrow keys to forward movement and turning by default', () => {
    expect(getMovementIntent(['ArrowUp']).moveForward).toBe(true);
    expect(getMovementIntent(['ArrowLeft']).turnLeft).toBe(true);
    expect(getMovementIntent(['ArrowRight']).turnRight).toBe(true);
  });

  it('uses shift plus left and right arrows to strafe instead of turn', () => {
    const left = getMovementIntent(['Shift', 'ArrowLeft']);
    const right = getMovementIntent(['Shift', 'ArrowRight']);

    expect(left.strafeLeft).toBe(true);
    expect(left.turnLeft).toBe(false);
    expect(right.strafeRight).toBe(true);
    expect(right.turnRight).toBe(false);
  });

  it('supports wasd movement aliases', () => {
    const intent = getMovementIntent(['w', 'a', 's', 'd']);

    expect(intent.moveForward).toBe(true);
    expect(intent.moveBackward).toBe(true);
    expect(intent.turnLeft).toBe(true);
    expect(intent.turnRight).toBe(true);
  });
});
