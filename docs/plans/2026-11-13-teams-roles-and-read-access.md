# Teams next: roles and read access

Status: logged, not started. Tracked in beads under epic `flowershow-dbg` (see the end). Follows [[2026-11-07-teams-phase1-site-collaborators-design]], which shipped owner + editor.

## Goal

Simple Google Docs-style sharing for a site: the owner decides who can read it and gives each person one role.

## Roles

| Role | Can |
|---|---|
| Viewer | Read the site when it is restricted |
| Commenter | Viewer, plus leave and reply to comments |
| Editor | Commenter, plus publish content (CLI, MCP, GitHub sync) |
| Admin | Editor, plus site settings and config, see builds and sync status, invite and remove people |
| Owner | Admin, plus billing, delete the site, custom domain, transfer ownership |

Change from phase 1: today's editor can change settings and see the dashboard, so it is closer to the new admin. When roles land, existing editors become admins so nobody loses access; owners can then narrow them to editor.

## Read access

One site setting, "Who can read":

- Anyone (default)
- Anyone with the password (today's password protection)
- Only invited people (viewers and above, signed in)

Viewers and commenters are added through the same email invite flow as editors. This likely covers GitHub issue #1374 (access by GitHub login) more simply; revisit #1374 after it ships.

Caching is not a design constraint (Rufus, 2026-11-13): restricted pages can be served uncached.

## Decisions to make in the design

- Which roles need Premium (likely restricted reading and roles beyond editor).
- Whether commenting stays open to anyone on public sites or follows the role.
- How viewers sign in (magic link is enough).
- How roles carry over to organizations (phase 2): an org role as the default for its sites.

## Beads

- `flowershow-dbg.17` Who-can-read setting and viewer/commenter roles
- `flowershow-dbg.18` Admin role separate from editor
