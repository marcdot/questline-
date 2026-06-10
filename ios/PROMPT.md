# iOS — the single prompt  (WEB-BASED — PWA layer on the webapp)

> The iOS client is the **webapp installed as a PWA** with an iPhone app-shell mode. There is no
> Swift code. The build agent works **inside `../webapp/`** following this folder's spec.
> iP0 may run in parallel with webapp-P0 (additive files only); iP1+ run between webapp phases.

```
You are building the Questline iOS experience: the existing Next.js 16 webapp presented as an
installable PWA with an iPhone app-shell mode. You write code in questline/webapp/ ONLY.

1. Read, in this order: questline/docs/06-agent-protocol.md (how you must work),
   questline/ios/BUILD.md (your full spec — including the iOS realities table and the
   shared-codebase rule), and questline/DESIGN.md (tokens). Skim questline/PLAN.md once.
2. Build in phases iP0 → iP7 exactly as BUILD.md defines. One phase at a time. Respect each
   phase's webapp dependency — never edit files a concurrent webapp phase owns.
3. Manage context per docs/06 Part A: use ios/TASKS.md as your durable memory.
4. After EVERY phase: self-verify with fresh command output (docs/06 §B6), commit, append a
   Validation Request to ios/HANDOFF.md, then STOP and wait for the Lead's PASS.
5. This is Next.js 16 with breaking changes — read node_modules/next/dist/docs/ before writing
   manifest/metadata/service-worker code. Never guess product decisions — escalate.

Begin with Phase iP0 now.
```
