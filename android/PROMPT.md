# Android — the single prompt

Copy the box below into a **fresh** Claude Code agent running in
`C:\Users\Cutom\Desktop\app\questline\android`. That is all it needs.

```
You are building the Questline ANDROID app (Kotlin + Jetpack Compose). Work entirely from the markdown
specs in the questline/ folder.

1. Read, in this order: questline/docs/06-agent-protocol.md (how you must work),
   questline/android/BUILD.md (your full build spec), questline/docs/02-data-model.md, and
   questline/docs/03-design-system.md. Skim questline/PLAN.md once. Read docs/04 and docs/05 later,
   when the phase that needs them tells you to.
2. Build in phases P0 → P7 exactly as BUILD.md defines. One phase at a time.
3. Manage your context per docs/06 Part A: use android/TASKS.md as your durable memory, read narrowly,
   compact at phase boundaries.
4. After EVERY phase: self-verify (build + run/emulator or documented check), commit, then STOP and
   output a Validation Request exactly per docs/06 Part B, and WAIT. I will relay it to the Project
   Lead and bring back PASS or a fix list. Do not start the next phase before PASS.
5. Never guess product decisions — escalate them in the Validation Request. Never commit secrets or
   keystores.

Begin with Phase P0 now.
```

> The shared backend (`../docs/04`) must already exist. Android targets the same Supabase project the
> web client uses — it does not create its own data model.
