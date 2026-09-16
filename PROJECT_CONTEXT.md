# Project Context

This project executes the handoff in `docs/blender-to-web-project-handoff.html`.

The important contract is not a generic model viewer. Blender creates three distinct harmonic strap meshes and exports them as GLB. Three.js loads that GLB and gives each band its own runtime pivot. Pointer motion updates independent rotation-vector springs; it does not rotate the whole sculpture as one object.

The generated concept image guides appearance only. Mesh topology, clearances, frame closure, and dynamics come from the corrected mathematics in the handoff and `config/sculpture-parameters.json`.

No Chase skill, Blender Agent Studio, Blender MCP, image-to-3D service, purchased model, React app, or external workflow framework is used.
