#!/usr/bin/env python3
"""Merge gate for the orchestrator (docs/agentic-development.md, section 7).

    scripts/merge-gate.py PR [--merge] [--json]

Checks the gates on the current head commit of the pull request, and prints
one line for each gate:

    0. The PR is open, is not a draft, and targets `alpha`. Work packages
       merge into `alpha` only. The promotions alpha -> beta -> main, and
       `publish` -> main, are the developer's, and they are merged, never
       squashed (CONTRIBUTING.md, "Branching and deployment").
    1. The checks pass, or the PR is docs-only. CI does not run on a PR into
       `alpha` (CONTRIBUTING.md, "CI"), so the gate runs the checks itself:
       it merges the PR head onto the current `origin/alpha` in a temporary
       worktree and runs `npm ci`, `npm run lint`, `npm run test:ci` at
       TZ=Asia/Tokyo and at TZ=America/Chicago, and `npm run build`. It
       prints the command that failed, and it always removes the worktree.
       A merge conflict fails the gate. A red check run on the head (not the
       Security Audit job, which is non-blocking) also fails the gate.
    2. The latest L1 verdict reads approve, and no push came after it (an
       orchestrator merge commit that resolves only package.json and
       package-lock.json keeps it, section 5.3).
    3. The latest L2 verdict reads approve, and no push came after it.
    4. A needs-human PR or issue has human approval (an APPROVED review or the
       label human-approved).
    5. GitHub reports no merge conflict.

It also fails when a review marker was escaped (`&lt;!--` in place of
`<!--`). An escaped marker is not a verdict.

The exit code is 0 when every gate passes and 1 when one fails. With
--merge, a pass is followed by a squash merge that pins the full head SHA.
The script never deletes a branch on GitHub: the developer does that.
--merge uses the result of this run. It does not run the checks again.

Needs python3, git, npm, and an authenticated `gh`. SCRUM_REPO sets the
repository, as for scripts/scrum.py.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scrum  # noqa: E402

MARKER = re.compile(r"\A\s*<!-- review:(L[12]) verdict=(approve|changes) -->")
ESCAPED = re.compile(r"&lt;!--\s*review:L[12]")
BILLING = re.compile(r"spending limit|billing|payments have failed|account is locked", re.I)
# Check run conclusions that are not a failure. A job that its `if:` skips
# is fine: `changes` decides which jobs run.
GREEN = {"success", "skipped", "neutral"}
DEPS_FILES = {"package.json", "package-lock.json"}
# The only base that a WP PR may merge into.
BASE = "alpha"
# Jobs that report but do not gate (CONTRIBUTING.md, "CI").
NON_BLOCKING = {"Security Audit"}
# Markdown that the site renders is content, not docs.
CONTENT_DIRS = ("_nav/", "_posts/", "_recipes/", "public/")


def is_docs_only(files):
    """Section 7: every changed file is Markdown that the site does not
    build. A file in _nav/, _posts/, or _recipes/ is a page, so it needs CI."""
    return bool(files) and all(
        f.endswith(".md") and not f.startswith(CONTENT_DIRS) for f in files)


def verdicts(comments):
    """The latest comment of each layer, as {"L1": comment, "L2": comment},
    and the URLs of comments with an escaped marker."""
    latest, escaped = {}, []
    for c in sorted(comments, key=lambda c: c["created_at"]):
        body = c.get("body") or ""
        m = MARKER.match(body)
        if m:
            latest[m.group(1)] = dict(c, verdict=m.group(2))
        elif ESCAPED.search(body[:200]):
            escaped.append(c.get("html_url", "?"))
    return latest, escaped


def ci_state(runs, annotations):
    """("green" | "red" | "pending" | "out-of-minutes" | "none", detail).

    `annotations` holds the annotation messages of the failed runs. CI is out
    of minutes when no run ran a step and some text names billing. The API
    gives no step count, so "ran no step" reads as: no run succeeded and
    every failed run failed with a billing annotation. Non-blocking jobs are
    left out."""
    runs = [r for r in runs if r["name"] not in NON_BLOCKING]
    if not runs:
        return "none", "no check runs on the head commit"
    pending = [r["name"] for r in runs if r["status"] != "completed"]
    if pending:
        return "pending", "still running: " + ", ".join(sorted(pending))
    red = [r for r in runs if r["conclusion"] not in GREEN]
    if not red:
        # Every check skipped is not a pass. One job must have run.
        if not any(r["conclusion"] == "success" for r in runs):
            return "none", "no CI job ran"
        return "green", f"{len(runs)} check runs green"
    if not any(r["conclusion"] == "success" for r in runs) and \
            any(BILLING.search(a) for a in annotations):
        return "out-of-minutes", "the failed runs name billing"
    return "red", "failed: " + ", ".join(
        f"{r['name']} ({r['conclusion']})" for r in sorted(red, key=lambda r: r["name"]))


def gate_ci(files, ci):
    state, detail = ci
    if state == "green":
        return True, detail
    if is_docs_only(files):
        return True, "docs-only PR, no CI needed (section 7)"
    if state == "out-of-minutes":
        return False, "CI is out of minutes; tell the developer (section 7)"
    return False, detail


# The local checks of gate 1: (label, argv, TZ or None).
CHECKS = (
    ("npm ci", ["npm", "ci"], None),
    ("npm run lint", ["npm", "run", "lint"], None),
    ("TZ=Asia/Tokyo npm run test:ci", ["npm", "run", "test:ci"], "Asia/Tokyo"),
    ("TZ=America/Chicago npm run test:ci", ["npm", "run", "test:ci"], "America/Chicago"),
    ("npm run build", ["npm", "run", "build"], None),
)


def sh(argv, cwd=None, env=None):
    """Run a command. Return (exit code, output). Tests replace this."""
    r = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def last_line(text):
    lines = [l for l in text.strip().splitlines() if l.strip()]
    return lines[-1].strip()[:200] if lines else "no output"


def gate_local(head, pr_number, run=sh):
    """Gate 1 for a PR into alpha: merge the head onto current origin/alpha
    in a temporary worktree and run the checks there. Returns (ok, reason).
    `run` takes (argv, cwd, env) and returns (exit code, output)."""
    code, out = run(["git", "fetch", "-q", "origin", "alpha"], None, None)
    if code:
        return False, "git fetch failed: " + last_line(out)
    # Fetch the PR head, then compare it with the SHA that the gate read.
    # (Fetching by SHA needs server support; this does not.)
    code, out = run(["git", "fetch", "-q", "origin", f"pull/{pr_number}/head"], None, None)
    if code:
        return False, "git fetch failed: " + last_line(out)
    code, out = run(["git", "rev-parse", "FETCH_HEAD"], None, None)
    fetched = out.strip()
    if code or fetched != head:
        return False, (f"the PR head moved during the run: read {head[:7]}, "
                       f"fetched {fetched[:7] or '?'}; run the gate again")
    tmp = tempfile.mkdtemp(prefix="merge-gate-")
    wt = os.path.join(tmp, "wt")
    try:
        code, out = run(["git", "worktree", "add", "--detach", wt, "origin/alpha"], None, None)
        if code:
            return False, "git worktree add failed: " + last_line(out)
        ident = ["-c", "user.name=merge-gate", "-c", "user.email=merge-gate@localhost"]
        code, out = run(["git", *ident, "merge", "--no-edit", "--no-ff", head], wt, None)
        if code:
            run(["git", "merge", "--abort"], wt, None)
            return False, f"merge conflict: {head[:7]} does not merge onto origin/alpha"
        for label, argv, tz in CHECKS:
            env = dict(os.environ, TZ=tz) if tz else None
            code, out = run(argv, wt, env)
            if code:
                return False, f"`{label}` failed (exit {code}): {last_line(out)}"
        return True, "merged onto origin/alpha; " + ", ".join(c[0] for c in CHECKS) + " passed"
    finally:
        run(["git", "worktree", "remove", "--force", wt], None, None)
        shutil.rmtree(tmp, ignore_errors=True)
        run(["git", "worktree", "prune"], None, None)


def gate_checks(files, ci, base, state, head, pr_number, run=sh):
    """Gate 1. A docs-only PR passes. A red check run on the head fails. A
    PR into alpha runs the checks locally. Any other PR (gate 0 fails it)
    reads CI as before."""
    if is_docs_only(files):
        return True, "docs-only PR, no checks needed (section 7)"
    if ci[0] in ("red", "out-of-minutes"):
        return gate_ci(files, ci)
    if base != BASE or state != "open":
        return gate_ci(files, ci)
    return gate_local(head, pr_number, run)


def gate_verdict(layer, latest, pushed_at, kept=False):
    c = latest.get(layer)
    if c is None:
        return False, f"no {layer} verdict"
    if c["created_at"] < pushed_at and not kept:
        return False, f"{layer} verdict ({c['created_at']}) is older than the head push ({pushed_at})"
    if c["verdict"] != "approve":
        return False, f"latest {layer} verdict is {c['verdict']}"
    note = " (kept across a package-lock merge)" if c["created_at"] < pushed_at else ""
    return True, f"{layer} approve at {c['created_at']}{note}"


def gate_human(labels, approved_reviews):
    """Gate 4. `needs-human` waits for the developer: a change that the
    client will see (layout, colour, copy, the CMS), a new dependency, or a
    change to the deploy (section 3)."""
    if "needs-human" not in labels:
        return True, "not needs-human"
    if "human-approved" in labels:
        return True, "label human-approved"
    if approved_reviews:
        return True, "approved by " + ", ".join(sorted(set(approved_reviews)))
    return False, "needs-human and no human approval"


def gate_conflict(mergeable, state):
    if mergeable is False or state == "dirty":
        return False, "merge conflict"
    if mergeable is None:
        return False, "GitHub has not computed mergeability yet; run again"
    return True, f"mergeable ({state})"


def evaluate(pr, files, comments, ci, labels, approved, pushed_at,
             l1_kept=False, run=sh):
    """The gate results as a list of (name, ok, reason)."""
    latest, escaped = verdicts(comments)
    out = [
        ("1 checks", *gate_checks(files, ci, pr.get("base", {}).get("ref", BASE),
                                  pr.get("state", "open"), pr["head"]["sha"],
                                  pr.get("number", 0), run)),
        ("2 L1", *gate_verdict("L1", latest, pushed_at, l1_kept)),
        ("3 L2", *gate_verdict("L2", latest, pushed_at)),
        ("4 human", *gate_human(labels, approved)),
        ("5 conflict", *gate_conflict(pr.get("mergeable"), pr.get("mergeable_state"))),
    ]
    if pr.get("state", "open") != "open":
        out.insert(0, ("0 open", False, f"the PR is {pr['state']}"))
    base = pr.get("base", {}).get("ref", BASE)
    if base != BASE:
        out.insert(0, ("0 base", False,
                       f"the PR targets {base}; the orchestrator merges into {BASE} only"))
    if pr.get("draft"):
        out.insert(0, ("0 draft", False, "the PR is a draft; mark it ready after both reviews"))
    if escaped:
        out.append(("markers", False, "escaped review marker in " + ", ".join(escaped)))
    return out


def closed_issues(body):
    """The issue numbers of the leading `Closes #N` lines."""
    nums = []
    for line in (body or "").lstrip().splitlines():
        m = re.fullmatch(r"Closes #(\d+)\s*", line)
        if not m:
            break
        nums.append(int(m.group(1)))
    return nums


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True,
                          check=True).stdout


def merge_keeps_l1(shas):
    """Section 5.3: True when every commit is a merge commit whose own
    resolution touched only package.json and package-lock.json. A file that
    the merge resolved by hand differs from both parents."""
    if not shas:
        return False
    for sha in shas:
        parents = git("rev-list", "--parents", "-n", "1", sha).split()[1:]
        if len(parents) != 2:
            return False
        one = set(git("diff", "--name-only", parents[0], sha).split())
        two = set(git("diff", "--name-only", parents[1], sha).split())
        if not (one & two) <= DEPS_FILES:
            return False
    return True


def pushed_at(head, commit):
    """The time GitHub received the head commit: the first check suite on
    it. Without one, the committer date."""
    suites = scrum.api(f"commits/{head}/check-suites")["check_suites"]
    stamps = sorted(s["created_at"] for s in suites)
    return stamps[0] if stamps else commit["commit"]["committer"]["date"]


def fetch_pr(n):
    pr = scrum.api(f"pulls/{n}")
    for _ in range(3):
        if pr.get("mergeable") is not None:
            break
        time.sleep(3)
        pr = scrum.api(f"pulls/{n}")
    return pr


def collect(n):
    pr = fetch_pr(n)
    head = pr["head"]["sha"]
    files = [f["filename"] for f in scrum.pages(f"pulls/{n}/files")]
    comments = scrum.pages(f"issues/{n}/comments")
    runs = scrum.api(f"commits/{head}/check-runs?per_page=100")["check_runs"]
    notes = []
    for r in runs:
        if r["conclusion"] not in GREEN and r["output"].get("annotations_count"):
            notes += [a.get("message", "") for a in
                      scrum.api(f"check-runs/{r['id']}/annotations")]
    labels = {l["name"] for l in pr["labels"]}
    for i in closed_issues(pr["body"]):
        labels |= {l["name"] for l in scrum.api(f"issues/{i}")["labels"]}
    approved = [r["user"]["login"] for r in scrum.pages(f"pulls/{n}/reviews")
                if r["state"] == "APPROVED" and r["commit_id"] == head]
    commits = scrum.pages(f"pulls/{n}/commits")
    when = pushed_at(head, commits[-1])

    l1_kept = False
    latest, _ = verdicts(comments)
    if "L1" in latest and latest["L1"]["created_at"] < when:
        after = [c["sha"] for c in commits
                 if c["commit"]["committer"]["date"] > latest["L1"]["created_at"]]
        try:
            git("fetch", "-q", "origin", f"pull/{n}/head")
            l1_kept = merge_keeps_l1(after)
        except subprocess.CalledProcessError:
            l1_kept = False
    return pr, evaluate(pr, files, comments, ci_state(runs, notes), labels,
                        approved, when, l1_kept)


def merge(pr):
    if pr["base"]["ref"] != BASE:
        sys.exit(f"refused: the orchestrator merges into {BASE} only")
    n = pr["number"]
    res = scrum.api(f"pulls/{n}/merge", "PUT", {
        "merge_method": "squash",
        "sha": pr["head"]["sha"],
        "commit_title": f"{pr['title']} (#{n})",
    })
    print(f"merged #{n}: {res.get('sha', '?')}")
    # No branch delete: the developer deletes branches on GitHub.


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("pr", type=int)
    ap.add_argument("--merge", action="store_true",
                    help="squash-merge with the full head SHA when every gate passes")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    pr, results = collect(args.pr)
    ok = all(r[1] for r in results)
    if args.json:
        json.dump({"pr": args.pr, "head": pr["head"]["sha"], "pass": ok,
                   "gates": [{"gate": g, "ok": o, "reason": r} for g, o, r in results]},
                  sys.stdout, indent=1)
        print()
    else:
        print(f"merge gate for #{args.pr} at {pr['head']['sha']}")
        for g, o, r in results:
            print(f"  {'pass' if o else 'FAIL'}  {g}: {r}")
        print("merge-gate: " + ("PASS" if ok else "FAIL"))
    if ok and args.merge:
        merge(pr)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
