import chalk from "chalk";
import ora from "ora";
import { confirm } from "@inquirer/prompts";
import { requireAuth } from "../auth.js";
import { getSites, deleteSite } from "../api-client.js";
import { displayError, getSiteUrl, getDashboardUrl } from "../utils.js";

/**
 * Delete command - remove a site and all its files
 */
export async function deleteCommand(projectName: string): Promise<void> {
  try {
    if (!projectName) {
      displayError(
        "Project name is required.\nUsage: flowershow delete <project-name>",
      );
      process.exit(1);
    }

    const user = await requireAuth();

    const spinner = ora(`Looking for site '${projectName}'...`).start();

    // Get all sites to find the one to delete
    const sitesData = await getSites();
    const sites = sitesData.sites || [];
    const siteToDelete = sites.find((s) => s.projectName === projectName);

    if (!siteToDelete) {
      spinner.fail(`Site '${projectName}' not found`);
      displayError(
        `Site '${projectName}' not found.\nUse 'flowershow list' to see all sites.`,
      );
      process.exit(1);
    }

    const url = getSiteUrl(projectName, user.username || user.email || "user");
    spinner.succeed(`Found site: ${projectName}`);
    console.log(chalk.gray(`URL: ${url}`));
    console.log();

    // Check if site has an active premium subscription
    if (siteToDelete.plan === "PREMIUM") {
      const dashboardUrl = getDashboardUrl(siteToDelete.id);
      displayError(
        `This site has an active premium subscription.\n` +
          `You must cancel the subscription before deleting the site.\n` +
          `Please visit your dashboard to manage your subscription:\n\n` +
          `${dashboardUrl}`,
      );
      process.exit(1);
    }

    // Prompt for confirmation
    console.log(
      chalk.yellow(
        "⚠️  This will permanently delete the site and all its content.",
      ),
    );
    console.log();

    const confirmed = await confirm({
      message: "Are you sure you want to delete this site?",
      default: false,
    });

    if (!confirmed) {
      console.log(chalk.gray("Deletion cancelled."));
      process.exit(0);
    }

    spinner.start("Deleting site...");

    // Delete via API
    const result = await deleteSite(siteToDelete.id);

    spinner.succeed(`Successfully deleted site '${projectName}'`);
    if (result.deletedFiles) {
      console.log(chalk.gray(`  Deleted ${result.deletedFiles} file(s)\n`));
    }
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
