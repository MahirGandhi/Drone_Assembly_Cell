# Production model upgrade

Implemented operator parking, access entry, work, exit, reset and separate restart authorization. Both normal routes and all ten fault recoveries are checked. Recovery requires gate closure before restart. The renderer follows gate and ownership state. Lower-assembly envelopes include gear, rails, deck and board geometry. Raised input/output nests preserve modeled bench clearance. Physical fixture and product fit remain open.

Production scheduling holds one operator through each full visit. Supply starvation and output blocking are separate waits. Rework consumes operator time, including a modeled recheck. Started frames remain WIP until accepted output. Output is counted at unload in both cell and shift engines. Exports include durations, scenario inputs, seeds and results; cell exports have unique run IDs.

Independent review led to fixes for manual fault restart, premature output accounting, overlapping operator visits, worker reservation while blocked, negative event intervals and end-of-shift floating-point mismatch. The shift renderer pauses when its view closes and distinguishes full-shift totals from playback counts.

Browser checks completed a 192.6-second modeled cycle with 16 accepted joints and one output, including pause/resume. A 900-second delivery interval changed one-cell shift output from 124 to 56 and introduced supply wait. End-of-shift playback also showed 56. The deliberate bin obstruction returned zero clearance. Native composition and regeneration are documented in data/native-asset-report.json.

Rework rate, task times, service time, buffer sizes and logistics are assumptions. Physical safety, clamp load, strength, robot reach and actual capacity remain unqualified. Evidence status is tracked in data/acceptance-matrix.json.
