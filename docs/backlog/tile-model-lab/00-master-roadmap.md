# Tile Model Lab Master Roadmap

## Goal

Build one responsive debug page that can load a tile model plugin and expose
every supported feature, input, event, animation, sound, dependency, and LOD.

## Phase 1: Viewer Shell

- [ ] Complete `01-viewer-shell.md`.
- [ ] Build the responsive model lab page.
- [ ] Keep the 3D viewport as the primary visual area.
- [ ] Add a narrow control panel beside the viewport.
- [ ] Move reports into tabs below or beside the viewer.
- [ ] Preserve controls when switching report tabs.
- [ ] Keep the viewer usable on desktop, tablet, and mobile.

## Phase 2: Plugin Introspection

- [ ] Complete `02-plugin-introspection.md`.
- [ ] Load one tile model plugin at a time.
- [ ] Read the plugin manifest and declared capabilities.
- [ ] List every required parameter.
- [ ] List every optional parameter.
- [ ] List every supported dependency.
- [ ] List every required dependency.
- [ ] List every event the plugin accepts.
- [ ] List every event the plugin emits.
- [ ] Build controls from plugin metadata where possible.

## Phase 3: Scene Inputs

- [ ] Complete `03-input-controls.md`.
- [ ] Add world seed controls.
- [ ] Add world coordinate controls.
- [ ] Add local coordinate controls where relevant.
- [ ] Add randomize buttons for seed and coordinates.
- [ ] Add world time controls.
- [ ] Add time-of-year controls.
- [ ] Add weather controls.
- [ ] Add day and night controls.
- [ ] Add every plugin-declared custom input.

## Phase 4: LOD and Rendering

- [ ] Complete `04-lod-rendering.md`.
- [ ] Force every supported LOD level.
- [ ] Compare LODs side by side when requested.
- [ ] Show model resource usage by LOD.
- [ ] Add model bounding-box views.
- [ ] Add wireframe and normal debug views.
- [ ] Add texture and material inspection.
- [ ] Add texel density and UV stretch heatmaps.

## Phase 5: Animation, Input, Audio, and Events

- [ ] Complete `05-animation-input.md`.
- [ ] Complete `06-audio-events.md`.
- [ ] List all animations.
- [ ] Play, pause, loop, and scrub animations.
- [ ] Test click, enter, exit, and custom interactions.
- [ ] List all sounds.
- [ ] Play any declared sound on demand.
- [ ] Show event input controls.
- [ ] Show emitted events in a live event log.

## Phase 6: Package Loading

- [ ] Complete `07-package-upload.md`.
- [ ] Support loading installed plugins.
- [ ] Support uploading a plugin package ZIP.
- [ ] Unpack the package into an isolated test workspace.
- [ ] Read package metadata before executing code.
- [ ] Validate plugin entry points.
- [ ] Report missing or incompatible dependencies.
- [ ] Keep uploaded packages isolated from the main project.

## Phase 7: Reports and Export

- [ ] Complete `08-reports-export.md`.
- [ ] Add compatibility reports.
- [ ] Add resource reports.
- [ ] Add dependency reports.
- [ ] Add rendering reports.
- [ ] Add animation and event reports.
- [ ] Export reports as JSON.
- [ ] Copy reports as formatted text.
- [ ] Export a polished PDF report.
- [ ] Include LOD renders in the PDF report.

## Phase 8: Model Export

- [ ] Complete `09-model-export.md`.
- [ ] Export the current model as GLB.
- [ ] Export the current model as glTF where useful.
- [ ] Include textures with exported model data.
- [ ] Bake supported current transforms when requested.
- [ ] Export one selected LOD.
- [ ] Export all supported LODs as separate files.
- [ ] Warn when runtime-only effects cannot be exported.

## Phase 9: Validation and Tests

- [ ] Complete `10-validation-tests.md`.
- [ ] Test capability-driven controls.
- [ ] Test unsupported feature handling.
- [ ] Test package upload failures safely.
- [ ] Test model export.
- [ ] Test report export.
- [ ] Test responsive layouts.
