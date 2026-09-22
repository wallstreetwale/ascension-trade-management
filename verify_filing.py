#!/usr/bin/env python3
"""verify_filing.py — confirm files are byte-identical to the originals recorded in
.filing-expected.json.  STRICTLY READ-ONLY: it creates, modifies, and deletes nothing.

  STAGE 1 — isolated extraction, BEFORE copying into the repository:
      python3 verify_filing.py --staging
  Every listed file must exist and match. NO unlisted file and NO unexpected
  directory may be present. Keep the .zip OUTSIDE the staging folder.

  STAGE 2 — the repository checkout, AFTER committing (authoritative):
      python3 verify_filing.py > FILING_VERIFICATION_<repo>.md
  Every listed file must exist, match, and be committed; the manifest must be
  committed; no tracked file modified; no untracked file present — except the
  report this command is writing (FILING_VERIFICATION_*.md at the root), which
  the shell creates before the script starts.

DO NOT TRUST THIS SCRIPT TO VERIFY ITSELF. Check `sha256sum verify_filing.py` and
`sha256sum .filing-expected.json` against FILING_INSTRUCTIONS_2026-09-20.md, which
sits OUTSIDE the bundle, before running it.

It does NOT prove: that the trust-anchor document is authentic, that the archive
came from the intended source, or that any document is correct, current, or approved.

No network. No credentials. Git used read-only: rev-parse, status, ls-files.
"""
import hashlib, json, os, subprocess, sys, datetime, fnmatch

EXPECTED = '.filing-expected.json'
ALLOWED_UNLISTED = {EXPECTED}
REPORT_PATTERN = 'FILING_VERIFICATION_*.md'      # root only — the report being written
SUPPORTED_SCHEMA = 1                              # never default an unknown version
HEX = set('0123456789abcdef')

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:                     # bytes — no line-ending normalization
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

def git(*args):
    try:
        return subprocess.run(['git', *args], capture_output=True, text=True, check=True).stdout
    except Exception:
        return None

def contained(path):
    if os.path.isabs(path): return False
    root = os.path.realpath('.')
    full = os.path.realpath(os.path.join(root, path))
    return full == root or full.startswith(root + os.sep)

def walk_all():
    files, dirs = set(), set()
    for d, subdirs, names in os.walk('.'):
        subdirs[:] = [x for x in subdirs if x != '.git']
        for s in subdirs: dirs.add(os.path.normpath(os.path.relpath(os.path.join(d, s), '.')))
        for n in names:   files.add(os.path.normpath(os.path.relpath(os.path.join(d, n), '.')))
    return files, dirs

def ancestors(paths):
    """Every parent directory of the listed paths. Terminates on '/' and similar fixed
    points: os.path.dirname('/') == '/', which would otherwise loop forever."""
    out = set()
    for p in paths:
        d = os.path.dirname(p)
        while d and d != '.':
            out.add(os.path.normpath(d))
            parent = os.path.dirname(d)
            if parent == d: break
            d = parent
    return out

def is_report(path):
    return os.sep not in path and fnmatch.fnmatch(path, REPORT_PATTERN)

def load_manifest(say):
    """Fail closed on anything malformed — never traceback, never partially verify."""
    try:
        with open(EXPECTED, 'r', encoding='utf-8') as fh:
            meta = json.load(fh)
    except (OSError, json.JSONDecodeError, UnicodeDecodeError) as e:
        say(f'FAIL  cannot read valid JSON from {EXPECTED}: {e}'); return None
    if not isinstance(meta, dict):
        say('FAIL  manifest must be a JSON object.'); return None
    ver = meta.get('manifestSchemaVersion')
    if ver != SUPPORTED_SCHEMA:
        say(f'FAIL  manifestSchemaVersion is {ver!r}; this verifier supports only {SUPPORTED_SCHEMA}. '
            'A missing or unknown version is refused, never assumed.'); return None
    repo, files = meta.get('repository'), meta.get('files')
    if not isinstance(repo, str) or not repo.strip():
        say('FAIL  manifest "repository" must be a non-empty string.'); return None
    if not isinstance(files, dict) or not files:
        say('FAIL  manifest "files" must be a non-empty object.'); return None
    for path, h in files.items():
        if not isinstance(path, str) or not path or not isinstance(h, str):
            say('FAIL  manifest paths and hashes must be non-empty strings.'); return None
        if len(h) != 64 or not set(h) <= HEX:
            say(f'FAIL  invalid SHA-256 for {path!r} — must be 64 lowercase hex characters.'); return None
    return meta

def main():
    staging = '--staging' in sys.argv[1:]
    say = lambda m: print(m, file=sys.stderr)
    if not os.path.exists(EXPECTED):
        say(f'FAIL  {EXPECTED} not found. Run from the bundle or repository root.'); return 1
    meta = load_manifest(say)
    if meta is None: return 1
    repo, files = meta['repository'], meta['files']

    rows, bad = [], 0
    for path, expected in sorted(files.items()):
        if not contained(path):
            rows.append((path, expected, 'REJECTED', 'OUTSIDE ROOT')); bad += 1; continue
        if os.path.islink(path):
            rows.append((path, expected, 'REJECTED', 'SYMLINK NOT PERMITTED')); bad += 1; continue
        if not os.path.isfile(path):
            rows.append((path, expected, 'MISSING', 'MISSING')); bad += 1; continue
        actual = sha(path)
        st = 'MATCH' if actual == expected else 'MISMATCH'
        rows.append((path, expected, actual, st)); bad += st != 'MATCH'
    ok = sum(1 for r in rows if r[3] == 'MATCH')

    unlisted, bad_dirs, uncommitted, dirty, untracked = [], [], [], [], []
    head, manifest_committed, git_ok = 'n/a — staging', None, True
    # Only CONTAINED paths define what may legitimately exist here. A rejected path
    # is already counted as a failure; it must not shape the allowed-directory set.
    listed = {os.path.normpath(p) for p in files if contained(p)}
    if staging:
        found_files, found_dirs = walk_all()
        unlisted = sorted(found_files - listed - ALLOWED_UNLISTED)
        bad_dirs = sorted(found_dirs - ancestors(listed))
    else:
        h = git('rev-parse', 'HEAD'); st = git('status', '--porcelain')
        if h is None or st is None:
            git_ok = False; head = 'UNAVAILABLE'
        else:
            head = h.strip()
            lines = st.splitlines()
            dirty = [l for l in lines if not l.startswith('??')]
            untracked = [l[3:] for l in lines if l.startswith('??') and not is_report(l[3:].strip())]
        manifest_committed = git('ls-files', '--error-unmatch', EXPECTED) is not None
        uncommitted = [r[0] for r in rows if r[2] != 'REJECTED' and git('ls-files', '--error-unmatch', r[0]) is None]

    passed = (bad == 0 and not unlisted and not bad_dirs and not uncommitted and not dirty
              and not untracked and git_ok and manifest_committed is not False)
    mode = 'STAGE 1 — staging' if staging else 'STAGE 2 — committed checkout'
    extra = (f' · {len(unlisted)} unlisted · {len(bad_dirs)} unexpected dirs' if staging else
             f' · {len(uncommitted)} not committed · {len(untracked)} untracked · {len(dirty)} modified')
    out = [f'# Filing Verification — {repo}', '',
           f'**Mode:** {mode}',
           f'**Bundle:** `{meta.get("bundleId", "—")}`',
           f'**Run:** {datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")}',
           f'**Commit (HEAD):** `{head}`']
    if not staging:
        out.append(f'**Manifest committed:** {"YES" if manifest_committed else "**NO**"}')
    out += [f'**Result:** {"PASS" if passed else "FAIL"} — {ok} match · {bad} mismatch/missing/rejected{extra}', '',
            '| Path | Expected | Actual | Status |', '|---|---|---|---|']
    for path, exp, act, s in rows:
        a = f'{act[:16]}…' if len(act) == 64 else act
        out.append(f'| `{path}` | `{exp[:16]}…` | `{a}` | **{s}** |')
    for title, items in [('Unlisted files — not in the manifest', unlisted),
                         ('Unexpected directories', bad_dirs),
                         ('Not committed', uncommitted),
                         ('Untracked files in checkout', untracked),
                         ('Tracked files modified after commit', dirty)]:
        if items: out += ['', f'## {title}', ''] + [f'- `{i}`' for i in items]
    if not git_ok: out += ['', '## Git inspection failed', '', 'Could not read HEAD or status.']
    out += ['', '---', '', 'Proves the bytes match the originals. Does not prove the documents are',
            'correct, current, or approved, nor that the trust-anchor document is authentic.']
    print('\n'.join(out))
    say(f'{"PASS" if passed else "FAIL"}  [{mode}]  {ok} match · {bad} mismatch/missing/rejected{extra}')
    return 0 if passed else 1

if __name__ == '__main__':
    sys.exit(main())
