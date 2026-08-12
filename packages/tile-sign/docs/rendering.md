# Tile Sign Rendering

The full-detail roadside sign tile now also exposes a progressive build path so
the renderer can spread sign landmark work across multiple frames.

Current progressive phases:

- `posts`
- `placards`
- `lantern`

The synchronous `create3DModel()` path exhausts the same generator so the
progressive and eager builds stay structurally aligned.

Current full-detail optimizations:

- the main sign post, optional secondary post, and placard boards now collapse
  into instanced meshes instead of one standalone box mesh per repeated solid
- placard support bars, edge caps, and arrow heads are emitted as instanced
  hardware instead of one standalone mesh per placard attachment
- each placard now uses one double-sided label plane instead of separate front
  and back label meshes, which also lets one textured label material serve both
  viewing directions
- label textures and their `MeshBasicMaterial` wrappers are cached per host and
  sign style, so repeated builds of the same placard text reuse both the canvas
  texture and the label material instead of manufacturing equivalent materials
- core post, placard, trim, and lantern `MeshStandardMaterial` instances are
  now also cached per host by their effective colors and fixed render-state
  values, so different regional sign variants can reuse the same materials
  whenever their resolved palette actually matches
- the sign's tiny box and cone parts collapse their geometry groups to one
  shared single-material draw group so default primitive grouping does not
  inflate draw-call and material-group diagnostics for a small roadside prop

The reduced-quality sign silhouette now also uses its main post mesh as the
tile root and attaches the simplified placard and optional brace beneath it, so
each low-detail sign tile avoids one otherwise empty wrapper `Group` without
changing the silhouette.

The full-detail roadside sign now also uses its post `InstancedMesh` as the
tile root and attaches the brace, placards, label planes, and lantern pieces
beneath it, so each sign tile avoids one otherwise empty wrapper `Group`
without changing the placard layout or night-light placement.

Material reuse:

- repeated full-detail sign builds on one Three host are expected to stay
  within one shared seven-material palette for the post, placard, trim,
  lantern, and three cached label surfaces
- different regional sign variants that happen to land on the same post,
  placard, or trim colors are also expected to share those host-level material
  instances instead of duplicating equivalent `MeshStandardMaterial` objects
- the regression test locks that budget so repeated nearby sign builds cannot
  quietly start allocating extra equivalent materials on the same host
