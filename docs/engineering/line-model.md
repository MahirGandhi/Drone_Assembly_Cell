# Parametric assembly line

The proposed route wraps the existing frame cell with lower-frame preparation, avionics integration, configuration/bench checks, and final assembly/inspection. Purchased motor/ESC arm modules remain inputs. The frame-cell contract and its qualification gaps remain intact. Output is a modeled inspected assembly, not a flight-qualified aircraft.

## Evidence and reuse

SimScript 1.0.37 supplies the event calendar, entities and finite-capacity resources. The application adds process rules and presentation. Runtime logic is unchanged; normalized file hashes are checked. The local package works in Node, Vite development and production without the upstream compiler/documentation dependencies.

The optional AI-PRISM scenario independently resamples 913 manual appliance-test intervals, normalized within each source file. Transferring that variability to entered drone-task means is an explicit analog assumption. It supplies no drone mean times, defect rates, MTBF or qualified recipes. Manufacturer/PX4 references establish assembly structure; the station split, times, footprints and losses are assumptions.

## Resource and material rules

Each station has parallel resources and bounded waiting spaces. Products reserve admission space, then a resource. Completed work retains its resource until the next station can admit it: blocking after service. Outside input queues are excluded from admitted WIP.

Frame phases preserve the existing access/automatic-work precedence. Shared operators remain reserved through each access visit. Editable cycle/touch values scale phase totals. Other stations use manual work followed by unattended processing; touch time is included in cycle time.

Failure clocks advance during processing. Failed equipment waits for a shared technician, undergoes repair and resumes remaining work. Exponential operating-time failures and entered repair durations are assumptions. Scheduled pauses interrupt processing while retaining work. Different recovery policies require process-specific extensions.

Quality failures trigger bounded operator repair/recheck attempts. Unsuccessful repair causes scrap and an assumed 15-second disposal task. Accepted output occupies finite space until scheduled external collection. Counts satisfy **admitted = accepted + scrapped + WIP**. First-pass yield uses accepted-or-scrapped final dispositions, excluding unfinished rework. Unfinished resource intervals are clipped to the production horizon.

Transport time, inspection detection errors, worker travel, changeovers, absenteeism, wear/drift, flight validation and special-cause disruptions remain outside this model. Footprints exclude installation aisles and qualified safety spacing.

## Design and uncertainty

Required takt is available seconds divided by accepted demand. Resource work-content capacity is an upper bound; the event schedule includes sharing, blocking and losses. Search evaluates at most 24 designs, prioritizing demand feasibility before weighted equipment/capital, staffing and footprint. Capital is used only when every station has a price; otherwise equipment count is disclosed as a proxy. This is bounded search, without a global-optimality claim.

Selection uses seed 17. Held-out evaluation seeds are separate. Eight stochastic replications use the [NIST Wilson formula](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm) for a conditional target-attainment interval. This excludes parameter/model uncertainty and is not factory predictive confidence. Deterministic scenarios run once and receive no statistical interval.

The visual resource layout, playback and export use the same product traces. Added resources appear at the selected stations. The layout is schematic; other workbenches are concept proxies. No live physical-factory connection or qualified robot/tool geometry is claimed.
