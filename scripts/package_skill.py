#!/usr/bin/env python3
"""Build the standalone skill from public source assets; --check performs no writes."""
import argparse
import hashlib
import io
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / 'skills/obsidian-second-brain-builder'
PLUGIN = ROOT / 'plugins/second-brain-capture'
RUNTIME = ('manifest.json', 'main.js', 'styles.css')
ARCHIVE = ROOT / 'downloads/obsidian-second-brain-builder.zip'


def files(folder, seed=False):
    result = {}
    for p in folder.rglob('*'):
        relative = p.relative_to(folder)
        if any(part in ('.git', '__pycache__', 'node_modules') for part in relative.parts):
            continue
        if p.is_symlink():
            raise ValueError('Generated assets must not contain symbolic links.')
        if not p.is_file() or p.name == '.DS_Store' or p.name == 'data.json' or p.name.startswith('workspace'):
            continue
        if seed and len(relative.parts) > 1 and relative.parts[:2] == ('.obsidian', 'plugins'):
            continue
        result[relative.as_posix()] = p.read_bytes()
    return result


def replace_generated(folder, data):
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)
    for name, content in data.items():
        p = folder / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(content)


def archive_bytes():
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, content in sorted(files(SKILL).items()):
            info = zipfile.ZipInfo(SKILL.name + '/' + name, (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, content)
    return stream.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    seed = files(ROOT / 'starter-vault', seed=True)
    plugin = files(PLUGIN)
    if args.check:
        assert files(SKILL / 'assets/starter-vault') == seed, 'Skill seed differs from starter-vault'
        assert files(SKILL / 'assets/form-plugin') == plugin, 'Skill plugin differs from plugin source'
        assert (SKILL / 'LICENSE').read_bytes() == (ROOT / 'LICENSE').read_bytes(), 'Skill license differs'
    else:
        replace_generated(SKILL / 'assets/starter-vault', seed)
        replace_generated(SKILL / 'assets/form-plugin', plugin)
        shutil.copyfile(ROOT / 'LICENSE', SKILL / 'LICENSE')
    for name in RUNTIME:
        target = ROOT / 'starter-vault/.obsidian/plugins/second-brain-capture' / name
        if args.check:
            assert target.read_bytes() == (PLUGIN / name).read_bytes(), 'Seed runtime differs: ' + name
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(PLUGIN / name, target)
    data = archive_bytes()
    checksum = hashlib.sha256(data).hexdigest() + '  ' + ARCHIVE.name + '\n'
    if args.check:
        assert ARCHIVE.read_bytes() == data, 'Skill ZIP is out of date; run package_skill.py'
        assert (ARCHIVE.parent / 'SHA256SUMS.txt').read_text() == checksum, 'Checksum differs'
    else:
        ARCHIVE.parent.mkdir(exist_ok=True)
        ARCHIVE.write_bytes(data)
        (ARCHIVE.parent / 'SHA256SUMS.txt').write_text(checksum)
    print(('PASS: ' if args.check else 'Built: ') + ARCHIVE.name + ' (' + str(len(data)) + ' bytes)')


if __name__ == '__main__':
    main()
