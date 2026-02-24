# CHANGELOG

## 1.1.0

### Minor Changes

- cb191a3: The CLI now collects anonymous usage data via PostHog to help understand how commands are used and improve the product. Telemetry is sent for all commands: publish, sync, list, delete, auth login, auth logout, and auth status.

  No personally identifiable information is collected. Events include the command name and basic outcome (success/error).

## 1.0.1

### Patch Changes

- Correct help messages.

## 1.0.0

### Major Changes

- **Breaking change:** Updated to match new Flowershow API response format.

  Previous CLI versions are incompatible with the current API and will fail to detect file processing status correctly. Please upgrade to this version.

## 0.4.1

### Patch Changes

- Files are no longer renamed to README.md - they keep their original filenames. Project name is still inferred from the first file or folder name. The API now handles file organization.
- HTML files can be published too.

## 0.4.0

### Minor Changes

- **BREAKING CHANGE - Package Renamed to Scoped Package**

  This release renames the package from `flowershow-publish` to `@flowershow/publish` (scoped package).

## What Changed

### Package Name

- NPM package: `flowershow-publish` → `@flowershow/publish`
- Binary command: `publish` (unchanged)

See [MIGRATION.md](MIGRATION.md) for complete migration instructions.

## 0.3.0

### Minor Changes

- **BREAKING CHANGES - Package and Command Rename**

  This release renames the package from `flowershow` to `flowershow-publish` with significant command structure improvements.

  ## What Changed

  ### Package Name
  - NPM package: `flowershow` → `flowershow-publish`
  - Binary command: `flowershow` → `publish`

  ### Command Structure
  - **Main publish command is now default**: `publish <path>` (previously `flowershow publish <path>`)
  - **All other commands updated**: Use `publish` as the base command
    - `publish auth login` (was `flowershow auth login`)
    - `publish sync <path>` (was `flowershow sync <path>`)
    - `publish list` (was `flowershow list`)
    - `publish delete <name>` (was `flowershow delete <name>`)

  ### Migration

  See [MIGRATION.md](MIGRATION.md) for complete migration instructions.

## 0.2.12

### Patch Changes

- Use content type returned from the API when uploading files using presigned URLs.

## 0.2.11

### Patch Changes

- Publish to production environment.

## 0.2.10

### Patch Changes

- Normalize paths on Windows.

## 0.2.9

### Patch Changes

- Fix version display.

## 0.2.8

### Patch Changes

- Fix version display.

## 0.2.7

### Patch Changes

- Fix version display.

## 0.2.6

### Patch Changes

- Fix package version display when running `flowershow --version`.

## 0.2.5

### Patch Changes

- Add `sync` command for intelligent syncing of changed files.
