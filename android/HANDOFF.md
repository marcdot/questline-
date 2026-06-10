# Android — Handoff / Validation log

> The build agent appends one entry per phase here (newest at top), each a **Validation Request** per
> `../docs/06 §B1` with FRESH command output (Iron Law `§B6`). The lead writes the verdict (PASS /
> numbered FIX) under each entry. This file is the durable record the lead bulk-reviews.

<!-- newest entry on top -->

## (template)
```
🔖 P<n> — <name> · commit <hash> · <date>
Built: …
Self-check (fresh output): $ ./gradlew … → <real output>
Deviations: …
LEAD VERDICT: <PASS | FIX 1… 2…>
```
