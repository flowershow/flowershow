import chalk from "chalk";
import { removeToken, getToken } from "../auth.js";
import { displayError } from "../utils.js";

/**
 * Auth logout command - remove stored CLI token
 */
export async function authLogoutCommand(): Promise<void> {
  try {
    const tokenData = getToken();

    if (!tokenData) {
      console.log(chalk.yellow("\nYou are not currently logged in.\n"));
      return;
    }

    await removeToken();

    console.log(chalk.green("\n✓ Successfully logged out\n"));
    console.log(chalk.gray("Your authentication token has been removed.\n"));
  } catch (error) {
    if (error instanceof Error) {
      displayError(error.message);
      console.error(chalk.gray(error.stack));
    } else {
      displayError("An unknown error occurred");
    }
    process.exit(1);
  }
}
