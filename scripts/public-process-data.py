"""Import a small, checksummed public assembly benchmark; never relabel it as X500 data."""
import csv
import hashlib
import io
import json
from pathlib import Path
import statistics
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
RECORD = "https://zenodo.org/api/records/15340717"


def fetch(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        result = response.read(200_001)
    if len(result) > 200_000:
        raise ValueError("Unexpected benchmark size")
    return result


def seconds(value):
    fields = value.strip().split(".")
    if len(fields) != 3:
        raise ValueError("Expected H.MM.SS timestamp")
    hours, minutes, secs = map(int, fields)
    if not 0 <= minutes < 60 or not 0 <= secs < 60:
        raise ValueError("Invalid timestamp")
    return hours * 3600 + minutes * 60 + secs


def main():
    metadata = json.loads(fetch(RECORD))
    if metadata["metadata"]["license"]["id"] != "cc-by-4.0":
        raise ValueError("Review changed license before importing")
    profiles, multipliers = [], []
    cache = ROOT / ".cache/public-process"
    cache.mkdir(parents=True, exist_ok=True)
    for entry in sorted(metadata["files"], key=lambda item: item["key"]):
        if entry["key"] not in [f"MW{i}.csv" for i in range(1, 5)]:
            continue
        raw = fetch(entry["links"]["self"])
        if "md5:" + hashlib.md5(raw).hexdigest() != entry["checksum"]:
            raise ValueError("Benchmark checksum mismatch")
        (cache / entry["key"]).write_bytes(raw)
        durations, rejected = [], 0
        for row in csv.DictReader(io.StringIO(raw.decode("utf-8-sig")), delimiter=";"):
            try:
                duration = seconds(row["Stop"]) - seconds(row["Start"])
                if duration <= 0:
                    raise ValueError("Nonpositive duration")
                durations.append(duration)
            except (ValueError, KeyError, TypeError):
                rejected += 1
        mean = statistics.mean(durations)
        multipliers.extend(round(value / mean, 6) for value in durations)
        profiles.append({"file": entry["key"], "sourceChecksum": entry["checksum"],
                         "sha256": hashlib.sha256(raw).hexdigest(), "records": len(durations),
                         "excludedRows": rejected, "meanSeconds": mean,
                         "medianSeconds": statistics.median(durations),
                         "minSeconds": min(durations), "maxSeconds": max(durations)})
    result = {"schemaVersion": 1, "source": "https://zenodo.org/records/15340717",
              "doi": "10.5281/zenodo.15340717", "license": "CC-BY-4.0",
              "author": "Angela Lago Alvarez, Tampere University / AI-PRISM",
              "context": "Silverline appliance assembly: manual functional-test workstation",
              "method": "Positive Stop minus Start within each row; normalize by each file's mean; pool samples. No cross-row clock differences.",
              "permittedUse": "Optional analog sensitivity scenario for manual task variability",
              "limits": "Different product and task. Not measured drone times, failure rates or quality. Independent resampling does not preserve learning or serial dependence.",
              "profiles": profiles, "manualMultipliers": multipliers}
    destination = ROOT / "data/public-process-evidence.json"
    destination.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Imported {len(multipliers)} positive intervals from {len(profiles)} verified files")


if __name__ == "__main__":
    main()
