import { existsSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import ora from "ora";
import cliProgress from "cli-progress";
import {
  createSite,
  syncFiles,
  uploadToR2,
  getSiteByName,
} from "../api-client.js";
import { discoverFiles, getProjectName, validateFiles } from "../files.js";
import {
  displayPublishSuccess,
  displayError,
  displayWarning,
  waitForSync,
} from "../utils.js";
import { requireAuth } from "../auth.js";
import { capture, flushTelemetry, CLI_VERSION } from "../telemetry.js";

interface UploadResult {
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Publish command - upload files to Flowershow
 * @param inputPaths - Path(s) to the file(s) or folder to publish
 * @param overwrite - Whether to overwrite existing site
 * @param siteName - Optional custom name for the site
 */
export async function publishCommand(
  inputPaths: string | string[],
  overwrite: boolean = false,
  siteName?: string,
): Promise<void> {
  const startTime = Date.now();
  capture("command_started", { command: "publish", cli_version: CLI_VERSION });
  try {
    const spinner = ora();
    const user = await requireAuth();

    spinner.succeed(`Publishing as: ${user.username || user.email}`);

    spinner.start("Discovering files...");
    // Normalize to array
    const paths = Array.isArray(inputPaths) ? inputPaths : [inputPaths];

    // Validate input paths
    const absolutePaths: string[] = [];
    for (const inputPath of paths) {
      const absolutePath = resolve(inputPath);
      if (!existsSync(absolutePath)) {
        displayError(`Path not found: ${inputPath}`);
        process.exit(1);
      }
      absolutePaths.push(absolutePath);
    }

    // Discover files from all paths
    const files = discoverFiles(absolutePaths);
    validateFiles(files);

    // Use custom site name if provided, otherwise derive from project
    const projectName = siteName || getProjectName(files);
    spinner.succeed(`Found ${files.length} file(s) to publish.`);

    const existingSite = await getSiteByName(user.username!, projectName);

    // Check if site already exists (if not overwriting)
    if (existingSite && !overwrite) {
      displayError(
        `A site named '${existingSite.site.projectName}' already exists.\n` +
          `Please choose a different name or delete the existing site first.\n` +
          `Use 'flowershow list' to see all sites.\n\n` +
          `💡 Tip: Use the --overwrite flag to publish over an existing site.`,
      );
      process.exit(1);
    }

    spinner.start("Creating site...");

    // Create site via API (with overwrite flag)
    const siteData = await createSite(projectName, overwrite);
    const site = siteData.site;
    spinner.succeed(`Site created (ID: ${site.id})`);

    // Create upload progress bar
    const uploadBar = new cliProgress.SingleBar(
      {
        format:
          "Uploading |" +
          chalk.cyan("{bar}") +
          "| {percentage}% | {value}/{total} files",
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic,
    );

    // Prepare file metadata for sync request
    const fileMetadata = files.map((file) => ({
      path: file.path,
      size: file.size,
      sha: file.sha,
    }));

    // Get sync plan from API (for initial publish, all files will be in toUpload)
    const syncPlan = await syncFiles(site.id, fileMetadata);

    // Combine new and updated files for upload
    const allFilesToUpload = [...syncPlan.toUpload, ...syncPlan.toUpdate];

    // Update progress bar with actual files to upload
    uploadBar.start(allFilesToUpload.length, 0);

    // Upload files directly to R2 using presigned URLs
    const uploadResults: UploadResult[] = [];
    for (let i = 0; i < allFilesToUpload.length; i++) {
      const uploadInfo = allFilesToUpload[i];
      if (!uploadInfo) continue;

      const file = files.find((f) => f.path === uploadInfo.path);
      if (!file) {
        uploadResults.push({
          path: uploadInfo.path,
          success: false,
          error: "File not found in local files",
        });
        uploadBar.increment();
        continue;
      }

      try {
        await uploadToR2(
          uploadInfo.uploadUrl,
          file.content,
          uploadInfo.contentType,
        );
        uploadResults.push({ path: file.path, success: true });
        uploadBar.increment();
      } catch (error) {
        uploadResults.push({
          path: file.path,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        uploadBar.increment();
      }
    }

    uploadBar.stop();

    const failedUploads = uploadResults.filter((r) => !r.success);
    if (failedUploads.length > 0) {
      console.log(
        chalk.yellow(`⚠️  ${failedUploads.length} file(s) failed to upload`),
      );
      for (const result of failedUploads) {
        console.log(chalk.yellow(`  - ${result.path}: ${result.error}`));
      }
    } else {
      console.log(chalk.green(`✓ Uploaded ${files.length} file(s)`));
    }

    // Wait for markdown files to be processed with progress bar
    const syncResult = await waitForSync(site.id, 30);

    if (syncResult.timeout) {
      displayWarning(
        "Some files are still processing after 30 seconds.\n" +
          "Your site is available but some pages may not be ready yet.\n" +
          "Check back in a moment.",
      );
    } else if (!syncResult.success && syncResult.errors) {
      displayWarning("Some files had processing errors (see above).");
    }

    // Display success
    capture("command_succeeded", {
      command: "publish",
      cli_version: CLI_VERSION,
      duration_ms: Date.now() - startTime,
    });
    displayPublishSuccess(
      site.projectName,
      user.username || user.email || "user",
    );
  } catch (error) {
    capture("command_failed", {
      command: "publish",
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
