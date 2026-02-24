# CLI Telemetry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add opt-out anonymous telemetry to the `@flowershow/publish` CLI using PostHog, tracking command-level and outcome-level events.

**Architecture:** A single `lib/telemetry.ts` module initialises PostHog, manages the anonymous `distinctId` config, and exports `capture()` / `flushTelemetry()`. Each command file gets inline `capture()` calls at start and in success/failure paths.

**Tech Stack:** `posthog-node` (PostHog Node.js SDK), existing TypeScript CLI with `commander`, config stored in `~/.flowershow/config.json`

---

### Task 1: Add posthog-node dependency

**Files:**
- Modify: `apps/cli/package.json`

**Step 1: Add the dependency**

```bash
cd apps/cli && pnpm add posthog-node
```

**Step 2: Verify it installed**

```bash
cat apps/cli/package.json | grep posthog
```

Expected: `"posthog-node": "^4.x.x"` in `dependencies`

**Step 3: Commit**

```bash
git add apps/cli/package.json apps/cli/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "chore(cli): add posthog-node dependency"
```

---

### Task 2: Create the telemetry module

**Files:**
- Create: `apps/cli/lib/telemetry.ts`

**Step 1: Create the file**

```typescript
// apps/cli/lib/telemetry.ts
import { homedir } from "os";
import { join } from "path";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { randomUUID } from "crypto";
import { PostHog } from "posthog-node";
import packageJson from "../package.json" with { type: "json" };

// PostHog project API key (public, safe to embed in CLI)
const POSTHOG_API_KEY = "phc_REPLACE_WITH_YOUR_KEY";
const POSTHOG_HOST = "https://eu.i.posthog.com";

export const CLI_VERSION = packageJson.version;

const CONFIG_DIR = join(homedir(), ".flowershow");
const CONFIG_FILE = join(CONFIG_DIR, ".config.json");

interface CliConfig {
  distinctId?: string;
  telemetryNoticeShown?: boolean;
}

function readConfig(): CliConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as CliConfig;
  } catch {
    return {};
  }
}

function writeConfig(config: CliConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

function getOrCreateDistinctId(): string {
  const config = readConfig();
  if (config.distinctId) return config.distinctId;
  const id = randomUUID();
  writeConfig({ ...config, distinctId: id });
  return id;
}

function showNoticeIfNeeded(): void {
  const config = readConfig();
  if (config.telemetryNoticeShown) return;
  console.log(
    "\nTelemetry Notice: FlowerShow CLI collects anonymous usage data to improve the product.",
  );
  console.log(
    "To opt out, set the FLOWERSHOW_TELEMETRY_DISABLED=1 environment variable.\n",
  );
  writeConfig({ ...config, telemetryNoticeShown: true });
}

export function isEnabled(): boolean {
  return !process.env["FLOWERSHOW_TELEMETRY_DISABLED"];
}

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!isEnabled()) return null;
  if (!_client) {
    _client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
    showNoticeIfNeeded();
  }
  return _client;
}

export function capture(
  event: string,
  properties: Record<string, unknown>,
): void {
  const client = getClient();
  if (!client) return;
  const distinctId = getOrCreateDistinctId();
  client.capture({ distinctId, event, properties });
}

export async function flushTelemetry(): Promise<void> {
  if (!_client) return;
  await _client.shutdown();
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd apps/cli && pnpm build
```

Expected: No errors, `dist/lib/telemetry.js` created.

**Step 3: Replace the placeholder API key**

In `apps/cli/lib/telemetry.ts`, replace `phc_REPLACE_WITH_YOUR_KEY` with your actual PostHog project API key.

**Step 4: Commit**

```bash
git add apps/cli/lib/telemetry.ts
git commit -m "feat(cli): add telemetry module with PostHog"
```

---

### Task 3: Add telemetry to the publish command

**Files:**
- Modify: `apps/cli/lib/commands/publish.ts`

**Step 1: Add imports at the top of the file**

After the existing imports, add:

```typescript
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";
```

**Step 2: Add `command_started` capture and start timer**

At the very start of `publishCommand`'s try block, before `const spinner = ora()`:

```typescript
const startTime = Date.now();
capture("command_started", { command: "publish", cli_version: CLI_VERSION });
```

**Step 3: Add `command_succeeded` capture**

Just before `displayPublishSuccess(...)` at the end of the try block:

```typescript
capture("command_succeeded", {
  command: "publish",
  duration_ms: Date.now() - startTime,
});
```

**Step 4: Add `command_failed` capture and flush in catch/finally**

Replace the existing catch block with:

```typescript
  } catch (error) {
    capture("command_failed", {
      command: "publish",
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
    });
    if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError("An unknown error occurred");
    }
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
```

**Note:** The `startTime` variable is declared inside the try block — move its declaration to **before** the try block so the catch can access it:

```typescript
export async function publishCommand(...): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "publish", cli_version: CLI_VERSION });
  try {
    // ... rest of function
```

**Step 5: Build and verify**

```bash
cd apps/cli && pnpm build
```

Expected: No errors.

**Step 6: Commit**

```bash
git add apps/cli/lib/commands/publish.ts
git commit -m "feat(cli): add telemetry to publish command"
```

---

### Task 4: Add telemetry to the sync command

**Files:**
- Modify: `apps/cli/lib/commands/sync.ts`

**Step 1: Add imports**

```typescript
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";
```

**Step 2: Add telemetry inline calls**

Apply the same pattern as Task 3 to `syncCommand`:

```typescript
export async function syncCommand(...): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "sync", cli_version: CLI_VERSION });
  try {
    // ... existing code ...
    // just before the final displaySyncSuccess call:
    capture("command_succeeded", {
      command: "sync",
      duration_ms: Date.now() - startTime,
    });
    displaySyncSuccess(...);
  } catch (error) {
    capture("command_failed", {
      command: "sync",
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
    });
    if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError("An unknown error occurred");
    }
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
}
```

**Step 3: Build and verify**

```bash
cd apps/cli && pnpm build
```

**Step 4: Commit**

```bash
git add apps/cli/lib/commands/sync.ts
git commit -m "feat(cli): add telemetry to sync command"
```

---

### Task 5: Add telemetry to the list command

**Files:**
- Modify: `apps/cli/lib/commands/list.ts`

**Step 1: Add imports**

```typescript
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";
```

**Step 2: Add telemetry inline calls**

```typescript
export async function listCommand(): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "list", cli_version: CLI_VERSION });
  try {
    // ... existing code ...
    // at the end of the try block (after the sites loop):
    capture("command_succeeded", {
      command: "list",
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    capture("command_failed", {
      command: "list",
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
    });
    if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError("An unknown error occurred");
    }
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
}
```

**Step 3: Build, verify, commit**

```bash
cd apps/cli && pnpm build
git add apps/cli/lib/commands/list.ts
git commit -m "feat(cli): add telemetry to list command"
```

---

### Task 6: Add telemetry to the delete command

**Files:**
- Modify: `apps/cli/lib/commands/delete.ts`

**Step 1: Add imports**

```typescript
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";
```

**Step 2: Add telemetry inline calls**

```typescript
export async function deleteCommand(projectName: string): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "delete", cli_version: CLI_VERSION });
  try {
    // ... existing code ...
    // just before the end of the try block (after spinner.succeed):
    capture("command_succeeded", {
      command: "delete",
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    capture("command_failed", {
      command: "delete",
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
    });
    if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError("An unknown error occurred");
    }
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
}
```

**Step 3: Build, verify, commit**

```bash
cd apps/cli && pnpm build
git add apps/cli/lib/commands/delete.ts
git commit -m "feat(cli): add telemetry to delete command"
```

---

### Task 7: Add telemetry to auth-login command

**Files:**
- Modify: `apps/cli/lib/commands/auth-login.ts`

**Step 1: Add imports**

```typescript
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";
```

**Step 2: Add telemetry inline calls**

```typescript
export async function authLoginCommand(): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "auth_login", cli_version: CLI_VERSION });
  try {
    // ... existing code ...
    // just before the final console.log at the end of the try block:
    capture("command_succeeded", {
      command: "auth_login",
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    capture("command_failed", {
      command: "auth_login",
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
    });
    if (error instanceof Error && error.message.includes("fetch")) {
      displayError(
        "Failed to connect to Flowershow API.\n" +
          "Please check your internet connection and try again.",
      );
    } else if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError("An unknown error occurred");
    }
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
}
```

**Step 3: Build, verify, commit**

```bash
cd apps/cli && pnpm build
git add apps/cli/lib/commands/auth-login.ts
git commit -m "feat(cli): add telemetry to auth login command"
```

---

### Task 8: Add telemetry to auth-logout command

**Files:**
- Modify: `apps/cli/lib/commands/auth-logout.ts`

**Step 1: Add imports**

```typescript
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";
```

**Step 2: Add telemetry inline calls**

```typescript
export async function authLogoutCommand(): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "auth_logout", cli_version: CLI_VERSION });
  try {
    // ... existing code ...
    // just before the final console.log (after removeToken):
    capture("command_succeeded", {
      command: "auth_logout",
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    capture("command_failed", {
      command: "auth_logout",
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
    });
    if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError("An unknown error occurred");
    }
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
}
```

**Step 3: Build, verify, commit**

```bash
cd apps/cli && pnpm build
git add apps/cli/lib/commands/auth-logout.ts
git commit -m "feat(cli): add telemetry to auth logout command"
```

---

### Task 9: Add telemetry to auth-status command

**Files:**
- Modify: `apps/cli/lib/commands/auth-status.ts`

**Step 1: Add imports**

```typescript
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";
```

**Step 2: Add telemetry inline calls**

```typescript
export async function authStatusCommand(): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "auth_status", cli_version: CLI_VERSION });
  try {
    // ... existing code ...
    // at the end of the outer try block (after the inner try/catch for getUserInfo):
    capture("command_succeeded", {
      command: "auth_status",
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    capture("command_failed", {
      command: "auth_status",
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
    });
    if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError("An unknown error occurred");
    }
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
}
```

**Step 3: Build, verify, commit**

```bash
cd apps/cli && pnpm build
git add apps/cli/lib/commands/auth-status.ts
git commit -m "feat(cli): add telemetry to auth status command"
```

---

### Task 10: Manual smoke test

**Step 1: Set your PostHog API key in `lib/telemetry.ts` if not already done**

**Step 2: Build and run the CLI locally**

```bash
cd apps/cli && pnpm build
node dist/cli.js --help
```

Expected: First run shows the telemetry notice. Running again does not show it.

**Step 3: Test opt-out**

```bash
FLOWERSHOW_TELEMETRY_DISABLED=1 node dist/cli.js --help
```

Expected: No telemetry notice printed.

**Step 4: Verify events in PostHog dashboard**

Run a command (e.g. `node dist/cli.js list`) and check the PostHog dashboard for the `command_started` and `command_succeeded` events.

**Step 5: Final commit and push**

```bash
git push
```
