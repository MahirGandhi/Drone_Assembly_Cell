# Exploded view and line explorer verification

| Check | Result |
| --- | --- |
| Product selection | Browser rendering showed an exploded model. Clicking a motor selected the matching BOM group. Assemble and Explode fully changed the slider and model. Choosing landing gear showed Kitting, Preparation and Outgoing inspection. |
| Line inputs | The default 420-minute shift produced 120 good frames with one assembly cell and one operator. Two cells with one operator produced 217. Average queue in front of assembly fell from about 2.9 frames to zero. |
| Output target | The planner selected two cells and one operator for 145 good frames. At the same release cadence it reported that a 2,000-frame target was outside the searched configurations. |
| Mobile | At 375 CSS pixels, the page stayed within the viewport. The station table scrolled independently and part selection and target planning worked. |
| Cell integration | Opened the existing cell workspace, started a cycle and confirmed an operator step. The cell resumed running. The review browser used the vector product renderer because WebGL was unavailable. |
| Automated checks | Nine tests passed, including the five existing cell checks. The Vite production build succeeded. |

The independent reviewer ran 1,200 seeded scenarios across both handling modes and found no accounting or queue-capacity violation. Two review findings were corrected and rechecked. The UI distinguishes the nominal capacity limit from the simulated queue and labor metrics. The fallback product renderer uses ambient lighting for surfaces outside the directional light.

The model assumes nominal service times and deterministic reject routing. Physical timing, fit and clearance remain outside this verification.
