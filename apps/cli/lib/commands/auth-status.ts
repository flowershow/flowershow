import chalk from "chalk";
import ora from "ora";
import { getToken, getUserInfo } from "../auth.js";
import { displayError } from "../utils.js";
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";

/**
 * Auth status command - show current authentication status
 */
export async function authStatusCommand(): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "auth_status", cli_version: CLI_VERSION });
  try {
    const tokenData = getToken();

    if (!tokenData) {
      console.log(chalk.yellow("\n✗ Not authenticated\n"));
      console.log(chalk.gray("Run `publish auth login` to authenticate.\n"));
      return;
    }

    const spinner = ora("Checking authentication status...").start();

    try {
      // Verify token is still valid by fetching user info
      const userInfo = await getUserInfo(tokenData.token);

      spinner.succeed("Authenticated");
      console.log(
        chalk.gray(
          `Logged in as: ${chalk.cyan(
            userInfo.username || userInfo.email || "user",
          )}`,
        ),
      );
    } catch (error) {
      spinner.fail(chalk.red("Authentication token is invalid or expired"));
      console.log(chalk.gray("Run `publish auth login` to re-authenticate.\n"));
    }
    capture("command_succeeded", {
      command: "auth_status",
      cli_version: CLI_VERSION,
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    capture("command_failed", {
      command: "auth_status",
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
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
}
