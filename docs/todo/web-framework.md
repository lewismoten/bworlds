# React, Radix UI, and Landing Page

## Project Structure

- [ ] Add React support to the Vite web application.
- [ ] Keep game logic independent from React components.
- [ ] Keep Three.js rendering independent from React state.
- [ ] Keep audio systems independent from React state.
- [ ] Create a shared React UI component directory.
- [ ] Create a separate directory for debug components.
- [ ] Create a separate directory for page components.
- [ ] Create a separate directory for laboratory components.
- [ ] Keep one primary component per source file.
- [ ] Keep reusable controls out of page component files.
- [ ] Keep page-specific controls beside their page code.
- [ ] Avoid files that contain unrelated UI components.
- [ ] Keep component files below the project size limit.
- [ ] Export shared UI components through one index module.

## React Application Shell

- [ ] Create a small React application shell.
- [ ] Mount React only where application UI is required.
- [ ] Keep the main game runtime outside the React tree.
- [ ] Create a shared page layout component.
- [ ] Create a shared navigation component.
- [ ] Create a shared loading indicator.
- [ ] Create a shared error boundary.
- [ ] Show lazy-load failures in the error boundary.
- [ ] Add a route for the landing page.
- [ ] Add a route for the game.
- [ ] Add a route for updates.
- [ ] Add routes for debug laboratories.

## Progressive Loading

- [ ] Lazy load the main game page.
- [ ] Lazy load the updates page.
- [ ] Lazy load each debug laboratory.
- [ ] Lazy load model inspection tools.
- [ ] Lazy load music inspection tools.
- [ ] Lazy load sound bank inspection tools.
- [ ] Lazy load performance inspection tools.
- [ ] Lazy load heavy Three.js debug exporters.
- [ ] Lazy load waveform and spectrum tools.
- [ ] Lazy load controls only used by advanced panels.
- [ ] Show a loading state while page chunks load.
- [ ] Avoid loading debug tools for normal players.
- [ ] Avoid loading locked tools before they are unlocked.
- [ ] Prefetch a page when the user is likely to open it.
- [ ] Keep the landing page bundle small.
- [ ] Keep the initial game bundle free of debug-only code.
- [ ] Inspect production chunks after each major page is added.
- [ ] Warn when a lazy page grows beyond its size budget.

## Radix UI Setup

- [ ] Add Radix UI primitives needed by the project.
- [ ] Add Radix controls only when they are actually needed.
- [ ] Wrap Radix primitives with project UI components.
- [ ] Avoid importing Radix directly inside feature pages.
- [ ] Create a shared Button component.
- [ ] Create a shared IconButton component.
- [ ] Create a shared Toggle component.
- [ ] Create a shared Slider component.
- [ ] Create a shared Select component.
- [ ] Create a shared Tabs component.
- [ ] Create a shared Dialog component.
- [ ] Create a shared Tooltip component.
- [ ] Create a shared Popover component.
- [ ] Create a shared Accordion component.
- [ ] Create a shared Dropdown component.
- [ ] Create a shared Checkbox component.
- [ ] Create a shared RadioGroup component.
- [ ] Create a shared Label component.
- [ ] Create a shared Separator component.
- [ ] Create a shared ScrollArea component.
- [ ] Keep common control styles in one place.
- [ ] Keep control accessibility behavior from Radix intact.

## Shared Project Controls

- [ ] Create a shared TextInput component.
- [ ] Create a shared NumberInput component.
- [ ] Create a shared SeedInput component.
- [ ] Create a shared PluginSelect component.
- [ ] Create a shared LODSelect component.
- [ ] Create a shared PropertyRow component.
- [ ] Create a shared PropertyGroup component.
- [ ] Create a shared StatsPanel component.
- [ ] Create a shared ErrorPanel component.
- [ ] Create a shared DownloadButton component.
- [ ] Create a shared CopyButton component.
- [ ] Create a shared ResetButton component.
- [ ] Create a shared loading panel.
- [ ] Create a shared empty-state panel.
- [ ] Keep specialized visualizers out of generic controls.

## UI State Boundaries

- [ ] Keep game state in the existing game systems.
- [ ] Let React subscribe to game state snapshots.
- [ ] Avoid duplicating authoritative game state in React.
- [ ] Keep debug page state separate from game state.
- [ ] Unsubscribe React listeners during component cleanup.
- [ ] Dispose viewer resources when components unmount.
- [ ] Cancel stale async work when components unmount.
- [ ] Preserve game playback when opening debug tools.
- [ ] Preserve game state while navigating debug pages.

## Landing Page

- [ ] Create a landing page before entering the game.
- [ ] Add the game name and short welcome message.
- [ ] Add a plain-language description of the project.
- [ ] Explain that the world is procedurally generated.
- [ ] Explain that music and sound are procedurally generated.
- [ ] Add a clear button to enter the game.
- [ ] Add a link to the updates page.
- [ ] Add a recent updates section.
- [ ] Keep the landing page useful without JavaScript extras.
- [ ] Keep the landing page fast to load.
- [ ] Add basic page metadata for sharing and search engines.
- [ ] Add a footer with project and repository links.

## Updates Data Structure

- [ ] Create a directory for update JSON files.
- [ ] Store one update per JSON file.
- [ ] Give every update a stable ID.
- [ ] Store the update title.
- [ ] Store the update date and time.
- [ ] Store the update version.
- [ ] Store the update commit hash.
- [ ] Store the previous update commit hash.
- [ ] Store a 40 to 50 word summary.
- [ ] Store an array of features added.
- [ ] Store optional fixes separately from features.
- [ ] Store optional technical notes separately.
- [ ] Keep update JSON free of rendered HTML.
- [ ] Validate every update JSON file.

## Update Manifest

- [ ] Create an update manifest JSON file.
- [ ] Add each update file to the manifest.
- [ ] Store updates in newest-first order.
- [ ] Store the update ID in the manifest.
- [ ] Store the update title in the manifest.
- [ ] Store the update date in the manifest.
- [ ] Store the update version in the manifest.
- [ ] Store the update JSON path in the manifest.
- [ ] Validate that manifest entries reference real files.
- [ ] Fail the build when manifest entries are invalid.
- [ ] Keep only update metadata in the manifest.

## Landing Page Updates

- [ ] Load the update manifest on the landing page.
- [ ] Show the ten most recent updates.
- [ ] Show each update title.
- [ ] Show each update date and time.
- [ ] Show each update version.
- [ ] Link each item to its full update page.
- [ ] Show a link to view all updates.
- [ ] Handle an empty update manifest gracefully.
- [ ] Handle malformed update data gracefully.

## Updates Page

- [ ] Create a page that lists all update entries.
- [ ] Load update details only when they are needed.
- [ ] Show updates in newest-first order.
- [ ] Show the update title.
- [ ] Show the update date and time.
- [ ] Show the 40 to 50 word summary.
- [ ] Show the feature list.
- [ ] Show optional fix notes when present.
- [ ] Show the version in the update footer.
- [ ] Show the short commit hash in the footer.
- [ ] Link the commit hash to GitHub.
- [ ] Link to the diff from the prior update.
- [ ] Hide the diff link for the first recorded update.
- [ ] Add previous and next update navigation.

## Git History Analysis

- [ ] Add a script to read the full Git commit history.
- [ ] Read commit hashes and commit dates.
- [ ] Read commit subjects and bodies.
- [ ] Group related commits into candidate updates.
- [ ] Let the agent identify meaningful update boundaries.
- [ ] Avoid creating an update for trivial formatting commits.
- [ ] Avoid creating an update for dependency noise alone.
- [ ] Prefer commits that complete visible features.
- [ ] Prefer commits that complete a clear development phase.
- [ ] Preserve the original commit date for each update.
- [ ] Summarize commits between update boundaries.
- [ ] Generate feature lists from the included commits.
- [ ] Keep generated summaries grounded in commit messages.

## Version Selection

- [ ] Start generated update tags at `v0.0.1`.
- [ ] Increment the patch version for each update point.
- [ ] Keep generated versions in chronological order.
- [ ] Never reuse an existing Git tag.
- [ ] Check existing tags before choosing a new version.
- [ ] Associate one version with one update commit.
- [ ] Record the version in the update JSON file.
- [ ] Record the tagged commit in the update JSON file.

## Git Tagging

- [ ] Add a script to preview proposed update tags.
- [ ] Show proposed tags before changing the repository.
- [ ] Tag only commits selected as update boundaries.
- [ ] Use annotated Git tags for update versions.
- [ ] Include the update title in the tag message.
- [ ] Do not move an existing update tag automatically.
- [ ] Verify each tag points to the expected commit.
- [ ] Keep tag creation deterministic from update choices.

## Initial Update Generation

- [ ] Scan the repository history from oldest to newest.
- [ ] Find the first meaningful feature milestone.
- [ ] Mark that commit as the first update point.
- [ ] Continue scanning after the selected commit.
- [ ] Find each later meaningful feature milestone.
- [ ] Create one JSON update for each selected milestone.
- [ ] Summarize commits since the prior update point.
- [ ] Generate a feature array from those commits.
- [ ] Use the selected commit time as the update time.
- [ ] Assign the next available `v0.0.x` version.
- [ ] Add each generated update to the manifest.
- [ ] Tag each selected commit with its update version.

## Update Generation Safety

- [ ] Generate updates in preview mode first.
- [ ] Show which commits belong to each proposed update.
- [ ] Show the proposed update summary.
- [ ] Show the proposed feature list.
- [ ] Show the proposed version.
- [ ] Show the proposed tag commit.
- [ ] Allow update JSON generation without creating tags.
- [ ] Keep generated updates deterministic where possible.
- [ ] Never rewrite repository history.
- [ ] Never force-update existing version tags.

## GitHub Links

- [ ] Store the repository GitHub base URL in one config.
- [ ] Build commit links from the full commit hash.
- [ ] Display only a short hash in the UI.
- [ ] Build compare links from adjacent update hashes.
- [ ] URL encode generated repository links safely.
- [ ] Hide GitHub links when the repository URL is missing.

## Update JSON Validation

- [ ] Require a title in every update.
- [ ] Require a valid version in every update.
- [ ] Require a valid commit hash in every update.
- [ ] Require a valid timestamp in every update.
- [ ] Require a summary in every update.
- [ ] Require at least one feature in every update.
- [ ] Validate the summary length.
- [ ] Validate that tagged commits exist.
- [ ] Validate that versions match Git tags.
- [ ] Validate update ordering by commit date.
- [ ] Validate previous commit references.
- [ ] Fail tests when update data is inconsistent.

## Build Integration

- [ ] Include update JSON files in the production build.
- [ ] Include the update manifest in the production build.
- [ ] Keep Git tooling out of the browser bundle.
- [ ] Keep Git history parsing in Node-only scripts.
- [ ] Keep tag creation outside the browser application.
- [ ] Build update pages from static JSON data.
- [ ] Verify lazy update pages build as separate chunks.

## Testing

- [ ] Test the React application mounts successfully.
- [ ] Test lazy page loading.
- [ ] Test lazy component loading.
- [ ] Test the landing page without update data.
- [ ] Test the landing page with ten updates.
- [ ] Test the landing page with more than ten updates.
- [ ] Test update manifest validation.
- [ ] Test update JSON validation.
- [ ] Test update ordering.
- [ ] Test GitHub commit URL generation.
- [ ] Test GitHub compare URL generation.
- [ ] Test semantic update grouping fixtures.
- [ ] Test existing Git tags are never overwritten.
- [ ] Test update versions increment correctly.
- [ ] Test generated dates match commit dates.

## Performance Checks

- [ ] Measure the landing page JavaScript size.
- [ ] Measure the initial game JavaScript size.
- [ ] Measure each laboratory chunk size.
- [ ] Ensure Radix imports remain tree-shakeable.
- [ ] Avoid importing all Radix components at once.
- [ ] Avoid loading update detail JSON until requested.
- [ ] Check for duplicate React copies in the bundle.
- [ ] Check for duplicate UI dependencies in the bundle.
- [ ] Add bundle size limits for major lazy chunks.

# React External Store Integration

- [ ] Define a small external store interface for debug state.
- [ ] Add `subscribe()` to notify React when state changes.
- [ ] Add `getSnapshot()` for the current client state.
- [ ] Add `getServerSnapshot()` for non-browser rendering.
- [ ] Wrap stores with a reusable `useExternalStore()` hook.
- [ ] Use `useSyncExternalStore` inside the shared hook.
- [ ] Keep snapshots immutable between state changes.
- [ ] Avoid creating a new snapshot object on every read.
- [ ] Add stores for music, models, and runtime metrics.
- [ ] Subscribe only to state needed by each debug page.
- [ ] Unsubscribe listeners when components unmount.
- [ ] Test that updates rerender subscribed components.
- [ ] Test that unchanged snapshots do not rerender.
- [ ] Keep Three.js objects and AudioNodes out of snapshots.
- [ ] Expose IDs and plain debug data instead of live objects.
- [ ] Lazy load store adapters with their debug pages.

# Additional React Architecture

- [ ] Add React error boundaries around each lazy-loaded page.
- [ ] Add loading fallbacks for every lazy-loaded page.
- [ ] Add route-level code splitting for labs and debug pages.
- [ ] Keep debug-only dependencies out of the game bundle.
- [ ] Add selectors so components subscribe to minimal state.
- [ ] Avoid snapshots that expose mutable engine objects.
- [ ] Add version numbers to external store snapshots.
- [ ] Batch rapid engine updates before notifying React.
- [ ] Throttle high-frequency metrics shown in React.
- [ ] Keep frame-by-frame rendering outside React state.
- [ ] Keep Three.js rendering loops outside React effects.
- [ ] Keep Web Audio scheduling outside React effects.
- [ ] Add shared hooks for game, audio, and model snapshots.
- [ ] Add React component tests for shared controls.
- [ ] Add accessibility tests for Radix-based controls.
- [ ] Add bundle checks for accidental debug dependencies.
- [ ] Add a development-only React performance profiler.
- [ ] Track slow React renders on complex debug pages.
- [ ] Define one project-wide styling and spacing system.
- [ ] Define one icon library and avoid mixing icon sets.
