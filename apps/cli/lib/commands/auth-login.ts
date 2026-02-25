import chalk from 'chalk';
import ora from 'ora';
import { saveToken, pollForToken, getUserInfo } from '../auth.js';
import { displayError } from '../utils.js';
import { API_URL } from '../const.js';
import { capture, flushTelemetry, CLI_VERSION } from '../telemetry.js';

interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

/**
 * Auth login command - authenticate via OAuth Device Flow
 */
export async function authLoginCommand(): Promise<void> {
  const startTime = Date.now();
  capture('command_started', {
    command: 'auth_login',
    cli_version: CLI_VERSION,
  });
  try {
    const spinner = ora('Initiating authentication...').start();

    // Step 1: Request device code
    const response = await fetch(`${API_URL}/api/cli/device/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_name: 'flowershow-cli',
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to initiate authentication: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as DeviceAuthResponse;
    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      expires_in,
      interval,
    } = data;

    spinner.stop();

    // Step 2: Display instructions to user
    console.log(
      chalk.bold('\nPlease complete authentication in your browser:\n'),
    );
    console.log(
      chalk.cyan(`  ${verification_uri_complete || verification_uri}\n`),
    );

    if (!verification_uri_complete) {
      console.log(chalk.bold('Enter this code when prompted:\n'));
      console.log(chalk.green.bold(`  ${user_code}\n`));
    }

    console.log(
      chalk.gray(
        `This code expires in ${Math.floor(expires_in / 60)} minutes\n`,
      ),
    );

    spinner.start('Waiting for authorization...');

    // Step 3: Poll for token
    const accessToken = await pollForToken(
      API_URL,
      device_code,
      interval,
      expires_in,
    );

    // Step 4: Get user info
    const user = await getUserInfo(accessToken);

    // Step 5: Save token
    saveToken(accessToken, user.username || user.email || 'user');

    spinner.succeed('Successfully authenticated!');

    // Step 6: Display success
    capture('command_succeeded', {
      command: 'auth_login',
      cli_version: CLI_VERSION,
      duration_ms: Date.now() - startTime,
    });
    console.log(
      chalk.gray(
        `Logged in as: ${chalk.cyan(user.username || user.email || 'user')}`,
      ),
    );
    console.log(
      chalk.gray('\nYou can now use the CLI to publish your sites.\n'),
    );
  } catch (error) {
    capture('command_failed', {
      command: 'auth_login',
      cli_version: CLI_VERSION,
      duration_ms: Date.now() - startTime,
      error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      error_message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error && error.message.includes('fetch')) {
      displayError(
        'Failed to connect to Flowershow API.\n' +
          'Please check your internet connection and try again.',
      );
    } else if (error instanceof Error) {
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
