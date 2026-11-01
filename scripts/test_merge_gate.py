#!/usr/bin/env python3
"""Tests for scripts/merge-gate.py. No network: they call the pure functions.

    python3 -B scripts/test_merge_gate.py
"""
import importlib.util
import os
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("merge_gate", os.path.join(HERE, "merge-gate.py"))
mg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mg)

HEAD = "a" * 40
PUSH = "2026-10-25T15:18:07Z"


def comment(body, at="2026-10-25T15:30:00Z", url="u"):
    return {"body": body, "created_at": at, "html_url": url}


def run(name, conclusion="success", status="completed"):
    return {"name": name, "status": status, "conclusion": conclusion}


L1_OK = comment("<!-- review:L1 verdict=approve -->\nok")
L2_OK = comment("<!-- review:L2 verdict=approve -->\nok", at="2026-10-25T15:40:00Z")
PR = {"head": {"sha": HEAD}, "base": {"ref": "alpha"}, "mergeable": True,
      "mergeable_state": "clean"}


class Fake:
    """A fake for merge-gate's `run`. It records each command and fails the
    commands that `fail` names (a substring of the joined argv, or of
    TZ=<zone> plus the argv). It runs nothing."""

    def __init__(self, fail=None):
        self.fail = fail or {}
        self.calls = []

    def __call__(self, argv, cwd=None, env=None):
        text = " ".join(argv)
        if env and env.get("TZ"):
            text = "TZ=" + env["TZ"] + " " + text
        self.calls.append(text)
        for key, code in self.fail.items():
            if key in text:
                return code, "boom line 1\nthe last line"
        return 0, ""

    def count(self, key):
        return sum(1 for c in self.calls if key in c)


def gates(**kw):
    kw.setdefault("run", Fake())
    args = dict(pr=PR, files=["util/googleCalendar.js"], comments=[L1_OK, L2_OK],
                ci=("none", "no check runs on the head commit"), labels=set(),
                approved=[], pushed_at=PUSH)
    args.update(kw)
    return {g: (ok, why) for g, ok, why in mg.evaluate(**args)}


class Verdicts(unittest.TestCase):
    def test_latest_wins(self):
        old = comment("<!-- review:L1 verdict=approve -->", at="2026-10-25T15:20:00Z")
        new = comment("<!-- review:L1 verdict=changes -->", at="2026-10-25T15:25:00Z")
        latest, _ = mg.verdicts([new, old])
        self.assertEqual(latest["L1"]["verdict"], "changes")

    def test_escaped_marker_is_not_a_verdict(self):
        latest, escaped = mg.verdicts([comment("&lt;!-- review:L2 verdict=approve --&gt;", url="x")])
        self.assertNotIn("L2", latest)
        self.assertEqual(escaped, ["x"])

    def test_marker_must_lead(self):
        latest, _ = mg.verdicts([comment("text\n<!-- review:L1 verdict=approve -->")])
        self.assertEqual(latest, {})


class CIState(unittest.TestCase):
    def test_green_with_skips(self):
        self.assertEqual(mg.ci_state([run("Lint"), run("Build", "skipped")], [])[0], "green")

    def test_all_skipped_is_not_green(self):
        runs = [run("Lint", "skipped"), run("Test", "skipped")]
        self.assertEqual(mg.ci_state(runs, [])[0], "none")

    def test_red(self):
        state, why = mg.ci_state([run("Lint"), run("Screenshots", "failure")], [])
        self.assertEqual(state, "red")
        self.assertIn("Screenshots (failure)", why)

    def test_security_audit_does_not_gate(self):
        runs = [run("Lint"), run("Test"), run("Security Audit", "failure")]
        self.assertEqual(mg.ci_state(runs, [])[0], "green")
        self.assertEqual(mg.ci_state([run("Security Audit")], [])[0], "none")

    def test_pending(self):
        self.assertEqual(mg.ci_state([run("Test", None, "in_progress")], [])[0], "pending")

    def test_out_of_minutes(self):
        runs = [run("Lint", "failure"), run("Test", "skipped")]
        text = ["The job was not started because recent account payments have failed "
                "or your spending limit needs to be increased."]
        self.assertEqual(mg.ci_state(runs, text)[0], "out-of-minutes")

    def test_billing_text_with_a_success_is_red(self):
        runs = [run("Lint"), run("Test", "failure")]
        self.assertEqual(mg.ci_state(runs, ["spending limit"])[0], "red")


class Gates(unittest.TestCase):
    def test_all_pass(self):
        self.assertTrue(all(ok for ok, _ in gates().values()))

    def test_contract_attribute_is_not_a_marker(self):
        latest, _ = mg.verdicts([comment("<!-- review:L2 verdict=approve contract=additive -->")])
        self.assertEqual(latest, {})

    def test_draft_fails(self):
        g = gates(pr=dict(PR, draft=True))
        self.assertFalse(g["0 draft"][0])
        self.assertNotIn("0 draft", gates())

    def test_only_alpha(self):
        for base in ("main", "beta", "publish"):
            self.assertFalse(gates(pr=dict(PR, base={"ref": base}))["0 base"][0], base)
        self.assertNotIn("0 base", gates())

    def test_local_pass(self):
        fake = Fake()
        ok, why = gates(run=fake)["1 checks"]
        self.assertTrue(ok, why)
        for cmd in ("npm ci", "npm run lint", "TZ=Asia/Tokyo npm run test:ci",
                    "TZ=America/Chicago npm run test:ci", "npm run build"):
            self.assertEqual(fake.count(cmd), 1, cmd)
        self.assertEqual(fake.count("worktree remove"), 1)

    def test_local_failing_command_is_named(self):
        fake = Fake(fail={"TZ=America/Chicago npm run test:ci": 1})
        ok, why = gates(run=fake)["1 checks"]
        self.assertFalse(ok)
        self.assertIn("TZ=America/Chicago npm run test:ci", why)
        self.assertIn("the last line", why)
        self.assertEqual(fake.count("npm run build"), 0)
        self.assertEqual(fake.count("worktree remove"), 1)

    def test_merge_conflict_fails_and_cleans_up(self):
        fake = Fake(fail={"merge --no-edit": 1})
        ok, why = gates(run=fake)["1 checks"]
        self.assertFalse(ok)
        self.assertIn("merge conflict", why)
        self.assertEqual(fake.count("npm"), 0)
        self.assertEqual(fake.count("merge --abort"), 1)
        self.assertEqual(fake.count("worktree remove"), 1)

    def test_worktree_removed_when_a_command_raises(self):
        fake = Fake()
        real = fake.__call__

        def boom(argv, cwd=None, env=None):
            if argv[:2] == ["npm", "ci"]:
                raise RuntimeError("x")
            return real(argv, cwd, env)
        with self.assertRaises(RuntimeError):
            mg.gate_local(HEAD, 1, boom)
        self.assertEqual(fake.count("worktree remove"), 1)

    def test_red_check_run_fails_without_local_run(self):
        fake = Fake()
        ok, why = gates(ci=("red", "failed: Test (failure)"), run=fake)["1 checks"]
        self.assertFalse(ok)
        self.assertIn("Test (failure)", why)
        self.assertEqual(fake.calls, [])

    def test_gate_does_not_read_green_ci_as_a_pass(self):
        fake = Fake(fail={"npm run lint": 1})
        self.assertFalse(gates(ci=("green", "ok"), run=fake)["1 checks"][0])

    def test_docs_only_needs_no_ci(self):
        g = gates(files=["docs/a.md", "README.md", ".claude/skills/x/SKILL.md"],
                  ci=("none", ""), run=Fake(fail={"": 1}))
        self.assertTrue(g["1 checks"][0])

    def test_content_markdown_is_not_docs_only(self):
        for f in ("_nav/about.md", "_posts/hello.md", "_recipes/soup.md"):
            self.assertFalse(mg.is_docs_only(["README.md", f]), f)
        self.assertFalse(mg.is_docs_only(["util/x.js", "README.md"]))

    def test_out_of_minutes_fails(self):
        ok, why = gates(ci=("out-of-minutes", ""), run=Fake())["1 checks"]
        self.assertFalse(ok)
        self.assertIn("developer", why)

    def test_stale_verdict_fails(self):
        g = gates(pushed_at="2026-10-25T15:35:00Z")
        self.assertFalse(g["2 L1"][0])
        self.assertTrue(g["3 L2"][0])

    def test_l1_kept_across_deps_merge(self):
        g = gates(pushed_at="2026-10-25T15:35:00Z", l1_kept=True)
        self.assertTrue(g["2 L1"][0])
        self.assertIn("package-lock", g["2 L1"][1])

    def test_changes_verdict_fails(self):
        l2 = comment("<!-- review:L2 verdict=changes -->", at="2026-10-25T15:40:00Z")
        self.assertFalse(gates(comments=[L1_OK, l2])["3 L2"][0])

    def test_missing_verdict_fails(self):
        self.assertFalse(gates(comments=[L1_OK])["3 L2"][0])

    def test_needs_human(self):
        self.assertFalse(gates(labels={"needs-human"})["4 human"][0])
        self.assertTrue(gates(labels={"needs-human", "human-approved"})["4 human"][0])
        self.assertTrue(gates(labels={"needs-human"}, approved=["dev"])["4 human"][0])

    def test_conflict(self):
        self.assertFalse(gates(pr=dict(PR, mergeable=False, mergeable_state="dirty"))["5 conflict"][0])
        self.assertFalse(gates(pr=dict(PR, mergeable=None))["5 conflict"][0])

    def test_closed_pr_fails(self):
        self.assertFalse(gates(pr=dict(PR, state="closed"))["0 open"][0])

    def test_escaped_marker_fails(self):
        bad = comment("&lt;!-- review:L1 verdict=approve --&gt;", url="x")
        self.assertFalse(gates(comments=[L1_OK, L2_OK, bad])["markers"][0])


class ClosedIssues(unittest.TestCase):
    def test_leading_lines_only(self):
        self.assertEqual(mg.closed_issues("Closes #5\nCloses #6\n\nCloses #7"), [5, 6])
        self.assertEqual(mg.closed_issues("## Summary\nCloses #5"), [])


if __name__ == "__main__":
    unittest.main()
