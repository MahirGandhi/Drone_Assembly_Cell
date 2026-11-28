# Parametric line milestone

Implemented a five-stage planning route around the existing frame cell using the published SimScript runtime. Imported 913 checksummed public manual-work intervals as an optional analog scenario. Added editable resources, operators, durations, footprint/cost inputs, losses, bounded rework/scrap, output space and material cadence; bounded design search and 3D playback share the resulting product traces.

## Checks

- 23 automated checks passed, including exact-horizon output, conservation, staff/technician exclusivity, finite buffers, planned pauses, breakdowns, unsuccessful rework, unfinished-rework yield, repeatability and demand-driven additions.
- Native asset evidence checks, runtime/benchmark checks and production build passed.
- An isolated initial assembly completed at 687.6 seconds, equal to its entered stage work-content sum.
- Baseline line scenario: 117 accepted assemblies against 105 requested in 420 minutes. These are assumed-input outputs, not observed production.
- Browser demand study for 160 requested: 14 designs evaluated; frame and avionics resources increased from one to two each; nominal output 164; end-of-window playback also 164, with 11 WIP.
- Browser public-variation/loss example: nominal 108, eight evaluation outputs 104–110, ten equipment failures and eight repair/recheck attempts. Seven evaluation runs met the 105 target. Conditional interval 52.9–97.8%; parameter uncertainty excluded.
- Rendered-browser checks covered landing navigation, component filtering, isolation/camera framing, component-to-process navigation, cell Start/Pause and line playback/pause. The managed preview route resolved the earlier environment limitation. No mobile-device rendering check is claimed.

## Review findings and corrections

A scoped independent kernel review found inconsistent first-pass-yield cohorts and reuse of a design-selection seed in reported evaluation. Yield now uses accepted-or-scrapped final dispositions, with failed WIP reported separately. Evaluation seeds are held out from selection. A targeted re-review confirmed both fixes and the seven kernel checks.

Browser testing found CommonJS runtime imports failing in development despite a passing production build. A local runtime package and explicit Vite dependency optimization fixed startup without installing the upstream documentation/compiler dependencies. Zero-duration phase awaits also caused scheduling drift; skipping empty phases restored the exact-horizon analytical case.

Small isolated parts now receive camera framing. The line camera preserves left-to-right process order, added resources are visible, and forecast figures remain distinct from playback counts. Physical process qualification, measured drone timings/reliability and live equipment integration remain open.
