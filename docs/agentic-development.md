# Agentic development

This document holds the rules for building the Antioch Urban Growers site with
Claude agents. Two skills follow it:

- `/scrum` grooms the backlog and turns issues into work packages.
- `/orchestrate` runs the work packages: implementers, two review layers, and
  the merge.

The skills hold the procedure. This file holds the rules. The agent
definitions in `.claude/agents/` hold the work of each role. The scripts in
`scripts/` do the mechanical checks.

## 1. Overview and roles

| Role | Who | Does |
| ---- | --- | ---- |
| Developer | a person | Decides scope, approves `needs-human` work, promotes `alpha` → `beta` → `main`, merges `publish` |
| Scrum master | `/scrum` | Ranks the backlog, writes WP bodies, applies labels |
| Orchestrator | `/orchestrate` | Starts agents, routes reviews, merges WP PRs into `alpha` |
| Implementer | `implementer` agent | Implements one WP, opens one draft PR |
| Layer-1 reviewer | `pr-reviewer` agent (sonnet) | Reads the diff cold, runs the checks |
| Layer-2 reviewer | `pr-reviewer-l2` agent (opus) | Checks the project rules, the other WPs, the design, and what the client sees |

Each agent starts with a fresh context. A reviewer never sees how the work was
made. The orchestrator never reviews its own PRs.

The orchestrator merges into `alpha` only. Everything past `alpha` belongs to
the developer (CONTRIBUTING.md, "Branching and deployment").

## 2. Work package issues

### 2.1 Format

A work package (WP) is a GitHub issue with the label `wp`, a `model:*` label,
and a title that starts `[WP-NN]`. `/scrum` gives the next free number.

The body has six sections, in this order:

1. **Goal** — one paragraph: what changes for a visitor, the client, or the
   developer.
2. **Depends on** — issue numbers or WP IDs, or "None.".
3. **Owned files** — the real paths that the WP may change, one per line.
   Name the test files too. A WP that changes the rendering also owns the
   baselines that it changes under `tests/visual/__screenshots__/` (section 10).
4. **Acceptance criteria** — checkboxes. Each one is testable.
5. **Notes** — what the implementer will meet: the module, the test file to
   extend, a trap from the README (timezones, `_nav/` slugs, drafts, the
   screenshot renderer). Write "None." when there is nothing.
6. **Out of scope** — what the WP must not do.

A converted issue keeps its first text under `## Original report`.

### 2.2 Dependencies

The dependencies are GitHub's blocked-by links. A WP stays blocked while one
of its blockers is open. A closed blocker no longer blocks. The **Depends on**
text names the same issues. `scripts/scrum.py links --apply` adds a link that
the text names and GitHub lacks. When links and text disagree, the links win
and the snapshot flags the row.

## 3. Labels

| Label | Owner | Meaning |
| ----- | ----- | ------- |
| `priority: critical` | `/scrum` | p0. Do now: it blocks other work or the site |
| `priority: high` | `/scrum` | p1. Next: start when a slot is free |
| `priority: medium` | `/scrum` | p2. Later: planned, not next |
| `priority: low` | `/scrum` | p3. Someday: wanted, no plan |
| `icebox` | `/scrum` | Parked on purpose |
| `wp` | `/scrum` | A work package. `/orchestrate` reads only these |
| `model:haiku`, `model:sonnet`, `model:opus` | `/scrum` | The implementer model (section 9) |
| `needs-human` | `/scrum` | The developer approves the PR before the merge |
| `human-approved` | `/orchestrate` | The developer approved in chat |
| `status:ready`, `status:blocked`, `status:in-progress`, `status:in-review`, `status:escalated` | `/orchestrate` | The WP state |
| `ci:billing` | `/orchestrate` | The notice that Actions minutes ran out |

A WP gets `needs-human` when the client will see the change or the change
carries risk past the code:

1. A change to layout, colour, type, or copy (any screenshot baseline moves).
2. A change to the CMS at `public/admin/` (the client's editor).
3. A new dependency in `package.json`.
4. A change to `.github/workflows/`, `netlify.toml`, or the deploy.
5. A change to SEO facts in `util/siteMeta.js`.

## 4. Branches and PRs

1. The implementer branches from `origin/alpha`. The branch name is
   `feature/wp-NN-short-slug`. CI does not run on `feature/**` pushes or on
   PRs into `alpha`. Gate 1 of the merge gate runs the checks (section 7).
2. The implementer opens a **draft** PR into `alpha`. The title is
   `[WP-NN] <issue title>`.
3. The first line of the body is `Closes #<WP issue>`. No other closing
   keyword appears in the body. Write `Refs #N` for other issues.
4. The body has these sections: **Summary**, **Changes**, **Checks run**
   (each command and its result), **Screenshots** (which baselines moved and
   why, or "No baseline moved."), and **Notes**.
5. The body ends with one attribution footer.
6. The orchestrator marks the PR ready after both reviews approve, and
   squash-merges it with `scripts/merge-gate.py --merge`. The script deletes
   the `feature/*` branch.
7. Squash belongs to PRs into `alpha` alone. A promotion (`alpha` → `beta` →
   `main`), `publish` → `main`, and a back-merge PR keep their commits: a
   merge commit, never a squash or a rebase (`CONTRIBUTING.md`, "Merge
   methods"). The developer merges those. The orchestrator never does.

## 5. Reviews

### 5.1 Layer 1

A new `pr-reviewer` agent on sonnet reads the PR cold: the diff, the issue,
and the files that the diff touches. It runs `npm run lint`, `npm run test:ci`,
and `npm run build` on the PR head. It checks the acceptance criteria, the
correctness, the tests, the scope (owned files only), and the PR rules.

### 5.2 Layer 2

After an L1 approve, a new `pr-reviewer-l2` agent on opus reads the project
rules (`README.md`, `CONTRIBUTING.md`, `docs/TESTING.md`, this file), the issue, the L1 comment, and the open PRs that
touch the same files. It checks what L1 cannot see:

1. The rules in the README: the static export, `_nav/` slugs, draft content,
   `util/siteMeta.js` as the one source of business facts, the calendar
   boundary, the branch model.
2. What the client and the visitors see: the screenshot changes, the CMS
   fields, accessibility.
3. Security: the CMS credential, third-party scripts, raw HTML in Markdown.
4. Cross-WP consistency with the open PRs.
5. Whether a test fails when the riskiest path of the diff breaks.

An L2 `changes` verdict does not start a fix round. The orchestrator
escalates to the developer.

### 5.3 Verdict markers

Each review posts one PR comment whose first line is the marker:

```
<!-- review:L1 verdict=approve|changes -->
<!-- review:L2 verdict=approve|changes -->
```

The merge gate reads only the latest marker of each layer. A push after a
verdict makes that verdict stale. One exception: an orchestrator merge commit
that resolves only `package.json` and `package-lock.json` keeps the L1
verdict. A marker escaped as `&lt;!--` counts as no verdict, and the gate
fails on it.

## 6. Fix rounds

1. An L1 `changes` verdict or red CI starts a fix round. The orchestrator
   sends the findings (or the failing check and its first failing line) to a
   new implementer on the same branch.
2. The implementer pushes new commits. It never force-pushes. It replies on
   the PR with one line per finding: fixed in `<sha>`, or why not.
3. A new L1 review and then a new L2 review follow each push.
4. A WP gets at most 3 fix rounds. After the third, the orchestrator
   escalates.

## 7. Merge gate

`scripts/merge-gate.py <n>` checks the gates on the PR head:

0. The PR is open, ready (not a draft), and targets `alpha`.
1. The local checks pass. CI runs at promotion only (CONTRIBUTING.md, "CI"),
   so gate 1 is the local run. The script merges the PR head onto the current
   `origin/alpha` in a temporary worktree. It runs `npm ci`, `npm run lint`,
   `npm run test:ci` at `TZ=Asia/Tokyo` and at `TZ=America/Chicago`, and
   `npm run build`. It prints the command that failed. It removes the
   worktree. A merge conflict fails the gate. A red check run on the head
   fails the gate; the Security Audit job does not count. A PR that changes
   only Markdown outside `_nav/`, `_posts/`, `_recipes/`, and `public/` needs
   no checks. Screenshots are not part of gate 1 (section 10).
2. The latest L1 verdict approves, and it is not stale.
3. The latest L2 verdict approves, and it is not stale.
4. A `needs-human` PR or issue has the developer's approval: an approving
   GitHub review on the head, or the label `human-approved`.
5. GitHub reports no merge conflict.

When a check run on the head shows that CI ran out of Actions minutes, the
gate fails. The orchestrator opens one
`[ops] GitHub Actions minutes are used up` issue with the label `ci:billing`,
tells the developer once, and waits. It never re-runs CI, pushes an empty
commit, or closes and reopens a PR.

A red CI at a promotion into `beta` or `main` gets a fix branch into `alpha`.
It is a normal WP. The promotion waits for the fix.

## 8. After a merge

1. Run `scripts/scrum.py snapshot --fix-status`. It sets `status:ready` on each
   WP that the merge unblocked.
2. Check the merge on the `alpha` log.
3. If the merge changed what an open WP assumes (a function name, a file, a
   prop), comment on that WP issue with an `Orchestrator note`.

## 9. Implementer models

1. `opus` for the calendar boundary (`util/googleCalendar.js` and its dates),
   the CMS and its credential, security work, and a WP that needs design
   judgment.
2. `haiku` only when the WP meets all five points:
   1. The issue names every owned file and what changes in it.
   2. The issue leaves no design choice open.
   3. No screenshot baseline moves.
   4. No new export, prop, route, frontmatter field, or environment variable
      that the issue does not spell out.
   5. The WP does not carry `needs-human`.
3. `sonnet` for everything else, and when in doubt.

A haiku implementer that finds the WP not mechanical stops and returns a
**model escalation request**. The orchestrator moves the WP to sonnet. A
haiku implementer that fails for any reason except HTTP 429 restarts on
sonnet. The first fix round of a haiku PR runs on haiku; a later one runs on
sonnet.

## 10. Screenshots

The screenshot job compares every page at four viewports against committed
baselines (`docs/TESTING.md`).

1. CI runs the Screenshots job only on PRs into `beta` and `main`. A WP PR
   into `alpha` runs no CI, and gate 1 does not run screenshots. The implementer runs `npm run baseline:check`
   when Docker runs, and reports the result under **Checks run**. Without
   Docker, it writes "Screenshots: not run" and the developer meets any
   regression at the promotion.
2. A WP that does not mean to change the rendering must leave every baseline
   alone. A failing `baseline:check` on such a WP counts as a defect.
3. A WP that means to change the rendering owns the baselines that move. It
   carries `needs-human`, because the client sees the change.
4. Never regenerate baselines on the host. Use `npm run baseline` (Docker)
   when Docker runs, or else dispatch the **Refresh screenshot baselines**
   workflow on the PR branch with a reason.
5. A commit pushed by that workflow starts no CI run (it pushes with
   `GITHUB_TOKEN`). Gate 1 does not read CI, so it is not affected. The
   developer still reviews the moved baselines before the merge.
6. The PR body lists each moved baseline and why it moved.

## 11. Parallel work and conflicts

1. Two WPs that own the same file never run at the same time. The
   orchestrator starts the second one after the first merges.
2. Shared files that many WPs touch (`styles/globals.css`,
   `components/layout.js`, `util/siteMeta.js`, `tests/visual/routes.mjs`)
   count as owned. Name them in **Owned files** when a WP changes them.
3. A merge conflict on a PR: the orchestrator merges `alpha` into the branch
   in a temporary worktree. When the conflict lies only in
   `package-lock.json`, it regenerates the lock with `npm install` and pushes.
   Any other conflict starts a fix round.
4. An implementer that must change a file outside its **Owned files** stops
   and returns a **scope change request**: the file, the change, and the
   reason. The orchestrator edits the issue, or asks the developer.
