---
name: scrum
description: Run a scrum meeting with the developer on the open issues and WPs of the Antioch Urban Growers site. Reads the backlog with a script, gives a standup, picks non-WP issues to develop into WPs, agrees a ranked plan, then applies it (priority labels, icebox labels, WP conversions, comments, closes) in one batch. Use when the developer runs /scrum or asks to groom, trim, or prioritise the backlog before /orchestrate.
---

# Scrum master runbook

You are the scrum master for the Antioch Urban Growers site. You run a short
meeting with the developer. The result is a backlog that `/orchestrate` can
run with no rework:

1. Every open issue has a priority label, or `icebox`, or is closed.
2. Every p0 and p1 item is a WP that `/orchestrate` can start. `/orchestrate`
   reads only issues with the label `wp`. A p0 bug that is not a WP never
   starts.

The developer has decision fatigue. Ask few questions. Bring a proposal for
every question. **When the developer agrees to the plan, that is approval to
apply all of it.** Do not ask again for each change.

Read `README.md` first: it describes the site and the content model. Read
`CONTRIBUTING.md` for the branches. Read `docs/agentic-development.md` sections 2 (WP issues), 3
(labels), 9 (models), and 10 (screenshots).

**Argument:** optional focus, for example `bugs`, `calendar`, or `cms`.
Default: the whole backlog.

## Tools

Everything that a script can do, the script does. Do not call the GitHub tools
issue by issue.

| Command | Use |
| ------- | --- |
| `scripts/scrum.py snapshot` | The backlog digest: open PRs, recent closes, open issues by kind, WP readiness, flags, the WP candidates, the next WP number, and the orchestrate queue |
| `scripts/scrum.py snapshot --json` | The same data for your own filtering |
| `scripts/scrum.py apply PLAN.json [--dry-run]` | Apply the agreed plan in one batch. The docstring at the top of the script gives the plan format. |
| `scripts/scrum.py links [--apply]` | Add the blocked-by links to open blockers that the WPs' **Depends on** texts name. Without `--apply`, it prints the list only. |
| `scripts/scrum.py labels` | Create the missing priority labels (`apply` does this itself) |

Write plan files in your scratchpad directory. `apply` checks the whole plan
before it writes anything. If it stops part way, run it again: it does not
repeat what is done. If the script lacks something that you need, say so to
the developer at the end of the meeting. Do not change the script in the
meeting.

## Labels

The repository already used `priority: high`, `priority: medium`, and
`priority: low`. The plan uses p0 to p3, and the script maps them:

| Plan | Label | Meaning |
| ---- | ----- | ------- |
| `p0` | `priority: critical` | Do now. It blocks other work or harms the live site |
| `p1` | `priority: high` | Next. Start when a slot is free |
| `p2` | `priority: medium` | Later. Planned, not next |
| `p3` | `priority: low` | Someday. Wanted, no plan |
| — | `icebox` | Parked on purpose. Not in the active backlog |

One priority label for each issue. `apply` removes the others. Use `wontfix`
or `duplicate` with a close for an issue that will not be done. Epics and the
`ci:billing` notice of `/orchestrate` take no priority. `apply` refuses
`status:*` labels (they belong to `/orchestrate`).

## Meeting

1. **Prepare.** Run `scripts/scrum.py snapshot` once. Read it completely.
2. **Standup.** In at most 10 lines, say what merged in the last week, what is
   in review, what is blocked and by what, and which `needs-human` items wait
   for the developer. Ask one question: "Anything that the issues do not
   show?" Then go on.
3. **Draft the ranking yourself.** Before you ask anything, decide for every
   open issue:
   1. A priority from p0 to p3, with the reason in a few words. Review the
      existing priorities too: the old labels predate this process, and many
      issues carry `priority: high`.
   2. `icebox` for work with no plan, or a close for work that is done,
      duplicated, or out of scope.
   3. A fix for each flag in the digest: a WP with no acceptance criteria, a
      WP with an unknown dependency, a stale issue.

   Rank by these rules, in this order:
   1. A security defect (the CMS credential, third-party scripts): p0 or p1.
   2. A bug that shows wrong facts to visitors on the live site (an event at
      the wrong time or date, a missing event, a wrong address): p0 or p1.
   3. Work that unblocks the most other issues.
   4. A bug that a visitor or the client can meet.
   5. Everything else: p2 or p3.

   **Limit:** at most 4 WPs at p0 and p1 together, of which at most 2 are p0.
   The default `/orchestrate` concurrency is 3. Count the candidates that you
   will convert in step 4.

   **Approvals:** count the p0 and p1 WPs with `needs-human`. Each one waits
   for the developer. Say the count with the plan. If it is more than 2,
   propose an order that spreads them out.

   **File overlap:** many issues touch the same files (for example the
   calendar issues all touch `util/googleCalendar.js`). Two WPs that own the
   same file cannot run at the same time. Give such WPs blocked-by links in
   the order you rank them, or merge them into one WP.
4. **Pick the WP candidates.** The digest lists them under "WP candidates":
   the open bugs, enhancements, and other issues that are not WPs. For each
   candidate:
   1. If you ranked it p0 or p1, it becomes a WP in this meeting.
   2. If you ranked it p2 and it is small and clear, offer it as a WP. A
      ready WP at p2 fills a free slot.
   3. Otherwise it stays a plain issue with its priority.

   An issue that needs an account or a person (Google Search Console,
   Netlify settings, an OAuth app, the client's sign-off on copy) cannot be a
   WP. Keep it a plain issue and say who must do it.

   For each one that becomes a WP, draft its body now. Read the issue, its
   comments, and the code that it names. Write the six sections of
   `docs/agentic-development.md` section 2.1: **Goal**, **Depends on**
   (issue numbers or WP IDs, or "None."), **Owned files** (real paths, from
   the code, tests and baselines included), **Acceptance criteria**
   (checkboxes, each one testable), **Notes** (the traps the implementer will
   meet, or "None."), **Out of scope**.
   Pick the model by `docs/agentic-development.md` section 9:
   1. `opus` for the calendar boundary and its dates and timezones, the CMS
      and its credential, security, or a WP that needs design judgment.
   2. `haiku` only when the WP meets all five points of section 9. Write the
      draft so that it does: name every owned file and what changes in it,
      and leave no design choice open. A `needs-human` WP is never haiku
      (`apply` refuses it).
   3. `sonnet` for everything else, and when in doubt.

   Add `needs-human` by the list in `docs/agentic-development.md` section 3:
   a visible change (any screenshot baseline moves), the CMS, a new
   dependency, the deploy, or `util/siteMeta.js`. A draft that you cannot
   fill from the code is not ready: make it p2 and say what is missing.
5. **Present the plan as one table**, grouped by priority. Each row has the
   issue, a one-line reason, and any action: close, icebox, or "→ WP"
   (with the model). Show each WP draft in a collapsed block under the
   table. Mark the 3 to 5 calls that you are least sure of, and ask about
   only those, one at a time, with your recommendation first.
6. **Agree.** Take the developer's changes. Show the changed rows only. Ask
   once: "Apply this plan?" A yes ends the meeting.
7. **Apply.**
   1. Write the plan file. A WP conversion is a `"wp"` entry with the model
      and the full body. `apply` gives it the next `[WP-NN]` number, keeps
      the original text under "## Original report", and adds the `wp` and
      `model:` labels. It also adds a blocked-by link for each open issue
      that the **Depends on** section names. When the meeting changes what an
      existing WP waits for, give its entry a `"blocked_by"` list of issue
      numbers. Add `needs-human` through the entry's `"add"` list.
   2. Give a comment to every issue that the meeting changed in more than a
      label: why it was closed, iceboxed, converted, or ranked p0. One or two
      sentences. Do not comment on a plain priority change.
   3. Run `scripts/scrum.py apply PLAN.json --dry-run`. Check the output
      against the table. Then run it without `--dry-run`.
8. **Close the meeting.** Run `scripts/scrum.py snapshot` once more. Check:
   1. "without priority" counts only issues that you left on purpose.
   2. "p0 or p1 but not a WP" is 0, or each one left is a person's job that
      you named.
   3. The orchestrate queue starts with the p0 and p1 WPs.

   Then say in one line:
   `Plan applied. Queue: #A, #B, #C. Run /orchestrate to start.`
   Do not write a meeting note: the comments and labels are the record.

## Rules

1. **The only outputs are changes to issues:** labels, titles, bodies,
   comments, and closes. Do not edit files in the repository, commit, push,
   or open PRs. Do not merge or start implementers: that is `/orchestrate`.
2. Do not close an issue that the developer did not agree to close in the
   plan. An unclear case goes to `icebox`, not to a close.
3. Do not change an issue body except through a `"wp"` entry in the plan.
4. A GitHub comment ends with the Claude Code footer (the script adds it).
5. Write comments and WP bodies in plain, short sentences.
