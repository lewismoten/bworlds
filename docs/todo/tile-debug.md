# 3D Tile Model Debug Page

## Page Setup

- [ ] Create a dedicated 3D tile model debug page.
- [ ] Add the page to the debug navigation.
- [ ] Make the 3D model viewer the primary page area.
- [ ] Keep the left control panel narrow and compact.
- [ ] Put advanced model inputs below the main viewer.
- [ ] Keep viewer state separate from control state.
- [ ] Persist the selected plugin and viewer settings.
- [ ] Reset the viewer cleanly when changing plugins.
- [ ] Dispose old Three.js resources when models change.
- [ ] Show model generation errors without hiding controls.

## Main Viewer

- [ ] Add a large Three.js model viewport.
- [ ] Add orbit rotation with mouse drag.
- [ ] Add pan controls with Shift and mouse drag.
- [ ] Add mouse wheel zoom.
- [ ] Add touch rotation and zoom support.
- [ ] Add a reset-camera button.
- [ ] Add a frame-model button.
- [ ] Add front, back, left, and right view buttons.
- [ ] Add top and bottom view buttons.
- [ ] Add perspective camera mode.
- [ ] Add orthographic camera mode.
- [ ] Show the current camera position.
- [ ] Show the current camera target.
- [ ] Add a toggle for automatic model rotation.
- [ ] Add an auto-rotate speed control.
- [ ] Pause auto-rotate during manual camera input.

## Tile Plugin Selection

- [ ] List tile plugins that support 3D model generation.
- [ ] Add a tile plugin selector.
- [ ] Show the selected plugin ID.
- [ ] Show the selected plugin name.
- [ ] Show the selected plugin description.
- [ ] Show the plugin source module.
- [ ] Show whether the plugin supports custom footprints.
- [ ] Show whether the plugin supports multiple LOD levels.
- [ ] Regenerate the model when the plugin changes.

## Seed Controls

- [ ] Add a world seed input.
- [ ] Add a tile seed input.
- [ ] Add an optional variation seed input.
- [ ] Add a randomize-seed button.
- [ ] Add a copy-seed button.
- [ ] Add a restore-seed button.
- [ ] Show the resolved seed values.
- [ ] Keep model output deterministic for the same seeds.
- [ ] Regenerate when a seed value changes.

## LOD Controls

- [ ] List every LOD supported by the selected plugin.
- [ ] Add an LOD selector.
- [ ] Show the requested LOD.
- [ ] Show the actual generated LOD.
- [ ] Show when a lower LOD fallback was used.
- [ ] Show the reason for any LOD fallback.
- [ ] Add previous and next LOD buttons.
- [ ] Add a compare-adjacent-LOD option.
- [ ] Keep the camera stable while switching LODs.
- [ ] Keep model scale stable while switching LODs.
- [ ] Highlight dimension changes between LOD levels.

## Footprint Grid

- [ ] Add a clickable tile footprint grid.
- [ ] Toggle grid cells on and off by clicking.
- [ ] Show active cells with a clear visual state.
- [ ] Show inactive cells with a clear visual state.
- [ ] Add a clear-grid button.
- [ ] Add a fill-grid button.
- [ ] Add common 1x1 footprint preset.
- [ ] Add common 1x2 footprint preset.
- [ ] Add common 2x2 footprint preset.
- [ ] Add common 3x3 footprint preset.
- [ ] Add common 4x4 footprint preset.
- [ ] Add L, T, S, and Z footprint presets.
- [ ] Allow footprint rotation.
- [ ] Allow footprint mirroring when supported.
- [ ] Show the footprint width and height.
- [ ] Show the number of active cells.
- [ ] Reject unsupported footprint shapes.
- [ ] Explain why a footprint is unsupported.
- [ ] Regenerate when the footprint changes.

## Footprint Validation

- [ ] Validate that active cells form an allowed footprint.
- [ ] Warn when active cells are disconnected.
- [ ] Warn when the footprint contains invalid gaps.
- [ ] Show the resolved footprint shape ID.
- [ ] Show the resolved footprint rotation.
- [ ] Show the selected owner cell.
- [ ] Show group-local cell coordinates.
- [ ] Show the model bounds for the footprint.
- [ ] Compare model bounds with expected tile bounds.

## Model Supports

- [ ] Read supported model features from the plugin.
- [ ] List all supported boolean model features.
- [ ] Add a toggle for each supported boolean feature.
- [ ] Hide unsupported feature controls.
- [ ] Show the default state for each feature.
- [ ] Show the current state for each feature.
- [ ] Group related supports together.
- [ ] Regenerate when a supported feature changes.
- [ ] Preserve supported values while changing LOD.
- [ ] Reset unsupported values when plugins change.

## Supported Inputs

- [ ] Read supported model input definitions from the plugin.
- [ ] Add text inputs for supported string values.
- [ ] Add number inputs for supported numeric values.
- [ ] Add sliders for bounded numeric values.
- [ ] Add selectors for supported enum values.
- [ ] Add checkboxes for supported boolean values.
- [ ] Add multiline inputs for longer text values.
- [ ] Show input labels supplied by the plugin.
- [ ] Show input descriptions supplied by the plugin.
- [ ] Show default values supplied by the plugin.
- [ ] Show minimum values when defined.
- [ ] Show maximum values when defined.
- [ ] Show step values when defined.
- [ ] Validate every model input before generation.
- [ ] Show validation errors beside invalid inputs.
- [ ] Regenerate after valid input changes.

## Tree and Carving Inputs

- [ ] Support text inputs for generated tree carvings.
- [ ] Support multiple carving entries when allowed.
- [ ] Add and remove carving values.
- [ ] Show carving placement options when supported.
- [ ] Show carving depth options when supported.
- [ ] Show carving scale options when supported.
- [ ] Preview carving changes in the model viewer.
- [ ] Keep carving inputs deterministic with the seed.

## Texture Controls

- [ ] Add a master textures on or off toggle.
- [ ] Add a material color on or off toggle.
- [ ] Add a normal map on or off toggle.
- [ ] Add a roughness map on or off toggle.
- [ ] Add a metalness map on or off toggle.
- [ ] Add an emissive map on or off toggle.
- [ ] Add an alpha map on or off toggle.
- [ ] Hide texture controls that are not used.
- [ ] Show every texture used by the model.
- [ ] Show texture dimensions.
- [ ] Show texture memory estimates.
- [ ] Show whether textures are generated or shared.
- [ ] Add a texture preview for each used texture.
- [ ] Keep geometry unchanged when textures are toggled.

## Material Debugging

- [ ] Add a wireframe toggle.
- [ ] Add a flat-shading toggle.
- [ ] Add a normals visualization toggle.
- [ ] Add a material ID visualization mode.
- [ ] Add a texture UV visualization mode.
- [ ] Show the number of unique materials.
- [ ] Show the number of shader programs.
- [ ] Show material names used by the model.
- [ ] Show material reuse across model parts.
- [ ] Warn about excessive material counts.

## Lighting Controls

- [ ] Add a default neutral lighting setup.
- [ ] Add a directional light toggle.
- [ ] Add an ambient light toggle.
- [ ] Add an environment light toggle.
- [ ] Add a light intensity control.
- [ ] Add a light direction control.
- [ ] Add a shadows on or off toggle.
- [ ] Add a dark-background toggle.
- [ ] Add a light-background toggle.
- [ ] Add a neutral-background toggle.
- [ ] Keep lighting independent from model generation.

## Scene Helpers

- [ ] Add a ground grid toggle.
- [ ] Add world axes toggle.
- [ ] Add bounding box toggle.
- [ ] Add bounding sphere toggle.
- [ ] Add pivot marker toggle.
- [ ] Add tile boundary toggle.
- [ ] Add footprint boundary toggle.
- [ ] Add collision geometry toggle.
- [ ] Add interaction point toggle.
- [ ] Add navigation point toggle.
- [ ] Add light source marker toggle.
- [ ] Add attachment point toggle.
- [ ] Add LOD anchor marker toggle.

## Model Statistics

- [ ] Show triangle count.
- [ ] Show vertex count.
- [ ] Show index count.
- [ ] Show mesh count.
- [ ] Show Object3D count.
- [ ] Show InstancedMesh count.
- [ ] Show instance count.
- [ ] Show material count.
- [ ] Show texture count.
- [ ] Show light count.
- [ ] Show animation count.
- [ ] Show draw call estimate.
- [ ] Show estimated GPU memory.
- [ ] Show estimated CPU memory.
- [ ] Show model generation time.
- [ ] Show current model dimensions.
- [ ] Show width, height, and depth separately.

## Budget Comparison

- [ ] Show the tile resource budget.
- [ ] Show the footprint resource budget.
- [ ] Show actual triangles versus budget.
- [ ] Show actual draw calls versus budget.
- [ ] Show actual materials versus budget.
- [ ] Show actual textures versus budget.
- [ ] Show actual lights versus budget.
- [ ] Show actual Object3D count versus budget.
- [ ] Warn when any soft budget is exceeded.
- [ ] Fail model validation when hard limits are exceeded.

## LOD Comparison

- [ ] Add a side-by-side LOD comparison mode.
- [ ] Add an overlay LOD comparison mode.
- [ ] Show dimension differences between LODs.
- [ ] Show triangle differences between LODs.
- [ ] Show draw-call differences between LODs.
- [ ] Show material differences between LODs.
- [ ] Show missing major features between LODs.
- [ ] Show added detail between LODs.
- [ ] Warn when silhouettes change too much.
- [ ] Warn when the ground anchor moves between LODs.
- [ ] Warn when collision bounds change unexpectedly.

## Footprint Comparison

- [ ] Compare a grouped model with separate tile models.
- [ ] Show resource totals for separate tile models.
- [ ] Show resource totals for the grouped model.
- [ ] Show the resource savings from consolidation.
- [ ] Show the extra detail gained from consolidation.
- [ ] Show grouped versus solo draw-call counts.
- [ ] Show grouped versus solo Object3D counts.
- [ ] Keep the same total resource budget for comparison.

## Export

- [ ] Add a download model button.
- [ ] Export the current model as GLB.
- [ ] Option to Include embedded textures in GLB exports.
- [ ] Export the currently selected LOD only.
- [ ] Export the currently selected footprint only.
- [ ] Export current supported input values.
- [ ] Export current seeds with the model.
- [ ] Export model metadata as JSON.
- [ ] Export model statistics as JSON.
- [ ] Export the footprint mask as JSON.
- [ ] Export model supports as JSON.
- [ ] Include plugin ID in export metadata.
- [ ] Include LOD level in export metadata.
- [ ] Include footprint shape in export metadata.
- [ ] Use deterministic filenames for model exports.

## Export Validation

- [ ] Verify exported GLB can be parsed after creation.
- [ ] Verify exported GLB contains all visible geometry.
- [ ] Verify exported GLB contains required textures.
- [ ] Verify exported materials match the preview.
- [ ] Verify exported model dimensions match the preview.
- [ ] Warn when a feature cannot be exported.
- [ ] Show export size after generation.

## Model Generation Flow

- [ ] Debounce rapid input changes before regeneration.
- [ ] Cancel old generation when inputs change again.
- [ ] Keep the current model visible during regeneration.
- [ ] Swap models only after the new model is ready.
- [ ] Show a small generating status indicator.
- [ ] Show generation progress when available.
- [ ] Show the generation stage when available.
- [ ] Allow generation cancellation.
- [ ] Restore the previous valid model after failure.

## Cache Debugging

- [ ] Show whether the current model came from cache.
- [ ] Show the model cache key.
- [ ] Show available cached LOD levels.
- [ ] Show cached footprint variants.
- [ ] Add a clear-current-model-cache button.
- [ ] Add a clear-plugin-model-cache button.
- [ ] Add a bypass-cache toggle.
- [ ] Compare cached and freshly generated output.
- [ ] Warn when deterministic output differs from cache.

## Animation Debugging

- [ ] List animations when the model supports them.
- [ ] Add play and pause controls per animation.
- [ ] Add animation speed controls.
- [ ] Add animation loop controls.
- [ ] Add a stop-all-animations button.
- [ ] Show the active animation name.
- [ ] Show the animation duration.
- [ ] Hide animation controls for static models.

## Responsive Layout

- [ ] Keep the viewer large on wide screens.
- [ ] Keep primary controls beside the viewer when space allows.
- [ ] Move the control panel above the viewer on narrow screens.
- [ ] Put supported inputs below the viewer on all layouts.
- [ ] Keep advanced sections collapsible.
- [ ] Avoid shrinking the model viewport for long input lists.
- [ ] Keep export controls easy to reach.
- [ ] Keep camera controls visible while scrolling.

## Debug Presets

- [ ] Save common viewer presets locally.
- [ ] Save common footprint presets locally.
- [ ] Save model input presets locally.
- [ ] Add a reset-to-plugin-defaults button.
- [ ] Add a copy-current-settings button.
- [ ] Add a paste-settings input.
- [ ] Validate pasted debug settings.
- [ ] Include plugin, seed, LOD, and footprint in presets.

## Unit Tests

- [ ] Test supported plugin discovery.
- [ ] Test LOD option discovery.
- [ ] Test supported feature discovery.
- [ ] Test supported input discovery.
- [ ] Test footprint grid serialization.
- [ ] Test footprint rotation.
- [ ] Test irregular footprint validation.
- [ ] Test model input validation.
- [ ] Test deterministic cache key creation.
- [ ] Test model statistics collection.
- [ ] Test GLB filename generation.
- [ ] Test export metadata generation.

## Integration Tests

- [ ] Test switching between tile plugins.
- [ ] Test switching LOD while preserving camera state.
- [ ] Test changing footprint while preserving camera state.
- [ ] Test toggling every supported feature.
- [ ] Test changing every supported input type.
- [ ] Test textures on and off.
- [ ] Test wireframe and helper overlays.
- [ ] Test model regeneration failure recovery.
- [ ] Test cached model loading.
- [ ] Test GLB export with textures.
- [ ] Test GLB export without textures.
- [ ] Test cleanup after repeated model changes.

## Performance Tests

- [ ] Measure model generation time by plugin.
- [ ] Measure model generation time by LOD.
- [ ] Measure model generation time by footprint.
- [ ] Measure viewer frame time with complex models.
- [ ] Measure memory before and after model replacement.
- [ ] Verify repeated model swaps do not leak memory.
- [ ] Verify repeated exports do not leak resources.
- [ ] Warn when debug helpers cause major frame drops.
