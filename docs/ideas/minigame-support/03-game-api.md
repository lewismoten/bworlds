# Game API

## API Shape

- [ ] Create a versioned PHP API namespace.
- [ ] Return JSON for minigame API calls.
- [ ] Use stable machine-readable error codes.
- [ ] Include request IDs in server errors.
- [ ] Keep API responses independent from HTML pages.
- [ ] Document every public minigame endpoint.

## Game Registration

- [ ] Add an endpoint to fetch game metadata.
- [ ] Add an endpoint to fetch game capabilities.
- [ ] Add an endpoint to fetch current API versions.
- [ ] Reject unsupported client API versions.
- [ ] Expose deprecation warnings to developers.

## Session API

- [ ] Add a minigame session start endpoint.
- [ ] Return a unique server session ID.
- [ ] Record the minigame plugin ID.
- [ ] Record the authenticated user ID.
- [ ] Record the selected character ID when relevant.
- [ ] Record the world context when relevant.
- [ ] Record start time on the server.
- [ ] Add a session heartbeat endpoint.
- [ ] Add a session completion endpoint.
- [ ] Add a session abandonment endpoint.

## Inventory API

- [ ] Add a read-only inventory query endpoint.
- [ ] Add a server-only inventory mutation service.
- [ ] Never trust a client inventory balance.
- [ ] Add inventory transaction IDs.
- [ ] Make inventory changes idempotent.
- [ ] Record the reason for every inventory mutation.
- [ ] Record the source minigame session ID.

## Skill API

- [ ] Add an endpoint to query unassigned skill points.
- [ ] Add an endpoint to query character skills.
- [ ] Add an endpoint to assign skill points.
- [ ] Validate point assignment on the server.
- [ ] Prevent negative skill balances.
- [ ] Record skill point transactions.
- [ ] Let games request rewards but not grant them.

## Achievement API

- [ ] Add an endpoint to query achievement definitions.
- [ ] Add an endpoint to query player achievements.
- [ ] Add an internal achievement progress service.
- [ ] Let games report achievement events.
- [ ] Validate achievement events on the server.
- [ ] Keep secret achievement rules server-side.

## World API

- [ ] Add an endpoint for limited local world context.
- [ ] Return immutable world snapshots.
- [ ] Return only data allowed by game capabilities.
- [ ] Add an endpoint for safe activity presence.
- [ ] Add an endpoint for approved world event requests.
- [ ] Never let a game directly mutate core world state.

## Leaderboards

- [ ] Add scoped leaderboard definitions.
- [ ] Support global leaderboards.
- [ ] Support seasonal leaderboards.
- [ ] Support friend leaderboards later.
- [ ] Store verified score records only.
- [ ] Keep rejected scores for anti-cheat review.
- [ ] Support leaderboard opt-out.

## MariaDB

- [ ] Create migrations for minigame tables.
- [ ] Add foreign keys where practical.
- [ ] Index player and game lookup columns.
- [ ] Index session status columns.
- [ ] Index leaderboard ranking columns.
- [ ] Keep append-only reward ledgers where useful.
