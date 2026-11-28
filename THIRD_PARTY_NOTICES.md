# Reused software and data

Scheduling uses seven runtime modules from Bernardo Castilho's published **SimScript 1.0.37**, https://registry.npmjs.org/simscript/-/simscript-1.0.37.tgz. Repository: https://github.com/Bernardo-Castilho/SimScript.

`vendor/simscript/SOURCE.json` preserves original metadata, archive digest and original/normalized file digests. Line endings are normalized to LF; runtime logic is unchanged. `index.js` is a local three-export adapter. The local package omits the upstream documentation/compiler dependencies. Upstream package metadata declares ISC; the repository's MIT notice is included in `vendor/simscript/LICENSE`. Original metadata and copyright notices are retained.

The **AI-PRISM assembly-duration benchmark** is by Angela Lago Alvarez, Tampere University / AI-PRISM, version 1, https://doi.org/10.5281/zenodo.15340717. License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The importer checks four manual-workstation files and derives 913 positive within-row intervals. Samples in `data/public-process-evidence.json` are divided by their file means; original files remain outside tracked source. This transformed appliance-testing benchmark is an optional analog scenario. It is not measured drone timing/reliability, and independent resampling removes learning and serial dependence.

Three.js remains the rendering library. NVIDIA SimReady attribution, pinned revision and conversion records remain in `data/asset-manifest.json`. Original product CAD remains linked and hashed rather than redistributed.
