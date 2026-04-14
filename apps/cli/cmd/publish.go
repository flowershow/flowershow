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
	"github.com/flowershow/publish/internal/localconfig"
	"github.com/flowershow/publish/internal/telemetry"
	"github.com/flowershow/publish/internal/ui"
	"github.com/spf13/cobra"
)

var publishName string
var publishYes bool

func init() {
	rootCmd.Args = cobra.ArbitraryArgs
	rootCmd.Flags().StringVar(&publishName, "name", "", "Custom name for the site")
	rootCmd.Flags().BoolVar(&publishYes, "yes", false, "Skip confirmation prompt (for scripts and CI)")
	rootCmd.RunE = func(cmd *cobra.Command, args []string) error {
		if len(args) == 0 {
			return cmd.Help()
		}
		ui.Header("Flowershow")
		return runPublish(args, publishName, publishYes)
	}
}

func runPublish(inputPaths []string, nameFlag string, skipConfirm bool) error {
	startTime := time.Now()
	telemetry.Capture("command_started", map[string]interface{}{
		"command":     "publish",
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
	sp.Succeed(fmt.Sprintf("Logged in as: %s", userInfo.DisplayName()))

	// Detect folder mode: single path that is a directory
	isFolderMode := false
	var folderPath string
	if len(inputPaths) == 1 {
		abs, err := filepath.Abs(inputPaths[0])
		if err == nil && pathExists(abs) {
			if info, statErr := os.Stat(abs); statErr == nil && info.IsDir() {
				isFolderMode = true
				folderPath = abs
			}
		}
	}

	// Read local config (folder mode only)
	var localCfg *localconfig.Config
	if isFolderMode {
		localCfg = localconfig.Read(folderPath)
	}

	// Reject --name if config already has a different name
	if localCfg != nil && nameFlag != "" && nameFlag != localCfg.SiteName {
		ui.PrintError(fmt.Sprintf(
			"Site name is already set to %q in .flowershow.\n"+
				"To use a different name, delete .flowershow and re-run with --name.",
			localCfg.SiteName,
		))
		return nil
	}

	// Discover files
	sp.Start("Discovering files...")
	var absolutePaths []string
	for _, p := range inputPaths {
		abs, err := filepath.Abs(p)
		if err != nil || !pathExists(abs) {
			sp.Fail("Path not found")
			ui.PrintError(fmt.Sprintf("Path not found: %s", p))
			os.Exit(1)
		}
		absolutePaths = append(absolutePaths, abs)
	}

	discovered, err := files.DiscoverFiles(absolutePaths)
	if err != nil {
		sp.Fail("Discovery failed")
		ui.PrintError(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "publish",
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
	sp.Succeed(fmt.Sprintf("Found %d file(s)", len(discovered)))

	// Resolve site name
	var siteName string
	switch {
	case localCfg != nil:
		siteName = localCfg.SiteName
	case nameFlag != "":
		siteName = nameFlag
	default:
		siteName, err = files.GetProjectName(discovered)
		if err != nil {
			ui.PrintError(err.Error())
			return nil
		}
	}

	// Look up existing site on the server
	existingSite, err := api.GetSiteByName(userInfo.Username, siteName)
	if err != nil {
		ui.PrintError(err.Error())
		return nil
	}

	// Config found but site was deleted on the server
	if localCfg != nil && existingSite == nil {
		localconfig.Delete(folderPath)
		ui.PrintError(fmt.Sprintf(
			"Site %q not found. It may have been deleted.\n"+
				"Run `fl` to create a new site.",
			siteName,
		))
		return nil
	}

	// Site already exists → delta sync
	if existingSite != nil {
		// Restore missing config if site exists (e.g. config was manually deleted)
		if isFolderMode && localCfg == nil {
			_ = localconfig.Write(folderPath, &localconfig.Config{SiteName: siteName})
		}
		return doSync(existingSite.Site, siteName, discovered, sp, startTime)
	}

	// No existing site → first publish
	// Show confirmation prompt unless --yes or --name was provided
	if !skipConfirm && nameFlag == "" {
		siteURL := fmt.Sprintf("https://my.flowershow.app/@%s/%s", userInfo.Username, siteName)
		fmt.Printf("\n%s\n\n", ui.Bold("Creating new site:"))
		confirmed, err := ui.PromptSiteName(siteName, siteURL)
		if err != nil {
			ui.PrintError("Failed to read input: " + err.Error())
			return nil
		}
		if confirmed != siteName {
			siteName = confirmed
			// Check if the new name already has a site
			existingSite, err = api.GetSiteByName(userInfo.Username, siteName)
			if err != nil {
				ui.PrintError(err.Error())
				return nil
			}
			if existingSite != nil {
				if isFolderMode {
					_ = localconfig.Write(folderPath, &localconfig.Config{SiteName: siteName})
				}
				return doSync(existingSite.Site, siteName, discovered, sp, startTime)
			}
		}
	}

	// Create the site
	sp.Start("Creating site...")
	siteData, err := api.CreateSite(siteName, false)
	if err != nil {
		sp.Fail("Failed to create site")
		ui.PrintError(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "publish",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_type":    fmt.Sprintf("%T", err),
			"error_message": err.Error(),
		})
		return nil
	}
	site := siteData.Site
	sp.Succeed("Site created")

	// Upload all files via sync API
	var fileMetadata []api.FileMetadata
	for _, f := range discovered {
		fileMetadata = append(fileMetadata, api.FileMetadata{
			Path: f.Path,
			Size: f.Size,
			SHA:  f.SHA,
		})
	}
	syncPlan, err := api.SyncFiles(site.ID, fileMetadata, false)
	if err != nil {
		ui.PrintError(err.Error())
		return nil
	}

	allToUpload := append(syncPlan.ToUpload, syncPlan.ToUpdate...)
	total := len(allToUpload)

	fileByPath := make(map[string]*files.FileInfo, len(discovered))
	for i := range discovered {
		fileByPath[discovered[i].Path] = &discovered[i]
	}

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
			fmt.Printf("  %s %s\n", ui.Yellow("-"), f)
		}
	} else {
		fmt.Printf("%s Uploaded %d file(s)\n", ui.Green("✓"), len(discovered))
		// Write config only after a fully successful upload in folder mode
		if isFolderMode {
			_ = localconfig.Write(folderPath, &localconfig.Config{SiteName: siteName})
		}
	}

	// Wait for processing
	result := ui.WaitForSync(site.ID, 30)
	if result.Timeout {
		ui.PrintWarning("Some files are still processing after 30 seconds.\n" +
			"Your site is available but some pages may not be ready yet.\n" +
			"Check back in a moment.")
	} else if !result.Success && len(result.Errors) > 0 {
		ui.PrintWarning("Some files had processing errors (see above).")
	}

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "publish",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})
	ui.PrintPublishSuccess(site.URL)
	return nil
}

// doSync performs a delta sync to an existing site with already-discovered files.
func doSync(site api.Site, siteName string, discovered []files.FileInfo, sp *ui.Spinner, startTime time.Time) error {
	var fileMetadata []api.FileMetadata
	for _, f := range discovered {
		fileMetadata = append(fileMetadata, api.FileMetadata{
			Path: f.Path,
			Size: f.Size,
			SHA:  f.SHA,
		})
	}

	sp.Start("Analyzing changes...")
	syncPlan, err := api.SyncFiles(site.ID, fileMetadata, false)
	if err != nil {
		sp.Fail("Failed to analyze changes")
		ui.PrintError(err.Error())
		return nil
	}
	sp.Stop()

	// Nothing to do
	if syncPlan.Summary.ToUpload == 0 && syncPlan.Summary.ToUpdate == 0 && syncPlan.Summary.Deleted == 0 {
		fmt.Printf("\n%s Already in sync!\n", ui.Green("✅"))
		fmt.Printf("%s All %d file(s) are up to date.\n", ui.Gray(""), len(discovered))
		fmt.Printf("%s Site: %s\n", ui.Gray(""), ui.Cyan(site.URL))
		return nil
	}

	displaySyncSummary(syncPlan, siteName, false)

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
	result := ui.WaitForSync(site.ID, 30)
	if result.Timeout {
		ui.PrintWarning("Some files are still processing after 30 seconds.\n" +
			"Your site is available but some pages may not be ready yet.\n" +
			"Check back in a moment.")
	} else if !result.Success && len(result.Errors) > 0 {
		ui.PrintWarning("Some files had processing errors (see above).")
	}

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "publish",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})

	fmt.Printf("\n%s Sync complete!\n", ui.Green("✅"))
	fmt.Printf("   Site: %s\n", ui.Cyan(site.URL))
	fmt.Printf("   %s\n", ui.Gray(fmt.Sprintf(
		"New: %d | Updated: %d | Deleted: %d | Unchanged: %d",
		syncPlan.Summary.ToUpload,
		syncPlan.Summary.ToUpdate,
		syncPlan.Summary.Deleted,
		syncPlan.Summary.Unchanged,
	)))
	return nil
}

func pathExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}
