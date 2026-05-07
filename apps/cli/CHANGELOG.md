# CHANGELOG

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
