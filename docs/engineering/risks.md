# Feasibility risks and gate ownership

Priorities below are engineering triage, not calculated failure rates.

| Risk | Required evidence/response | Gate |
|---|---|---|
| Unknown source CAD parts, units or revision | Inspect original geometry, record hashes/units/part inventory; proxies labeled | S1.1 |
| Nut pockets trap finished assembly or allow spinning | Demonstrate loading, anti-rotation, tool access and extraction on actual geometry | S1.4 |
| Lower preassembly/gear/rails obstruct fixture or robot | Include them in envelope; adjust legitimate fixture/sequence, never hide them | S1.3–S1.6 |
| Arm wires cannot be connected/parked before closure | Explicit manual cable service; check access and downstream tails; revise boundary if necessary | S1.3 |
| Wrong arm/orientation accepted | Practical identity and seating checks with coverage limits | S1.2, S6.4 |
| Long screw not retained or driver nose hits frame | Exact tool/bit/screw/feeder compatibility and all joint approaches | S1.5 |
| False tightening pass on locknut resistance | Joint-specific recipe and diagnostic limits; unqualified values never presented as validated | S4.4–S4.6 |
| Robot reaches endpoints but collides in transit | Joint-limited path and held-tool/product envelope checks | S5.5 |
| Model treats sensors as infallible | Separate world defects, observations, invalid results and coverage gaps | S3, S6 |
| Reset loses partial assembly or failed attempts | Preserve IDs/material/joints; explicit recovery/disposition | S6.3, S6.6 |
| Capacity omits operator wiring/refill/rework | Shared operator resource and service time included | S7.1–S7.3 |
| Asset download/conversion becomes scope sink | Select only needed SimReady assets; record revision/license; no whole-dataset download | S3.1 |
| Source CAD rights unclear for public distribution | Keep originals ignored; link/hash; publish only authorized assets or clearly labeled independent geometry | S1.1, S8.5 |
| Reviewer gives unsupported approval | Require file/line or reproducible evidence; keep unresolved gate blocked | Every major review |

## Review budget

One read-only reviewer per major milestone; one targeted re-review if needed. Fix concrete findings sequentially. A budget cap never converts an actual blocker into a pass. Broader research, multiple reviewers and GPU runs require a concrete unresolved question.
