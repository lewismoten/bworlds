# React Router Setup

## Install and Configure

* [ ] Add React Router to the web application.
* [ ] Create one shared router configuration file.
* [ ] Keep route definitions out of page component files.
* [ ] Add a root application layout route.
* [ ] Add a fallback route for unknown paths.
* [ ] Add a shared route error boundary.
* [ ] Keep route paths in one shared constants module.

## Core Routes

* [ ] Add `/` for the landing page.
* [ ] Add `/game` for the main game.
* [ ] Add `/updates` for the update list.
* [ ] Add `/updates/:id` for update details.
* [ ] Add `/labs` for the laboratory index.
* [ ] Add `/labs/music` for the music laboratory.
* [ ] Add `/labs/models` for the model laboratory.
* [ ] Add `/labs/audio` for the audio laboratory.
* [ ] Add `/debug` for the debug page index.
* [ ] Add `/debug/errors` for runtime error snapshots.
* [ ] Add `/debug/performance` for performance metrics.

## Lazy Loading

* [ ] Lazy load the game route.
* [ ] Lazy load the updates route.
* [ ] Lazy load each laboratory route.
* [ ] Lazy load each debug route.
* [ ] Keep landing page code in the initial bundle.
* [ ] Keep laboratory code out of the initial bundle.
* [ ] Keep debug code out of the initial bundle.
* [ ] Add a loading fallback for lazy routes.
* [ ] Add a retry option when a route chunk fails.
* [ ] Prefetch likely routes after the landing page is idle.

## Route Layouts

* [ ] Create a shared site layout.
* [ ] Create a separate game layout.
* [ ] Create a laboratory layout.
* [ ] Create a debug layout.
* [ ] Keep site navigation inside the site layout.
* [ ] Keep laboratory navigation inside its layout.
* [ ] Keep debug navigation inside its layout.
* [ ] Avoid duplicating headers across route components.

## Navigation

* [ ] Replace manual page links with router links.
* [ ] Add a clear link from the landing page to the game.
* [ ] Add a link from the landing page to updates.
* [ ] Add a link from the game to unlocked laboratories.
* [ ] Add a back-to-game action from laboratory pages.
* [ ] Preserve game state when leaving for a laboratory.
* [ ] Preserve music playback when entering a laboratory.
* [ ] Avoid full page reloads during internal navigation.

## Route Parameters

* [ ] Validate update IDs from route parameters.
* [ ] Validate plugin IDs from route parameters.
* [ ] Add optional model plugin route parameters.
* [ ] Add optional seed query parameters.
* [ ] Add optional LOD query parameters.
* [ ] Add optional song IDs to music lab routes.
* [ ] Keep route parameters serializable and shareable.
* [ ] Reject malformed route values safely.

## URL State

* [ ] Put shareable debug selections in query parameters.
* [ ] Keep temporary UI state out of the URL.
* [ ] Store selected model plugin in the URL when useful.
* [ ] Store selected update ID in the route path.
* [ ] Store selected LOD in the URL when useful.
* [ ] Store selected footprint preset in the URL when useful.
* [ ] Restore supported page state from the URL on load.

## Access Control

* [ ] Add route metadata for required tester levels.
* [ ] Check laboratory access before rendering a route.
* [ ] Redirect locked laboratory routes safely.
* [ ] Show why a laboratory route is locked.
* [ ] Let developer mode bypass progression locks.
* [ ] Avoid loading locked laboratory chunks when possible.

## Game Integration

* [ ] Keep router state separate from game engine state.
* [ ] Keep the game runtime alive when opening a lab.
* [ ] Avoid recreating the world on normal route changes.
* [ ] Keep current player location while visiting labs.
* [ ] Keep current SongDNA while visiting the music lab.
* [ ] Restore the prior game view when returning.
* [ ] Add a shared game session bridge for route pages.

## Error Handling

* [ ] Add a route-level error page.
* [ ] Show lazy import errors clearly.
* [ ] Report route errors to runtime error tracking.
* [ ] Keep browser console errors visible after reporting.
* [ ] Show the failed route path in error details.
* [ ] Add a return-home action on route failures.
* [ ] Add a return-to-game action when possible.

## Updates Routing

* [ ] Route update titles to `/updates/:id`.
* [ ] Load only the requested update JSON file.
* [ ] Add previous update navigation.
* [ ] Add next update navigation.
* [ ] Preserve scroll position when returning to the list.
* [ ] Handle missing update IDs with a not-found view.

## Laboratory Routing

* [ ] Add a laboratory index page.
* [ ] List only unlocked laboratories.
* [ ] Show locked laboratories when progression allows it.
* [ ] Lazy load laboratory-specific dependencies.
* [ ] Keep each laboratory route in its own file.
* [ ] Keep each laboratory layout in its own file.
* [ ] Allow direct links to unlocked laboratories.

## Debug Routing

* [ ] Add a debug page index.
* [ ] Group debug routes by system.
* [ ] Lazy load each debug page independently.
* [ ] Hide developer-only routes outside developer mode.
* [ ] Preserve debug filter state when changing debug routes.
* [ ] Add breadcrumbs for nested debug routes.

## Scroll and Focus

* [ ] Restore scroll position for normal site pages.
* [ ] Reset scroll for new update detail pages.
* [ ] Preserve laboratory scroll state when appropriate.
* [ ] Move focus to page content after route changes.
* [ ] Keep keyboard navigation usable after route changes.

## Testing

* [ ] Test the landing page route.
* [ ] Test the game route.
* [ ] Test update list and detail routes.
* [ ] Test laboratory routes.
* [ ] Test debug routes.
* [ ] Test unknown routes.
* [ ] Test locked route redirects.
* [ ] Test developer mode route access.
* [ ] Test lazy route loading.
* [ ] Test lazy route error handling.
* [ ] Test query parameter restoration.
* [ ] Test navigation without full page reloads.

## Performance

* [ ] Measure the initial router bundle size.
* [ ] Verify labs build into separate chunks.
* [ ] Verify debug pages build into separate chunks.
* [ ] Verify the game builds into a separate chunk.
* [ ] Check for duplicate React Router code in chunks.
* [ ] Add route chunk sizes to bundle reports.
* [ ] Warn when a route chunk exceeds its size budget.
