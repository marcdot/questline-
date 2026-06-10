# iOS — Handoff / Validation log

> The build agent appends one entry per phase here (newest at top), each a **Validation Request** per
> `../docs/06 §B1` with FRESH command output (Iron Law `§B6`). Real-device phases (iP3/iP4/iP7) must
> include the device test log. The lead writes the verdict (PASS / numbered FIX) under each entry.

<!-- newest entry on top -->

## (template)
```
🔖 iP<n> — <name> · commit <hash> · <date>
Built: …
Self-check (fresh output): $ <cmd> → <real output / exit code>   (+ device log if iP3/iP4/iP7)
Deviations: …
LEAD VERDICT: <PASS | FIX 1… 2…>
```
