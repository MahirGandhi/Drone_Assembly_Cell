# Nominal assembly access study

The [access script](../../scripts/check_x500_access.py) uses the same manufacturer STEP hash as the [joint map](../../data/reference-geometry.json). It resolves component placements and intersects test solids with the reference arm geometry in FreeCAD. The [results](../../data/reference-access.json) record positive intersection volumes above 0.00001 mm³. That threshold filters numerical noise in this check and is not a production tolerance.

| Check | Result | Design implication |
|---|---|---|
| Lower the upper plate along −Y with four nominal arms prepositioned | No detected overlap at 50, 25, 10, 5 or 2 mm above final position. At 1 mm and at final seating, one feature per arm intersects the plate. Per feature the computed volumes are approximately 0.093 and 0.186 mm³, respectively. | Investigate the four matching features before accepting rigid vertical closure. The result could reflect intended fit or CAD interference. It does not establish the real cause or imply a modification. |
| Approach the 16 nominal fastening positions from +Y | A hypothetical cylinder of 5 mm radius and 50 mm length above each screw envelope returned zero intersections against the upper plate and arm solids. | A top approach remains a candidate for the tool study. Check actual nose and bit geometry, engagement, clamping and tool motion when available. |

These are discrete checks of an assumed sequence. They omit flexible leads, actual connectors, fixture, robot and surrounding equipment. The closure test excludes the main frame fasteners and does not test arm insertion or downstream service access. The bare cylinder starts above the screw envelope and does not test tool contact or screw pickup.

## Closure discrepancy

The same imported feature family, HMX5V-JIBI-JIA-MUJU, overlaps in each arm. Keep the overlap in the source record. Determine whether the feature is relevant to the current kit by checking the arm connector and plate together against an actual assembly or dimensioned drawing. Until then, any upper plate motion in the simulation is provisional. The model cannot use this test to report a collision-free physical closure.

To reproduce with FreeCAD Python:

```sh
python scripts/check_x500_access.py assets/local-source/x500v2-frame.step data/reference-geometry.json
```
