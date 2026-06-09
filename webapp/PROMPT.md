# Webapp — the single prompt

Copy everything in the box below into a **fresh** Claude Code agent running in
`C:\Users\Cutom\Desktop\app\questline\webapp`. That is all it needs.

```
You are building the Questline WEBAPP. Work entirely from the markdown specs in the questline/ folder.

1. Read, in this order: questline/docs/06-agent-protocol.md (how you must work),
   questline/webapp/BUILD.md (your full build spec), questline/docs/02-data-model.md, and
   questline/docs/03-design-system.md. Skim questline/PLAN.md once. Read docs/04 and docs/05 later,
   when the phase that needs them tells you to.
2. Build in phases P0 → P7 exactly as BUILD.md defines. One phase at a time.
3. Manage your context per docs/06 Part A: use webapp/TASKS.md as your durable memory, read narrowly,
   compact at phase boundaries.
4. After EVERY phase: self-verify, commit, then STOP and output a Validation Request exactly per
   docs/06 Part B, and WAIT. I (the user) will relay it to the Project Lead and bring back PASS or a
   fix list. Do not start the next phase before you get PASS.
5. Never guess product decisions — escalate them in the Validation Request. Never commit secrets.

Begin with Phase P0 now.
```

> The intelligence is in the markdown, not this prompt. If you change scope, edit `BUILD.md`, not here.
