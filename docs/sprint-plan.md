# Automated Drone Frame Assembly Cell: Review Plan

**Status: planning complete for review; implementation has not started.**

This is a plan for a virtual manufacturing station. It specifies the engineering work, software work and verification needed before we can demonstrate a credible automated assembly cell. It does not claim that the cell has already been designed, simulated or physically validated.

## 1. The goal

Build a virtual cell that repeatedly assembles a drone frame from purchased components, controls its fastening operations, detects the faults it is equipped to detect, and records the disposition of each assembly. Then allow a user to enter required good frames per shift and evaluate whether the cell, or a bounded configuration of duplicate cells, can meet that requirement.

**First product:** the Holybro X500 V2 frame architecture, used as an existing reference. Its exact part revisions and geometry must be checked in Sprint 0–1.

**First station output:** an assembled frame, not a complete flight-ready drone. Final electronics installation, software loading, propellers and flight testing belong to other stations and remain outside this project's first release.

**Why this is a manufacturing project:** the work includes fixture design, tool access, nut retention, material presentation, robotic handling, fastening control, inspection, interlocks, traceability, rework, replenishment and shift capacity. A visually attractive robot animation alone does not satisfy the goal.

## 2. Decisions fixed for this plan

| Topic | Planning decision |
|---|---|
| Work scope | Assembly automation using purchased finished parts and subassemblies |
| Main assembly | Lower plate, four motor/ESC arm modules, upper plate and specified frame fasteners |
| Inaccessible upstream work | Any parts/wiring that must precede frame closure become explicitly defined incoming work; this is resolved before robot implementation |
| Automation progression | First prove the fixture and automatic fastening with operator-loaded parts; then add robotic part loading and unloading |
| Initial material presentation | Known-position trays; operator-loaded nuts and indexed screw presentation; bulk bin picking and a custom bowl feeder are excluded |
| Candidate cell | One six-axis robot, interchangeable handling and screwdriving tools, one fixture, parts trays, output positions, controls and inspection |
| Part holding | The fixture holds the product during fastening; the robot is not assumed to hold a plate and drive screws simultaneously |
| Human work | Replenish trays, load retained nuts, handle exceptions and perform controlled recovery |
| Software | Git/GitHub for versioned source and tracking; Vercel for the web application; station logic runs independently of graphics |
| Compute | Browser/local deterministic simulation first; GPU simulation only if needed to answer a specific unresolved engineering question |
| Delivery method | One task in progress at a time; evidence required before closing each task |
| Current stop point | Present this plan for user review before creating a repository, installing project dependencies, implementing or deploying |

These are project design decisions. They are not claimed to be Holybro's production arrangements.

## 3. What must arrive at the station

| Incoming item | Condition and checks |
|---|---|
| Lower plate or prepared lower-plate subassembly | Correct revision, orientation and datum features; any required PDB/wiring or inaccessible hardware already installed upstream and documented |
| Four arm modules | Preassembled motors/ESCs; known arm identity/position, controlled loose cable routing and defined gripping surfaces |
| Upper plate | Correct revision, orientation and undamaged locating/fastening features |
| Frame screws | Official guide lists 16 M3×38 socket-cap screws for the main frame joint; actual head, handed installation, length and access must be checked |
| Matching nuts | Official guide lists 16 M3 flange locknuts; exact geometry/locking feature and retention method must be checked |
| Carrier/tray identity | A unique assembly/carrier ID linked to the active product and process revisions |

The manufacturer assembly guide is the starting reference, not a released automation drawing. Do not silently replace loose nuts with threaded inserts, shorten screws or redesign the product to make the demonstration easier. Any proposed change needs its own recorded decision and impact assessment.

## 4. Real assembly issues that must be resolved first

1. **Loose-nut retention:** show how each nut is loaded, detected or checked, prevented from turning and released when the finished assembly is lifted. A nut cannot hang in space in the model.
2. **Fastener direction and tool access:** confirm which side receives the screw and which receives the nut. Show bit, nosepiece, extension and surrounding geometry at every joint.
3. **Long-screw handling:** qualify presentation and retention for the actual M3×38 screw. A tool's advertised screw-size range alone does not prove feeding, retraction and clearance compatibility.
4. **Arm identity and cable routing:** the correct module belongs at each position; wiring must not be pinched when plates close. Define a cable parking feature or explicit upstream/operator step.
5. **Assembly retention:** the nest must maintain location while the robot changes tools and applies axial force and tightening reaction. Avoid unsupported arms or clamps that block screw locations.
6. **Downstream access:** closing the frame must not make later required assembly impossible. If it does, revise the incoming subassembly or station boundary before coding the cycle.
7. **Joint recipe:** no tightening torque is inferred just from an M3 thread. Locknut rundown resistance, joint materials, thread engagement and clamp-load requirements affect the process. Unsourced recipes remain labeled provisional.
8. **Robot feasibility:** verify joint-limited reach, tool orientation, payload/inertia, grasp stability and clearance for the actual task, not just the tool centre reaching a point.
9. **Inspection coverage:** part presence and a tool's successful return code do not prove every aspect of joint integrity. State which defects each check can and cannot find.
10. **Recovery:** define what happens to a partly assembled frame after a fault. Resetting the interface cannot delete its process history or make failed joints pass.

## 5. Proposed normal production cycle

The exact fastener direction and clamping order are frozen after CAD review. The intended sequence is:

1. Operator replenishes identified trays, loads the fixture's retained-nut positions, and prepares the cell while automatic motion is disabled.
2. Operator leaves the safeguarded working area, confirms readiness and requests a cycle. Reset and cycle start are separate actions.
3. Controller verifies active recipe, carrier ID, fixture state, material availability, tool status, clear output position and modeled access interlocks.
4. Robot picks and seats the prepared lower plate, using verified grasp and locating features.
5. Robot picks and places four identified arm modules in the defined order. Each placement is confirmed before continuing; cables remain within the approved routing condition.
6. Robot picks and seats the upper plate. The fixture clamps and confirms the assembly without obstructing tool paths.
7. Robot docks the handling tool and acquires the screwdriver. Tool identity and lock state are checked.
8. Robot obtains the correct screw from the indexed presentation and approaches the assigned joint.
9. Driver performs the approved engagement/rundown/final-tightening stages. The controller receives and stores the result for that joint and attempt.
10. Repeat for every required joint in the approved sequence. Any failed joint holds the assembly for the specified recovery/disposition.
11. Inspection checks the defined features and verifies that every required joint has an accepted result for the correct assembly and recipe.
12. Robot changes back to the handling tool, supports the assembly, releases fixture clamps and unloads to a clear accepted-product position.
13. Record the assembly as accepted only after completed inspection and unload confirmation. Otherwise preserve its hold/rework/scrap status.
14. Check replenishment requirements and readiness for the next cycle.

No battery is energized, propeller fitted or motor spun in this frame-assembly cell.

## 6. Operating logic and information

### Modes and states

Modes: automatic production, controlled setup/manual intervention, and disabled. The exact safety implementation is a future physical-engineering task; the virtual model represents its required permissions and feedback.

Production states: initialize, idle, await operator preparation, verify material, place lower plate, place arms, place upper plate, clamp, change tool, acquire screw, fasten joint, inspect, change to handling tool, unload and complete. Waiting states distinguish starved material from blocked output. Fault and emergency-stop states preserve current product and joint history.

Every transition needs a request, permission conditions, completion feedback, timeout and failure route. A command is not proof that its actuator moved. A modeled emergency-stop or access interruption inhibits motion; clearing the condition does not automatically restart the sequence.

### Minimum signals

| Device | Required command/feedback concepts |
|---|---|
| Robot | Ready, requested task, busy, task complete, task failed, position/zone status |
| Handling tool | Tool identity/lock, grip command, part held/lost, release confirmation |
| Screwdriver | Tool identity, recipe ID, ready, screw acquired, start, busy, result, fault and timeout |
| Fixture | Open/close request, open/closed feedback, locating/seating status, retained-nut condition where detectable |
| Material presentation | Tray ID, part position/availability, screw position, low stock/empty and replenishment complete |
| Inspection | Trigger, busy, result, coverage and invalid/no-result state |
| Operator/access | Preparation complete, start request, access condition, stop, acknowledge and reset |
| Output | Position available, unload requested, product transferred and full/blocked |

A virtual sensor observes the modeled world; it must not simply return true because a command was issued. Ground-truth defect state and observed detection results are distinct data.

### Records

Store run ID, assembly/carrier ID, product and recipe revisions, source/configuration versions, station ID, random seed, timestamps, state transitions, part consumption, joint ID and attempt number, tool result, inspections, faults, recovery actions and final disposition. Export a run bundle with configuration, results and event history. A replay uses recorded events; a new run gets a new ID.

## 7. Git and Vercel architecture

**GitHub:** proposed separate repository `drone-assembly-cell`; issues and milestones for the tasks below; versioned engineering documents, source manifest, configurations and application code. The name is proposed, not an existing repository claim.

**Web application:** React/TypeScript with a Vite build and Three.js rendering. A deterministic TypeScript station engine runs without the 3D view and can run capacity experiments in a worker. The 3D scene displays actual engine state; it does not independently invent production progress. Exact dependency versions are selected and locked during implementation.

**Vercel:** host the built application and approved web assets. Use branch previews for review and a deliberate production promotion after release checks. No persistent database, account system or live industrial-control connection is required for the first release; export/import files supply reproducibility.

**Higher-fidelity verification:** if needed, use Isaac Sim or another suitable robotics environment separately for a specified motion/contact question, with a compatible host and budget checked first. Exchange versioned scene/configuration/results rather than building live streaming infrastructure. A browser render is not proof of contact mechanics, clamp load or actual robot commissioning.

Proposed repository areas: engineering documents; source-asset manifest; approved product and fixture models; cell engine; device interfaces; robot kinematics/paths; web interface; scenario definitions; verification evidence; exports/examples. Large original CAD and usage rights are checked before committing binaries. Use existing suitable parts/models before making new ones.

## 8. Sprint execution rules

- There are **nine sequential sprints, S0 through S8, with seven ordered tasks each: 63 tasks total**.
- Work-in-progress limit is one. Complete or explicitly resolve a blocked task before starting the next. Do not create parallel agent tasks by default.
- Each task produces a concrete artifact and verification evidence. Every sprint ends with its listed gate.
- Sprint numbers specify order, not promised calendar weeks. CAD completeness, exact tooling and available hardware are still unknown. Calendar commitments would be invented at this point.
- Once implementation is authorized, routine choices within this plan can proceed autonomously. A geometry, scope, paid service or physical-equipment change is recorded and handled according to the user's authorization.
- No implementation sprint starts under this document until the user reviews the final plan.

## Sprint S0 — Freeze the product and station requirements

**Purpose:** establish exactly what arrives, what work is performed and what counts as accepted output.

| Order | Task and work | Deliverable and completion evidence |
|---|---|---|
| S0.1 | Register the exact X500 V2 source documents and reference revisions; distinguish old build examples from the chosen geometry. | Source register with URL, revision/date where available, access status and the specific fact supported. No mixed revisions hidden in the BOM. |
| S0.2 | Define the station boundary, incoming product state and downstream assembly needs. Resolve whether the lower plate arrives with PDB/wiring or other inaccessible items fitted. | One-page input/output contract; every operation belongs to upstream work, this cell or downstream work. |
| S0.3 | Produce the station BOM and operation-level consumption list, including fastener quantities and supplier arm modules. | BOM with quantities, identities and status; one frame's required materials reconcile with its operations. |
| S0.4 | Write the manual reference assembly route and precedence constraints using the existing guide; note access and wire-management requirements. | Ordered operation list and annotated assembly images; no robot assumptions yet. |
| S0.5 | Define accepted, held, reworked and scrapped product conditions, plus inspection coverage. | Product-quality requirements mapped to observable checks; unsupported physical performance is excluded from the pass claim. |
| S0.6 | Register engineering inputs: dimensions, mass, centre of gravity, thread/drive geometry, tightening recipe, operation times and replenishment. Mark each sourced, measured, CAD-derived or assumed. | Parameter register with units, provenance, range/status and impact. Unknowns cannot masquerade as manufacturer data. |
| S0.7 | Convert requirements to verification cases and prioritize feasibility risks. | Requirements-to-test matrix and risk register; every project claim has a proposed evidence path. |

**Gate S0:** one consistent product/station definition, explicit incoming preparation, and an auditable unknowns list. No requirement to invent missing torque or timing values.

## Sprint S1 — Prove mechanical assembly and automation feasibility

**Purpose:** prove we can hold, reach, assemble, fasten and unload the real geometry before creating a detailed simulation.

| Order | Task and work | Deliverable and completion evidence |
|---|---|---|
| S1.1 | Obtain and inspect existing CAD first. Check scale, units, revision, component separation, missing items and permitted reuse. Create simplified geometry only for a documented gap. | CAD inventory and reference-dimension checks; every proxy is labeled and excluded from unsupported clearance claims. |
| S1.2 | Define part datums, arm identities, assembly poses and a joint table for all frame screws/nuts. Establish the insertion side, head access and nut envelope. | Labeled product drawing and joint map; each fastener has one physical location and its actual mating parts. |
| S1.3 | Perform the assembly/access study: ordering, wire parking, part insertion, top-plate closure, downstream access and extraction. | Section views and a feasible sequence; access conflicts resolved before motion design. |
| S1.4 | Design the fixture: location, support, anti-rotation nut pockets, nut loading/checking, clamps and release. Address loose nuts and cable traps explicitly. | Fixture concept with loading/clamping/unloading states and clearance evidence; neither floating nuts nor blocked extraction. |
| S1.5 | Compare existing screwdriving/feeding options against the exact joint. Start with indexed screw presentation; verify length, head, bit, retention, axial travel and nose clearance. Define provisional joint-control stages. | Tool compatibility matrix and fastening concept; screw-size advertising is not used as complete proof. No unsourced final torque. |
| S1.6 | Select a candidate robot/tool arrangement from documented models. Verify payload including tooling, centre of gravity/inertia, grasp surfaces, reach, orientation and tool-change needs. Lay out operator/service access. | Candidate layout, robot/tool specification references, grasp list and reach/access evidence; choice remains rejectable if geometry fails. |
| S1.7 | Review the complete mechanical concept against product requirements and failure/recovery needs. | Design-review checklist with resolved blockers. If automation is infeasible, document the smallest justified boundary/tool change instead of hiding it. |

**Gate S1:** credible fixture, nut retention, tool access, incoming preparation and unloading solution. Robot/tool selection and remaining limitations are explicit.

## Sprint S2 — Establish the software and control foundation

**Purpose:** build a small, testable station engine and repeatable Git/Vercel workflow after plan approval.

| Order | Task and work | Deliverable and completion evidence |
|---|---|---|
| S2.1 | Create the approved repository and milestone/issue structure. Configure one-active-task workflow, reproducible local commands, automated checks and a minimal Vercel preview. | A clean checkout can run/build the minimal app; repository and deployment visibility follow the approved scope. |
| S2.2 | Define typed schemas for product, station, operation, joint, tool, sensor, material, run and result. Centralize units and coordinate conventions. | Versioned schemas and sample configuration; invalid/missing values are rejected with useful errors. |
| S2.3 | Implement the deterministic simulation clock, event queue and station state machine independently of rendering. | The same input and seed produces the same ordered results; pause/step/accelerate do not change process outcomes. |
| S2.4 | Implement device commands, permission checks, completion feedback and timeouts. Track robot, fixture, tools and operator as resources. | State-transition tests show no action completing solely because its command was sent. |
| S2.5 | Implement product/part ownership and event records. A part belongs to exactly one tray, gripper, fixture or output location. | Material and ownership invariants hold; event export identifies the active assembly and recipe. |
| S2.6 | Add essential verification: no negative inventory, duplicate joint acceptance, overlapping single-robot tasks or successful unload without a supported product. | Focused engine tests pass; invalid sequences are rejected and logged. |
| S2.7 | Provide a plain engineering interface for mode, start, stop, reset, step and state/event inspection. | A reviewer can execute a simple cycle and understand why a command is permitted or blocked. |

**Gate S2:** logic is reproducible without 3D, configuration is validated and the repository preview is usable.

## Sprint S3 — Build the station and operator-loaded baseline

**Purpose:** prove the fixture/material/control model with manually loaded parts before adding every robot movement.

| Order | Task and work | Deliverable and completion evidence |
|---|---|---|
| S3.1 | Import approved geometry and establish world, robot-base, tool, fixture, tray and part coordinate frames. Keep source CAD separate from optimized display meshes. | Scaled scene plus transform checks; rendering simplification does not change engineering datum positions. |
| S3.2 | Implement explicit operator loading and unloading permissions, durations and completion events. | Operator actions consume time/resources; loading while automatic access is prohibited cannot succeed. |
| S3.3 | Implement fixture seating, clamps and retained-nut state with separate command/feedback. | Missing/misseated parts or absent clamp confirmation prevent fastening. Fixture release preserves support requirements. |
| S3.4 | Implement known-position trays, nut/screw presentation, inventory and replenishment. | Every consumption/replenishment reconciles with stock; empty positions produce waiting or a defined fault. |
| S3.5 | Implement the screwdriver's device interface and approach/engagement concept without assuming a valid joint result. | Device states and provisional recipes are visible; result signals remain separate from the rendered tool movement. |
| S3.6 | Implement accepted output, held-product location and capacity-limited unload. | A full output location blocks release/transfer appropriately; a held product cannot enter accepted stock. |
| S3.7 | Demonstrate the operator-loaded baseline and review its work sequence and event history. | One reference frame flows through the modeled work; manual and automatic work are clearly separated. |

**Gate S3:** a coherent working station exists; parts, fixture and material flow behave correctly before full robotic assembly.

## Sprint S4 — Automate and control fastening

**Purpose:** complete a traceable automatic fastening cycle on an operator-loaded frame.

| Order | Task and work | Deliverable and completion evidence |
|---|---|---|
| S4.1 | Encode the approved joint list, fastening sequence and recipe revision. Associate every joint with its required screw/nut and fixture support. | Joint table matches the assembly; missing/duplicated positions cannot satisfy completion. |
| S4.2 | Implement screwdriver acquisition/docking and tool-lock/identity checks, with the physical access envelope established in S1. | Robot cannot drive with the wrong/unlocked tool; docking and tool changes consume explicit time. |
| S4.3 | Implement screw acquisition from indexed presentation and travel to the joint. Resolve long-screw retention/clearance and motor-wire proximity. | Screw ownership is preserved; absent screw, failed pick or obstructed path is handled explicitly. |
| S4.4 | Model engagement, rundown and final tightening as distinct operations. Represent nut locking resistance and suspicious early torque/insufficient engagement as testable cases. | Joint-result model distinguishes success from commanded torque. Synthetic signatures are labeled, not presented as measured tool curves. |
| S4.5 | Record each attempt's joint ID, recipe, reported torque/angle/depth where supported, status and failure reason. Separate instrument availability from desired data. | One joint's result cannot be applied to another assembly, location or recipe. Unsupported sensing is not fabricated. |
| S4.6 | Verify faults: missing nut, wrong screw, cross-thread-like engagement, spinning nut, tool timeout and incomplete sequence. Define their observable signatures/coverage. | Detected faults hold the cycle; undetectable conditions are recorded as coverage gaps rather than magically found. |
| S4.7 | Demonstrate complete fastening and compare modeled time with its operation breakdown and source status. | Every required joint has the proper accepted record; total process time equals accounted actions and waits. |

**Gate S4:** automatic fastening is traceable and fault-aware. A count of sixteen commands is insufficient evidence of sixteen accepted joints.

## Sprint S5 — Add robotic loading and unloading

**Purpose:** replace the baseline's defined manual part-transfer operations with feasible robotic operations, while keeping operator replenishment and exception work realistic.

| Order | Task and work | Deliverable and completion evidence |
|---|---|---|
| S5.1 | Implement the selected robot's joint model, limits, tool transforms, payload metadata and motion constraints. Use existing documented models first. | Joint-limited poses and paths are reproducible; a Cartesian animation without a valid robot configuration is not marked verified. |
| S5.2 | Implement the approved grasp and release model for lower plate, each arm, upper plate and completed assembly. Account for fingers, cables, motors and product support. | Each grasp has an approach, grip confirmation, transport, seating and release condition; held parts move with the tool. |
| S5.3 | Implement lower-plate and four-arm placement with identity checks and wire parking. Preserve the actual insertion order from the mechanical study. | Wrong arm/orientation and failed seating prevent subsequent closure; no hidden teleporting or preassembled replacement mesh. |
| S5.4 | Implement top-plate placement, fixture clamping and handoff to fastening. Tool changes must fit the actual single-robot sequence. | Fixture holds the assembly independently before the robot releases it or changes tools; clamps leave every fastening path accessible. |
| S5.5 | Verify joint paths and collision clearance throughout approach, insertion, travel and tool changes, including held product, tool and cables' defined envelopes. | Path review covers the moving envelope, not just endpoints; uncertain flexible-cable/contact behavior remains labeled. |
| S5.6 | Implement supported extraction and unload after accepted inspection. Verify nut-pocket release and grip access on the assembled product. | No fixture trapping, part loss or unload into occupied space; output transfer is recorded once. |
| S5.7 | Demonstrate the integrated normal automatic cycle and identify remaining manual tasks. | One assembly traverses all operations with consistent material, ownership, timing, joint and result records. |

**Gate S5:** the full intended automatic sequence is geometrically and logically credible. Any required external kinematic/contact check has a recorded question and result; no GPU work is launched merely for visual polish.

## Sprint S6 — Add production faults, recovery and quality control

**Purpose:** make the station behave sensibly when production does not go perfectly.

| Order | Task and work | Deliverable and completion evidence |
|---|---|---|
| S6.1 | Implement mode/access permissions, stop, emergency-stop representation, acknowledgement and deliberate restart behavior. Define retained state for each interruption point. | Closing access or acknowledging an alarm cannot silently resume motion. Product and joint history survive interruption. |
| S6.2 | Implement the fault catalogue below with explicit causes, observations, detection coverage, stop response and recovery prerequisites. | Every fault has a reproducible scenario and an observable explanation; random failure alone is not a recovery design. |
| S6.3 | Implement held/rework/scrap disposition, failed-joint attempt history and controlled return to the proper sequence point. | No unconditional retighten-until-pass behavior; intervention/replacement policy is recorded and counted. |
| S6.4 | Implement the inspection/control plan: incoming identity, seating, clamp state, fastening record completeness and final defined-feature inspection. | Each quality requirement is linked to a detector or manual check and its coverage limit. False accept/reject scenarios can be represented. |
| S6.5 | Implement operator servicing: tray refill, screw/nut refill, bit/tool checks, calibration-due condition and fault intervention. | Service actions consume operator availability, travel/service time and material. A single operator cannot service two cells simultaneously. |
| S6.6 | Verify information integrity: duplicate start, delayed/stale tool result, duplicate completion, wrong recipe and run reset during partial assembly. | The cell does not double-count parts or accept a product with mismatched/stale evidence. |
| S6.7 | Run the normal, fault and recovery demonstrations and review all dispositions and downtime attribution. | Failure cases either recover through their approved route or remain held; time and material are conserved. |

**Gate S6:** the cell works beyond the ideal animation. Interruptions, failed joints, human service and product disposition are auditable.

## Sprint S7 — Add shift capacity and demand configuration

**Purpose:** answer the original input-driven question using the same station engine that drives the visible cell.

| Order | Task and work | Deliverable and completion evidence |
|---|---|---|
| S7.1 | Define available shift time, breaks, planned service, replenishment, arrivals, output removal and timing provenance. Separate operator work, robot work, tool work and waits. | Transparent time budget and baseline operation-time breakdown; neither frame rate nor animation playback speed determines capacity. |
| S7.2 | Implement exact good/held/scrapped counts, first-pass yield, completed-cycle time, WIP, operator/robot utilization and categorized downtime. | Metrics reconcile against event records and conservation equations; denominator definitions are visible. |
| S7.3 | Model repeated cycles, finite trays and shared operator service, including starvation, blocked output and changeovers where actually included. | Capacity changes for explainable resource reasons; adding a robot does not automatically create free staffing or replenishment. |
| S7.4 | Define a bounded configuration catalogue: duplicate approved cell layouts, permitted operator counts and physical/service-space constraints. Keep product geometry fixed. | Every candidate references the approved cell; invalid layouts or insufficient resources are rejected before evaluation. |
| S7.5 | Accept required good frames per shift and evaluate candidates. Use minimum cell count, then minimum operator count as the initial explicit ranking; use cost only if defensible cost inputs are supplied. | Results show candidates, shortfalls and limiting reasons. No unsupported claim of a globally optimal factory or minimum actual cost. |
| S7.6 | Compare nominal and uncertain runs using a small fixed seed bank, the same seed set across candidates and a recorded compute cap. Expand runs only if needed to resolve an important difference. | Export sample size, distribution assumptions, sample outputs and ranking stability. A sample success rate is not labeled a guarantee or statistical confidence without the relevant analysis. |
| S7.7 | Demonstrate a low-demand and higher-demand configuration plus an infeasible request. Explain how resources, waiting and good output change. | Input changes cause a documented configuration decision; impossible requests produce a shortfall and limiting constraints rather than a fabricated solution. |

**Gate S7:** demand configuration is evidence-driven, bounded and reproducible. It includes the operator and material constraints that simple cycle-time division misses.

## Sprint S8 — Validate, document and release the project

**Purpose:** provide a reviewable engineering deliverable and a usable portfolio demonstration.

| Order | Task and work | Deliverable and completion evidence |
|---|---|---|
| S8.1 | Execute the virtual factory acceptance matrix below against pinned product, recipe, code and scenario versions. Resolve failed checks in order. | Test evidence with expected/observed outcomes and explicit unresolved limitations. |
| S8.2 | Verify the model by independent hand checks: material balance, joint counts, deterministic cycle time, waiting cases and simple bottleneck bounds. Compare with physical or documented observations when obtainable. | Explainable calculations and comparisons. Distinguish model verification from validation against a physical station. |
| S8.3 | Complete an appropriately scoped sensitivity study for the main uncertain inputs: handling time, fastening/service time, refill frequency, faults and rework. | Identify which uncertainties materially change capacity conclusions; avoid claiming precision unsupported by inputs. |
| S8.4 | Finish the engineering HMI: inspect state, follow an assembly, view joint results, inject approved faults, acknowledge/recover, compare demand cases and export runs. | Clear normal/held/fault states and readable units; a walkthrough is possible without developer knowledge. |
| S8.5 | Check web usability, asset rights, reproducible builds, capped worker runs, import validation and target-browser performance. | A clean build and representative browser run pass; exact browser/hardware and remaining performance limits are recorded. |
| S8.6 | Prepare the final Git/Vercel release, source/model manifest, engineering summary, short demonstration and portfolio case study. Keep visibility/promotion within the user's authorization. | Release candidate ties deployed source to a commit and includes setup instructions and downloadable evidence. |
| S8.7 | Review the project against its original goals, show normal/fault/demand scenarios and record final known limitations and follow-on backlog. | A reviewer can reproduce the evidence and understand which behaviors are modeled, assumed, geometrically checked or physically validated. |

**Gate S8:** reviewable release with a complete normal cycle, failure/recovery evidence, demand comparison and honest engineering limits.

## 9. Fault and recovery catalogue

These scenarios are specified now; implementation and detection coverage are completed in S4–S6. Each scenario gets a trigger, expected observations, allowed actions and a disposition. Not every listed defect is automatically detectable with the selected sensors.

| Scenario | Expected production response and recovery requirement |
|---|---|
| Lower plate missing or wrong orientation | Do not start the affected placement/assembly; correct material/seat and repeat the relevant check. |
| Arm missing, wrong identity or misseated | Hold before closure; remove/correct the module through the controlled intervention route. |
| Cable outside parking envelope | Prevent closure if the selected check can observe it; otherwise record a manual/inspection requirement and detection gap. |
| Upper plate not seated | Prevent clamping/fastening progression; correct the seating condition. |
| Nut missing or not retained | Hold on the specified observed failure or incoming check; investigate, reload/replace and preserve the failed attempt. |
| Wrong screw or failed screw pickup | Do not drive an unknown fastener; restore correct presentation and confirm acquisition. |
| Feeder/presentation jam or empty tray | Enter the appropriate starvation/fault state; consume real modeled operator service time to recover. |
| Clamp commanded closed but not confirmed | Inhibit fastening; diagnose fixture feedback or mechanics before resetting. |
| Abnormal engagement/cross-thread-like signature | Hold joint/product; apply the approved inspection and replacement route. A simulated signature is not a proven physical detector. |
| Nut spins or joint never reaches recipe criteria | Stop the attempt; preserve data and rework cause rather than repeatedly issuing the same command. |
| Tool disconnected, wrong tool or stale tool result | Reject the result/command; verify identity and communication before recovery. |
| Gripper loses part or placement fails | Stop dependent motion; establish supported product state and controlled recovery. |
| Output full | Wait in a supported condition; operator clears output through the permitted access process. |
| Access interruption or emergency stop | Inhibit relevant motion/energy in the modeled control state, retain product history and require deliberate reset/start. Physical safe behavior needs separate engineering validation. |
| Duplicate assembly ID, wrong recipe or repeated completion | Hold/reject inconsistent data; prevent double counting and retain the audit trail. |
| Sensor stuck/misread or inspection invalid | Represent invalid feedback or a detection gap; do not use hidden ground truth to produce an unjustified perfect inspection. |

## 10. Quality and fastening control plan

| Characteristic | Planned check | Evidence or limit still needed |
|---|---|---|
| Product/part identity | Recipe and identified tray/module match | Exact revisions and practical identification method |
| Frame/arm location | Fixture seating and defined visual/sensor checks | Datums, allowed fit and detector geometry |
| Wire protection | Defined parking path and observable/manual check | Real routing envelope and inspection coverage |
| Nut presence and anti-rotation | Incoming/fixture check where feasible, plus joint-process evidence | Nut geometry, pocket design and actual detection capability |
| Screw correctness | Presentation identity and acquisition check | Actual screw/head/bit dimensions and supported tool sensing |
| Fastening completion | Joint-specific process result and appropriate monitored criteria | Approved torque/angle/depth or other recipe, real instrument outputs, qualification data |
| Final assembly completeness | Reconciled material/joint records and observable final features | Required physical features and capability of the inspection method |
| Product disposition | Accepted/held/rework/scrap record tied to ID | Approved rework policy and product release criteria |

Torque-only success is not proof of correct clamp load or an undamaged joint. No universal M3 torque is inserted. For the virtual demonstration, provisional values and synthetic failure signatures can exercise control logic, but remain visibly provisional and cannot support a claim of validated joint strength.

## 11. Verification and virtual acceptance matrix

The checklist is a project acceptance specification, not a declaration of a commissioned physical cell.

| ID | Demonstration/check | Required outcome |
|---|---|---|
| V01 | Product and asset provenance | Every engineering model and important parameter has a source/status; proxies and unknowns are visible. |
| V02 | Coordinate consistency | Reference dimensions and transforms agree; no hidden unit-scale errors. |
| V03 | Assembly access | Each part insertion, nut retention, fastening approach and finished-product extraction is explained and geometrically supported. |
| V04 | Normal cycle | One frame follows the complete approved route and produces a coherent record. |
| V05 | Material balance | Initial stock + receipts = final stock + consumption/scrap, with no negative quantities or duplicate part ownership. |
| V06 | Fastener completeness | Every required unique joint has the correct accepted attempt; duplicates/missing locations cannot satisfy the requirement. |
| V07 | Tool and fixture permissions | Wrong/unlocked tool or absent clamp feedback inhibits the relevant action. |
| V08 | Missing/wrong material | The cell holds/waits through a justified detector or incoming check; no magical substitution occurs. |
| V09 | Fastening failures | Approved fault scenarios lead to hold/rework, preserving original and subsequent attempt records. |
| V10 | Access/stop/restart | Stop behavior preserves product state; reset or access closure alone cannot restart automatic work. |
| V11 | Replenishment/operator contention | Empty stock and shared service consume actual modeled waiting and operator time. |
| V12 | Blocked output | Product remains supported and unavailable capacity is reflected in results. |
| V13 | Replay and reproducibility | Identical configuration/seed yields identical process events/results; presentation frame rate does not alter them. |
| V14 | Capacity accounting | Good output, WIP, cycle times, downtime and utilization reconcile with the event history. |
| V15 | Demand configuration | Selected candidates satisfy the configured sample criterion or report shortfall; resources and constraints are disclosed. |
| V16 | Browser/headless consistency | The rendered view and non-rendered engine agree on production results for the same scenario. |
| V17 | Input handling | Invalid units, negative demand, inconsistent recipes, oversized runs and corrupted imports are rejected cleanly. |
| V18 | Independent plausibility | Deterministic time and simple resource bounds agree with hand checks; sensitivity is reported where inputs are uncertain. |
| V19 | Deployment reproducibility | A clean checkout/build identifies the deployed commit, model revision and available example scenarios. |
| V20 | Claim accuracy | Portfolio wording distinguishes a virtual station, verified logic/geometry and any genuinely completed physical validation. |

## 12. Capacity definitions

- **Required production pace:** available production time divided by required good frames. This is a planning target, not a measured cell cycle time.
- **Cycle time:** report both the work content of one normal cycle and actual intervals between accepted completions; waits, servicing and rework are visible.
- **Good output:** frames meeting this station's defined acceptance conditions. It is not a count of flight-ready drones.
- **First-pass yield:** frames accepted without a rework attempt divided by frames processed, with the precise denominator documented.
- **Utilization:** time a named resource is occupied divided by the stated available time. Robot, screwdriver and operator are not interchangeable resources.
- **Downtime:** distinguish planned service, fault recovery, starvation and blocked output instead of burying all waiting in one availability multiplier.
- **WIP conservation:** assemblies entering = accepted + scrapped + assemblies still held/in process at the end, accounting for any explicitly modeled transfers.
- **Cell replication:** dividing shift time by a normal cycle gives a bound, not a complete multi-cell capacity calculation. Shared service and material/output constraints must be simulated.
- **Uncertainty:** label deterministic assumptions, measured distributions and scenario-based faults separately. Use fixed seeds and comparable scenarios. Never present a sampled result as guaranteed production.

Default configuration scope is deliberately bounded: select among duplicate approved cells and allowed staffing/layout options. Arbitrary factory generation, automatic product redesign, autonomous safety engineering and a cost optimizer without cost inputs remain outside the first release.

## 13. Required engineering deliverables

1. Product/station requirements and input/output contract.
2. Source register, asset manifest, parameter/evidence register and revision history.
3. Station BOM, operation list, joint map and precedence constraints.
4. Fixture, nut-retention, cable-parking and part-presentation concepts.
5. Candidate robot, gripper, screwdriver and tool-change compatibility assessment.
6. Cell layout with operator, service, guarded-motion and output envelopes.
7. Control states, I/O/handshake definitions, interlock conditions and timeout/fault table.
8. Quality/control plan, rework rules and traceability schema.
9. Normal/fault scenario set, verification evidence and virtual acceptance results.
10. Cycle-time/shift-capacity breakdown and bounded demand-configuration comparison.
11. Git repository, reproducible setup, approved Vercel release and exportable examples.
12. Portfolio case study showing engineering decisions, one normal cycle, one fault/recovery and one demand change.

## 14. Open engineering inputs and how they will be resolved

| Input not yet established | Resolution task | Impact if unresolved |
|---|---|---|
| Exact CAD contents, revision and units | S1.1–S1.2 | No detailed geometry/reach claim |
| Accessible incoming lower-plate state | S0.2, S1.3 | Station boundary and sequence cannot be frozen |
| Actual screw/nut geometry and insertion direction | S1.2, S1.5 | Feeding, nut retention and fastening approach remain provisional |
| Joint tightening recipe and qualification | S0.6, S1.5, S4.4 | Control behavior can be demonstrated using labeled assumptions; joint strength/true process capability cannot be claimed |
| Nut retention, loading and release solution | S1.4 | Blocking mechanical issue; do not implement a falsely feasible automatic cycle |
| Robot/tool mass, inertia and model compatibility | S1.6, S5.1 | Payload/motion verification incomplete |
| Grasp geometry and arm cable envelope | S1.3–S1.6, S5.2 | Handling/collision claims incomplete |
| Measured operation and replenishment times | S0.6, S7.1 | Capacity is scenario-based rather than a validated prediction |
| Failure/rework occurrence and duration | S6, S7.6, S8.3 | Uncertainty must remain visible; no invented reliability |
| User GPU and local hardware capability | Only when an external verification task is justified | Do not assume Isaac Sim is available or commission paid compute |
| Asset usage/redistribution rights | S1.1, S8.5 | Hold redistribution of unclear assets; use an authorized alternative or linked source |
| Numeric physical acceptance and safety settings | Mechanical/process qualification for an actual build | Virtual interlocks/tests do not constitute physical certification |

An unresolved engineering measurement is not an excuse to invent it. The plan is complete when the task, evidence needed, consequence and permitted provisional behavior are specified; the actual measurement belongs to its execution sprint.

## 15. Work deliberately deferred

Component manufacture; semiconductor/battery-cell research; motors winding or machining; complete-drone avionics installation; flight dynamics; AI vision training; reinforcement learning; bulk bin picking; custom screw/nut feeder development; warehouse/AGV systems; arbitrary facility generation; multi-user databases; accounts; billing; live PLC/robot connection; and physical commissioning. These can be separate projects if later authorized.

The optional future extension most connected to the current goal is comparing manual loading with robotic loading using the same verified fastening cell. The first release already contains the staged models needed for that comparison; additional features do not precede the core acceptance gates.

## 16. Primary references checked for this plan

These sources establish reference assembly facts or available capabilities. All sprint structure, architecture, control requirements, proposed fixture design and acceptance criteria are project engineering decisions, not copied manufacturer specifications.

- [Holybro X500 V2 exploded assembly guide](https://cdn.shopifycdn.net/s/files/1/0604/5905/7341/files/X500_V2_Assembly_Guide_en.pdf?v=1720853913): product structure and main-frame hardware. It does not provide a qualified automated tightening recipe.
- [PX4 X500 V2/Pixhawk 6C build guide](https://docs.px4.io/main/en/frames_multicopter/holybro_x500v2_pixhawk6c): manual reference assembly, arm placement and the need to consider wiring access before closure. Product/firmware revisions still need reconciliation.
- [OnRobot screwdriver](https://onrobot.com/en/products/onrobot-screwdriver): example of existing screwdriving tooling, detection and CAD availability. The current page distinguishes maximum supported screw length from the shorter fully retracted transport condition; neither is blanket proof for our joint or feeder.
- [Atlas Copco torque and angle](https://www.atlascopco.com/en-uk/itba/expert-hub/articles/torque-and-angle): basis for considering joint behavior and monitored fastening, not a torque specification for this product.
- [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects): issue-linked boards and iteration tracking.
- [Vercel Git deployments](https://vercel.com/docs/git): branch previews and production deployment workflow.
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations): reason to specify the web/compute boundary explicitly rather than assume an unrestricted long-running simulation host.
- [Vite guide](https://vite.dev/guide/): proposed web build workflow; exact versions selected during implementation.
- [Three.js documentation](https://threejs.org/docs/): proposed browser scene/rendering layer; it does not provide automatic manufacturing or robot validation by itself.
- [NVIDIA Isaac Sim](https://developer.nvidia.com/isaac/sim/) and [requirements](https://docs.isaacsim.omniverse.nvidia.com/latest/installation/requirements.html): optional external robotics/sensor/physics verification capability with separately checked host requirements.

**Review stop:** this document completes the requested planning work. No repository, implementation, deployment or compute job has been created under this plan.

