#!/usr/bin/env python3
"""Tests for scripts/scrum.py. No network: they call the pure functions.

    python3 -B scripts/test_scrum.py
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scrum  # noqa: E402

NOW = "2026-10-20T00:00:00Z"
WP_BODY = "\n".join(f"## {s}\nx" for s in scrum.WP_SECTIONS)


def issue(number, title, body="", state="open", reason=None, labels=()):
    return {"number": number, "title": title, "body": body, "state": state,
            "state_reason": reason, "labels": [{"name": l} for l in labels],
            "created_at": NOW, "updated_at": NOW, "comments": 0}


class Section(unittest.TestCase):
    def test_stops_at_next_heading(self):
        body = "## Goal\ng\n### Depends on\n- #4\n## Owned files\nf"
        self.assertEqual(scrum.section(body, "Depends on").strip(), "- #4")

    def test_missing(self):
        self.assertIsNone(scrum.section("## Goal\ng", "Depends on"))
        self.assertIsNone(scrum.section(None, "Goal"))


class Deps(unittest.TestCase):
    def rows(self, *issues):
        return {r["number"]: r for r in scrum.build(list(issues))}

    def test_suffixed_id_blocks(self):
        rows = self.rows(
            issue(10, "[WP-2] Main", "## Depends on\n- Auth-26t\n", labels=["wp"]),
            issue(9, "[Auth-26t] Tests", labels=["wp"]),
        )
        self.assertEqual(rows[10]["open_deps"], [9])
        self.assertEqual(rows[10]["unknown_deps"], [])

    def test_unknown_id_is_reported(self):
        rows = self.rows(issue(10, "[WP-2] Main", "## Depends on\n- FH-9\n",
                               labels=["wp"]))
        self.assertEqual(rows[10]["unknown_deps"], ["FH-9"])

    def test_number_and_id_together(self):
        rows = self.rows(
            issue(10, "[WP-2] Main", "## Depends on\n- WP-1 (#5)\n", labels=["wp"]),
            issue(5, "[WP-1] Base", state="closed", reason="completed",
                  labels=["wp"]),
        )
        self.assertEqual(rows[10]["deps"], [5])
        self.assertEqual(rows[10]["open_deps"], [])

    def test_not_planned_dep_no_longer_blocks(self):
        # GitHub's rule (developer, 2026-10-28): a closed blocker resolves,
        # whatever the close reason.
        rows = self.rows(
            issue(10, "[WP-2] Main", "## Depends on\n- #5\n", labels=["wp"]),
            issue(5, "[WP-1] Base", state="closed", reason="not_planned"),
        )
        self.assertEqual(rows[10]["open_deps"], [])

    def test_reused_id_resolves_to_newest(self):
        # The API lists the newest issue first.
        rows = self.rows(
            issue(30, "[WP-2] Main", "## Depends on\n- WP-1\n", labels=["wp"]),
            issue(20, "[WP-1] Redo", labels=["wp"]),
            issue(5, "[WP-1] Old", state="closed", reason="not_planned"),
        )
        self.assertEqual(rows[30]["deps"], [20])


class OpenPR(unittest.TestCase):
    def test_closes_line_matches_exact_number(self):
        row = {"number": 31, "title": "Some bug"}
        prs = [{"title": "[fix] x", "body": "Closes #315\n"}]
        self.assertFalse(scrum.in_open_pr(row, prs))
        prs = [{"number": 700, "title": "[fix] x", "body": "Closes #31\n"}]
        self.assertTrue(scrum.in_open_pr(row, prs))
        self.assertEqual(scrum.open_pr_of(row, prs), 700)

    def test_title_id(self):
        row = {"number": 315, "title": "[WP-109] Forum reads"}
        self.assertTrue(scrum.in_open_pr(row, [{"number": 7, "title": "[WP-109] Forum", "body": ""}]))
        self.assertFalse(scrum.in_open_pr(row, [{"title": "[WP-10] Other", "body": ""}]))


class PRRefs(unittest.TestCase):
    def test_pr_in_depends_on_does_not_block(self):
        rows = {r["number"]: r for r in scrum.build([
            issue(631, "[Mod-7] Hide", "## Depends on\n- Mod-3a (#698): from the tests, PR #697.\n",
                  labels=["wp"]),
            issue(698, "[Mod-3a] Contract", state="closed", reason="completed", labels=["wp"]),
        ])}
        self.assertEqual(rows[631]["open_deps"], [])
        self.assertEqual(rows[631]["unknown_deps"], [])

    def test_number_that_is_no_issue_is_flagged(self):
        rows = {r["number"]: r for r in scrum.build([
            issue(10, "[WP-2] Main", "## Depends on\n- #697\n", labels=["wp"])])}
        self.assertEqual(rows[10]["open_deps"], [])
        self.assertEqual(rows[10]["unknown_deps"], ["#697"])


class Links(unittest.TestCase):
    TEXT = "## Depends on\n- WP-1 (#5)\n"

    def build(self, links, text=TEXT):
        issues = [issue(10, "[WP-2] Main", text, labels=["wp"]),
                  issue(5, "[WP-1] Base", labels=["wp"]),
                  issue(6, "[WP-3] Other", state="closed", reason="completed", labels=["wp"])]
        self.by_num = {i["number"]: i for i in issues}
        return {r["number"]: r for r in scrum.build(issues, links)}

    def test_links_decide(self):
        r = self.build({10: [{"number": 5, "state": "open"}]})[10]
        self.assertTrue(r["linked"])
        self.assertEqual(r["open_deps"], [5])
        self.assertEqual([f for f in r["flags"] if "link" in f], [])

    def test_closed_blocker_resolves(self):
        r = self.build({10: [{"number": 6, "state": "closed"}]}, "## Depends on\n- #6\n")[10]
        self.assertEqual(r["open_deps"], [])

    def test_links_win_and_disagreement_is_flagged(self):
        # The text names open #5; the only link is to closed #6.
        r = self.build({10: [{"number": 6, "state": "closed"}]})[10]
        self.assertEqual(r["open_deps"], [])
        self.assertTrue(any(f.startswith("links and text disagree") for f in r["flags"]))

    def test_text_fallback_is_flagged(self):
        r = self.build({})[10]
        self.assertEqual(r["open_deps"], [5])
        self.assertIn("no blocked-by links (run scrum.py links)", r["flags"])

    def test_plan_adds_only_missing_links(self):
        rows = list(self.build({}).values())
        self.assertEqual(scrum.link_plan(rows, self.by_num), [(10, 5)])
        rows = list(self.build({10: [{"number": 5, "state": "open"}]}).values())
        self.assertEqual(scrum.link_plan(rows, self.by_num), [])

    def test_plan_skips_closed_blockers(self):
        rows = list(self.build({}, "## Depends on\n- #5, #6\n").values())
        self.assertEqual(scrum.link_plan(rows, self.by_num), [(10, 5)])

    def test_closed_text_dep_is_no_disagreement(self):
        r = self.build({10: [{"number": 5, "state": "open"}]}, "## Depends on\n- #5, #6\n")[10]
        self.assertEqual([f for f in r["flags"] if "disagree" in f], [])

    def test_plan_leaves_extra_links(self):
        rows = list(self.build({10: [{"number": 5, "state": "open"},
                                     {"number": 6, "state": "closed"}]}).values())
        self.assertEqual(scrum.link_plan(rows, self.by_num), [])


class Status(unittest.TestCase):
    def state(self, labels=(), deps_open=False, pr=None):
        dep = issue(5, "[WP-1] Dep", state="open" if deps_open else "closed",
                    reason=None if deps_open else "completed", labels=["wp"])
        wp = issue(10, "[WP-2] Main", "## Depends on\n- #5\n", labels=["wp", *labels])
        prs = [{"number": 77, "title": "[WP-2] Main", "body": "Closes #10\n"}] if pr else []
        rows = scrum.build([wp, dep])
        scrum.finish_flags(rows, prs)
        return next(r for r in rows if r["number"] == 10)

    def test_ready_and_blocked(self):
        self.assertEqual(self.state(["status:ready"])["status_fix"], None)
        r = self.state(["status:ready"], deps_open=True)
        self.assertEqual((r["wp_state"], r["status_fix"]), ("blocked", "status:blocked"))
        self.assertEqual(self.state(["status:blocked"])["status_fix"], "status:ready")
        self.assertEqual(self.state()["status_fix"], "status:ready")

    def test_open_pr_means_in_review(self):
        r = self.state(["status:in-progress"], pr=True)
        self.assertEqual((r["wp_state"], r["pr"], r["status_fix"]), ("in-review", 77, "status:in-review"))

    def test_in_review_without_pr_is_for_a_person(self):
        r = self.state(["status:in-review"])
        self.assertIsNone(r["status_fix"])
        self.assertIn("status:in-review but no open PR", r["flags"])

    def test_escalated_and_in_progress_stay(self):
        self.assertEqual(self.state(["status:escalated"], pr=True)["status_fix"], None)
        self.assertEqual(self.state(["status:in-progress"], deps_open=True)["wp_state"], "in-progress")

    def test_two_labels_are_fixed(self):
        r = self.state(["status:ready", "status:blocked"])
        self.assertEqual(r["status_fix"], "status:ready")


class Validate(unittest.TestCase):
    KNOWN = ["bug", "wontfix", "needs-human"]

    def errs(self, *entries):
        return scrum.validate(list(entries), self.KNOWN)

    def test_good_plan(self):
        self.assertEqual(self.errs(
            {"issue": 1, "priority": "p1", "add": ["icebox"], "comment": "c"},
            {"issue": 2, "wp": {"model": "sonnet", "body": WP_BODY}},
        ), [])

    def test_refuses_status_and_unknown_labels(self):
        errs = self.errs({"issue": 1, "remove": ["status:ready"], "add": ["bgu"]})
        self.assertEqual(len(errs), 2)

    def test_refuses_duplicates_and_bad_values(self):
        errs = self.errs({"issue": 1, "priority": "high"},
                         {"issue": 1, "close": "done"})
        self.assertEqual(len(errs), 3)

    def test_wp_needs_every_section_and_a_model(self):
        errs = self.errs({"issue": 1, "wp": {"model": "gpt", "body": "## Goal\nx"}})
        self.assertEqual(len(errs), 2)

    def test_haiku_wp_cannot_need_a_human(self):
        self.assertEqual(self.errs(
            {"issue": 1, "wp": {"model": "haiku", "body": WP_BODY}}), [])
        errs = self.errs({"issue": 1, "add": ["needs-human"],
                          "wp": {"model": "haiku", "body": WP_BODY}})
        self.assertEqual(len(errs), 1)


class BlockedByPlan(unittest.TestCase):
    def errs(self, *entries):
        return scrum.validate(list(entries), [])

    def test_good(self):
        self.assertEqual(self.errs({"issue": 5, "blocked_by": [4, 3]}), [])

    def test_bad_values(self):
        self.assertEqual(len(self.errs({"issue": 5, "blocked_by": "4"})), 1)
        self.assertEqual(len(self.errs({"issue": 5, "blocked_by": [5]})), 1)


class Kinds(unittest.TestCase):
    def test_ops_issue_is_not_backlog(self):
        rows = scrum.build([issue(1, "[ops] GitHub Actions minutes are used up",
                                  labels=["ci:billing"])])
        scrum.finish_flags(rows, [])
        self.assertEqual(rows[0]["kind"], "ops")
        self.assertFalse(scrum.is_candidate(rows[0]))
        self.assertNotIn("no priority", rows[0]["flags"])


class Labels(unittest.TestCase):
    def test_existing_priority_labels_map_to_levels(self):
        rows = scrum.build([issue(1, "a", labels=["bug", "priority: high"]),
                            issue(2, "b", labels=["enhancement", "priority: low"]),
                            issue(3, "c", labels=["priority: critical"])])
        self.assertEqual([r["priority"] for r in rows], ["p1", "p3", "p0"])
        self.assertEqual([r["kind"] for r in rows], ["bug", "enhancement", "other"])


class Convert(unittest.TestCase):
    def test_keeps_original_text(self):
        title, body = scrum.wp_change(issue(1, "All-day events vanish", "It fails."),
                                      {"body": WP_BODY}, 130)
        self.assertEqual(title, "[WP-130] All-day events vanish")
        self.assertTrue(body.startswith("## Goal"))
        self.assertTrue(body.endswith("## Original report\n\nIt fails."))

    def test_drops_old_tag(self):
        title, _ = scrum.wp_change(issue(1, "[bug] All-day events vanish"),
                                   {"body": WP_BODY}, 130)
        self.assertEqual(title, "[WP-130] All-day events vanish")

    def test_already_a_wp(self):
        self.assertIsNone(scrum.wp_change(issue(1, "[WP-5] x"), {"body": WP_BODY}, 9))
        self.assertIsNone(scrum.wp_change(issue(1, "x", labels=["wp"]),
                                          {"body": WP_BODY}, 9))

    def test_next_number(self):
        issues = [issue(1, "[WP-129] a"), issue(2, "[WP-06a] b"), issue(3, "x")]
        self.assertEqual(scrum.next_wp_number(issues), 130)


if __name__ == "__main__":
    unittest.main()
