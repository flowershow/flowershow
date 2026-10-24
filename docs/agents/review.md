# Reviewing plans and PRs

Get an independent review before implementing a non-trivial plan and before merging a non-trivial PR (anything beyond content, docs or dev tooling). Use a fresh subagent with a clean brief so it isn't anchored on your reasoning: give it the artifact and the goal, not your conclusion.

1. **Launch the reviewer** (opus for design- or security-sensitive work, sonnet otherwise). For a plan, give it the brief and the plan together. Ask it to try to break the change: security (the checklist in `AGENTS.md`), UX, what could regress, what's missing, and overdesign or weight added to the codebase.
2. **Log the report** as a PR comment, or on the bead for a plan.
3. **Fix or defer:** fix what matters, log the rest as beads.
4. **Merge** only after that, and confirm CI yourself (`gh pr checks N --watch`).

Reports start with a short TL;DR and a recommendation, then the details.
