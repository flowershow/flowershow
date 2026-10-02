# CHANGELOG

## 2.5.0

- New `--anon` flag: publish without an account (`fl --anon ./folder`). No login needed; the site gets a random `<name>-anon.flowershow.me` URL, expires in 7 days unless claimed, and `fl` prints the live URL and a claim link (`Claim it to keep it (expires <date>): <claimUrl>`). Opening the claim link, signing in and confirming moves the site into your account. If an upload fails, `fl` still prints the claim link. Anonymous sites are limited to 200 files / 50 MB.
- Re-running `fl --anon` on the same folder updates the same anonymous site: the site ID and claim token are saved in the folder's `.flowershow`. Single files and multiple paths aren't linked, so each anonymous publish of them creates a new site. If the saved site has expired or been deleted, or its claim token is rejected (HTTP 401, 404 or 410), `fl` says so once, removes the anonymous link from `.flowershow` and exits 1; run it again to create a new one. If the site has been claimed (HTTP 409), `fl --anon` exits 1 but keeps the link and tells you to `fl login` and publish without `--anon`, which updates the claimed site.
- `fl` never publishes anonymously unless asked: without a login and without `--anon` it exits 1, suggesting `fl login` or `fl --anon <path>`.
- New `FLOWERSHOW_TOKEN` environment variable: an API token (e.g. a personal access token) used instead of the one saved by `fl login`, for CI and agents. `fl whoami` notes when it is in use, and `fl logout` explains that it can't remove it.
- Publishing a folder previously published with `--anon` while logged in: if you've claimed that site, `fl` relinks the folder's `.flowershow` to it and updates it (no duplicate site). Otherwise the folder is treated as unlinked (it gets a site in your account), and `fl` prints the earlier site's claim link so you can still keep it. `fl sync` refuses anonymously published folders and points to `fl --anon <folder>`.

## 2.4.0

- Fix: publishing a path that isn't linked to a site (no `.flowershow` file) no longer silently overwrites an existing site with the same name. Previously `fl ./notes` would sync into your existing `notes` site and delete any of its files missing locally, with no prompt, even without `--yes`. Now `fl` warns (naming the site and its URL) and asks whether to overwrite it or choose a new name. With `--yes` it refuses and exits non-zero; pass `--overwrite` to publish into the existing site on purpose. Linked folders are unchanged.
- New `--overwrite` flag: the explicit opt-in for publishing an unlinked path into an existing site with the same name. `--yes` now only skips the new-site name prompt.
- Fix: `fl` now exits with a non-zero status on every failure (not authenticated, path not found, validation errors, site not found, API errors, failed uploads), so scripts, CI and agents can detect failures. `fl whoami` exits 1 when not logged in or when the token is invalid.
- `install.sh`: set `FL_INSTALL_DIR` to install without `sudo` (e.g. `FL_INSTALL_DIR="$HOME/.local/bin"`), for AI agents and CI. The script now also warns when the install directory isn't on your `PATH`.
- The "couldn't find a site" warning now points to the dashboard at `https://cloud.flowershow.app` instead of the retired `https://my.flowershow.app`.

## 2.3.0

- Fix: `fl publish` now respects `contentExclude`/`contentInclude` in `config.json`, matching the visibility rules the GitHub-sync build already applies. Previously the CLI ignored `config.json` entirely, so excluded paths (e.g. drafts, internal notes) were published and served even though the GitHub-sync build correctly hid them for the same repo.

## 2.2.0

- Recover gracefully when a site has been renamed on the server. Previously, if the stored site name no longer matched (e.g. after the site-name unification), `fl` reported the site as deleted, removed the local `.flowershow`, and could create a duplicate site. It now recognises a likely rename, keeps `.flowershow` intact, and offers to re-point the folder to the site's current name.
- `--name` now takes precedence over the name saved in `.flowershow`, so you can re-point a folder to a renamed site with `fl --name "Current Name" ./folder` (including in `--yes`/CI mode).
- `fl sync` now hints that a "not found" site may have been renamed and can be reached with `--name`.

## 2.1.0

- Publish history tracking: the CLI now sends a `publish-id` header with every R2 upload, enabling per-file status tracking and a full publish history in the Flowershow dashboard.

## 2.0.6

- Fix file change detection: use Git blob SHA format so CLI publishes after a GitHub publish no longer mark all files as updated.

## 2.0.5

- Improve `fl --help` output: add long description, usage pattern, and examples.

## 2.0.4

- Show an update notification when a newer version of `fl` is available.
- Add `flowershow` as a symlink alias alongside `fl` in the install script.

## 2.0.3

- Show the site URL before uploading when publishing to an existing site.

## 2.0.2

- Fix stale URL shown in the site name confirmation prompt.

## 2.0.1

- Fix processing progress count display.
- Clean up publish UX copy.

## 2.0.0

- **Breaking:** `fl` is now a single idempotent command — it creates the site on first run and syncs changes on every subsequent run. The separate `fl sync` command is deprecated (still works with a deprecation warning).
- Add `install.sh` for one-line installation on macOS and Linux.

## 1.3.0

- Rename the binary from `publish` to `fl`.
- Simplify auth commands: `fl login`, `fl logout`, `fl whoami` (previously `fl auth login` etc.).

## 1.2.3

- Fix progress display — replace progressbar library with simpler `\r`-based progress lines.

## 1.2.2

- Rewrite CLI in Go (previously a Node.js package). The binary is now distributed as a standalone executable via GitHub Releases — no Node.js required.

---

For versions prior to 1.2.2 (Node.js CLI, published to npm as `@flowershow/publish`), see the [old CHANGELOG in git history](https://github.com/flowershow/flowershow/blob/e24addd48e0f5318653c9bfcd5a2d25900ea08f1/apps/cli/CHANGELOG.md).
