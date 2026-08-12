# Multiplayer Minigames

## Match Model

- [ ] Give every match a stable server ID.
- [ ] Store the minigame plugin ID.
- [ ] Store match mode and rules.
- [ ] Store invited players.
- [ ] Store joined players.
- [ ] Store NPC slots.
- [ ] Store match state.
- [ ] Store server start time.
- [ ] Store server end time.

## Matchmaking

- [ ] Support private invite matches.
- [ ] Support public queue matches.
- [ ] Support friend groups later.
- [ ] Support NPC filling for empty slots.
- [ ] Support minimum and maximum player counts.
- [ ] Add queue timeout behavior.
- [ ] Allow players to leave before match start.

## Synchronization

- [ ] Choose server authority per minigame.
- [ ] Define input message formats.
- [ ] Define state snapshot formats.
- [ ] Define interpolation rules.
- [ ] Define correction rules.
- [ ] Add sequence numbers.
- [ ] Add server timestamps.
- [ ] Handle packet reordering.
- [ ] Handle reconnect windows.

## Racing

- [ ] Make checkpoints server-authoritative.
- [ ] Record lap order.
- [ ] Record checkpoint timestamps.
- [ ] Reject skipped checkpoints.
- [ ] Support NPC racers.
- [ ] Support live spectators.
- [ ] Publish sanitized race positions to the world.
- [ ] Use low-detail race environments for speed.
- [ ] Keep race physics separate from full world physics.

## Results

- [ ] Lock match results on the server.
- [ ] Award achievements after verification.
- [ ] Award skill points after verification.
- [ ] Update leaderboards after verification.
- [ ] Record disconnect and abandonment outcomes.
- [ ] Keep raw result data for dispute review.
