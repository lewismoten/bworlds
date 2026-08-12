# Security and Anti-Cheat

## Trust Model

- [ ] Treat all browser state as attacker-controlled.
- [ ] Treat all JavaScript timers as attacker-controlled.
- [ ] Treat submitted scores as claims, not facts.
- [ ] Make trusted rewards server-authoritative.
- [ ] Keep secret reward rules off the client.
- [ ] Document which game modes produce trusted rewards.

## Request Security

- [ ] Require TLS for authenticated API calls.
- [ ] Authenticate every protected API request.
- [ ] Require CSRF protection for cookie writes.
- [ ] Validate request content types.
- [ ] Validate every input field server-side.
- [ ] Enforce maximum request sizes.
- [ ] Add per-user API rate limits.
- [ ] Add per-IP abuse rate limits.
- [ ] Add endpoint-specific burst limits.

## Session Integrity

- [ ] Issue unpredictable minigame session IDs.
- [ ] Bind trusted results to a server session.
- [ ] Reject results for closed sessions.
- [ ] Reject results for expired sessions.
- [ ] Reject duplicate completion requests.
- [ ] Record server start and completion times.
- [ ] Track expected game mode and difficulty.
- [ ] Track declared client build versions.

## Replay Protection

- [ ] Add unique event IDs to reward requests.
- [ ] Reject reused event IDs.
- [ ] Add idempotency keys to critical writes.
- [ ] Add short-lived action tokens when useful.
- [ ] Bind action tokens to the player and game.
- [ ] Expire unused action tokens.

## Plausibility Checks

- [ ] Set minimum plausible completion times.
- [ ] Set maximum plausible score rates.
- [ ] Set maximum reward rates.
- [ ] Validate race checkpoint order.
- [ ] Validate impossible movement claims.
- [ ] Validate inventory consumption claims.
- [ ] Flag impossible skill gains.
- [ ] Flag repeated impossible perfect outcomes.
- [ ] Avoid banning from one heuristic alone.

## Deterministic Verification

- [ ] Let games submit a seed when useful.
- [ ] Let the server issue trusted challenge seeds.
- [ ] Record important player inputs when practical.
- [ ] Re-simulate cheap deterministic games server-side.
- [ ] Compare claimed results to verified results.
- [ ] Keep verification optional for low-value games.

## Multiplayer Anti-Cheat

- [ ] Make match state server-authoritative.
- [ ] Validate client input rates.
- [ ] Reject impossible position updates.
- [ ] Use checkpoints for racing.
- [ ] Keep hidden NPC state off clients where practical.
- [ ] Detect disconnect abuse.
- [ ] Detect collusive score farming where practical.

## Static Games

- [ ] Clearly mark local-only scores as unverified.
- [ ] Never trust localStorage as reward proof.
- [ ] Never trust IndexedDB as reward proof.
- [ ] Allow static games to have local achievements.
- [ ] Keep trusted account rewards disabled without API proof.

## Audit and Moderation

- [ ] Log trusted reward grants.
- [ ] Log rejected reward attempts.
- [ ] Log suspicious score submissions.
- [ ] Add an admin review view.
- [ ] Allow score invalidation.
- [ ] Allow leaderboard removal.
- [ ] Avoid exposing anti-cheat thresholds to clients.
