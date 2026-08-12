# Minigame Platform Master Roadmap

## Goal

Build a plugin platform for games that may be static, API-aware, world-aware,
multiplayer, or any combination of those modes.

## Priority 1: Contracts

- [ ] Complete `01-plugin-contract.md`.
- [ ] Define the client minigame plugin contract.
- [ ] Define the server minigame API contract.
- [ ] Define static-only minigame behavior.
- [ ] Define world-aware minigame behavior.
- [ ] Define multiplayer minigame behavior.
- [ ] Define versioned capability negotiation.
- [ ] Keep games isolated from core world internals.

## Priority 2: Identity

- [ ] Complete `02-auth-accounts.md`.
- [ ] Support anonymous play where a game allows it.
- [ ] Support local accounts.
- [ ] Support OpenID Connect login.
- [ ] Support Google login through OIDC.
- [ ] Support Facebook login through a provider adapter.
- [ ] Support optional passkeys.
- [ ] Support optional two-factor authentication.
- [ ] Support account linking without duplicate identities.

## Priority 3: API and Persistence

- [ ] Complete `03-game-api.md`.
- [ ] Build the PHP server API.
- [ ] Store authoritative data in MariaDB.
- [ ] Define achievement APIs.
- [ ] Define inventory APIs.
- [ ] Define skill reward APIs.
- [ ] Define minigame session APIs.
- [ ] Define world presence APIs.
- [ ] Define leaderboard APIs.
- [ ] Define multiplayer match APIs.

## Priority 4: Security

- [ ] Complete `04-security-anticheat.md`.
- [ ] Treat the browser as untrusted.
- [ ] Make reward decisions server-authoritative.
- [ ] Add replay protection.
- [ ] Add rate limits.
- [ ] Add score plausibility checks.
- [ ] Add audit logs for important reward events.
- [ ] Make static-only games unable to mint trusted rewards.

## Priority 5: Progression

- [ ] Complete `05-achievements-skills.md`.
- [ ] Build achievement definitions.
- [ ] Build skill point rewards.
- [ ] Let players assign earned points to characters.
- [ ] Separate minigame skill from character skill.
- [ ] Add daily and lifetime statistics.
- [ ] Add optional leaderboards.
- [ ] Prevent reward farming through simple refresh loops.

## Priority 6: World Integration

- [ ] Complete `06-world-integration.md`.
- [ ] Represent optional minigame activity in-world.
- [ ] Let games query limited world context.
- [ ] Let games report safe world events.
- [ ] Keep world simulation authoritative.
- [ ] Keep minigames replaceable and independently deployable.

## Priority 7: Multiplayer

- [ ] Complete `07-multiplayer.md`.
- [ ] Add match creation.
- [ ] Add invite and join flows.
- [ ] Add NPC fallback opponents.
- [ ] Add race synchronization.
- [ ] Add spectator feeds.
- [ ] Add reconnect handling.
- [ ] Add match result verification.

## Priority 8: Developer Experience

- [ ] Complete `08-sdk-ui.md`.
- [ ] Build a JavaScript minigame SDK.
- [ ] Build reusable UI controls.
- [ ] Consider Radix UI for accessible controls.
- [ ] Add a local mock API.
- [ ] Add a plugin test harness.
- [ ] Add sample games for each integration mode.

## Priority 9: Game Catalog

- [ ] Review `09-a-minigame-catalog.md`.
- [ ] Review `09-b-minigame-catalog.md`.
- [ ] Pick three first-party starter games.
- [ ] Build one fully static game.
- [ ] Build one API-aware solo game.
- [ ] Build one multiplayer world-aware game.

## Priority 10: Data and Release

- [ ] Complete `10-data-model.md`.
- [ ] Complete `11-testing-release.md`.
- [ ] Add schema migrations.
- [ ] Add plugin conformance tests.
- [ ] Add API compatibility tests.
