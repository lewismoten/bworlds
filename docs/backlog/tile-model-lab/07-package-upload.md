# Plugin Package Upload

## Upload

- [ ] Add an NPM package ZIP upload control.
- [ ] Accept ZIP files only for the first implementation.
- [ ] Enforce a maximum upload size.
- [ ] Compute a package fingerprint.
- [ ] Unpack into a temporary isolated workspace.
- [ ] Never unpack over the main application source.

## Inspection

- [ ] Read `package.json` before running package code.
- [ ] Show package name and version.
- [ ] Show package license metadata.
- [ ] Show declared dependencies.
- [ ] Show declared peer dependencies.
- [ ] Show package entry points.
- [ ] Show package exports.
- [ ] Detect missing package metadata.

## Safety

- [ ] Reject path traversal entries in ZIP files.
- [ ] Reject absolute paths in ZIP entries.
- [ ] Reject dangerous symbolic links.
- [ ] Limit total unpacked size.
- [ ] Limit unpacked file count.
- [ ] Do not execute lifecycle scripts.
- [ ] Do not run package install scripts.
- [ ] Isolate uploaded package execution.

## Compatibility

- [ ] Compare dependencies with installed packages.
- [ ] Report missing dependencies.
- [ ] Report version mismatches.
- [ ] Report peer dependency mismatches.
- [ ] Report unsupported browser dependencies.
- [ ] Report Node-only dependencies.
- [ ] Report unavailable plugin dependencies.
