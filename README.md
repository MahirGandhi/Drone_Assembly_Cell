# Drone Assembly Cell

A virtual automated X500-reference drone frame assembly cell, focused on fixturing, robotic handling, controlled fastening, inspection, recovery and production capacity.

The station produces an assembled frame, not a flight-ready drone. Manufacturing evidence and modeled behavior are tracked separately.

- [Sprint plan](docs/sprint-plan.md)
- [Execution status](docs/progress.md)
- [Engineering definition](docs/engineering/station-contract.md)
- [Source register](docs/sources/register.json)

## Execution

One task at a time. Each major milestone receives relevant checks and a bounded independent agent review. NVIDIA SimReady supplies selected environment assets; product/fixture geometry requires its own evidence.

Implementation is in progress. No physical station, qualified tightening process or validated throughput is claimed.

## Run the virtual prototype

```sh
npm ci
npm test
npm run dev
```

The app opens on the live overhead station. **Explore components** opens an X500 V2-inspired exploded view. Pick a component and select **Show in assembly station** to highlight its tray, fixture, screw feeder or output and read what happens there.

Change **Handling** or **Scenario** before starting a cycle to see the corresponding operation sequence or hold. **Estimate output** shows the selected cell and operator layout. **Find layout** selects the smallest evaluated layout that meets the entered target across all five samples, or reports the closest result. **Top** returns to the live cell.

[Prototype coverage and engineering limits](docs/engineering/virtual-prototype.md).

## Production studies

Open **Material supply and quality assumptions** to set kit and pallet capacities, delivery/collection intervals and a rework scenario. Zero interval uses on-demand operator service. Positive intervals represent external scheduled logistics. Repairs include recheck and recover all affected frames under the selected assumption. **Play shift** and its time slider show per-cell activity, waits and cumulative output from computed events. **Export shift study** saves inputs, timings, seeds and results.

Operator work is wrapped in modeled parking, access, exit, reset and deliberate restart. The guided option requires individual confirmations. Default playback simulates those commands. Resource scheduling reserves a worker for the whole visit.

## Native asset reproduction

Install usd-core 26.11 in an isolated Python environment and use Blender 4.3.2 for the recorded export. Run python scripts/native_asset.py, then npm run check:assets.

The script fetches only the pinned crate package, verifies each file against its published BOM, composes a metric root-referenced stage and records dependencies and static clearance controls. Vendor files and the generated station USD stay in ignored assets/local-source/simready-crate/. The report and browser mesh are versioned. The export rotates native Z-up geometry into Y-up and checks simplified bounds within 2 mm of the native envelope.

NVIDIA profile validation, contact simulation, current-kit fit, tooling qualification and physical production measurements remain open. The on-screen evidence panel and data/acceptance-matrix.json distinguish software checks from physical qualification.
