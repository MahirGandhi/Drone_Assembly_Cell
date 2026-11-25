# Project execution rules

- Follow `docs/sprint-plan.md` and the current task in `docs/progress.md`. The user authorized execution after reviewing the plan. The original plan's review-stop text is historical, not a renewed approval requirement.
- Work on one implementation task at a time. Prefer existing documented assets and parts. Do not restart component-manufacturing research.
- After each major milestone: run relevant checks, request one narrowly scoped read-only agent review, fix specific findings, and recheck only affected behavior. Record evidence in `docs/reviews/`. A reviewer opinion does not replace tests or sources.
- Default review budget: one initial review and one targeted re-review if blockers were found. If genuine blockers remain, record and resolve them; the cap must never turn a failed gate into a pass. Do not use review swarms or speculative brainstorming.
- Use NVIDIA SimReady assets selectively for the station environment; keep origin, revision, license, attribution and conversions in an asset manifest. Do not download the entire dataset.
- Product-critical geometry uses the X500 reference CAD where usable; environmental assets cannot substitute for validated tooling/product geometry.
- Keep source facts, CAD measurements and design assumptions distinguishable. Never invent a qualified torque, physical test result, measured cycle time or robot clearance.
- Model commands separately from completion feedback; keep material ownership, joint identity and recovery history explicit.
- Preserve the station boundary: drone frame assembly, purchased motor/ESC arm modules, automatic fastening and staged handling automation. No semiconductor, cell or material manufacturing.
- No paid services or GPU runs without an identified engineering need and existing authorization. Check small/local deterministic cases before larger runs.
- Do not store credentials or personal profile documents. Do not copy unclear-license original CAD into the public repository; link and hash it, keeping local working sources ignored.
