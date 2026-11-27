# Supply asset and access study

The asset manifest pins the source revision and records the existing browser derivative's SHA-256, dimensions, topology, conversion limits and unverified native-USD status. Builds check the local file against the manifest. A source-revision-format check does not authenticate the upstream package.

The placement study uses the recorded resized mesh bounds and a project-defined operator-access envelope at the modeled gate. It translates those bounds into the same Y-up scene frame and calculates the Euclidean gap between axis-aligned boxes. Box overlap is reported as an obstruction, rather than a negative distance. The editable gap is an assumed design requirement.

The original rear position gives 3130.3 mm of bounding-box separation. The deliberate gate obstruction gives 0 mm. Ten tests and the production build passed. The added tests cover the obstruction control, allowance boundary, touching boxes and invalid geometry. Asset integrity checks passed.

Independent review identified a stale placeholder in shift-layout snapshots and the risk of reporting geometry checks while the visible asset was unavailable. The loader now updates the live bin, snapshot and repeated bays together. Checks require a successfully loaded crate. Renderer failure terminates the loading badge.

Browser QA could not finish because the preview browser timed out while reconnecting. Native USD/profile validation, real crate dimensions, physical access requirements and collision checks against the complete station remain open. This study establishes a bounded calculation and a deliberately failing example using the current visualization.
