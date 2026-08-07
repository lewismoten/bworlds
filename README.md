# bworlds

`bworlds` is a JavaScript npm-workspace monorepo for an infinite-feeling procedural world explorer that can switch between top-down 2D and immersive 3D views while sharing the same simulation state, tile language, and map generation rules.

The first bootstrap in this repository includes:

- A browser app with seamless 2D/3D view switching
- Deterministic overworld generation with GPS-style coordinates
- Procedural towns, caves, dungeons, buildings, and depth levels
- A plugin-friendly world generation pipeline
- Unit tests, coverage, Prettier, and developer docs

See [docs/development.md](docs/development.md) for setup and scripts, and [docs/architecture.md](docs/architecture.md) for the package layout.
