#!/usr/bin/env python3
"""Plan or create a new vault from the packaged seed. Never merge an existing vault."""

import argparse
import json
from pathlib import Path
import sys


SKILL = Path(__file__).resolve().parents[1]
SEED = SKILL / "assets" / "starter-vault"
FORM = SKILL / "assets" / "form-plugin"
FORM_FILES = ("manifest.json", "main.js", "styles.css")


def copy_plan(stage_form):
    if not SEED.is_dir():
        raise ValueError("Packaged starter vault is missing.")
    plan = []
    for source in sorted(SEED.rglob("*")):
        if source.is_symlink():
            raise ValueError("The packaged seed must not contain symbolic links.")
        if not source.is_file() or source.name == ".DS_Store":
            continue
        relative = source.relative_to(SEED)
        if "plugins" in relative.parts and relative.parts[0] == ".obsidian":
            continue
        plan.append((source, relative))
    if stage_form:
        for name in FORM_FILES:
            source = FORM / name
            if not source.is_file() or source.is_symlink():
                raise ValueError("A packaged form runtime file is missing or unsafe.")
            plan.append((source, Path(".obsidian/plugins/second-brain-capture") / name))
    return plan


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", required=True, help="New, absent or empty vault directory")
    parser.add_argument("--apply", action="store_true", help="Create files; otherwise report only")
    parser.add_argument("--stage-form", action="store_true", help="Place form files without enabling them")
    args = parser.parse_args()
    target = Path(args.target).expanduser().absolute()
    created = []
    try:
        if target.is_symlink():
            raise ValueError("The target must be a real directory, not a symbolic link.")
        if target.exists() and (not target.is_dir() or any(target.iterdir())):
            raise ValueError("Target is not empty. Use the existing-vault workflow; no files were changed.")
        target = target.resolve()
        if target == SKILL or SKILL in target.parents or target in SKILL.parents:
            raise ValueError("Target must be separate from the skill package.")
        plan = copy_plan(args.stage_form)
        if args.apply:
            target.mkdir(parents=True, exist_ok=True)
            # Exclusive creation also protects against a file appearing after the initial check.
            for source, relative in plan:
                dest = target / relative
                dest.parent.mkdir(parents=True, exist_ok=True)
                with dest.open("xb") as stream:
                    stream.write(source.read_bytes())
                created.append(str(relative))
        print(json.dumps({
            "status": "created" if args.apply else "plan-only",
            "target": str(target),
            "files": [str(relative) for _, relative in plan],
            "created_files": len(created),
            "form_files_staged": bool(args.apply and args.stage_form),
            "form_enabled": False,
            "materials_imported": False,
            "next": "Open 首页.md, adapt rules, then verify with a supplied sample."
        }, ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError) as error:
        print(json.dumps({"status": "stopped", "error": str(error), "created_files": created}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
