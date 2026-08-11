# Build Bundle Budgets

The web build treats every JavaScript chunk at or above `64 KiB` as a tracked
"major chunk". When a debug page or feature split crosses that threshold, two
updates are required together:

- add a hard limit in [apps/web/build-bundle-budgets.mjs](/Users/lewismoten/dev/bworlds/apps/web/build-bundle-budgets.mjs:1)
- add a committed baseline entry in [apps/web/build-bundle-budgets-baseline.json](/Users/lewismoten/dev/bworlds/apps/web/build-bundle-budgets-baseline.json:1)

That keeps CI honest in two different ways:

- new large chunks fail immediately if nobody decided what their limit should be
- existing tracked chunks fail when they grow beyond their allowed regression window

Recent example: the lazily loaded `sound-bank-debug-page` chunk is now tracked
explicitly instead of piggybacking on the main bundle budget. That preserves
code-splitting visibility for debug-only features while still requiring an
intentional ceiling for the split chunk itself.
