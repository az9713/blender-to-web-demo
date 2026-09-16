# Browser Verification Report

URL tested:

```text
http://127.0.0.1:4186/
```

Observed page state:

- Page title: `Three-Band Energy Sculpture`
- Status text: `Loaded GLB: three independent bands, core, and optional nodes.`
- Controls visible and keyboard-reachable as buttons/checkboxes: Pause, Reset, Pulse, Wireframe.
- Static fallback image exists at `public/images/fallback.png`.

GLB inspection:

- Magic/version/length: `0x46546c67`, version `2`, length `830652`.
- Nodes: `CoreSphere`, `InnerBand`, `MiddleBand`, `Node_0`, `Node_1`, `Node_2`, `Node_3`, `OuterBand`, `EnergySculpture`.
- Materials: `MAT_Core`, `MAT_Inner`, `MAT_Middle`, `MAT_Node`, `MAT_Outer`.
- Meshes: `CoreSphereMesh`, `InnerBandMesh`, `MiddleBandMesh`, `Node_0Mesh`, `Node_1Mesh`, `Node_2Mesh`, `Node_3Mesh`, `OuterBandMesh`.

Pointer behavior check:

After retuning the sculpture and increasing pointer gain, a real browser drag over the canvas reported distinct nonzero rotation vectors:

```json
{
  "OuterBand": [0.0092, 0.1824, 0.0057],
  "MiddleBand": [0.0873, -0.1133, 0.0755],
  "InnerBand": [-0.0984, -0.3672, 0.1354]
}
```

This confirms the browser is not merely rotating the root object.

Screenshots:

- `evidence/screenshots/browser-neutral-fixed.png`
- `evidence/screenshots/browser-pointer-final.png`
- `evidence/screenshots/browser-wire-scroll.png`
- `evidence/screenshots/browser-energy-sculpture-final-warm-silver.png`
- `evidence/screenshots/browser-energy-sculpture-final-motion.png`
- Blender previews: `blender-three-quarter.png`, `blender-front.png`, `blender-side.png`

Remaining caveats:

- Browser verification was done in the Codex in-app browser, not across multiple physical GPUs or phones.
- Full nonadjacent triangle self-intersection testing is not implemented; the bands are manifold by construction and pass conservative inter-band shell bounds.
- Performance numbers are local browser-frame render timings from diagnostics, not a formal GPU benchmark.
