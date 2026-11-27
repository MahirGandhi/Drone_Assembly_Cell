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
