# Contributing

This covers the branching model, CI, and agentic development. For running the project day to day —
quick start, scripts, project structure, content authoring — see
[README.md](README.md). For the screenshot-testing workflow, see
[docs/TESTING.md](docs/TESTING.md).

## Branching and deployment

Two tracks, meeting only at `main`.

**Code** moves through integration:

```
feature/*  →  alpha  →  beta  →  main
```

- **`feature/*`** — individual pieces of work
- **`alpha`** — integration branch, where features merge first and conflicts are
  resolved
- **`beta`** — client preview of code (Netlify branch deploy)
- **`main`** — production, deployed to the live site

**Content** does not:

```
main  →  publish  →  main
```

- **`publish`** — cut from `main`, receives commits only from the editor at
  `/admin`, merged back into `main` to go live, then re-cut from `main`

Keeping them apart is the point: `publish` never carries unreleased code, so
putting a blog post live cannot ship a half-finished feature, and a code release
cannot be held up waiting on content. See [The editor](README.md#the-editor-admin)
in the README for how `publish` is maintained.

Those five branches are the whole set. Feature and `claude/*` branches are
deleted once merged — a long list of stale branches makes it impossible to tell
at a glance what is actually in flight.

### Merge methods

| Pull request | Method |
| ------------ | ------ |
| `feature/*` or `claude/*` → `alpha` | **Squash** |
| `alpha` → `beta`, `beta` → `main` | **Merge commit** (or rebase) |
| `publish` → `main` | **Merge commit** (or rebase) |
| Back-merge PRs (`sync/main-to-*`) | **Merge commit** |

Squash belongs to `alpha` alone. Every other merge keeps the commits.

Prefer a merge commit for the promotions. A rebase merge on GitHub rewrites
each commit with a new SHA, the same as a squash does. The branches then share
no ancestry for those commits, and `back-merge.yml` meets conflicts. The
comment at the top of that workflow gives the details.

## CI

GitHub Actions runs on every push to `main`, `alpha`, `beta` and `feature/**`,
and on pull requests targeting the first three:

| Job | What it runs |
| --- | ------------ |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Test | `npm run test:ci` |
| Screenshots | `npm run test:visual`, in the pinned Playwright container. Pull requests into `beta` and `main` only |
| Security Audit | `npm audit --audit-level=high`, non-blocking |

Lint gates Build, Test and Screenshots; the audit runs independently. The
screenshot job uses the same container image as `npm run baseline`, which is
what makes its comparisons meaningful; on failure it uploads the report and
diffs as an artifact for 14 days. See [docs/TESTING.md](docs/TESTING.md) for
how the screenshot tests work and how to rebaseline.

The audit job is `continue-on-error` because a static export has no server
runtime — the advisories it reports are build-time tooling. It is currently red
and being ignored, which is a habit worth not teaching: issue #32 tracks either
fixing the advisories or dropping the check.

Netlify builds with `npm ci && npm run build` and publishes `out/`.

Four operational workflows sit alongside CI, all dispatchable from the
**Actions** tab:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| Daily content refresh | 13:00 UTC daily | Fires the Netlify build hook so the calendar feed stays current |
| Refresh screenshot baselines | Manual | Regenerates baselines in the pinned container and commits them to your branch |
| Sync publish with main | Push to `main` | Rebases `publish` onto `main`, so the client's preview runs production code |
| Back-merge main into alpha and beta | Push to `main` (also manual) | Merges `main` back into `alpha` and `beta` via pull request, so code branches don't drift from what's live |

GitHub only offers `workflow_dispatch` for workflows that exist on the default
branch, so all four must stay on `main`.

## Agentic development

Claude agents can work the issue tracker under two skills in `.claude/skills/`:

| Skill | What it does |
| ----- | ------------ |
| `/scrum` | Ranks the backlog with the developer and turns the next issues into work packages (`[WP-NN]` issues with owned files and acceptance criteria) |
| `/orchestrate` | Runs the ready work packages in parallel, has each PR reviewed twice by fresh agents, and merges the ones that pass into `alpha` |

The orchestrator never merges past `alpha`: promotion to `beta` and `main`
stays a person's job. Changes the client will see wait for the developer's
approval. The rules are in [docs/agentic-development.md](docs/agentic-development.md); the agents are in
`.claude/agents/`; the two helper scripts need Python 3 and an authenticated
`gh`:

```bash
scripts/scrum.py snapshot        # backlog digest and the orchestrator's queue
scripts/merge-gate.py <pr>       # the merge gates for one PR
python3 -B scripts/test_scrum.py && python3 -B scripts/test_merge_gate.py
```
