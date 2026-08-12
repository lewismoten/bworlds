# Minigame Plugin Contract

## Core Manifest

- [ ] Give every minigame a stable plugin ID.
- [ ] Give every minigame a semantic version.
- [ ] Give every minigame a display name.
- [ ] Give every minigame a short description.
- [ ] Declare supported player counts.
- [ ] Declare static-only support.
- [ ] Declare server API support.
- [ ] Declare world API support.
- [ ] Declare multiplayer support.
- [ ] Declare spectator support.
- [ ] Declare achievement support.
- [ ] Declare skill reward support.
- [ ] Declare inventory support.
- [ ] Declare leaderboard support.
- [ ] Declare required browser features.
- [ ] Declare optional browser features.

## Runtime Modes

- [ ] Support a fully static browser mode.
- [ ] Support a signed-in solo mode.
- [ ] Support a world-aware solo mode.
- [ ] Support a multiplayer mode.
- [ ] Support an NPC opponent mode.
- [ ] Support a spectator mode.
- [ ] Let one game support more than one mode.
- [ ] Expose available modes before launch.

## Capability Model

- [ ] Define a minigame capability enum.
- [ ] Grant only requested capabilities.
- [ ] Deny unknown capabilities.
- [ ] Version each capability contract.
- [ ] Make capabilities queryable at runtime.
- [ ] Allow fallback when a capability is absent.
- [ ] Keep static games functional without the SDK.

## Client Lifecycle

- [ ] Define `mount()` for game startup.
- [ ] Define `pause()` for backgrounding.
- [ ] Define `resume()` for returning to play.
- [ ] Define `destroy()` for cleanup.
- [ ] Define `serialize()` for optional local state.
- [ ] Define `restore()` for optional local state.
- [ ] Define `getStatus()` for debug tooling.
- [ ] Require games to clear timers on destroy.
- [ ] Require games to remove listeners on destroy.

## Isolation

- [ ] Do not expose direct core world objects.
- [ ] Expose immutable world snapshots where needed.
- [ ] Use narrow APIs for inventory and rewards.
- [ ] Keep minigame CSS scoped.
- [ ] Keep minigame storage namespaced.
- [ ] Keep minigame errors isolated from the host shell.
- [ ] Consider iframe isolation for third-party games.
- [ ] Add CSP rules for remotely hosted games.

## Static Games

- [ ] Let static games load from plain HTML and JavaScript.
- [ ] Let static games run without authentication.
- [ ] Let static games run without network access.
- [ ] Let static games save local settings locally.
- [ ] Mark local-only scores as untrusted.
- [ ] Do not grant trusted inventory from static results.
- [ ] Let static games later opt into the SDK.
