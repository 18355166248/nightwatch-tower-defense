"""复用动作管线生成首关低占用候选；新目录/新资产，不覆盖高分源或旧评审批次。"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import uuid
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


def write_json(target: Path, value: dict) -> None:
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def image_meta(template: Path, name: str, size: tuple[int, int]) -> dict:
    meta = json.loads(template.read_text(encoding="utf-8"))
    previous = meta["uuid"]
    identity = str(uuid.uuid5(uuid.NAMESPACE_URL, "nightwatch/runtime-budget-v1/" + name))
    meta = json.loads(json.dumps(meta).replace(previous, identity))
    meta["imported"] = False
    for sub in meta["subMetas"].values():
        sub["displayName"] = name
        if sub["importer"] == "texture":
            sub["userData"].update(wrapModeS="clamp-to-edge", wrapModeT="clamp-to-edge", mipfilter="none")
        elif sub["importer"] == "sprite-frame":
            # 新画布必须同步SpriteFrame元数据，不能继承旧图的UV/裁切尺寸。
            data = sub["userData"]
            data.update(width=size[0], height=size[1], rawWidth=size[0], rawHeight=size[1],
                        trimX=0, trimY=0, offsetX=0, offsetY=0, packable=False)
            data.pop("vertices", None)  # Creator导入时按新尺寸重建顶点。
    return meta


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pipeline", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--install", action="store_true", help="只写此前不存在的独立候选资源")
    args = parser.parse_args()
    pipeline = args.pipeline.resolve()
    if not (pipeline / "src/asset_bundle.py").is_file():
        parser.error("pipeline必须是现有ai-asset-pipeline仓库")
    output = args.out.resolve()
    if output.exists() or output.is_relative_to(ROOT / "assets"):
        parser.error("输出必须是新的非运行时目录，拒绝覆盖历史批次")
    resource_root = ROOT / "assets/resources/level-one"
    clips = [("walk", "clockwork-infantry-rig-v2", "frames", 80),
             ("collapse", "clockwork-infantry-rig-collapse-v1", "render/frames", 160)]
    planned = [resource_root / (name + ".jpg") for name in ["backdrop-plaza-budget-v1", "backdrop-budget-v1"]]
    for clip, *_ in clips:
        base = resource_root / "units" / f"clockwork-infantry-{clip}-rig-budget-v1"
        planned.extend([base.with_suffix(".png"), Path(str(base) + "-layout.json")])
    if args.install and any(p.exists() or Path(str(p) + ".meta").exists() for p in planned):
        parser.error("候选安装目标已存在，拒绝覆盖；选新批次而不是强制重写")

    sys.path.insert(0, str(pipeline / "src"))
    import asset_bundle
    output.mkdir(parents=True)
    assets = []
    transfers = []
    for clip, directory, frame_directory, cell in clips:
        source = ROOT / "art-source/first-level-units" / directory
        recipe = json.loads((source / "recipe.json").read_text(encoding="utf-8"))
        recipe["cell"] = [cell, cell]
        recipe["title"] += " · runtime-budget-v1"
        recipe["source"]["note"] += "；仅全画布统一缩放，无逐帧裁切；高分源未修改。"
        recipe_path = output / f"{clip}-recipe.json"
        write_json(recipe_path, recipe)
        bundle = output / clip
        asset_bundle.build(recipe_path, source / frame_directory, bundle)
        report = json.loads((bundle / "report.json").read_text(encoding="utf-8"))
        if report["warnings"]:
            raise ValueError(f"{clip}需要先复核管线警告: {report['warnings']}")
        name = f"clockwork-infantry-{clip}-rig-budget-v1"
        target = resource_root / "units" / (name + ".png")
        template = resource_root / "units" / ("clockwork-infantry-walk-rig-v2.png.meta" if clip == "walk"
                                                else "clockwork-infantry-collapse-rig-v1.png.meta")
        transfers.extend([(bundle / "atlas.png", target, image_meta(template, name, (cell * 4, cell * 4))),
                          (bundle / "manifest.json", target.with_name(name + "-layout.json"), None)])
        assets.append({"id": name, "source": str(source), "recipe": str(recipe_path), "bundle": str(bundle),
                       "runtime": str(target), "cell": [cell, cell], "frames": 16, "anchor": recipe["anchor"],
                       "status": "needs-human-and-runtime-review"})

    for original, name in [("backdrop-plaza-v2", "backdrop-plaza-budget-v1"), ("backdrop", "backdrop-budget-v1")]:
        source = resource_root / (original + ".jpg")
        with Image.open(source) as image:
            size = (768, round(image.height * 768 / image.width))
            resized = image.convert("RGB").resize(size, Image.Resampling.LANCZOS)
            result = output / (name + ".jpg")
            resized.save(result, quality=90, optimize=True)
        target = resource_root / (name + ".jpg")
        transfers.append((result, target, image_meta(Path(str(source) + ".meta"), name, size)))
        assets.append({"id": name, "source": str(source), "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                       "runtime": str(target), "size": size, "operation": "whole-canvas Lanczos, JPEG quality90",
                       "provenance": "derived from existing project candidate; original rights review remains pending",
                       "status": "needs-human-and-runtime-review"})

    if args.install:
        for source, target, meta in transfers:
            shutil.copyfile(source, target)
            if meta is None:
                meta = {"ver": "2.0.1", "importer": "json", "imported": False,
                        "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, "nightwatch/runtime-budget-v1/" + target.name)),
                        "files": [".json"], "subMetas": {}, "userData": {}}
            write_json(Path(str(target) + ".meta"), meta)
    write_json(output / "profile-manifest.json", {"version": 1, "status": "draft", "assets": assets,
        "locks": "same sources, full canvases, normalized anchors, all frames, durations and loops; no rule change",
        "pipeline": str(pipeline), "pillow": Image.__version__, "installed": args.install})
    print(json.dumps({"out": str(output), "installed": args.install, "assetCount": len(assets)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
