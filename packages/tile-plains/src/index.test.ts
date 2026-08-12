import { describe, expect, it } from 'vitest';

import { createPlainsTilePlugin } from './index.ts';

function getPlainsTile() {
  const tile = createPlainsTilePlugin().tiles?.find(
    (entry) => entry.kind === 'plains'
  );
  expect(tile).toBeDefined();
  return tile!;
}

describe('tile plains', () => {
  it('relies on the renderer shared floor instead of creating a plains plugin model', () => {
    const tile = getPlainsTile();

    expect(tile.create3DModel).toBeUndefined();
    expect(tile.create3DModelProgressive).toBeUndefined();
  });
});
