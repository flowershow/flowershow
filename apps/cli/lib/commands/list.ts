import chalk from "chalk";
import ora from "ora";
import { requireAuth } from "../auth.js";
import { getSites } from "../api-client.js";
import { displayError, formatDate, getSiteUrl } from "../utils.js";
import { API_URL } from "../const.js";
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";

/**
 * List command - show all sites for the authenticated user
 */
export async function listCommand(): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "list", cli_version: CLI_VERSION });
  try {
    const user = await requireAuth();

    const spinner = ora("Fetching sites...").start();

    // Get sites from API
    const sitesData = await getSites();
    const sites = sitesData.sites || [];

    spinner.stop();

    if (sites.length === 0) {
      console.log(chalk.gray("\nNo sites found.\n"));
      return;
    }

    console.log(chalk.bold(`\nFound ${sites.length} site(s):\n`));

    for (const site of sites) {
      const url = getSiteUrl(
        site.projectName,
        user.username || user.email || "user",
      );
      const dashboardUrl = `${API_URL}/site/${site.id}/settings`;
      console.log(chalk.cyan(`  ${site.projectName}`));
      console.log(chalk.gray(`    URL: ${url}`));
      console.log(chalk.gray(`    Dashboard URL: ${dashboardUrl}`));
      console.log(chalk.gray(`    Created: ${formatDate(site.createdAt)}`));
      console.log(
        chalk.gray(
          `    Updated: ${formatDate(site.updatedAt || site.createdAt)}`,
        ),
      );
      console.log();
    }
    capture("command_succeeded", {
      command: "list",
      cli_version: CLI_VERSION,
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    capture("command_failed", {
      command: "list",
      cli_version: CLI_VERSION,
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : "Unknown",
      error_message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError("An unknown error occurred");
    }
    await flushTelemetry();
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
}
