# Development

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Install

```bash
npm install
```

## Useful scripts

```bash
npm run dev
npm run build
npm run lint
npm run lint:fix
npm run test
npm run coverage
npm run format
```

## Working model

- The app lives in `apps/web`
- Shared logic is kept in `packages/*`
- Tests run with Vitest from the repository root
- Coverage is generated with V8 coverage and written to `coverage/`
- Linting is handled with ESLint
- Formatting is handled with Prettier

## Next suggested milestones

1. Replace color-only tile definitions with authored sprites and 3D meshes.
2. Add a save system keyed by world seed and player GPS position.
3. Introduce NPCs, encounter systems, and quest/event plugins.
4. Split plugin loading into first-party and third-party plugin packages.
