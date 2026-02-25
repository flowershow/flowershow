import chalk from 'chalk';
import { removeToken, getToken } from '../auth.js';
import { displayError } from '../utils.js';
import { capture, flushTelemetry, CLI_VERSION } from '../telemetry.js';

/**
 * Auth logout command - remove stored CLI token
 */
export async function authLogoutCommand(): Promise<void> {
  const startTime = Date.now();
  capture('command_started', {
    command: 'auth_logout',
    cli_version: CLI_VERSION,
  });
  try {
    const tokenData = getToken();

    if (!tokenData) {
      console.log(chalk.yellow('\nYou are not currently logged in.\n'));
      return;
    }

    await removeToken();

    capture('command_succeeded', {
      command: 'auth_logout',
      cli_version: CLI_VERSION,
      duration_ms: Date.now() - startTime,
    });
    console.log(chalk.green('\n✓ Successfully logged out\n'));
    console.log(chalk.gray('Your authentication token has been removed.\n'));
  } catch (error) {
    capture('command_failed', {
      command: 'auth_logout',
      cli_version: CLI_VERSION,
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      error_message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError('An unknown error occurred');
    }
    await flushTelemetry();
    process.exit(1);
  } finally {
    await flushTelemetry();
  }
}
