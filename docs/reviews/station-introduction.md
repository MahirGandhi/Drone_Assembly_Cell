# Station introduction verification

| Check | Evidence |
| --- | --- |
| Baseline restoration | The revert has the same file tree as the original overhead station revision, `631003c`. The correction starts from that tree. |
| Component handoff | The browser opened on the original overhead station. Choosing frame screws in the exploded view returned to Overhead, highlighted the feeder and identified its role in fastening. |
| Full browser cycle | Confirmed retained-nut loading and arm-lead routing. The cycle finished in 176.6 simulated seconds with 16 accepted joints, one kit consumed and one accepted frame. |
| Layout to output | With the target blank, a 420-minute shift estimated 135 good frames for one cell and 256 for two cells sharing one operator. Both rendered layouts used per-cell counts from the shift simulation. |
| Output to layout | A target of 300 good frames selected three cells with one shared operator. A target of 2,000 showed the closest evaluated layout and its shortfall. The four bays rendered in the same station viewport. |
| Regression checks | Six automated tests passed, covering both handling modes, all listed fault recoveries, emergency-stop behavior, horizon and shared-operator checks, and per-cell planning totals. The production build succeeded. |

A read-only reviewer found two interface issues. Demand is now optional when estimating output and required when finding a layout. Per-cell output and operator wait are also shown in readable text beside the layout. Both fixes passed targeted re-review.

Browser checks used the vector rendering fallback. Shift output is modeled from nominal operation times and five timing samples. Physical fit, tool clearance, and factory capacity require separate validation.
