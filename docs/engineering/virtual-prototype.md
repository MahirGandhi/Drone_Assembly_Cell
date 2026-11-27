# X500 assembly cell virtual prototype

Select **Start cycle** to play one frame through the station. The operator loads retained nuts and routes the arm leads. Both tasks consume modeled time. Select **Confirm operator steps** before starting if you want to authorize each operator task yourself. While the cycle runs, the blue ring follows the active work. **Pause cycle** holds the current step, pose and counters until **Resume cycle**. Use **Fixture** to inspect the joint markers. To exercise a hold, start a new run with a fault selected, open the simulated gate, confirm corrective action, close the gate, then resume. The exported JSON includes the event sequence, screw losses, retained nuts and joint attempts.

The modeled output pallet must have room before the unload starts. During unload the fixture retains the frame through the approach. At 22% of the assumed transfer duration the model confirms the handler's grip and opens the clamps. The handler owns the frame until it reaches the pallet and the output count increments. This timing split describes the display sequence. It has no measured hardware timing behind it.

| Sprint | Reviewable prototype evidence | Remaining evidence |
| --- | --- | --- |
| S0 | Existing station contract, BOM, route and quality requirements | Supplier changes remain tracked separately |
| S1 | FreeCAD reference coordinates, 16 probe checks and the recorded closure intersections. The scene represents an elevated nest, retained nuts, support, and clamps | Current kit fit, cable envelope, extraction clearance and selected robot/tool qualification |
| S2 | Vite production build, headless cell engine, deterministic time, command and feedback records, UI and test suite | Real device integration |
| S3 | Operator-loaded route, known-position trays, retained-nut and clamp feedback, output position, environment geometry | Fixture design release and real replenishment measurement |
| S4 | Sixteen individual joints with separate screw pickup, approach, rundown, tightening and feedback | Instrumented torque/angle curves, real bit and feeder verification |
| S5 | Robot-assisted handling route, visible articulated display, handoff to operator for wire service and supported unload condition | Manufacturer robot model, validated grasps, joint limits, and swept collision checks |
| S6 | Ten selectable faults, held state, restart interlock, modeled emergency stop, correction and event export | Remaining full fault catalogue, physical detection coverage and formally validated recovery procedures |
| S7 | Six bounded cell/operator configurations, shared service, assumed pallet/replenishment time and five seeded timing variations | Measured cycle inputs and failure/recovery rates |
| S8 | Automated checks, browser review interface, deployment packaging and this evidence map | Physical acceptance and production qualification |

The 3D arm is an articulated display model. Its geometry and paths are provisional. Plate and arm meshes are independently drawn visualization proxies. The fixture view uses STEP-derived coordinates for the sixteen joint markers. Plate closure in the browser is an assumed animation. The previously reported STEP intersections remain unresolved. The modeled driver feedback uses scripted events rather than torque or force measurements.

Capacity uses the same operation route as the interactive cell, including access and restart work. A worker is reserved for the full visit. Finite kits and pallets, logistics timing and rework affect throughput. Repairs are a declared scenario that recovers affected frames. Shift playback uses computed event intervals and accepted-output timestamps. Detailed fault scenarios remain separate from the shift quality-rate assumption.

The normal routes total 192.6 modeled seconds with robot handling and 220.6 with operator handling. These are assumed work contents. Guided interaction pauses simulation time while awaiting the user. Actual factory waiting needs measurement.

The native crate workflow opens the pinned vendor root with usd-core 26.11, verifies package files, composes a metric Z-up stage and checks two clearance controls. A reproducible Blender export generates the browser mesh. data/native-asset-report.json records dependency resolution, schemas and bounds. NVIDIA profile validation and physics remain pending.

## Environment mesh attribution

The supply crate uses [NVIDIA SimReady Assets, crate_black_a02](https://huggingface.co/datasets/nvidia/simready-assets/tree/dde58cf7c1d74896c2116a6c14a3a851bc5b58a7/crate_black_a02), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source revision: `dde58cf7c1d74896c2116a6c14a3a851bc5b58a7`. The web mesh was converted from the package geometry USD, reoriented to Y up, resized, triangulated, simplified, and assigned a new material. Physics and texture payloads are outside the browser asset. Manufacturer STEP remains local.
