# Reference process route — revision A

The source manual is a manual build reference. This station route is a project proposal requiring S1 geometry review. No qualified cycle times are available.

| Operation | Work and predecessor | Resource | Completion evidence |
|---|---|---|---|
| OP10 | Receive prepared lower assembly, arm kit, plate, screws and nuts | Operator | Correct revision/kit and carrier ID |
| OP20 | Replenish trays and load retained nuts; follows OP10 | Operator, fixture | Preparation record; fixture positions checked |
| OP30 | Verify readiness; follows OP20 | Controller | Active recipe, safe access state, tools/material/output ready |
| OP40 | Load prepared lower assembly; follows OP30 | Operator initially; robot at S5 | Supported and located lower assembly |
| OP50-FL/FR/RL/RR | Place four identified arms; each follows OP40 and previous placement | Operator initially; robot at S5 | Correct identity and seating at each arm |
| OP60 | Park robot, enter controlled operator access; follows all four OP50 | Robot, operator, fixture | Automatic motion disabled; parts supported |
| OP70 | Connect required arm power leads, route wires and park downstream tails; follows OP60 | Operator | Routing/connection checklist, explicit completion |
| OP80 | Operator exits; acknowledge access state and deliberately resume; follows OP70 | Operator/controller | Separate reset/resume permissions |
| OP90 | Place upper plate; follows OP80 | Operator initially; robot at S5 | Plate seated, wires clear |
| OP100 | Clamp and confirm; follows OP90 | Fixture | Closed feedback and maintained support |
| OP110 | Acquire/verify screwdriver; follows OP100 | Robot/tool changer | Correct tool ID and lock |
| OP120-J01..J16 | Acquire screw, approach, engage, run down and tighten each joint; follows OP110 and required joint order | Robot, driver, screw presentation | One individual result per required joint/attempt |
| OP130 | Inspect product and reconcile all joint evidence; follows all required OP120 | Inspection/controller | Defined checks valid; complete accepted joint set |
| OP140 | Change to handling tool, support product, release fixture, unload; follows OP130 acceptance and available output | Robot initially or controlled operator baseline | Supported extraction and transfer confirmation |
| OP150 | Complete record and check next-cycle resources; follows OP140 | Controller | Accepted count incremented exactly once |

## Precedence and feedback

Commands and feedback are distinct. OP100 cannot complete from the clamp command alone. OP120 cannot complete from issuing sixteen drive commands. OP130 cannot accept a duplicate/stale result. OP140 cannot release an unsupported product or overwrite full output.

S3/S4 use the operator-loaded baseline; the robot only handles the tool path that has been verified. S5 substitutes robotic part transfers without deleting operator preparation, cable routing, replenishment or recovery.

## Rework route

Any failed operation preserves assembly and attempt IDs, stops dependent work and holds the product. Diagnose under controlled access, inspect/replace the affected part as the approved policy requires, record consumed replacement stock and return to the correct predecessor. No blanket retry-until-pass. An aborted assembly remains WIP or receives an explicit scrap/transfer disposition.

## Geometric review checklist

S1 will annotate actual source/CAD views for arm insertion, cable paths, screw side, nut retention, bit/nosepiece clearance and extraction. No annotated geometry is claimed complete by this route table.

Sources: PX4-X500-6C and HB-FRAME-GUIDE. OP10–OP150 identities, cell boundaries and control rules are project decisions.
