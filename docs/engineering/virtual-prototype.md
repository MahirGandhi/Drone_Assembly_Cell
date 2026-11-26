# X500 assembly cell virtual prototype

Open the overhead view, select **Start cycle**, and confirm operator work at the retained-nut preparation and cable-routing steps. All parts start in the input area. Use **Fixture** to see individual joint markers. To exercise a hold, start a new run with a fault selected, open the simulated gate, confirm corrective action, close the gate, then resume. The exported JSON includes the event sequence, screw losses, retained nuts and joint attempts.

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

Capacity uses the same operation duration list as the interactive simulation. A scheduled operator performs manual operations and a service stop of 20 s after every two frames. In each planning run, each completed route counts as good. Fault scenarios and corrective actions are available in the cycle demo. They are excluded from the shift estimates. A configuration ranking is conditional on five fixed timing samples and the available-time input.

## Environment mesh attribution

The supply crate uses [NVIDIA SimReady Assets, crate_black_a02](https://huggingface.co/datasets/nvidia/simready-assets/tree/dde58cf7c1d74896c2116a6c14a3a851bc5b58a7/crate_black_a02), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source revision: `dde58cf7c1d74896c2116a6c14a3a851bc5b58a7`. The web mesh was converted from the package geometry USD, reoriented to Y up, resized, triangulated, simplified, and assigned a new material. Physics and texture payloads are outside the browser asset. Manufacturer STEP remains local.
