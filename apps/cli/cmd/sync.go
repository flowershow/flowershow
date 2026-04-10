package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/flowershow/publish/internal/api"
	"github.com/flowershow/publish/internal/auth"
	"github.com/flowershow/publish/internal/config"
	"github.com/flowershow/publish/internal/files"
	"github.com/flowershow/publish/internal/telemetry"
	"github.com/flowershow/publish/internal/ui"
	"github.com/spf13/cobra"
)

var syncCmd = &cobra.Command{
	Use:   "sync <path>",
	Short: "Sync changes to an existing published site",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		ui.Header("Sync")
		name, _ := cmd.Flags().GetString("name")
		dryRun, _ := cmd.Flags().GetBool("dry-run")
		verbose, _ := cmd.Flags().GetBool("verbose")
		return runSync(args[0], name, dryRun, verbose)
	},
}

func init() {
	syncCmd.Flags().String("name", "", "Specify site name if different from folder name")
	syncCmd.Flags().Bool("dry-run", false, "Show what would be synced without making changes")
	syncCmd.Flags().Bool("verbose", false, "Show detailed list of all files in each category")
	rootCmd.AddCommand(syncCmd)
}

func runSync(inputPath, siteName string, dryRun, verbose bool) error {
	startTime := time.Now()
	telemetry.Capture("command_started", map[string]interface{}{
		"command":     "sync",
		"cli_version": config.Version,
	})
	defer func() { telemetry.Flush() }()

	sp := ui.NewSpinner()

	// Authenticate
	sp.Start("Checking authentication...")
	tokenData, err := auth.GetToken()
	if err != nil || tokenData == nil {
		sp.Fail("Not authenticated")
		ui.PrintError("You must be authenticated to use this command.\nRun `fl login` to authenticate.")
		return nil
	}
	userInfo, err := auth.GetUserInfo(config.APIURL(), tokenData.Token)
	if err != nil {
		sp.Fail("Authentication failed")
		ui.PrintError("You must be authenticated to use this command.\nRun `fl login` to authenticate.")
		return nil
	}
	sp.Succeed(fmt.Sprintf("Syncing as: %s", userInfo.DisplayName()))

	// Discover files
	sp.Start("Discovering files...")
	absPath, err := filepath.Abs(inputPath)
	if err != nil || !pathExists(absPath) {
		sp.Fail("Path not found")
		ui.PrintError(fmt.Sprintf("Path not found: %s", inputPath))
		os.Exit(1)
	}

	discovered, err := files.DiscoverFiles([]string{absPath})
	if err != nil {
		sp.Fail("Discovery failed")
		ui.PrintError(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "sync",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_type":    fmt.Sprintf("%T", err),
			"error_message": err.Error(),
		})
		return nil
	}
	if err := files.ValidateFiles(discovered); err != nil {
		sp.Fail("Validation failed")
		ui.PrintError(err.Error())
		return nil
	}

	projectName := siteName
	if projectName == "" {
		projectName, err = files.GetProjectName(discovered)
		if err != nil {
			ui.PrintError(err.Error())
			return nil
		}
	}
	sp.Succeed(fmt.Sprintf("Found %d file(s) in %s", len(discovered), inputPath))

	// Check site exists
	existingSite, err := api.GetSiteByName(userInfo.Username, projectName)
	if err != nil {
		ui.PrintError(err.Error())
		return nil
	}
	if existingSite == nil {
		ui.PrintError(fmt.Sprintf(
			"Site '%s' not found.\nUse 'fl' to create it first, or specify a different site name with --name.",
			projectName,
		))
		os.Exit(1)
	}

	// Get sync plan
	sp.Start("Analyzing changes...")
	var fileMetadata []api.FileMetadata
	for _, f := range discovered {
		fileMetadata = append(fileMetadata, api.FileMetadata{
			Path: f.Path,
			Size: f.Size,
			SHA:  f.SHA,
		})
	}
	syncPlan, err := api.SyncFiles(existingSite.Site.ID, fileMetadata, dryRun)
	if err != nil {
		sp.Fail("Failed to analyze changes")
		ui.PrintError(err.Error())
		return nil
	}
	sp.Stop()

	// Check for changes
	if syncPlan.Summary.ToUpload == 0 && syncPlan.Summary.ToUpdate == 0 && syncPlan.Summary.Deleted == 0 {
		fmt.Printf("\n%s Already in sync!\n", ui.Green("✅"))
		fmt.Printf("%s All %d file(s) are up to date.\n", ui.Gray(""), len(discovered))
		fmt.Printf("%s Site: https://my.flowershow.app/@%s/%s\n", ui.Gray(""), userInfo.DisplayName(), projectName)
		return nil
	}

	// Display sync summary
	displaySyncSummary(syncPlan, projectName, verbose)

	if dryRun || syncPlan.DryRun {
		fmt.Printf("\n%s Dry run complete - no changes were made to your site\n", ui.Yellow("🔍"))
		fmt.Printf("%s Run without --dry-run to apply these changes\n", ui.Gray(""))
		return nil
	}

	// Upload new/modified files
	allToUpload := append(syncPlan.ToUpload, syncPlan.ToUpdate...)
	if len(allToUpload) > 0 {
		fileByPath := make(map[string]*files.FileInfo, len(discovered))
		for i := range discovered {
			fileByPath[discovered[i].Path] = &discovered[i]
		}

		total := len(allToUpload)
		var failedUploads []string
		for i, uploadInfo := range allToUpload {
			ui.PrintProgress("Uploading", i+1, total)
			f := fileByPath[uploadInfo.Path]
			if f == nil {
				failedUploads = append(failedUploads, uploadInfo.Path+" (not found locally)")
				continue
			}
			if err := api.UploadToR2(uploadInfo.UploadURL, f.Content, uploadInfo.ContentType); err != nil {
				failedUploads = append(failedUploads, uploadInfo.Path+": "+err.Error())
			}
		}
		ui.PrintProgressDone()

		if len(failedUploads) > 0 {
			fmt.Printf("%s %d file(s) failed to upload\n", ui.Yellow("⚠️"), len(failedUploads))
			for _, f := range failedUploads {
				fmt.Printf("  - %s\n", f)
			}
		} else {
			if syncPlan.Summary.ToUpload > 0 {
				fmt.Printf("%s Uploaded %d new file(s)\n", ui.Green("✓"), syncPlan.Summary.ToUpload)
			}
			if syncPlan.Summary.ToUpdate > 0 {
				fmt.Printf("%s Updated %d file(s)\n", ui.Green("✓"), syncPlan.Summary.ToUpdate)
			}
		}
	}

	if len(syncPlan.Deleted) > 0 {
		fmt.Printf("%s Deleted %d file(s)\n", ui.Green("✓"), len(syncPlan.Deleted))
	}

	// Wait for processing
	result := ui.WaitForSync(existingSite.Site.ID, 30)
	if result.Timeout {
		ui.PrintWarning("Some files are still processing after 30 seconds.\n" +
			"Your site is available but some pages may not be ready yet.\n" +
			"Check back in a moment.")
	} else if !result.Success && len(result.Errors) > 0 {
		ui.PrintWarning("Some files had processing errors (see above).")
	}

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "sync",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})

	fmt.Printf("\n%s Sync complete!\n", ui.Green("✅"))
	fmt.Printf("   Site: %s\n", ui.Cyan(fmt.Sprintf("https://my.flowershow.app/@%s/%s", userInfo.DisplayName(), projectName)))
	fmt.Printf("   %s\n", ui.Gray(fmt.Sprintf(
		"New: %d | Updated: %d | Deleted: %d | Unchanged: %d",
		syncPlan.Summary.ToUpload,
		syncPlan.Summary.ToUpdate,
		syncPlan.Summary.Deleted,
		syncPlan.Summary.Unchanged,
	)))
	return nil
}

func displaySyncSummary(plan *api.SyncFilesResponse, projectName string, verbose bool) {
	fmt.Printf("\n%s\n", ui.Bold(fmt.Sprintf("Sync Summary for '%s':", projectName)))

	if plan.Summary.ToUpload > 0 {
		fmt.Printf("  %s New files to upload: %d\n", ui.Cyan("📝"), plan.Summary.ToUpload)
		for _, f := range plan.ToUpload {
			fmt.Printf("    %s %s\n", ui.Cyan("+"), f.Path)
		}
	}
	if plan.Summary.ToUpdate > 0 {
		fmt.Printf("  %s Files to update: %d\n", ui.Cyan("🔄"), plan.Summary.ToUpdate)
		for _, f := range plan.ToUpdate {
			fmt.Printf("    %s %s\n", ui.Cyan("~"), f.Path)
		}
	}
	if plan.Summary.Deleted > 0 {
		fmt.Printf("  %s Files to delete: %d\n", ui.Yellow("🗑️"), plan.Summary.Deleted)
		for _, p := range plan.Deleted {
			fmt.Printf("    %s %s\n", ui.Yellow("-"), p)
		}
	}
	if plan.Summary.Unchanged > 0 {
		if verbose {
			fmt.Printf("  %s Files unchanged: %d\n", ui.Green("✅"), plan.Summary.Unchanged)
			for _, p := range plan.Unchanged {
				fmt.Printf("    %s %s\n", ui.Gray("•"), p)
			}
		} else {
			fmt.Printf("  %s Files unchanged: %d\n", ui.Green("✓"), plan.Summary.Unchanged)
			fmt.Printf("\n%s\n", ui.Gray("Note: Use --verbose to see all unchanged files"))
		}
	}
}
