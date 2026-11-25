# Station input/output contract — revision A

Status: concept baseline for CAD feasibility review, not a released physical process.

## Purpose and output

Assemble an X500 V2-reference frame using the lower-plate subassembly, four identified motor/ESC arm modules, upper plate and 16 specified screw/nut pairs. Output is a frame accepted against this station's checks; it is not a complete or flight-qualified aircraft.

## Upstream work

The prepared lower-plate subassembly includes the reference guide's rail/board supports, PDB mounting, accessible power-module routing and landing gear as needed for the manual sequence. Their exact revision and geometry will be checked in S1. These are not silently removed from the scene to make robot access easy. Upstream also supplies complete arm modules, identified trays, screws, nuts and a carrier/assembly identity.

Each arm's motor, ESC and structural arm/mount connections arrive complete. The factory does not manufacture or assemble those internal modules in this project.

## Work inside this cell

1. Operator replenishes known-position trays and loads fixture-retained nuts. Nut presence is an explicit preparation check; automatic detection is not presumed.
2. Controller verifies carrier/product/recipe identity, resource readiness, preparation status and empty output position.
3. Handling sequence loads the prepared lower plate and the four correct arm modules onto supported locating features.
4. **Cable preparation hold:** robot parks and automatic motion is disabled under the modeled access procedure. Operator connects the required arm power leads to the prepared PDB, routes and secures wiring, and parks free signal tails for downstream avionics. Exact connector access is checked in S1. No energized battery is present.
5. Operator exits and confirms routing. Access reset and deliberate cycle resume are separate actions. This service consumes operator time and cannot occur simultaneously with other work assigned to that operator.
6. Upper plate is placed; fixture locates and clamps the assembly independently of the robot.
7. Automatic screwdriver acquires and installs each specified fastener in the approved sequence. Each joint attempt gets an individual result. Nut reaction is taken by the fixture, not an invisible second gripper.
8. Defined inspection and process-record checks determine accept/hold. Robot supports the product before clamps release and unloads to an available output position.

The initial S3/S4 baseline uses operator loading and automatic fastening. S5 replaces supported part-transfer operations with robotic handling. The cable preparation hold remains explicit unless a documented engineering change proves it can be eliminated. This is a hybrid real-world assembly concept, not a claim of fully unattended production.

## Downstream work

Remaining avionics installation/connections, battery installation, firmware/calibration, propellers and flight validation remain downstream. S1 must verify those operations are still accessible after this cell's frame closure. If closure prevents required work, revise the incoming state or sequence before implementing the robot cycle.

## Material and product disposition

- A unique assembly ID follows the product from first loading through accepted output, hold/rework or scrap.
- An accepted assembly requires all required parts, unique accepted results for all required joints, valid inspection evidence and confirmed unloading.
- Held product remains identified and supported. Acknowledging an alarm does not turn it into accepted product.
- Rework preserves failed attempts, authorizes the necessary inspection/replacement and returns to the correct step. Repeated blind retightening is not the recovery policy.
- Scrap or removed consumables are counted. Replacement material cannot be created by resetting the UI.

## Open blocking checks for S1

Prepared lower-plate and landing-gear envelope; arm insertion and identity; cable connector/tool/finger access; nut loading/anti-rotation/release; screw direction and head geometry; all 16 tool approaches; clamping/support; downstream access; grasp/extraction. These are explicit feasibility requirements, not completed validation.

## Scope guard

Purchased components and modules; one cell with known-position presentation; mechanical assembly automation and a modeled human wiring service. No semiconductor/cell/material manufacture, flight simulation, bulk bin picking or live robot control.

Basis: HB-FRAME-GUIDE and PX4-X500-6C in the source register for manual assembly facts. Station division, manual cable hold and fixture concept are project engineering decisions.
