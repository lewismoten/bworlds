import { describe, expect, it } from 'vitest';
import { buildWorkspaceAliases } from './vite.workspace.ts';

describe('workspace aliases', () => {
  it('discovers bworlds workspace packages from package metadata', () => {
    const aliases = buildWorkspaceAliases();

    expect(aliases['@bworlds/app']).toMatch(/apps\/web\/src\/main\.ts$/);
    expect(aliases['@bworlds/worldgen']).toMatch(
      /packages\/worldgen\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/tile-interior']).toMatch(
      /packages\/tile-interior\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/tile-plains']).toMatch(
      /packages\/tile-plains\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/poi-support']).toMatch(
      /packages\/poi-support\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/paint-support']).toMatch(
      /packages\/paint-support\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/overworld-support']).toMatch(
      /packages\/overworld-support\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/map-support']).toMatch(
      /packages\/map-support\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/tile-support']).toMatch(
      /packages\/tile-support\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/content-pack-frontier']).toMatch(
      /packages\/content-pack-frontier\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/content-pack-ruins']).toMatch(
      /packages\/content-pack-ruins\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/runtime-overworld-anchors']).toMatch(
      /packages\/runtime-overworld-anchors\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/runtime-start-region']).toMatch(
      /packages\/runtime-start-region\/src\/index\.ts$/
    );
    expect(aliases['@bworlds/tile-ruins']).toMatch(
      /packages\/tile-ruins\/src\/index\.ts$/
    );
  });

  it('keeps pace with the current workspace package count', () => {
    const aliases = buildWorkspaceAliases();
    const packageAliases = Object.keys(aliases).filter((alias) =>
      alias.startsWith('@bworlds/')
    );

    expect(packageAliases.length).toBe(37);
  });
});
