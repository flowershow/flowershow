import chalk from "chalk";
import cliProgress from "cli-progress";
import { getSiteStatus } from "./api-client.js";
import { API_URL, APP_URL } from "./const.js";

interface BlobStatus {
  id: string;
  path: string;
  syncStatus: "UPLOADING" | "PROCESSING" | "SUCCESS" | "ERROR";
  syncError: string | null;
  extension: string | null;
}

interface SiteStatusData {
  siteId: string;
  status: "pending" | "complete" | "error";
  files: {
    total: number;
    pending: number;
    success: number;
    failed: number;
  };
  blobs: BlobStatus[];
}

interface SyncResult {
  success: boolean;
  blobs: BlobStatus[];
  errors?: BlobStatus[];
  timeout?: boolean;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString();
}

/**
 * Get site URL
 */
export function getSiteUrl(projectName: string, username: string): string {
  return `${APP_URL}/@${username}/${projectName}`;
}

/**
 * Get dashboard URL for a site
 */
export function getDashboardUrl(siteId: string): string {
  return `${API_URL}/site/${siteId}/settings`;
}

/**
 * Wait for all markdown files to be processed
 * Polls the API every second for up to maxWaitSeconds
 */
export async function waitForSync(
  siteId: string,
  maxWaitSeconds: number = 180,
): Promise<SyncResult> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;

  let progressBar: cliProgress.SingleBar | null = null;
  let totalFiles = 0;

  while (Date.now() - startTime < maxWaitMs) {
    const statusData: SiteStatusData = await getSiteStatus(siteId);
    const blobs = statusData.blobs || [];

    if (blobs.length === 0) {
      // No markdown files, consider it done
      if (progressBar) {
        progressBar.stop();
      }
      return { success: true, blobs: [] };
    }

    const pending = blobs.filter(
      (b) => b.syncStatus === "UPLOADING" || b.syncStatus === "PROCESSING",
    );
    const errors = blobs.filter((b) => b.syncStatus === "ERROR");
    const success = blobs.filter((b) => b.syncStatus === "SUCCESS");

    // Initialize progress bar on first iteration
    if (!progressBar && blobs.length > 0) {
      totalFiles = blobs.length;
      progressBar = new cliProgress.SingleBar(
        {
          format:
            "Processing |" +
            chalk.cyan("{bar}") +
            "| {percentage}% | {value}/{total} files",
          barCompleteChar: "\u2588",
          barIncompleteChar: "\u2591",
          hideCursor: true,
        },
        cliProgress.Presets.shades_classic,
      );
      progressBar.start(totalFiles, success.length);
    }

    // Update progress bar
    if (progressBar) {
      progressBar.update(success.length + errors.length);
    }

    // All done
    if (pending.length === 0) {
      if (progressBar) {
        progressBar.stop();
      }

      if (errors.length > 0) {
        console.log(chalk.yellow(`\n⚠️  ${errors.length} file(s) had errors:`));
        for (const blob of errors) {
          console.log(
            chalk.yellow(
              `  - ${blob.path}: ${blob.syncError || "Unknown error"}`,
            ),
          );
        }
        return { success: false, blobs, errors };
      }

      console.log(chalk.green(`✓ All files processed successfully`));
      return { success: true, blobs };
    }

    await sleep(500);
  }

  if (progressBar) {
    progressBar.stop();
  }

  // Timeout
  const statusData: SiteStatusData = await getSiteStatus(siteId);
  const blobs = statusData.blobs || [];
  const pending = blobs.filter(
    (b) => b.syncStatus === "UPLOADING" || b.syncStatus === "PROCESSING",
  );

  console.log(
    chalk.yellow(`\n⚠️  Timeout: ${pending.length} file(s) still processing`),
  );
  for (const blob of pending) {
    console.log(chalk.yellow(`  - ${blob.path}`));
  }

  return { success: false, blobs, timeout: true };
}

/**
 * Display success message with URL
 */
export function displayPublishSuccess(
  projectName: string,
  username: string,
): void {
  const url = getSiteUrl(projectName, username);

  console.log(chalk.cyan(`\n💐 Visit your site at: ${url}\n`));
}

/**
 * Display error message
 */
export function displayError(message: string): void {
  console.error(chalk.red(`\n✗ Error: ${message}\n`));
}

/**
 * Display warning message
 */
export function displayWarning(message: string): void {
  console.warn(chalk.yellow(`\n⚠️  Warning: ${message}\n`));
}

/**
 * Display info message
 */
export function displayInfo(message: string): void {
  console.log(chalk.blue(`ℹ ${message}`));
}
