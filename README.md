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

Use **Top** for the overhead view, **Isometric** for the full cell, or **Fixture** for fastening detail. [Prototype coverage and engineering limits](docs/engineering/virtual-prototype.md).
