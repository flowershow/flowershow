# CLI Telemetry Design

**Date:** 2026-02-24
**Status:** Approved

## Overview

Add opt-out anonymous telemetry to the `@flowershow/publish` CLI using PostHog. Tracks command-level and outcome-level events to understand how the CLI is used and where it fails.

## Requirements

- **Provider:** PostHog (`posthog-node`)
- **Opt-out mechanism:** `FLOWERSHOW_TELEMETRY_DISABLED=1` environment variable
- **Default:** Enabled (opt-out)
- **First-run notice:** Display once, persist acknowledgement to config file
- **Approach:** Inline `capture()` calls in each command

## Telemetry Module (`lib/telemetry.ts`)

Single module responsible for:

1. Initialising the PostHog Node client
2. Generating and persisting an anonymous `distinctId` (UUID v4) in `~/.flowershow/config.json`
3. Displaying the first-run notice once (tracked via `telemetryNoticeShown` in config)
4. Exporting `capture(event, properties)` — no-ops when `FLOWERSHOW_TELEMETRY_DISABLED=1`
5. Exporting `flushTelemetry()` — must be called before process exit (PostHog Node requires explicit flush)
6. Exporting `isEnabled()` — for conditional logic if needed

## Config File

`~/.flowershow/config.json` (separate from `token.json`):

```json
{
  "distinctId": "<uuid-v4>",
  "telemetryNoticeShown": true
}
```

## Events

| Event | Trigger | Properties |
|---|---|---|
| `command_started` | Top of each command action | `command`, `cli_version` |
| `command_succeeded` | Before successful exit | `command`, `duration_ms` |
| `command_failed` | In catch block | `command`, `duration_ms`, `error_type` |

**`command`** values: `publish`, `sync`, `list`, `delete`, `auth_login`, `auth_logout`, `auth_status`

**`error_type`**: Error constructor name only (e.g. `Error`, `TypeError`) — no message content to avoid leaking user data.

**`cli_version`**: Read from `package.json` at runtime.

## First-Run Notice

Printed once to stdout when `telemetryNoticeShown` is not set in config:

```
Telemetry Notice: FlowerShow CLI collects anonymous usage data to improve the product.
To opt out, set the FLOWERSHOW_TELEMETRY_DISABLED=1 environment variable.
```

## Inline Call Pattern

Each command gets three additions:

```ts
export async function exampleCommand(...): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "example", cli_version: VERSION });
  try {
    // ... existing logic ...
    capture("command_succeeded", { command: "example", duration_ms: Date.now() - startTime });
  } catch (error) {
    capture("command_failed", {
      command: "example",
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
    });
    // ... existing error handling ...
  } finally {
    await flushTelemetry();
  }
}
```

## Files Changed

- `apps/cli/lib/telemetry.ts` — new file
- `apps/cli/lib/commands/publish.ts` — add inline calls
- `apps/cli/lib/commands/sync.ts` — add inline calls
- `apps/cli/lib/commands/list.ts` — add inline calls
- `apps/cli/lib/commands/delete.ts` — add inline calls
- `apps/cli/lib/commands/auth-login.ts` — add inline calls
- `apps/cli/lib/commands/auth-logout.ts` — add inline calls
- `apps/cli/lib/commands/auth-status.ts` — add inline calls
- `apps/cli/package.json` — add `posthog-node` dependency
