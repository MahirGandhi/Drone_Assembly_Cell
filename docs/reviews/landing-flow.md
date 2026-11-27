# Landing and component flow review

Implemented the product/process/production entry routes, component-system filtering, isolation, camera selection and selected-part process context. Corrected the battery deck's incoming state to match the station contract and removed an absolute locknut retention claim.

Checks: existing 16 tests passed; asset checks and production build passed. A scoped read-only review found hidden-object raycasting and filter/selection inconsistency. Both were corrected: raycasts now include visible component groups only, and a model selection reveals its list entry.

Browser execution was attempted. The local Chromium wrapper has no executable; the official Playwright browser download returned HTTP 403. The available cloud browser could not reach the local server. These changes have not yet received a rendered-browser check in this environment. Do not describe this milestone as browser-verified.
