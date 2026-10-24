# Issue tracker: beads + GitHub

**Beads (`bd`) is the team's work tracker** for planning, breaking work down and tracking it during and across sessions (`bd ready`, `bd create`, `bd update <id> --claim`, `bd close`). Run `bd prime` for the full workflow.

**GitHub Issues** at `github.com/flowershow/flowershow` is the public front door: user reports and things outsiders follow. When one becomes work, create a bead with `--external-ref gh-N`; the fix PR says `Fixes #N` and the bead is closed too. Use the `gh` CLI for GitHub operations below.

## Issue types

Issue type is tracked using GitHub's native issue types (not labels). The three types in use are:

| Type    | When to use                                      |
| ------- | ------------------------------------------------ |
| Bug     | Something is broken or behaving incorrectly      |
| Feature | New capability or user-facing addition           |
| Task    | Internal work, chores, refactors, docs, CI, etc. |

Set the type at creation time with `--type "Bug"` / `--type "Feature"` / `--type "Task"`.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..." --type "Bug|Feature|Task"`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Claiming an issue

As soon as you start working on an issue, claim it: assign it to the user running the session, and set its Status to **🏗 In progress** on the "Flowershow Backlog" project (#1). Do this before writing any code.

```bash
N=<issue-number>
gh issue edit "$N" --add-assignee @me
ITEM=$(gh project item-add 1 --owner flowershow --url "https://github.com/flowershow/flowershow/issues/$N" --format json --jq .id)
gh project item-edit --id "$ITEM" --project-id PVT_kwDOBlO6L84ADb7F \
  --field-id PVTSSF_lADOBlO6L84ADb7FzgB-iyU --single-select-option-id 5668eb0e
```

`item-add` is idempotent: it returns the existing item if the issue is already on the board. The project commands need the `project` scope; if they fail, run `gh auth refresh -s project`.

## When a skill says "publish to the issue tracker"

Create a bead. Also create a GitHub issue only if outsiders need to follow it.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
