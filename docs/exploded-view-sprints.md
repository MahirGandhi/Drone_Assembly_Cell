# Exploded view and manufacturing line

Build one portfolio interaction in the existing assembly-cell application. Select an X500 V2-inspired component, see where it enters the frame route, then change a line input and measure what happens to output and queues.

| Sprint | Work | Acceptance |
| --- | --- | --- |
| 1. Product and scope | Define component families, quantity and assembly ownership. Use the existing station BOM and manufacturer references for the part inventory. | Separate purchased modules, upstream preparation, in-cell work and downstream integration. |
| 2. Exploded view | Create original product meshes, a controlled explosion and linked part selection. | Assemble and explode the same model. Every listed family can be selected from the BOM and every visible part from the model. |
| 3. Line simulation | Model kitting, preparation, existing cell operations, outgoing inspection and rework. Add finite queues and shared operators. | Prove material balance and reproduce assembly, kit release and inspection limits by changing inputs. Compare nominal capacity with simulated queues and staff wait. |
| 4. Experiments | Connect the BOM trace to the route, compare baseline and scenario KPIs, and search for configurations that meet demand. | One flow covers part selection, station trace, queue diagnosis, input change, KPI delta and target planning. No feasible result must be an explicit outcome. |
| 5. Verification | Run model checks, build the app, review it independently and check the desktop/mobile flow. | Save verification evidence, list assumptions and identify the tested revision. |

The product illustrates the X500 V2 architecture with custom display geometry. The line ends at accepted frame output. The view includes downstream hardware for product context. The line explorer uses assumed durations, release rates and first-pass rejection. It models staffing and flow from the existing assembly operation sequence. Physical fit, qualified cycle times and robot clearance remain engineering verification work.

Product references are recorded in the [source register](sources/register.json) and [station BOM](../data/station-bom.json). This plan extends the [assembly-cell plan](sprint-plan.md).
