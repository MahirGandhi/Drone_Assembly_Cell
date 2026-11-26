# X500 V2 reference geometry

S1.1 and S1.2 establish nominal frame geometry from the [manufacturer's STEP download](https://holybro.com/products/px4-development-kit-x500-v2) and the [assembly drawing](https://cdn.shopifycdn.net/s/files/1/0604/5905/7341/files/X500_V2_Assembly_Guide_en.pdf?v=1720853913). The STEP header identifies a July 2022 export. The hash, byte count, importer version and extracted dimensions are in [the geometry record](../../data/reference-geometry.json). The original STEP is excluded from Git because redistribution rights have not been established.

FreeCAD imported separate plates, four arm assemblies, and individual hardware. Both plates measure 143.720 × 143.720 mm in plan and 2.000 mm thick. The XYZ coordinates follow the imported assembly, with +Y up and the origin at the center of the underside of the lower plate. The imported bounds support evaluating a top-down driver approach (−Y) and nut retention below the lower plate. Driver access and the fastener head have not been verified. Sixteen screw and nut pairs have matching nominal X/Z envelope centers. Joint IDs sort by X and then Z and do not define tightening order. The correspondence between quadrant and supplier arm labels remains unverified.

The STEP labels the motor KV880 and contains a PM06 board assembly. Use the current kit listing for supplied motor identity. The STEP does not establish current motor, ESC, cable, harness, or connector clearance. No production tolerances or fixture gaps are derived from the nominal bounds. The screw and nut bounding envelopes are not thread geometry or an anti-rotation pocket profile.

## Access study for the next gate

| Operation | Nominal geometry evidence | Still needed |
|---|---|---|
| Lower plate loading | Lower face at Y = 0; joint axes published as coordinates | Confirm supported datum features and room for landing gear and rails |
| Arm seating | Four parent assembly transforms resolved | Check insertion sweep and arm variants, including motor and cable envelopes |
| Operator wiring hold | PX4 routes wiring before plate closure | Check connection access with the actual connector bodies and retained arms |
| Upper plate closure | Top plate underside at Y = 30 mm | Check cable keep-outs, operator inspection, clamp access and closure sweep |
| Fastening | Sixteen axes, screws above and nuts below | Check real driver nose and bit at each axis, and fixture reaction below |
| Extraction | Concept requires nut restraint to release in +Y | Check that pockets and clamps clear the shaft tips and completed frame |

For the fixture concept, start with vertical-access nut pockets below the lower plate and supports outside the screw-tip and nut envelopes. Keep the pockets open toward +Y so the nuts can lift out with the frame. Before counting this as feasible, check the real nut profile, engagement, cable access, fixture loading, tool envelopes and swept geometry. The joint map establishes nominal final positions. It does not establish these motion clearances.

Run the extraction with FreeCAD Python: `python scripts/inspect_x500.py /path/to/x500v2-frame.step`. The script checks four arms and 16 unique center-aligned screw/nut envelopes after resolving parent placements. It exports measurements only.

SimReady remains the source for reusable environment assets at S3.1. Select specific workbench and material-presentation assets against the eventual layout, then record each package revision, license and conversion. The frame and joint measurements above come from Holybro.
