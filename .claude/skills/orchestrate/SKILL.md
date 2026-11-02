---
name: orchestrate
description: Run the Antioch Urban Growers orchestrator loop. Schedules ready work packages, starts parallel implementer agents, runs layer-1 (independent sonnet) and layer-2 (independent opus) reviews, and merges PRs that pass all gates into alpha. Use when the developer runs /orchestrate or asks to continue the build.
---

# Orchestrator runbook

You are the orchestrator for the Antioch Urban Growers site. You have the
global context. Read `README.md`, `CONTRIBUTING.md`, `docs/TESTING.md`, and
`docs/agentic-development.md` completely
before you do anything. They are the rules. This file is the procedure.

**Argument:** optional concurrency limit. Default 3. The site is small, and
many WPs touch the same few files (`docs/agentic-development.md` section 11).

## 0. Preconditions

1. You run on the opus or the sonnet model. On any other model, tell the
   developer and stop. Opus is the default. On sonnet, follow section 5 as
   well. Name the model in your first message to the developer.
2. You can push `feature/*` branches and merge PRs into `alpha` in
   `revslaughter/aug-blog`. In a cloud session, ask the developer for this
   permission first. If you do not have it, tell the developer and stop.
3. Use the GitHub MCP tools if they are available. Otherwise use `gh`. The
   scripts use `gh api` (REST only).
4. If the local clone is shallow, run `git fetch --unshallow`. A shallow clone
   cannot find merge bases.
5. Run `git fetch origin alpha`. WPs branch from `origin/alpha` and merge
   into it. You never merge into `beta`, `main`, or `publish`. If `alpha`
   does not exist, tell the developer and stop. The developer creates it.
6. Run `docker info`. In a cloud session the Docker client is installed but
   the daemon does not run. Start it with `dockerd` in the background, and
   wait until `docker info` succeeds. The implementers and reviewers then
   run `npm run baseline:check` (`docs/agentic-development.md` section 10).

## 1. Build the state

Scripts do the mechanical work of this runbook. Read their output. Do not
rebuild it by hand, and do not call the GitHub tools issue by issue for what
a script prints.

1. Run `scripts/scrum.py snapshot --fix-status`. Its "Orchestrate state"
   section lists each open WP as escalated, in review (with its PR), in
   progress, ready, or blocked (with its open blockers). The blockers are
   the GitHub blocked-by links (`docs/agentic-development.md` section 2.2).
   `--fix-status` sets each wrong `status:*` label.
2. Act on the lines that the script leaves to you: "status:in-review but no
   open PR", "links and text disagree", and "no blocked-by links".

## 2. Loop

Repeat until no WP is open, or the developer says stop:

1. **Start work.** While running implementers < limit and a WP is ready:
   1. Pick the next ready WP from the orchestrate queue that
      `scripts/scrum.py snapshot` prints (priority first, then issue
      number). If many ready WPs have no priority, tell the developer to run
      `/scrum` first.
   2. Skip a WP whose **Owned files** overlap a WP that runs now or has an
      open PR (`docs/agentic-development.md` section 11). Take the next one.
   3. Set `status:in-progress`.
   4. Start an `implementer` agent in the background with
      `isolation: "worktree"`, the model from the `model:` label, and the
      prompt `WP-NN, issue #N.` The label `model:haiku` gives the model
      `haiku`, `model:sonnet` gives `sonnet`, and `model:opus` gives `opus`.
      A WP with no `model:` label runs on sonnet.
2. **Handle a finished implementer.**
   1. If it returned a PR number (a draft PR): set `status:in-review`. If the
      WP issue has `needs-human`, add `needs-human` to the PR too, before
      any review starts. If the implementer dispatched the "Refresh screenshot
      baselines" workflow, wait until that run ends. Then start
      a new `pr-reviewer` agent in the background with
      `isolation: "worktree"` and the prompt `Review PR #<n>.` Send nothing
      else.
   2. If it returned a **scope change request**: decide whether the file
      belongs to the WP. If it does, and no other running WP owns it, add it
      to **Owned files** in the issue, comment one line on the issue, and
      start the implementer again. Otherwise escalate.
   3. If it stopped with HTTP 429 (a spend or rate limit): this is not a
      failure. Set `status:ready` (or keep `status:in-review` for a fix
      round) and restart or resume it after the limit resets.
   4. If it failed for any other reason: read its output. Start it again
      once with the error. A `model:haiku` WP starts again on sonnet
      (section 6). After a second failure, escalate.
   5. If it returned a **model escalation request** (a `model:haiku` WP that
      is not mechanical): follow section 6, rule 3.
   6. A fix round that starts a new agent: tell it to work on a detached
      `HEAD` from `origin/<branch>` and push with `HEAD:<branch>`, because
      the first implementer's worktree still has the branch checked out.
3. **Handle a finished L1 review.**
   1. If L1 says `approve`: start a new `pr-reviewer-l2` agent in the
      background with `isolation: "worktree"` (model opus, from its
      definition) and the prompt `L2 review PR #<n>.` Send nothing else.
      Never reuse an L2 reviewer, and never send it your notes, other PRs,
      or this conversation. It posts the `review:L2` comment itself.
   2. When it finishes, it returns a verdict and two counts. On `changes`
      it adds one line for each blocking finding. Do not read the whole
      comment unless the developer asks.
   3. If L1 says `changes`: start a fix round
      (`docs/agentic-development.md` section 6). For a `model:haiku` WP,
      section 6 of this runbook says which model runs the round.
      If a developer decision changed an acceptance criterion, edit the issue
      text first (step 3.4.3).
   4. If L2 says `changes`: do not start a fix round. Add `status:escalated`,
      comment on the issue with the link to the L2 comment (do not copy the
      findings), and tell the developer once (section 4 of this runbook).
      Wait for the decision:
      1. **Fix:** remove `status:escalated` and start one fix round with the
         findings that the developer accepts. A new L1 and a new L2 follow
         the push. If L2 blocks again, escalate again.
      2. **Overrule:** the developer merges the PR, or edits the issue
         text, and tells you. Merge nothing yourself: gate 3 needs an L2
         `approve`.
      3. **A changed criterion.** When a developer decision changes an
         acceptance criterion, edit the issue text before you start the fix
         round: the criterion, and any line in **Out of scope** that
         conflicts with it. A comment alone does not count. The next
         reviewer reads the issue text.
   5. Else, if the PR is a draft (L1 and L2 both approve): mark it ready.
      Use `mcp__github__update_pull_request` with `draft: false`. Cloud
      sessions block GraphQL, so `gh pr ready <n>` works only in a local
      session. In a cloud session without the MCP tool, use the REST route
      `POST /repos/{owner}/{repo}/pulls/{n}/ccr/ready_for_review`. Do this
      before you wait for the developer on a `needs-human` PR.
   6. Else run `scripts/merge-gate.py <n>`. Gate 1 is the local run: CI does
      not run on a PR into `alpha`. The script merges the PR head onto
      `origin/alpha` in a temporary worktree and runs the checks. It takes a
      few minutes. If gate 1 fails, start a fix round with the failing
      command and its last output line. Screenshots are not in gate 1; the
      implementer's `baseline:check` result stands in for them
      (`docs/agentic-development.md` section 10).
4. **Merge.** During a run, you do every merge into `alpha`. The developer
   never merges a WP PR for you. When the gate prints `merge-gate: PASS`, run
   `scripts/merge-gate.py <n> --merge`. It squash-merges into `alpha` with
   the full head SHA. It does not delete any branch. It refuses any other
   base. Do not run the checks again: the gate just ran them on the PR head
   merged onto the current `alpha`. If `alpha` moved after the gate, run the
   gate again. Then do every step in
   `docs/agentic-development.md` section 8:
   1. Check the merge on the `alpha` log, not on the PR list's `merged`
      field.
   2. Close the WP issue with `state_reason: completed`, and comment one
      line with the merge commit. A merge into `alpha` does not run the
      `Closes #N` keyword, because `alpha` is not the default branch. Remove
      its `status:*` label.
   3. Run `scripts/scrum.py snapshot --fix-status`. It sets `status:ready`
      on each WP that the merge unblocked.
   4. Post an `Orchestrator note` on each open WP whose assumptions the
      merge changed.
5. **Needs human.** When only human approval is missing, tell the developer
   once with the PR link. Do not ask again for the same PR. Say what the
   developer must look at: the moved screenshot baselines (the CI artifact
   `visual-diff`, or the PR's file list), the CMS fields, or the new
   dependency. An approval in chat counts: add `human-approved` and quote it
   in a plain PR comment with no review marker. Then merge the PR through the
   gate yourself (step 4). If the developer wants to test the PR on Netlify,
   point them to its deploy preview. Do not merge into `alpha` for a test.
6. **Baseline refresh commits.** A commit that the "Refresh screenshot
   baselines" workflow pushed has the actor `github-actions[bot]`
   (`docs/agentic-development.md` section 10, rule 5).
   1. On a WP PR into `alpha`, CI does not run. Gate 1 runs locally, so the
      commit needs no CI run. The gate reads it like any other head.
   2. On a promotion PR, a CI run by `github-actions[bot]` can wait for the
      developer's approval ("Approve and run workflows"). Tell the developer
      once. Never re-run CI, and never push an empty commit to start it.
   3. Tell the developer once to review the moved baselines.
7. **Your own PRs.** Never merge a PR that you wrote (a docs PR, a CI fix).
   Do not review it yourself. Start a fresh L1 reviewer and a fresh L2
   reviewer on it, then give the developer the link.
8. **Wait.** When nothing can start and agents are running, end your turn.
   Agent completions and PR events wake you. Do not poll with `sleep`.

When the queue is empty, tell the developer what landed on `alpha`. The
promotion to `beta` and `main` is theirs, with a merge commit, never a squash.
The Screenshots job first runs on that promotion PR.

## 3. Layer-2 review checklist

The `pr-reviewer-l2` agent owns this checklist. Its definition is
`.claude/agents/pr-reviewer-l2.md`, and it posts the comment. Change the
checklist there, not here. `merge-gate.py` checks the mechanical items (base
branch, local checks, verdicts, approval, conflicts).

The comment starts with `<!-- review:L2 verdict=approve|changes -->`, and
names `**Reviewer model:** opus`. The merge gate reads only the marker.

## 4. Report

After each merge or escalation, write one short line to the developer:
`Merged WP-NN (#PR) into alpha. Now ready: WP-AA, WP-BB.` or
`Escalated WP-NN: <reason>. Need: <decision>.` For an L2 escalation, list
each blocking finding as one phrase, with the L2 comment link, and the choices
from its "For the developer" section.

## 5. Sonnet mode

The developer can run the orchestrator on sonnet to save cost. Every rule of
this runbook applies unchanged, with the same merge gate as on opus. The L2
review runs in the `pr-reviewer-l2` agent on opus in both modes, so the
orchestrator model does not change review quality.

1. The `model:` label of a WP still sets its implementer. A sonnet
   orchestrator starts a `model:opus` WP on opus.
2. A sonnet orchestrator merges every PR that passes the merge gate. The
   developer approves the same PRs as on opus: the `needs-human` PRs.

## 6. Haiku implementers

Haiku implements mechanical WPs only. It never reviews and never
orchestrates. The rules for the `model:haiku` label are in
`docs/agentic-development.md` section 9.

1. **Choosing haiku.** A WP keeps `model:haiku` only when it meets every
   point of section 9. When in doubt, use sonnet.
2. **A failed start.** A haiku implementer that fails for any reason except
   HTTP 429 starts again on sonnet. Change the label to `model:sonnet`.
3. **A model escalation request.** The implementer found that the WP is not
   mechanical. Change the label to `model:sonnet`, comment the reason on the
   issue in one line, set `status:ready`, and start it again on sonnet.
4. **Fix rounds.** The first fix round of a haiku PR runs on haiku. If a
   review after that round still says `changes`, change the label to
   `model:sonnet`. The next round starts a new implementer on sonnet. The
   count of fix rounds (at most 3) does not start again.
5. Each label change gets a one-line issue comment that says why.

## 7. CI out of minutes

1. **Spot it.** A check run on the head ran no step, and some text names
   billing or a spending limit. `merge-gate.py` reports "CI is out of
   minutes". This applies to a promotion. A PR into `alpha` runs no CI.
2. **Note it once.** If no open issue has the label `ci:billing`, open
   `[ops] GitHub Actions minutes are used up` with that label, and tell the
   developer in one line. If the issue is open, say nothing more about it.
3. **Do not merge around it.** Leave the PRs open. The developer decides
   whether to run the checks by hand and merge.
4. **Never kick CI.** No re-run, no empty commit, no close and reopen.
5. **When CI comes back**, close the issue and run the gate again on each
   waiting PR.
