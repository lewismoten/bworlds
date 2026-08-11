# Audio Debug Progressive Loading

The sound-bank debug page now lazy-loads its instrument preview player instead
of constructing the Web Audio preview path during page module startup.

Why:

- keeps preview-only audio code off the initial sound-bank debug route path
- lets build budgets track the larger shared music-debug chunk explicitly
- preserves the same visible controls while delaying the audio player import
  until a user actually starts or previews audio

Current split:

- `sound-bank-debug-page.ts` renders with idle audio state from lightweight
  local helpers
- the first audio interaction dynamically imports
  `music-debug-instrument-preview.ts`
- the preview player instance is cached for later mute, gain, resume, and
  preview actions
