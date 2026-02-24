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

const POSTHOG_API_KEY =
  process.env["POSTHOG_API_KEY"] ?? "phc_REPLACE_WITH_YOUR_KEY";
const POSTHOG_HOST =
  process.env["POSTHOG_HOST"] ?? "https://eu.i.posthog.com";

export const CLI_VERSION = packageJson.version;

const CONFIG_DIR = join(homedir(), ".flowershow");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

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
