package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/flowershow/publish/internal/api"
	"github.com/flowershow/publish/internal/auth"
	"github.com/flowershow/publish/internal/config"
	"github.com/flowershow/publish/internal/files"
	"github.com/flowershow/publish/internal/localconfig"
	"github.com/flowershow/publish/internal/siteconfig"
	"github.com/flowershow/publish/internal/telemetry"
	"github.com/flowershow/publish/internal/ui"
	"github.com/spf13/cobra"
)

var publishName string
var publishYes bool
var publishOverwrite bool

func init() {
	rootCmd.Args = cobra.ArbitraryArgs
	rootCmd.Flags().StringVar(&publishName, "name", "", "Custom name for the site")
	rootCmd.Flags().BoolVar(&publishYes, "yes", false, "Skip the new-site confirmation prompt (for scripts and CI)")
	rootCmd.Flags().BoolVar(&publishOverwrite, "overwrite", false, "Allow publishing an unlinked path into an existing site with the same name, replacing its content")
	rootCmd.RunE = func(cmd *cobra.Command, args []string) error {
		if len(args) == 0 {
			return cmd.Help()
		}
		ui.Header("Flowershow")
		return runPublish(args, publishName, publishYes, publishOverwrite)
	}
}

// runPublish publishes inputPaths. skipConfirm (--yes) only skips the
// new-site name prompt; overwrite (--overwrite) is the explicit opt-in needed
// to publish a path that isn't linked (no .flowershow) into an existing site.
func runPublish(inputPaths []string, nameFlag string, skipConfirm, overwrite bool) error {
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
		return fail("You must be authenticated to use this command.\nRun `fl login` to authenticate.")
	}
	userInfo, err := auth.GetUserInfo(config.APIURL(), tokenData.Token)
	if err != nil {
		sp.Fail("Authentication failed")
		return fail("You must be authenticated to use this command.\nRun `fl login` to authenticate.")
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

	// If --name is given and differs from the stored name, treat it as an
	// explicit re-point request (e.g. after a server-side rename)
	if localCfg != nil && nameFlag != "" && nameFlag != localCfg.SiteName {
		ui.PrintWarning(fmt.Sprintf(
			"Re-pointing this folder from %q to %q (--name overrides .flowershow).",
			localCfg.SiteName, nameFlag,
		))
	}

	// Discover files
	sp.Start("Discovering files...")
	var absolutePaths []string
	for _, p := range inputPaths {
		abs, err := filepath.Abs(p)
		if err != nil || !pathExists(abs) {
			sp.Fail("Path not found")
			return fail(fmt.Sprintf("Path not found: %s", p))
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
		return failSilently(err.Error())
	}
	// Apply config.json's contentInclude/contentExclude, matching the
	// visibility rules the GitHub-sync build applies to the same config.json.
	if isFolderMode {
		discovered = siteconfig.ApplyVisibility(discovered, folderPath)
	}

	if err := files.ValidateFiles(discovered); err != nil {
		sp.Fail("Validation failed")
		return fail(err.Error())
	}
	sp.Succeed(fmt.Sprintf("Found %d file(s)", len(discovered)))

	// Resolve site name
	var siteName string
	switch {
	case nameFlag != "":
		siteName = nameFlag
	case localCfg != nil:
		siteName = localCfg.SiteName
	default:
		siteName, err = files.GetProjectName(discovered)
		if err != nil {
			return fail(err.Error())
		}
	}

	// Look up existing site on the server
	existingSite, err := api.GetSiteByName(userInfo.Username, siteName)
	if err != nil {
		return fail(err.Error())
	}

	// The stored name no longer resolves on the server. The most common cause
	// is a server-side rename (e.g. the 2026 site-name unification), NOT a
	// deletion — the site still exists under a new name, with its content and
	// URL intact. Never discard .flowershow or auto-create a duplicate here;
	// help the user re-point to the current name instead.
	if localCfg != nil && existingSite == nil {
		ui.PrintWarning(fmt.Sprintf(
			"Couldn't find a site named %q.\n"+
				"It may have been renamed — your content and URL are unchanged.\n"+
				"Check its current name in your dashboard: https://my.flowershow.app",
			siteName,
		))

		if skipConfirm {
			return fail(fmt.Sprintf(
				"Re-point this folder by re-running with the current name:\n"+
					"  fl --name \"<current site name>\" %s",
				folderPath,
			))
		}

		newName, err := ui.PromptText("Enter the current site name (or leave blank to cancel):")
		if err != nil {
			return fail("Failed to read input: " + err.Error())
		}
		if newName == "" {
			return fail("Cancelled. Your local .flowershow was left unchanged.")
		}

		renamed, err := api.GetSiteByName(userInfo.Username, newName)
		if err != nil {
			return fail(err.Error())
		}
		if renamed == nil {
			return fail(fmt.Sprintf(
				"No site named %q found either.\n"+
					"Double-check the exact name in your dashboard and try again.",
				newName,
			))
		}

		_ = localconfig.Write(folderPath, &localconfig.Config{SiteName: newName})
		fmt.Printf("%s\n", ui.Green(fmt.Sprintf("✓ Re-pointed .flowershow to %q", newName)))
		return doSync(renamed.Site, newName, discovered, sp, startTime)
	}

	// The path isn't linked (no .flowershow) but its name matches an existing
	// site. Syncing would replace that site's content and delete its files
	// that aren't present locally, so never do it implicitly: require
	// --overwrite, or ask the user to overwrite or choose another name.
	// Linked paths (localCfg != nil) keep their behaviour.
	askedName := false
	if localCfg == nil && existingSite != nil && !overwrite {
		siteName, existingSite, err = resolveExistingSiteConflict(userInfo.Username, siteName, existingSite, skipConfirm, inputPaths)
		if err != nil {
			return err
		}
		askedName = true
	}

	// Site already exists → delta sync
	if existingSite != nil {
		// Persist the name in folder mode, both when there is no local config
		// yet and when --name re-pointed the folder to a different site.
		if isFolderMode && (localCfg == nil || localCfg.SiteName != siteName) {
			_ = localconfig.Write(folderPath, &localconfig.Config{SiteName: siteName})
		}
		return doSync(existingSite.Site, siteName, discovered, sp, startTime)
	}

	// No existing site → first publish
	// Show confirmation prompt unless --yes or --name was provided
	if !skipConfirm && nameFlag == "" && !askedName {
		fmt.Printf("\n%s\n\n", ui.Bold("Creating new site:"))
		confirmed, err := ui.PromptSiteName(siteName)
		if err != nil {
			return fail("Failed to read input: " + err.Error())
		}
		if confirmed != siteName {
			siteName = confirmed
			// Check if the new name already has a site
			existingSite, err = api.GetSiteByName(userInfo.Username, siteName)
			if err != nil {
				return fail(err.Error())
			}
			// Same safeguard as above: typing an existing site's name here
			// must not silently replace that site's content.
			if existingSite != nil && localCfg == nil && !overwrite {
				siteName, existingSite, err = resolveExistingSiteConflict(userInfo.Username, siteName, existingSite, skipConfirm, inputPaths)
				if err != nil {
					return err
				}
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
		return failSilently(err.Error())
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
		return fail(err.Error())
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
		if err := api.UploadToR2(uploadInfo.UploadURL, f.Content, uploadInfo.ContentType, syncPlan.PublishId); err != nil {
			failedUploads = append(failedUploads, uploadInfo.Path+": "+err.Error())
		}
	}
	ui.PrintProgressDone()

	if len(failedUploads) > 0 {
		fmt.Printf("%s %d file(s) failed to upload\n", ui.Yellow("⚠️"), len(failedUploads))
		for _, f := range failedUploads {
			fmt.Printf("  %s %s\n", ui.Yellow("-"), f)
		}
		return fail(fmt.Sprintf("%d file(s) failed to upload to %s. Re-run the same command to retry.", len(failedUploads), site.URL))
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
	fmt.Printf("  Publishing to: %s\n", ui.Cyan(site.URL))

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
		return fail(err.Error())
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
			if err := api.UploadToR2(uploadInfo.UploadURL, f.Content, uploadInfo.ContentType, syncPlan.PublishId); err != nil {
				failedUploads = append(failedUploads, uploadInfo.Path+": "+err.Error())
			}
		}
		ui.PrintProgressDone()

		if len(failedUploads) > 0 {
			fmt.Printf("%s %d file(s) failed to upload\n", ui.Yellow("⚠️"), len(failedUploads))
			for _, f := range failedUploads {
				fmt.Printf("  - %s\n", f)
			}
			return fail(fmt.Sprintf("%d file(s) failed to upload to %s. Re-run the same command to retry.", len(failedUploads), site.URL))
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

	fmt.Printf("\n%s Publish complete!\n", ui.Green("✅"))
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

// resolveExistingSiteConflict handles a path with no .flowershow link whose
// site name matches an existing site. With skipConfirm (--yes) it refuses.
// Otherwise it warns and asks the user to overwrite that site or choose a new
// name, repeating if the new name is also taken. It returns the chosen name
// and, if the user chose to overwrite, the existing site (nil for a new name).
func resolveExistingSiteConflict(username, siteName string, existing *api.GetSiteResponse, skipConfirm bool, inputPaths []string) (string, *api.GetSiteResponse, error) {
	paths := shellQuoteAll(inputPaths)
	for {
		ui.PrintWarning(fmt.Sprintf(
			"A site named %q already exists: %s\n"+
				"This path isn't linked to it (no .flowershow file). Publishing here would\n"+
				"replace that site's content and delete its files that aren't in this path.",
			siteName, existing.Site.URL,
		))

		if skipConfirm {
			return "", nil, fail(fmt.Sprintf(
				"Refusing to overwrite existing site %q (--yes does not imply overwrite).\n"+
					"  To publish as a new site:      fl --name <new-name> %s\n"+
					"  To replace the existing site:  fl --overwrite %s",
				siteName, paths, paths,
			))
		}

		ok, _ := ui.Confirm(fmt.Sprintf("Overwrite the existing site %q?", siteName))
		if ok {
			return siteName, existing, nil
		}

		newName, _ := ui.PromptText("Enter a new site name (or leave blank to cancel):")
		if newName == "" {
			return "", nil, fail("Cancelled. Nothing was published.")
		}

		next, err := api.GetSiteByName(username, newName)
		if err != nil {
			return "", nil, fail(err.Error())
		}
		if next == nil {
			return newName, nil, nil
		}
		siteName, existing = newName, next
	}
}

// shellQuoteAll joins paths for display in a copy-pasteable command,
// quoting any that contain spaces or shell metacharacters.
func shellQuoteAll(paths []string) string {
	quoted := make([]string, len(paths))
	for i, p := range paths {
		if strings.ContainsAny(p, " \t'\"$`\\&;|<>()*?[]{}!#~") {
			quoted[i] = "'" + strings.ReplaceAll(p, "'", `'\''`) + "'"
		} else {
			quoted[i] = p
		}
	}
	return strings.Join(quoted, " ")
}
