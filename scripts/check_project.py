#!/usr/bin/env python3
"""Check links, bundled assets, new-vault creation and optional form save tests."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / 'skills/obsidian-second-brain-builder'


def run(command):
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def digest_tree(folder):
    return {p.relative_to(folder).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in folder.rglob('*') if p.is_file()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--with-plugin-tests', action='store_true')
    parser.add_argument('--node', default='node')
    parser.add_argument('--report')
    args = parser.parse_args()
    checked = []
    run([sys.executable, '-B', str(ROOT / 'scripts/package_skill.py'), '--check'])
    checked.append('packaged assets, runtime files, deterministic ZIP and checksum agree')
    count = 0
    for p in ROOT.rglob('*.md'):
        if '.git' in p.parts:
            continue
        text = p.read_text(encoding='utf-8')
        for href in re.findall(r'!?\[[^\]\n]*\]\(([^)\n]+)\)', text):
            parsed = urlparse(href)
            if parsed.scheme or href.startswith(('#', '//')):
                continue
            assert (p.parent / unquote(parsed.path)).exists(), 'Missing Markdown resource in ' + str(p.relative_to(ROOT))
            count += 1
    checked.append(str(count) + ' local Markdown resources resolve')
    for vault in (ROOT / 'starter-vault', SKILL / 'assets/starter-vault'):
        for p in vault.rglob('*.md'):
            for link in re.findall(r'!?\[\[([^\]\n]+)\]\]', p.read_text(encoding='utf-8')):
                target = link.split('|')[0].split('#')[0]
                assert any(t.exists() for t in (vault / target, vault / (target + '.md'))), 'Missing wiki resource: ' + target
    checked.append('wiki links resolve in both example vaults')
    bootstrap = SKILL / 'scripts/bootstrap_vault.py'
    with tempfile.TemporaryDirectory(prefix='obsidian-builder-check-') as tmp:
        target = Path(tmp) / 'vault'
        command = [sys.executable, '-B', str(bootstrap), '--target', str(target)]
        run(command)
        assert not target.exists(), 'Plan-only mode wrote destination files'
        run(command + ['--apply', '--stage-form'])
        assert (target / '首页.md').exists()
        assert not (target / '.obsidian/community-plugins.json').exists()
        (target / 'existing-note.md').write_text('Keep this note.\n')
        before = digest_tree(target)
        attempt = subprocess.run(command + ['--apply'], capture_output=True, text=True)
        assert attempt.returncode != 0 and digest_tree(target) == before, 'Existing vault was modified'
    checked.append('new-vault plan, creation, optional runtime staging and existing-note protection')
    if args.with_plugin_tests:
        result = run([args.node, str(ROOT / 'plugins/second-brain-capture/test.js')])
        checked.append(result)
    report = {'status': 'passed', 'checked': checked, 'native_obsidian_tested': False,
              'independent_ai_invocation_tested': False, 'remote_download_install_and_star_tested': False}
    if args.report:
        destination = Path(args.report)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
