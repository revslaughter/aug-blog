---
name: multi-agent-cold-review
description: Run a batch of independent tasks (open issues, a backlog, a list of fixes) as parallel implementation agents with disjoint file ownership, then audit each result with a fresh reviewer agent that never sees how the work was produced. Use this whenever the user wants several issues, tickets, bugs, or TODOs worked at once, asks for a "multi-agent plan", asks to fan out work across agents, or asks for a review/audit of agent-written code. Also use it when the user wants adversarial or independent review of a PR — the cold-review half stands alone. Prefer this over spawning ad-hoc agents whenever more than two independent units of work are in play, because the file-ownership and contamination rules here are what keep parallel agents from corrupting each other's work and what keep reviews honest.
---

# Multi-agent delivery with cold review

Two ideas do the work here.

**Parallel implementers need disjoint file ownership.** Agents cannot see each other. If two of them can write the same file, you get a merge conflict at best and silent clobbering at worst. Ownership assigned up front, in writing, is what makes concurrency safe.

**Reviewers must be cold.** An agent that reviews its own work — or reads the implementer's account of it — inherits the implementer's blind spots. It already knows what the code was *meant* to do, so it reads intent into the code instead of reading the code. A reviewer that has never seen the reasoning has to derive behavior from the source, which is exactly the check you want. This is the part people skip, and it's the part that finds real bugs.

## When this applies

Use it for several independent units of work — open issues, a backlog, a list of bugs. Use the review half alone when someone wants a PR audited adversarially.

Don't use it for a single small change (one agent, or just do it), or for work that's inherently sequential (each step needs the last one's output — run those in series). Fanning out three agents onto one file is slower than doing it yourself.

## Phase 0 — Review before you plan

Read the actual code before proposing any split. This phase is not optional and it is not a formality: the plan's whole value is knowing what conflicts with what, and you cannot know that from issue titles.

For each unit of work, establish:

- **Which files it touches.** Actually look. Issue text is frequently stale.
- **Whether an agent can finish it.** Some work needs account access, a human decision, or a credential. Say so plainly rather than sending an agent to fail.
- **What blocks it.** A dependency on another issue, a decision only the user can make, an external service.

Then report what you found before spawning anything. Users routinely change scope once they see the real picture — deferring one item can collapse the whole dependency graph.

**Verify claimed blockers.** Issues say "blocked on #43" long after #43 closed. Check.

## Phase 1 — Find the serialization axis

The most valuable output of planning is knowing what *cannot* run in parallel. Look for:

- **Binary or generated artifacts.** Screenshot baselines, snapshots, lockfiles, compiled assets, generated JSON. Git cannot merge these. Two agents regenerating them concurrently produces a conflict no one can resolve by hand.
- **Files everything touches.** A router, a config, a barrel export, a central type file. Two agents editing these will conflict textually even when their changes are logically independent.
- **Shared regeneration steps.** If a change requires running a workflow that commits its output, only one agent per run can own it.

If exactly one task touches the unmergeable artifact, it becomes that task's sole owner and everything else runs free. If two do, they must be sequenced — and it is worth telling the user, because deferring one of them may be cheaper than serializing.

## Phase 2 — Surface decisions before spawning

Some tasks contain a real choice: which library, which of two designs, how wide the scope. An agent that guesses will produce work that gets thrown away.

Batch these into one round of questions with a recommendation for each. Don't ask about things with an obvious default — pick it, say you picked it, move on. Ask about things that would materially change the work.

Reserve blocking questions for cases where every reading is unsafe. Otherwise state your assumption and proceed.

## Phase 3 — Spawn the implementers

One agent per unit of work, in parallel, each isolated (its own worktree where available). Every brief needs:

- **The task**, in enough detail that the agent doesn't have to guess at intent
- **Decisions already made**, stated as requirements — including options explicitly *rejected*, so the agent doesn't rediscover and pick one
- **Files it owns**, and an explicit list of files it must not touch, naming the concurrent work that owns them
- **A definition of done**: lint, tests, build, commit, push, open a draft PR
- **The conventions of the repo** — commit trailers, PR templates, attribution footers, anything the project requires

Tell each agent what the *other* agents are doing at file granularity. "Do not touch `util/foo.js`, a concurrent task owns it" prevents the collision that ownership rules exist to prevent.

Ask for a report that includes what the agent could *not* verify. That admission is where the reviewer should aim first.

## Phase 4 — Cold review

This is the core of the skill.

### Contamination discipline

Reviewer agents start fresh, so the only leak path is what you put in the prompt. Keep out:

- The implementer's report, summary, or rationale
- Its self-assessment, its confidence, its account of what it verified
- Your own framing of how the work went
- Any hint about which findings you expect

Put in:

- **The specification**, fetched fresh from the source (the issue, the ticket) — not your paraphrase
- **Decisions and constraints**, phrased as *requirements to verify*, never as descriptions of what was built. Write "the fix must apply the bound in the guard itself, not simulate it via `limit`" — not "the author applied the bound in the guard."
- **Ownership rules**, so the reviewer can check scope violations
- **The PR number** and instructions to read the diff itself

The distinction that matters: a requirement tells the reviewer what to check. A description tells the reviewer what to expect — and a reviewer who expects something tends to find it.

### Phase ordering inside the review

Order is what preserves independence:

1. **Code only.** Read the diff. Form findings from the source alone. Do not read the PR description yet.
2. **Attack it.** Run things. See below.
3. **Verify invariants mechanically** — `git diff` a file that was supposed to be untouched, grep for a dependency that was supposed to stay out, execute rather than reason.
4. **Claims vs. code, last.** *Now* read the PR description and hunt for divergence between what it claims and what the diff does.

Step 4 is why you don't blackout the description entirely. Findings are already formed, so the description can't bias them — but a PR claiming a check that the code doesn't implement is itself a defect, and only a reviewer who reads both can see it.

### The checks that actually find things

**Revert the fix, keep the test, confirm the test fails.** The single highest-value check available. A test that passes without the production change is testing nothing, and this is invisible to every other form of review. Have the reviewer report real pass/fail counts in both states.

**Verify by execution, not inspection.** "The baselines were regenerated" — open the image and look. "It validates the host" — feed it a hostile host and see what comes out. "It doesn't throw" — pass it garbage. Reading code and concluding it looks right is what a self-review already did.

**Audit the specification's premises, not just conformance to it.** An implementation can satisfy the issue exactly and still be wrong, because the issue was wrong. Ask the reviewer to test the *stated cause*, not just the stated fix. This is the highest-yield instruction in the whole skill — a spec's premise is the one thing both the author and the issue-writer already agreed on, so nobody else will check it.

**Look for the assumption baked into the test.** When a test hardcodes the value that the bug is about, it proves nothing and passes under every condition. Name this pattern in the brief.

**Give the reviewer capabilities the implementer lacked or overlooked.** If a browser, a container, or a tool is available and the implementation reported it couldn't verify something, say so explicitly and point at the tool. Closing the implementation's stated gap is a natural reviewer job.

### Instruct honesty in both directions

Say plainly: *if you cannot break it, say so and describe what you tried; a clean audit reported honestly is a good outcome, and manufacturing findings to look thorough is a failure.* Without this, reviewers pad. Ask them to separate confirmed defects (with the exact input) from unproven suspicions.

## Phase 5 — Harvest what doesn't belong to any PR

Good reviews surface problems outside the diff — a latent bug, a broken contract, a test suite that doesn't guard what everyone assumed. These have no home and get lost.

Collect them and ask the user whether to file them. Ask rather than assume: an issue tracker is someone's roadmap, and filling it unbidden is rude. When you do file, include the evidence — the measurement, the failing input, the reproduction — because a finding without evidence gets closed as speculation.

## Reporting

Relay what changes the user's decisions:

- **The verdict**, and what was proven rather than assumed
- **Findings ranked by consequence**, not by which PR they came from
- **What each result gates** — the code may be clean while a product decision blocks the merge
- **Where a reviewer contradicted an implementer**, and which one you believe after checking

Say when a review came back clean. A run where nothing was found is a real result, and reporting it plainly is what makes the alarming reports credible.

## Failure modes

- **Contaminating the reviewer** by pasting the implementer's report. The most common way to waste the whole exercise.
- **Parallelizing onto shared files.** Do Phase 0 properly.
- **Letting an agent widen its own scope.** An agent that finds a global problem should report it, not fix it mid-run while others share the file. Take the finding, decide separately.
- **Stopping at "CI is green."** Green means nothing failed that was being checked. Whether anything meaningful was being checked is a separate question — and the answer is sometimes no.
- **Trusting an agent's self-report.** Agents state confident conclusions from incomplete evidence, the same as anyone. The cold review exists precisely because self-reports are unreliable; extend that skepticism to reviewer reports too, and spot-check the load-bearing claim yourself.
