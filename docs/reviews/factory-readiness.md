# Factory readiness review

Reviewed revision a07ce2c on product-line-explorer. Three agents reviewed the supplied NVIDIA SimReady library, manufacturing methods and owner acceptance in sequence. No physical trials, native USD validation or physics runs were performed by this review.

## Decision

Approve a bounded feasibility study. Defer production equipment, robot-loading investment and throughput commitments until the evidence gates below pass. The existing prototype demonstrates controls and manufacturing-planning software. Its physical assumptions require measurement.

## Agent 1 — Library workflow

The browser uses one NVIDIA crate as an environmental prop. Its 184,236-byte JSON contains only positions and indices, with 2,892 vertices and 7,472 triangles. The loader generates normals and applies a blue material. The resized derivative carries no native physics, semantic or unit metadata and supplies no process feedback. A fallback box remains after loading failure.

The derivative SHA-256 is cf36bf0ee31f7d0d59efa210c817d3ff14019bf1d819aa862b474d23f1bfc624. Attribution records source revision dde58cf7c1d74896c2116a6c14a3a851bc5b58a7 and CC BY 4.0. A reproducible converter and machine-readable manifest remain missing. The parameter register's simready_asset_commit remains null.

| Exact tutorial or reference | Project application and required proof |
| --- | --- |
| [Immutable NVIDIA crate revision](https://huggingface.co/datasets/nvidia/simready-assets/commit/dde58cf7c1d74896c2116a6c14a3a851bc5b58a7) | Pin the native root USD and its dependencies. Record actual hashes, license, variants and declared conformance scope. Packaging conformance alone cannot qualify a grasp or clearance. |
| [OpenUSD Referencing Layers](https://openusd.org/release/tut_referencing_layers.html) | Reference the vendor root from a separate station layer. Preserve dependency paths and source layers. Demonstrate a reproducible fresh open. |
| [OpenUSD units](https://openusd.org/release/api/group___usd_geom_linear_units__group.html) and [up axis](https://openusd.org/release/api/group___usd_geom_up_axis__group.html) | Record metersPerUnit, upAxis, default prim and world bounds. Verify the browser coordinate transform with known directions and distances. |
| [NVIDIA scene validation](https://docs.omniverse.nvidia.com/simready/latest/validate-a-simready-scene.html) and [schema validation](https://docs.omniverse.nvidia.com/simready/latest/simready-schema-validation.html) | Inventory actual collider, physics, material and semantic properties. Save tool/profile/rule versions, failures and skipped checks for the intended use. |
| [NVIDIA contact-based pick and place](https://huggingface.co/blog/nvidia/simready-assets-robot-pick-and-place) | Later contact-handling study. Its known-pose example and collision scope require separate validation for the frame, gripper and station. |
| [Isaac Sim Robot Assembler](https://docs.isaacsim.omniverse.nvidia.com/6.2.0/robot_setup/assemble_robots.html) | Later integration of a supported robot and tool, with known payload and explicit software release. Record placement and failure results. |

The first engineering application should compare two replenishment-bin placements against a defined refill/cart route, removal sweep and access envelope. Derive allowances from selected hardware and uncertainty. Report closest features, minimum separation, required clearance, units and dimension provenance. Deliberately obstruct the route and verify failure. Resolve bounding-box overlap with a narrower geometry check where needed. Check the chosen layout against a physical mock-up when available.

The checked default Python environment lacks pxr. The checked executable paths lack usdchecker, usdcat, Isaac Sim and nvidia-smi. FreeCAD and Blender executables and a local manufacturer STEP are available. Native validation needs a suitable runtime. No installation, GPU job or paid service was performed.

## Agent 2 — Manufacturing realism

Establish a measured manual benchmark using a hand-loaded fixture and traceable handheld driver. Pilot operator loading and wiring with guarded automatic fastening once fit and joint acceptance are proven. Compare robot loading against that pilot before investing in it. Both current handling modes already automate fastening.

| Gate | Current finding | Required evidence |
| --- | --- | --- |
| Frame closure | The imported 2022 STEP has four intersections near upper-plate seating. | Confirm current kit revision and mating features. Record unforced assembly with gear, PDB and leads present. Resolve interference and downstream access. |
| Fixture | Supports, clamps and nut markers are proxies. | Datum scheme, tolerance chain, clamp/driver load paths, plate deflection and upward-releasable anti-rotation nut pockets. Demonstrate repeated loading and extraction. |
| Presentation and driver | A predetermined rack presents screws. Idealized tool probes omit actual tooling and wires. | Trial actual M3×38 screws, drive, retained pickup, bit, nose and stroke. Challenge missing/double pickup, lost screws and jams. Check every approach and withdrawal. |
| Joint acceptance | Internal predicates produce simulated acceptance. | Characterize locknut prevailing resistance and seating using calibrated torque–angle traces and independent joint evidence. Challenge cross-threading, spinning nuts and false seating. |
| Wiring and access | One assumed 16-second task covers physical connection, routing and inspection. | Model verified stop/access, connection, inspection, exit, reset and deliberate restart. Competently validate safeguards before powered trials. |
| Material flow | Service assumes 20 seconds after every two frames. | Measure refill, walking, output pickup, faults and rework. Define finite tote capacities and pull signals. Validate predictions on pilot data withheld from calibration. |

Method references include the [Holybro frame guide](https://cdn.shopifycdn.net/s/files/1/0604/5905/7341/files/X500_V2_Assembly_Guide_en.pdf?v=1720853913), [PX4 build guide](https://docs.px4.io/main/en/frames_multicopter/holybro_x500v2_pixhawk6c), [Carr Lane locating methods](https://www.carrlane.com/product/locating-pins/fixture-keys/fixture-locating-pins), [Atlas Copco tightening monitoring](https://www.atlascopco.com/en-us/itba/expert-hub/articles/torque-and-angle) and [OSHA robotics technical guidance](https://www.osha.gov/otm/section-4-safety-hazards/chapter-4). They support method selection. Actual station acceptance needs application-specific evidence.

The model schedules 176.6 seconds per robot-handled frame and 204.6 per operator-handled frame, with 24 and 81 seconds of operator content. Both contain 105.6 assumed seconds of fastening. These values have no measured production-capability basis.

| Manufacturing KPI | Definition and evidence |
| --- | --- |
| Takt | Net available production seconds / required good frames. Declare breaks, demand and service convention. |
| Good output rate | Accepted unloads / stated shift hours. Retain serialized events and time boundaries. |
| First-pass yield | First-pass accepted / first-pass dispositions. Define the denominator and report open WIP separately. |
| Touch labor | Allocated operator work minutes / good frames. Include service and rework under a defined allocation. |
| Utilization | Named resource busy time / available time. Declare staffing and denominator. |
| Waiting and downtime | Time by resource and reason, separating staffing, starvation, blocked output, service and faults. |

Reconcile opening WIP plus starts against accepted output, scrap/transfers and closing WIP. Count held product once. Check throughput against cell and operator work-content bounds. Compare held-out pilot prediction error against a predeclared tolerance. Five seeded timing variations cannot establish a measured uncertainty distribution. OEE needs a defensible ideal cycle and loss definitions.

## Agent 3 — Strict owner acceptance

The owner would approve a limited feasibility scope with an agreed spending cap and acceptance criteria. Release an automatic-fastening pilot separately. Its evidence must precede robot loading.

| Order | Required evidence | Hold or reject condition | Recruiter skill evidence |
| --- | --- | --- | --- |
| 1 | Signed production brief and matched manual benchmark | Demand, revision, scope, acceptance or shift basis remains assumed | Requirements and work measurement |
| 2 | Witnessed product/fixture build | Unexplained force, trapped leads/nuts, damage or blocked extraction | Datum drawing, calculations and repeatability |
| 3 | Qualified fastening trial | Known defect can pass or limits lack corroboration | Sixteen indexed traces and a challenged failure |
| 4 | Verified access and recovery | Gate closure restarts motion, loss of support or invalid feedback releases product | I/O sequence, risk assessment and witnessed tests |
| 5 | Serialized operator-loaded pilot | Defect escape, missing history or output misses the requirement | Measured versus predicted output, yield and labor |
| 6 | Justified robot/library integration | Motion/service path fails or added investment cannot beat the pilot | Supported robot study, native asset manifest and obstruction test |
| 7 | Cost and reproducible handoff | Conservative demand/yield misses the owner's hurdle or service needs the author | Comparable quotes, sensitivity, procedures and independent rebuild |

The owner agent reran all eight tests successfully at a07ce2c. This supports the exercised software behavior. All 20 formal acceptance-register entries remain marked not-run and require evidence links and status reconciliation.

Costs require actual installed quotes for tooling, driver/feeding, safeguarding, integration, commissioning, training, calibration, spares, maintenance and downtime. Count labor savings only where staffing reduction or useful redeployment is credible. Incremental simple payback uses installed incremental cost divided by positive annual net cash benefit. No monetary estimate was invented.

The strongest single exhibit would follow one physical frame from fixture loading through all 16 joint records, a deliberately rejected attempt, recovery and final inspection. Factory-connected operation also needs equipment data mapping, timestamps, state reconciliation and measured-versus-modeled validation. These remain future work.

## Recommended next milestone

Deliver the production brief, a native-USD replenishment-layout proof and a fixture/closure feasibility package. Record missing demand, tooling, acceptance limits, physical timing and cost inputs explicitly. Release subsequent pilots against the gates above.
