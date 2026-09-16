import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "sculpture-parameters.json"
ASSETS = ROOT / "assets"
PUBLIC_MODELS = ROOT / "public" / "models"
PUBLIC_IMAGES = ROOT / "public" / "images"
EVIDENCE = ROOT / "evidence"
SCREENSHOTS = EVIDENCE / "screenshots"

for path in (ASSETS, PUBLIC_MODELS, PUBLIC_IMAGES, EVIDENCE, SCREENSHOTS):
    path.mkdir(parents=True, exist_ok=True)


def load_params():
    with CONFIG.open("r", encoding="utf-8") as f:
        return json.load(f)


def rot_x(a):
    c, s = math.cos(a), math.sin(a)
    return Matrix(((1, 0, 0), (0, c, -s), (0, s, c)))


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return Matrix(((c, 0, s), (0, 1, 0), (-s, 0, c)))


def rot_z(a):
    c, s = math.cos(a), math.sin(a)
    return Matrix(((c, -s, 0), (s, c, 0), (0, 0, 1)))


def web_to_blender(v):
    # Handoff convention: (x,y,z) Blender -> (x,z,-y) web, so inverse is (x,-z,y).
    return Vector((v.x, -v.z, v.y))


def rho(band, u):
    return band["R"] * (
        1
        + band["epsilon"] * math.cos(band["m"] * u + band["phi"])
        + band["eta"] * math.sin(band["n"] * u + band["psi"])
    )


def centerline_base(band, u):
    r = rho(band, u)
    return Vector((r * math.cos(u), r * math.sin(u), band["h"] * math.sin(band["k"] * u + band["gamma"])))


def orientation_matrix(index):
    if index == 0:
        return Matrix.Identity(3)
    if index == 1:
        return rot_z(math.radians(-14)) @ rot_x(math.radians(62))
    return rot_z(math.pi / 4) @ rot_y(math.acos(1 / math.sqrt(3)))


def centerline(band, index, u):
    return orientation_matrix(index) @ centerline_base(band, u)


def tangent_samples(band, index, count):
    pts = [centerline(band, index, 2 * math.pi * j / count) for j in range(count)]
    tangents = []
    for j in range(count):
        tangents.append((pts[(j + 1) % count] - pts[(j - 1) % count]).normalized())
    tangents.append(tangents[0].copy())
    pts.append(pts[0].copy())
    return pts, tangents


def rotate_about(axis, angle, vec):
    axis = axis.normalized()
    c, s = math.cos(angle), math.sin(angle)
    return vec * c + axis.cross(vec) * s + axis * (axis.dot(vec)) * (1 - c)


def closed_transport_frame(points, tangents):
    count = len(points) - 1
    axes = [Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))]
    t0 = tangents[0]
    seed = min(axes, key=lambda a: abs(a.dot(t0)))
    d1 = (seed - t0 * seed.dot(t0)).normalized()
    raw = [d1]
    for j in range(1, count + 1):
        prev_t, next_t = tangents[j - 1], tangents[j]
        axis = prev_t.cross(next_t)
        if axis.length < 1e-9:
            d = raw[-1] - next_t * raw[-1].dot(next_t)
            raw.append(d.normalized())
            continue
        angle = math.atan2(axis.length, max(-1, min(1, prev_t.dot(next_t))))
        d = rotate_about(axis.normalized(), angle, raw[-1])
        d = d - next_t * d.dot(next_t)
        raw.append(d.normalized())

    close = math.atan2(t0.dot(raw[count].cross(raw[0])), max(-1, min(1, raw[count].dot(raw[0]))))
    lengths = [0.0]
    total = 0.0
    for j in range(1, count + 1):
        total += (points[j] - points[j - 1]).length
        lengths.append(total)

    f1, f2 = [], []
    for j in range(count + 1):
        corr = close * lengths[j] / total if total > 0 else 0.0
        a = rotate_about(tangents[j], corr, raw[j])
        a = (a - tangents[j] * a.dot(tangents[j])).normalized()
        b = tangents[j].cross(a).normalized()
        f1.append(a)
        f2.append(b)
    return f1, f2, close, total


def superellipse(width, thickness, power, theta):
    c, s = math.cos(theta), math.sin(theta)
    eps = 1e-12
    if abs(c) < eps:
        a = 0.0
    else:
        a = width * 0.5 * (1 if c > 0 else -1) * (abs(c) ** (2 / power))
    if abs(s) < eps:
        b = 0.0
    else:
        b = thickness * 0.5 * (1 if s > 0 else -1) * (abs(s) ** (2 / power))
    return a, b


def build_band_mesh(band, index):
    loop_count = int(band["loopSamples"])
    section_count = int(band["sectionSamples"])
    points, tangents = tangent_samples(band, index, loop_count)
    f1, f2, close_angle, arc_length = closed_transport_frame(points, tangents)
    verts = []

    for j in range(loop_count):
        u = 2 * math.pi * j / loop_count
        chi = band["fullTwists"] * u + math.radians(band["tauDegrees"]) * math.sin(band["q"] * u + band["delta"])
        d1 = math.cos(chi) * f1[j] + math.sin(chi) * f2[j]
        d2 = -math.sin(chi) * f1[j] + math.cos(chi) * f2[j]
        for r in range(section_count):
            th = 2 * math.pi * r / section_count
            a, b = superellipse(band["W"], band["T"], band["p"], th)
            verts.append(web_to_blender(points[j] + a * d1 + b * d2))

    faces = []
    for j in range(loop_count):
        jn = (j + 1) % loop_count
        for r in range(section_count):
            rn = (r + 1) % section_count
            faces.append((j * section_count + r, j * section_count + rn, jn * section_count + rn, jn * section_count + r))

    mesh = bpy.data.meshes.new(band["meshName"] + "Mesh")
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    mesh.update(calc_edges=True)
    mesh.validate(clean_customdata=False)
    obj = bpy.data.objects.new(band["meshName"], mesh)

    for poly in mesh.polygons:
        poly.use_smooth = True

    f1_error = (f1[-1] - f1[0]).length
    f2_error = (f2[-1] - f2[0]).length
    edge_counts = {}
    for poly in mesh.polygons:
        vs = list(poly.vertices)
        for a, b in zip(vs, vs[1:] + vs[:1]):
            key = tuple(sorted((a, b)))
            edge_counts[key] = edge_counts.get(key, 0) + 1
    non_manifold = sum(1 for c in edge_counts.values() if c != 2)
    min_area = min((p.area for p in mesh.polygons), default=0.0)

    return obj, {
        "mesh": band["meshName"],
        "vertices": len(mesh.vertices),
        "faces": len(mesh.polygons),
        "triangles_if_triangulated": len(mesh.polygons) * 2,
        "frameCloseAngleRadians": close_angle,
        "frameF1ClosureError": f1_error,
        "frameF2ClosureError": f2_error,
        "arcLength": arc_length,
        "nonManifoldEdges": non_manifold,
        "minimumQuadArea": min_area,
        "finiteVertices": all(math.isfinite(c) for v in verts for c in v),
    }


def material(name, color, metallic, roughness, emission, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def clear_named_data():
    for name in ("EnergySculpture", "ExportAsset", "RenderRig"):
        obj = bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)
        col = bpy.data.collections.get(name)
        if col:
            bpy.data.collections.remove(col)
    for obj in list(bpy.data.objects):
        if obj.name.startswith(("OuterBand", "MiddleBand", "InnerBand", "CoreSphere", "Node_")):
            bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        if mesh.name.startswith(("OuterBand", "MiddleBand", "InnerBand", "CoreSphere", "Node_")):
            bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        if mat.name.startswith("MAT_"):
            bpy.data.materials.remove(mat)


def make_core(params, collection, parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=params["coreRadius"], location=(0, 0, 0))
    core = bpy.context.object
    core.name = "CoreSphere"
    core.data.name = "CoreSphereMesh"
    mat = material("MAT_Core", (0.55, 0.95, 1.0, 1.0), 0.0, 0.18, (0.4, 0.95, 1.0, 1.0), 1.8)
    core.data.materials.append(mat)
    core.parent = parent
    link_to_collection(core, collection)
    return core


def make_nodes(collection, parent):
    mat = material("MAT_Node", (0.38, 0.92, 1.0, 1.0), 0.25, 0.2, (0.1, 0.75, 1.0, 1.0), 0.8)
    nodes = []
    for i in range(4):
        angle = 2 * math.pi * i / 4
        loc_web = Vector((0.88 * math.cos(angle), 0.0, 0.88 * math.sin(angle)))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.04, location=web_to_blender(loc_web))
        node = bpy.context.object
        node.name = f"Node_{i}"
        node.data.name = f"Node_{i}Mesh"
        node.data.materials.append(mat)
        node.parent = parent
        link_to_collection(node, collection)
        nodes.append(node)
    return nodes


def link_to_collection(obj, collection):
    if obj.name not in collection.objects:
        collection.objects.link(obj)
    for col in list(obj.users_collection):
        if col != collection:
            col.objects.unlink(obj)


def shell_report(params):
    translations = {
        "Outer": math.sqrt((-0.1125) ** 2 + 0.0375 ** 2 + 0.05 ** 2),
        "Middle": math.sqrt(0.0875 ** 2 + (-0.05) ** 2 + 0.07 ** 2),
        "Inner": math.sqrt(0.02 ** 2 + 0.09 ** 2 + (-0.045) ** 2),
    }
    rows = []
    for band in params["bands"]:
        bound = math.sqrt(band["W"] ** 2 + band["T"] ** 2) / 2
        r_min = band["R"] * (1 - abs(band["epsilon"]) - abs(band["eta"])) - bound
        r_max = math.sqrt((band["R"] * (1 + abs(band["epsilon"]) + abs(band["eta"]))) ** 2 + band["h"] ** 2) + bound
        d = translations[band["id"]]
        rows.append({
            "id": band["id"],
            "restShell": [r_min, r_max],
            "translationBound": d,
            "movingShell": [r_min - d, 1.015 * r_max + d],
        })
    return rows


def render_preview(name, camera_location, camera_rotation):
    bpy.context.scene.camera.location = camera_location
    bpy.context.scene.camera.rotation_euler = camera_rotation
    bpy.context.scene.render.filepath = str(SCREENSHOTS / name)
    bpy.ops.render.render(write_still=True)


def setup_render_scene():
    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.samples = 96
    bpy.context.scene.view_settings.view_transform = "Filmic"
    bpy.context.scene.view_settings.look = "Medium High Contrast"
    bpy.context.scene.render.resolution_x = 1400
    bpy.context.scene.render.resolution_y = 1100
    bpy.context.scene.world = bpy.data.worlds.new("EnergyWorld") if not bpy.context.scene.world else bpy.context.scene.world
    bpy.context.scene.world.color = (0.78, 0.82, 0.86)

    bpy.ops.object.light_add(type="AREA", location=(0, -6, 6))
    key = bpy.context.object
    key.name = "RenderKeyLight"
    key.data.energy = 650
    key.data.size = 5
    bpy.ops.object.light_add(type="POINT", location=(-4, 3, 3))
    rim = bpy.context.object
    rim.name = "RenderRimLight"
    rim.data.energy = 95
    bpy.ops.object.camera_add(location=(0, -8.0, 4.2), rotation=(math.radians(62), 0, 0))
    cam = bpy.context.object
    bpy.context.scene.camera = cam
    cam.name = "RenderCamera"
    cam.data.lens = 62


def save_asset(params, collection):
    blend_path = ASSETS / "energy-sculpture.blend"
    glb_path = PUBLIC_MODELS / "energy-sculpture.glb"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["EnergySculpture"]
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_lights=False,
        export_cameras=False,
    )
    return blend_path, glb_path


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    params = load_params()
    clear_named_data()

    export_collection = bpy.data.collections.new("ExportAsset")
    bpy.context.scene.collection.children.link(export_collection)
    root = bpy.data.objects.new("EnergySculpture", None)
    export_collection.objects.link(root)

    reports = []
    for index, band in enumerate(params["bands"]):
        obj, report = build_band_mesh(band, index)
        mat = material(
            band["materialName"],
            tuple(band["color"]),
            band["metallic"],
            band["roughness"],
            tuple(band["emission"]),
            band["emissionStrength"],
        )
        obj.data.materials.append(mat)
        obj.parent = root
        export_collection.objects.link(obj)
        reports.append(report)

    make_core(params, export_collection, root)
    make_nodes(export_collection, root)
    setup_render_scene()

    render_preview("blender-three-quarter.png", (0, -8.0, 4.2), (math.radians(62), 0, 0))
    render_preview("blender-front.png", (0, -8.5, 0.2), (math.radians(89), 0, 0))
    render_preview("blender-side.png", (7.5, -0.1, 2.2), (math.radians(77), 0, math.radians(88)))
    # Fallback still is a real render of the generated model.
    bpy.context.scene.render.filepath = str(PUBLIC_IMAGES / "fallback.png")
    bpy.ops.render.render(write_still=True)

    blend_path, glb_path = save_asset(params, export_collection)
    report = {
        "blenderVersion": bpy.app.version_string,
        "coordinateConvention": "Canonical web Y-up geometry converted to Blender by (x,y,z)_web -> (x,-z,y)_Blender; glTF exporter export_yup=True.",
        "parameters": str(CONFIG.relative_to(ROOT)),
        "bandReports": reports,
        "shellReport": shell_report(params),
        "blendPath": str(blend_path.relative_to(ROOT)),
        "glbPath": str(glb_path.relative_to(ROOT)),
        "glbBytes": glb_path.stat().st_size,
        "glbSha256": sha256(glb_path),
        "previewRenders": [
            "evidence/screenshots/blender-three-quarter.png",
            "evidence/screenshots/blender-front.png",
            "evidence/screenshots/blender-side.png",
        ],
    }
    (EVIDENCE / "geometry-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
