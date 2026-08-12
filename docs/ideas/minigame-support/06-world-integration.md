# World Integration

## World Presence

- [ ] Let a minigame declare an optional world activity.
- [ ] Represent fishing players as fishing when practical.
- [ ] Represent racers in world race areas when practical.
- [ ] Represent builders near a planning site when practical.
- [ ] Keep presence cosmetic unless explicitly authoritative.
- [ ] Let players hide some public activity status.

## World Context

- [ ] Let games request a limited world context snapshot.
- [ ] Include nearby settlement ID when allowed.
- [ ] Include nearby water ID when allowed.
- [ ] Include local weather when useful.
- [ ] Include local time and season when useful.
- [ ] Include local route data when useful.
- [ ] Include local race course data when useful.
- [ ] Exclude hidden world information.

## Game-to-World Events

- [ ] Define approved event types a game may request.
- [ ] Let fishing request inventory reward evaluation.
- [ ] Let building submit planning proposals.
- [ ] Let trading submit route completion results.
- [ ] Let racing submit verified race results.
- [ ] Let tower defense submit defense results.
- [ ] Validate every event in the world service.
- [ ] Keep core world mutation outside game JavaScript.

## World-to-Game Events

- [ ] Let weather influence suitable games.
- [ ] Let time of day influence suitable games.
- [ ] Let season influence suitable games.
- [ ] Let settlement state influence suitable games.
- [ ] Let local inventory influence suitable games.
- [ ] Let nearby world events influence suitable games.
- [ ] Keep games functional when world data is unavailable.

## Spectators

- [ ] Expose sanitized live activity for spectators.
- [ ] Let the main world show race progress.
- [ ] Let the main world show tournament status.
- [ ] Let the main world show active fishing status.
- [ ] Rate-limit spectator update feeds.
- [ ] Avoid leaking private player data.
