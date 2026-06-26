# Issue tracker: GitHub

Issues and PRDs for this repo live as **GitHub Issues** at `github.com/flowershow/flowershow`. Use the `gh` CLI for all create/read/update operations.

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

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
