# Music Debug MIDI Export Tests

The MIDI export checks are split by responsibility so the long suite can
parallelize them and the files stay smaller:

- [music-debug-midi-export-structure.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-export-structure.test.ts:1)
  covers the multitrack file structure, tempo metadata, and controller setup.
- [music-debug-midi-export-metadata.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-export-metadata.test.ts:1)
  covers conductor metadata, section markers, and chord cues.
- [music-debug-midi-export-variants.test.ts](/Users/lewismoten/dev/bworlds/apps/web/src/music-debug-midi-export-variants.test.ts:1)
  covers percussion note mapping, export variants, and vocal lyric metadata.

All three suites share the MIDI parsing helpers in
[music-debug-midi-test-support.ts](/Users/lewismoten/dev/bworlds/apps/web/src/testing/music-debug-midi-test-support.ts:1)
so the split preserves the existing assertions while reducing the worst single
test-file bottleneck.
