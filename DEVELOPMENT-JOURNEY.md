# Development Journey — "Three-Band Energy Sculpture" from mathematical handoff to interactive browser object

**Date:** 2026-09-15
**Deliverable:** `http://127.0.0.1:4186/` and the local `three-band-energy-sculpture\energy-demo` project folder
**Brief:** "Read blender-to-web-project-handoff.html" followed by "can you execute this end-to-end from create the image to the final interactive website"
**Final render/artifact:** [`evidence/screenshots/browser-energy-sculpture-final-warm-silver.png`](evidence/screenshots/browser-energy-sculpture-final-warm-silver.png)

> **Reconstruction note:** This document was requested after the main build turn had been summarized. It is reconstructed from the original handoff, the surviving conversation record, source files, generated assets, reports, screenshots, and the live local site. Exact errors are quoted only where the original text survived. This is not a silent reconstruction from memory.

## 1. The brief — execute the handoff, not merely explain it

The starting artifact was [`docs/blender-to-web-project-handoff.html`](docs/blender-to-web-project-handoff.html). It was a specification, not a finished project. Its own status box said that no concept image, Blender script, `.blend`, GLB, or interactive site yet existed.

The requested result was a complete local data transformation:

`prompt -> concept pixels -> Blender Python -> Blender scene -> GLB -> Three.js objects -> GPU rendering -> interactive canvas`

The visible object had to be a mathematically generated sculpture with exactly three independent bands around a luminous core. The bands had to respond differently to the pointer. Rotating one root object would have failed the central requirement.

The handoff also fixed the implementation boundaries:

- Use an image-generation tool for the first concept image.
- Use Blender as the actual 3D authoring stage.
- Use Blender Python and a parameter file for reproducible geometry.
- Export a real `.blend` and `.glb`.
- Load the GLB with plain Three.js.
- Give each imported band its own runtime pivot and spring state.
- Run the result on a local server and verify it in a real browser.
- Preserve the concept, source, intermediate assets, final assets, and evidence.
- Do not use Chase's skill, Blender Agent Studio, Blender MCP, an image-to-3D service, a purchased model, React, or an external workflow framework.
- Do not publish publicly without a separate request.

The visual design was specific. The outer band should read as dark titanium blue, the middle as warm silver, and the inner as graphite with a cyan accent. The concept image could guide silhouette and lighting, but the equations and clearance constraints had authority over geometry.

The user later added two decisive browser comments:

> "the bands here are nothing like the Three-Band Energy Sculpture. let us make it the Three-Band Enery Sculpture"

> "the band movement is too small relative to the mouse motion."

Those comments changed the final geometry, orientation, materials, title, camera framing, and pointer gain.

## 2. Cold start — turn a specification into a runnable local project

The session began in the local project workspace. The handoff had to be read as source because its inactive tabs were only visually hidden; all eight sections remained in the HTML.

The environment probe established the actual local tools:

- Windows with PowerShell.
- Blender at a user-local Blender `5.2.1 LTS` installation.
- Blender `5.2.1 LTS`, hash `9e2066aef7ef`, build date `2026-08-25`.
- Python launcher `3.13.5`.
- Node `v22.22.0` and npm `9.9.4`.
- A bundled reference project containing a compatible local Three.js distribution.
- No working local Playwright installation for this project.

The implementation reused the existing Blender-to-web package layout instead of inventing a second structure. The fresh project was created under `three-band-energy-sculpture`, while the runnable deliverable lives in `three-band-energy-sculpture\energy-demo`.

The full handoff was copied into `energy-demo\docs` so the project would retain its governing specification. A compact [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) records the one-sentence contract: Blender authors three distinct bands; Three.js loads them and animates separate pivots.

The project is not a Git repository. No commit or push was possible, and none was fabricated for this record.

No subagents were spawned. The work was done inline by one Codex task using the built-in image generator, local command execution, Blender's own Python runtime, and browser computer use.

## 3. Design decisions

### Image-guided procedural modeling, not image-to-mesh conversion

Three options existed: generate geometry directly in Three.js, use an image-to-3D service, or construct the object procedurally in Blender. Direct Three.js geometry would have skipped the requested Blender-to-GLB transformation. Image-to-3D was explicitly prohibited and could not guarantee three clean, separately named, manifold bands. Blender Python won because it made the mathematics executable and the output editable.

The concept image therefore had a deliberately limited job: establish the visual target. [`references/concept-to-geometry.md`](references/concept-to-geometry.md) states the rule learned here: **when appearance and topology disagree, the math wins.**

### Deterministic parameters outside the construction code

Band radii, widths, thicknesses, harmonics, twists, materials, and sample counts live in [`config/sculpture-parameters.json`](config/sculpture-parameters.json). The generator in [`scripts/create_asset.py`](scripts/create_asset.py) reads those values and produces all durable 3D outputs.

This separation was chosen because the handoff explicitly required a reproducible parameter source. Hard-coding the whole design into browser JavaScript lost because it would make the GLB incidental rather than authoritative.

### Swept superellipse straps with closed transported frames

Each band is a closed harmonic centerline swept with a rounded rectangular, superellipse-like section. The construction transports a local frame along the curve and distributes the residual seam rotation before welding the loop.

The alternative was a simple torus or round tube. That would have been easier, but it would not resemble a wide twisted energy strap and would discard the handoff's mathematical identity.

The canonical geometry is computed in web-style Y-up coordinates, converted into Blender using `(x,y,z)_web -> (x,-z,y)_Blender`, and exported with `export_yup=True`. One explicit conversion avoided the common double-axis correction between Blender and glTF.

### Conservative shell separation instead of runtime collision solving

The bands use nested radial shells with analytically bounded movement. This won over a physics engine because the requested motion is restrained, the scene contains only three controlled rigid parts, and conservative clearances are cheaper to verify.

The final radii are `4.6`, `2.75`, and `1.45`, with widths `0.95`, `0.70`, and `0.52`. Their moving shell bounds retain at least the handoff's `0.03` margin between adjacent bands.

### Imported GLB hierarchy plus browser-side pivots

Blender exports `OuterBand`, `MiddleBand`, `InnerBand`, `CoreSphere`, and optional node objects under `EnergySculpture`. The browser finds those names and reparents each band beneath `OuterPivot`, `MiddlePivot`, or `InnerPivot`, all centered in the same assembly frame.

Animating the imported mesh roots independently won over rotating `EnergySculpture`. The latter would have looked interactive while violating the user's most important requirement.

### Fixed-step spring motion

Pointer coordinates are normalized, passed through the handoff's response matrices, and converted into per-band rotation-vector targets. A fixed-step damped spring evolves each pivot toward its target. This keeps the response inertial and avoids direct pointer snapping.

The initial mapping was mathematically sound but visually timid. The final browser code keeps the matrices and applies `POINTER_GAIN = 2.35`. This preserved relative band behavior while making hand movement visibly consequential.

### Plain local web stack

The website uses HTML, CSS, JavaScript, the official `GLTFLoader`, and vendored Three.js files. A 46-line Node server binds only to `127.0.0.1` and serves static files with `Cache-Control: no-store`.

React, Vite, a CSS framework, a physics engine, bloom, and cloud hosting were all left out. They did not help prove the Blender-to-GLB-to-Three.js pipeline.

### Browser material tuning is documented, not disguised as export fidelity

The GLB preserves named PBR materials, but Blender and Three.js do not produce identical pixels under different lights and tone mapping. The browser deliberately retunes imported materials in `tuneImportedMaterials()`:

- `MAT_Outer`: dark blue, metalness `1.0`, roughness `0.24`.
- `MAT_Middle`: warm silver, metalness `0.38`, roughness `0.22`.
- `MAT_Inner`: graphite/cyan, metalness `0.86`, roughness `0.26`.
- `MAT_Core`: cyan-white emission with intensity `2.3`.

Replacing the imported materials wholesale would have hidden whether Blender's asset contract survived. Tuning the named materials retained that traceability.

## 4. The real crux — mathematical validity was not enough

The handoff organized execution into six gates. The build followed them in order, but the user feedback exposed a seventh reality: passing geometry checks does not guarantee that the sculpture reads correctly.

### Gate 1 — generate and inspect the concept

The image-generation prompt was saved verbatim in [`references/image-generation-prompt.txt`](references/image-generation-prompt.txt). It asked for exactly three separate nested metallic straps, a luminous cyan/white sphere, wide rounded rectangular sections, a neutral studio background, no text, no extra rings, and no impossible intersections.

The built-in Codex image generator produced [`references/concept.png`](references/concept.png). The result was treated as appearance evidence, not topology evidence. There was no claim that pixels had been automatically reconstructed into hidden 3D surfaces.

The concept-to-geometry note was written before modeling. It records which source controls which decision:

- Concept image: silhouette, palette, strap readability, lighting target.
- Parameter JSON and equations: topology, clearances, frame closure, twists, and motion.

### Gate 2 — build the Blender asset

[`scripts/create_asset.py`](scripts/create_asset.py) creates the full scene in a fresh headless Blender process. For each band it:

1. Samples the harmonic centerline.
2. Computes tangent vectors.
3. Transports a normal/binormal frame around the loop.
4. Measures and distributes seam mismatch.
5. Applies the configured full twist and harmonic twist modulation.
6. Sweeps a rounded rectangular section into vertices and quad faces.
7. Creates a named mesh, object, and material.
8. Applies the band's assembly orientation.
9. Adds the central sphere and optional small nodes.
10. Saves the `.blend`, preview renders, fallback image, and geometry report.

The final orientations are intentionally different:

- Outer band: identity orientation.
- Middle band: `rot_z(-14 degrees) @ rot_x(62 degrees)`.
- Inner band: `rot_z(45 degrees) @ rot_y(acos(1/sqrt(3)))`.

The middle band did not start there. Its earlier edge-on orientation made a mathematically valid warm-silver ribbon read as a black vertical blade. Rotating it to an oblique pose fixed the visual interpretation without changing its topology.

Blender rendered three inspection views: [`blender-three-quarter.png`](evidence/screenshots/blender-three-quarter.png), [`blender-front.png`](evidence/screenshots/blender-front.png), and [`blender-side.png`](evidence/screenshots/blender-side.png).

### Gate 3 — export and inspect the GLB

Blender's bundled glTF exporter wrote [`public/models/energy-sculpture.glb`](public/models/energy-sculpture.glb) with Y-up export enabled. The final file is `830652` bytes and has SHA-256:

`4188ddbdf812b9efbf3d079c6616da0f286571a2378bb54ad42b8655a3e220d5`

The binary header was inspected as glTF magic `0x46546c67`, version `2`. The GLB JSON exposed the expected nodes:

`CoreSphere`, `InnerBand`, `MiddleBand`, `Node_0`, `Node_1`, `Node_2`, `Node_3`, `OuterBand`, `EnergySculpture`

It also retained `MAT_Core`, `MAT_Inner`, `MAT_Middle`, `MAT_Node`, and `MAT_Outer`.

Each band contains `4608` vertices and `4608` quad faces, or `9216` triangles if triangulated. All three report finite vertices, zero non-manifold edges, and positive minimum quad area.

Frame endpoint closure errors are below `1e-7` for the two transported basis vectors. The reported pre-correction close angle is not itself the acceptance metric; the corrected endpoint basis errors are.

### Gate 4 — build the plain Three.js page

[`public/src/main.js`](public/src/main.js) loads the GLB with `GLTFLoader`, checks the named hierarchy, tunes imported materials, constructs the three pivots, creates explicit lights and camera framing, and renders the assembly.

[`public/src/interaction.js`](public/src/interaction.js) owns the pointer response matrices, nonlinear input mapping, `2.35` pointer gain, fixed-step spring state, reset behavior, and motion limits.

The web runtime data flow is:

1. Browser requests the GLB from the local server.
2. `GLTFLoader` parses bytes into Three.js scene objects.
3. Named band meshes are attached to centered pivots.
4. Pointer and scroll events update targets, not geometry.
5. Fixed simulation steps update per-band rotation and translation state.
6. Quaternions are applied to the individual pivots.
7. Three.js converts scene state into WebGL draw work.
8. The browser composes the canvas with the title, status, controls, and pipeline explanation.

The site exposes Pause, Reset, Pulse, and Wireframe controls. The click pulse begins at the core and moves through inner, middle, and outer bands. A static Blender render is available as a fallback.

### Gate 5 — test, receive criticism, and rebuild

The first browser pass loaded and moved, but the user rejected its identity. The screenshot showed thin, generic loops rather than three broad energy straps. This was not a CSS problem. The underlying Blender widths and proportions were wrong for the intended visual language.

The geometry was rebuilt with wider sections and more generous radii. The middle band was moved away from an edge-on pose. Browser lighting gained a strong key, hemispheric fill, cyan rim, and front light. Camera and assembly positions were adjusted so the sculpture occupied the canvas without covering the title or controls.

The page title changed from `Three Mathematical Bands` to `Three-Band Energy Sculpture`. That was more than copy editing: it restored the artifact's intended identity.

The second criticism concerned motion scale. The browser was receiving pointer motion and all three pivots were changing, but the visible angular response was too small. Increasing a single shared gain to `2.35` fixed the root cause without rewriting each response matrix.

The final warm-silver material pass prevented the middle ribbon from collapsing visually into another black band. The best neutral screenshot is [`browser-energy-sculpture-final-warm-silver.png`](evidence/screenshots/browser-energy-sculpture-final-warm-silver.png). The motion state is recorded in [`browser-energy-sculpture-final-motion.png`](evidence/screenshots/browser-energy-sculpture-final-motion.png).

**Rule learned:** validate semantic resemblance after numerical validity. A closed manifold can still be the wrong sculpture.

### Gate 6 — deliver a reproducible project

The final project contains the concept and prompt, parameter JSON, Blender generator, editable `.blend`, exported GLB, fallback render, vendored Three.js runtime, web source, local server, geometry report, browser report, Blender previews, and browser screenshots.

The local launch is intentionally small:

```powershell
cd <project-root>\energy-demo
node server.cjs
```

The page is then available at `http://127.0.0.1:4186/`.

The Blender asset can be rebuilt with:

```powershell
$BlenderExe = '<path-to-blender.exe>'
& $BlenderExe --background --python-exit-code 1 --python .\scripts\create_asset.py
```

## 5. Tools and features used

| Tool or feature | What it did in this session |
|---|---|
| `blender-to-web-project-handoff.html` | Supplied the pipeline, equations, hierarchy contract, build gates, and acceptance tests. |
| Codex image generation | Created the first concept image from the saved prompt. |
| Blender `5.2.1 LTS` | Executed the procedural generator, saved the editable scene, rendered previews, and exported GLB. |
| Blender `bpy` and `mathutils` | Created meshes, materials, transforms, cameras, lights, and reports without external geometry packages. |
| Blender glTF exporter | Serialized the selected asset hierarchy into one uncompressed `.glb`. |
| Three.js | Rendered the imported scene and provided the object, quaternion, lighting, camera, and WebGL abstractions. |
| `GLTFLoader` | Parsed GLB bytes into named Three.js runtime objects. |
| Plain HTML/CSS/JavaScript | Built the interface, interaction, diagnostics, responsive layout, and controls. |
| Node `http`, `fs`, and `path` | Served the static site on loopback with no web framework. |
| Codex in-app browser/computer use | Performed actual pointer drags, clicks, scroll interaction, screenshots, and visual inspection. |
| PowerShell and local command execution | Verified installed versions, ran Blender headlessly, inspected files, and checked the live HTTP endpoint. |
| `dev-journey` Claude skill | Defined the structure and honesty requirements for this reconstructed development record. |

No paid service, API quota, or cloud deployment was used. No rate limit or credit ceiling was hit. The image generation tool did not expose a per-image cost in the surviving record.

## 6. What went wrong, and the fixes

1. **The starting artifact looked complete but was only a specification.**

   The handoff was a polished interactive HTML document, which made it easy to confuse documentation with implementation. Its status text explicitly prevented that wrong conclusion: no image, Blender asset, GLB, or site existed yet. The fix was to treat every stated deliverable as an execution gate requiring a file or observed behavior.

2. **The first sculpture passed technical checks but failed the user's visual test.**

   The first browser result read as three thin loops. The user said, "the bands here are nothing like the Three-Band Energy Sculpture." The fix was not a decorative overlay. Band widths increased, radii were rebalanced to preserve shell clearances, the middle orientation changed, materials were retuned, and framing was revised.

3. **The middle band looked like a dark blade.**

   Its edge-on pose hid most of the warm-silver face. More light alone would not reliably reveal a surface pointed away from the camera. The orientation changed to `rot_z(-14 degrees) @ rot_x(62 degrees)`, then the web material was warmed to `0xf1e5ca` with restrained emission.

4. **Pointer response was real but too small.**

   This was a scale problem, not an independence problem. The final diagnostic already showed different values for all three bands, so replacing the spring model would have been unnecessary. A single `POINTER_GAIN = 2.35` amplified the shared input while retaining different signs and inertias.

5. **The preferred browser test stack was unavailable.**

   Local Playwright was missing. Installing a new test framework was unnecessary because the Codex in-app browser could drive the actual page, expose state, and capture screenshots. The limitation is that this produced one browser/environment check, not a cross-browser matrix.

6. **One screenshot attempt failed.**

   The surviving exact error was: `Unable to capture screenshot`. Page state was checked again and the capture was retried successfully. The lesson was: **a screenshot failure is not evidence of a render failure; inspect live state before diagnosing the canvas.**

7. **One drag endpoint was outside the viewport.**

   A target at horizontal coordinate `735` exceeded the `734`-pixel-wide test viewport. The drag was repeated at `690`. This mattered because an out-of-bounds automation gesture could have been misread as weak application response.

8. **Blender emitted a deprecation warning.**

   The exact surviving text was: `DeprecationWarning: 'Material.use_nodes' is expected to be removed in Blender 6.0`. It did not block Blender `5.2.1 LTS`, asset creation, or export. The current generator remains valid for the verified version; a Blender 6 migration should remove reliance on that setter.

9. **The browser and Blender did not match pixel for pixel.**

   Metallic materials appeared darker under the browser's initial lighting. The fix was explicit web lighting and documented named-material tuning, not a claim that glTF guarantees renderer-identical pixels.

10. **A tempting wrong conclusion was nearly available from the early screenshot.**

    The site could have been called "working" because it loaded a GLB and animated. The user's critique showed that behavioral correctness and design correctness are separate acceptance gates. The build was reopened instead of defending the first technically valid render.

## 7. Verification

Verification used generated reports, file inspection, live HTTP checks, real browser input, diagnostics, and saved screenshots. A clean process exit alone was not treated as proof.

### Artifact checks

- [`assets/energy-sculpture.blend`](assets/energy-sculpture.blend) exists as the editable Blender source.
- [`public/models/energy-sculpture.glb`](public/models/energy-sculpture.glb) has a valid glTF 2.0 header, expected names, size `830652` bytes, and recorded SHA-256.
- [`evidence/geometry-report.json`](evidence/geometry-report.json) records finite vertices, zero non-manifold edges, positive minimum face areas, frame closure, shell bounds, Blender version, coordinate convention, and preview paths.
- Three Blender viewpoints were rendered, not only a hero angle.
- The concept image and its exact generation prompt are both retained.

### Browser checks

The local URL returned HTTP `200`. The page reported:

`Loaded GLB: three independent bands, core, and optional nodes.`

The page title, status, canvas, fallback, and four controls were observed in the in-app browser. Pointer drag, click, scroll, and wireframe states were exercised. Screenshots were captured for neutral, motion, pulse, wireframe/scroll, and successive visual refinements.

After retuning, one real pointer interaction produced these distinct rotation vectors:

```json
{
  "OuterBand": [0.0092, 0.1824, 0.0057],
  "MiddleBand": [0.0873, -0.1133, 0.0755],
  "InnerBand": [-0.0984, -0.3672, 0.1354]
}
```

A later drag from `[430,360]` to `[690,250]` produced pointer `[0.664,0.327]` and another distinct state:

```json
{
  "OuterBand": [-0.0484, 0.2939, -0.0115],
  "MiddleBand": [-0.3185, -0.1194, 0.0796],
  "InnerBand": [0.2879, -0.3463, 0.3516]
}
```

That is direct evidence that the root object is not the only moving transform.

### Acceptance status against the handoff

| ID | Status | Evidence or limitation |
|---|---|---|
| A1 | Pass | Real generated concept plus saved prompt. |
| A2 | Pass | Executed Blender generator, `.blend`, GLB, and three preview renders. |
| A3 | Partial | Manifold edges, finite vertices, and positive face areas verified. Full nonadjacent triangle self-intersection and explicit outward-normal tests were not implemented. |
| A4 | Pass | Transport-frame endpoint errors below `1e-5`; previews show no visible seam jump. |
| A5 | Pass | Unique band/core nodes and distinct named materials inspected in the GLB. |
| A6 | Pass with documented deviation | Imported materials survived; deliberate browser retuning is listed above and in source. |
| A7 | Partial | Real drag diagnostics prove independent signs and gains. The full center/left/right/top/bottom capture set was not preserved. |
| A8 | Partial | Fixed-step dynamics and return targets are implemented. No formal `30/60/144 Hz` numerical comparison report was retained. |
| A9 | Partial | Scroll separation and pointer behavior were exercised; exhaustive start/middle/end numeric bounds were not retained. |
| A10 | Partial | Pulse interaction and screenshots were observed. A formal timestamp trace of core-to-inner-to-middle-to-outer was not saved. |
| A11 | Pass | Pause, Reset, and Pulse controls were exercised in the browser; reset clears runtime state in source. |
| A12 | Partial | One Y-up conversion is explicit and final renders are correctly oriented. No separate axis-marker artifact was preserved. |
| A13 | Pass | Actual model rendered with no reported GLB/module error; screenshots inspect the result. |
| A14 | Source-verified only | Visibility handling exists in the runtime, but no retained hidden-tab/resume timing capture proves it. |
| A15 | Partial | Native buttons are keyboard reachable and reduced-motion behavior is present. No physical touch-device test was run. |
| A16 | Partial | A static fallback and error path exist. A deliberately missing-GLB/WebGL-disabled test was not retained. |
| A17 | Pass for this machine | Fresh project builds and runs without prohibited skills or services. Portability to another Windows machine was not tested. |

### What was not verified

- No cross-browser test across Chrome, Edge, Firefox, and Safari.
- No physical phone or tablet test.
- No multi-GPU or formal performance benchmark.
- No exhaustive mesh self-intersection solver.
- No public deployment.
- No clean-room rebuild on a second computer.

These omissions do not prevent the local demo from running, but they prevent broader compatibility claims.

## 8. Where things stand

The complete local demo is live at `http://127.0.0.1:4186/` while the local server is running. A current probe during documentation returned HTTP `200`.

The final deliverable includes:

- [`references/concept.png`](references/concept.png)
- [`references/image-generation-prompt.txt`](references/image-generation-prompt.txt)
- [`config/sculpture-parameters.json`](config/sculpture-parameters.json)
- [`scripts/create_asset.py`](scripts/create_asset.py)
- [`assets/energy-sculpture.blend`](assets/energy-sculpture.blend)
- [`public/models/energy-sculpture.glb`](public/models/energy-sculpture.glb)
- [`public/index.html`](public/index.html)
- [`public/styles.css`](public/styles.css)
- [`public/src/main.js`](public/src/main.js)
- [`public/src/interaction.js`](public/src/interaction.js)
- [`evidence/geometry-report.json`](evidence/geometry-report.json)
- [`evidence/browser-report.md`](evidence/browser-report.md)
- Blender and browser screenshots under [`evidence/screenshots`](evidence/screenshots)

Knowledge is split deliberately:

- The full original requirements remain in [`docs/blender-to-web-project-handoff.html`](docs/blender-to-web-project-handoff.html).
- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) records the architectural invariant.
- [`README.md`](README.md) gives launch and rebuild commands.
- The evidence directory records measured geometry and observed browser behavior.
- This document records how the build actually happened, including corrections and incomplete checks.

The project stands without public hosting, bloom, a framework, or a physics engine. The most valuable next work would be acceptance closure rather than more visual decoration: automate the full A7 pointer matrix, compare fixed-step dynamics at multiple render rates, force the GLB failure path, and run a physical touch-device test.
