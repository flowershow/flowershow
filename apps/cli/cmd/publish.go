package cmd

import (
	"errors"
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
var publishAnon bool

// notLoggedInMsg is shown when publishing without a login and without --anon.
// fl never publishes anonymously unless asked to.
const notLoggedInMsg = "You're not logged in.\nRun `fl login` to publish to your account, or `fl --anon <path>` to publish without an account (expires in 7 days unless claimed)."

// anonGoneMsg is shown when a saved anonymous site rejects its claim token
// (expired, claimed, deleted, or the token is no longer valid).
const anonGoneMsg = "This anonymous site has expired or been claimed, so it can't be updated from here. Its link was removed from .flowershow: run the same command again to publish a new anonymous site, or run `fl login`."

// anonSingleFilesNote is shown after an anonymous publish that can't be linked.
const anonSingleFilesNote = "Single files can't be updated without an account. Publish a folder, or run `fl login`."

func init() {
	rootCmd.Args = cobra.ArbitraryArgs
	rootCmd.Flags().StringVar(&publishName, "name", "", "Custom name for the site")
	rootCmd.Flags().BoolVar(&publishYes, "yes", false, "Skip the new-site confirmation prompt (for scripts and CI)")
	rootCmd.Flags().BoolVar(&publishOverwrite, "overwrite", false, "Allow publishing an unlinked path into an existing site with the same name, replacing its content")
	rootCmd.Flags().BoolVar(&publishAnon, "anon", false, "Publish without an account. The site expires in 7 days unless claimed; prints a claim link.")
	rootCmd.RunE = func(cmd *cobra.Command, args []string) error {
		if len(args) == 0 {
			return cmd.Help()
		}
		ui.Header("Flowershow")
		return runPublish(args, publishName, publishYes, publishOverwrite, publishAnon)
	}
}

// runPublish publishes inputPaths. skipConfirm (--yes) only skips the
// new-site name prompt; overwrite (--overwrite) is the explicit opt-in needed
// to publish a path that isn't linked (no .flowershow) into an existing site.
// anon (--anon) publishes without an account: no login is needed or used.
func runPublish(inputPaths []string, nameFlag string, skipConfirm, overwrite, anon bool) error {
	startTime := time.Now()
	telemetry.Capture("command_started", map[string]interface{}{
		"command":     "publish",
		"cli_version": config.Version,
	})
	defer func() { telemetry.Flush() }()

	sp := ui.NewSpinner()

	// Authenticate (not for --anon, which never uses the user's account)
	var userInfo *auth.UserInfo
	if !anon {
		sp.Start("Checking authentication...")
		tokenData, err := auth.GetToken()
		if err != nil || tokenData == nil {
			sp.Fail("Not logged in")
			return fail(notLoggedInMsg)
		}
		userInfo, err = auth.GetUserInfo(config.APIURL(), tokenData.Token)
		if err != nil {
			sp.Fail("Authentication failed")
			return fail("You must be authenticated to use this command.\nRun `fl login` to authenticate.")
		}
		sp.Succeed(fmt.Sprintf("Logged in as: %s", userInfo.DisplayName()))
	}

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

	// A link to an anonymous site is only used by --anon. For account
	// publishing the folder counts as unlinked; point out the earlier
	// anonymous site so it can still be claimed.
	var anonCfg *localconfig.Config
	if localCfg.IsAnon() {
		anonCfg, localCfg = localCfg, nil
		if !anon {
			fmt.Printf("\n%s This folder was previously published without an account", ui.Yellow("Note:"))
			if anonCfg.LiveURL != "" {
				fmt.Printf(" (%s)", anonCfg.LiveURL)
			}
			fmt.Println(". Publishing it to your account now.")
			if anonCfg.ClaimURL != "" {
				fmt.Printf("To keep that earlier site, claim it:\n%s\n", anonCfg.ClaimURL)
			}
			fmt.Println()
		}
	}
	if anon && nameFlag != "" {
		ui.PrintWarning("--name is ignored with --anon: anonymous sites get a random name.")
	}

	// If --name is given and differs from the stored name, treat it as an
	// explicit re-point request (e.g. after a server-side rename)
	if !anon && localCfg != nil && nameFlag != "" && nameFlag != localCfg.SiteName {
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

	if anon {
		// A folder linked to an account site keeps its .flowershow as is.
		return runAnonPublish(anonCfg, isFolderMode, isFolderMode && localCfg == nil, folderPath, discovered, sp, startTime)
	}

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
				"Check its current name in your dashboard: https://cloud.flowershow.app",
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

	if err := uploadNewSite(site, discovered); err != nil {
		return err
	}
	// Write config only after a fully successful upload in folder mode
	if isFolderMode {
		_ = localconfig.Write(folderPath, &localconfig.Config{SiteName: siteName})
	}

	waitForProcessing(site.ID)

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "publish",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})
	ui.PrintPublishSuccess(site.URL)
	return nil
}

// uploadNewSite uploads all discovered files to a freshly created site.
func uploadNewSite(site api.Site, discovered []files.FileInfo) error {
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
		return failWith(err)
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
	}
	fmt.Printf("%s Uploaded %d file(s)\n", ui.Green("✓"), len(discovered))
	return nil
}

// waitForProcessing polls the site's status until files are processed (or
// 30 seconds pass) and warns about slow or failed processing.
func waitForProcessing(siteID string) {
	result := ui.WaitForSync(siteID, 30)
	if result.Timeout {
		ui.PrintWarning("Some files are still processing after 30 seconds.\n" +
			"Your site is available but some pages may not be ready yet.\n" +
			"Check back in a moment.")
	} else if !result.Success && len(result.Errors) > 0 {
		ui.PrintWarning("Some files had processing errors (see above).")
	}
}

// runAnonPublish publishes discovered files without an account. If saved (a
// folder's anonymous .flowershow link) has a claim token, it updates that
// site; otherwise it creates a new anonymous site, linking it to folderPath
// when canLink is true. Requests are authorised by the site's claim token,
// never the user's token.
func runAnonPublish(saved *localconfig.Config, isFolderMode, canLink bool, folderPath string, discovered []files.FileInfo, sp *ui.Spinner, startTime time.Time) error {
	defer api.SetTokenOverride("")

	if saved != nil && saved.ClaimToken != "" {
		api.SetTokenOverride(saved.ClaimToken)
		site := api.Site{ID: saved.SiteID, URL: saved.LiveURL}
		if err := syncToSite(site, "anonymous site", discovered, sp, startTime, false); err != nil {
			var httpErr *api.HTTPError
			if errors.As(err, &httpErr) && isAnonGoneStatus(httpErr.StatusCode) {
				clearAnonConfig(folderPath, saved)
				return fail(anonGoneMsg)
			}
			var reported *reportedError
			if errors.As(err, &reported) {
				return err
			}
			return failWith(err)
		}
		printAnonSuccess(saved.LiveURL, saved.ClaimURL, saved.ExpiresAt)
		return nil
	}

	sp.Start("Creating site...")
	created, err := api.CreateAnonSite()
	if err != nil {
		sp.Fail("Failed to create site")
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "publish",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_type":    fmt.Sprintf("%T", err),
			"error_message": err.Error(),
			"anon":          true,
		})
		return failWith(err)
	}
	sp.Succeed("Site created")
	api.SetTokenOverride(created.ClaimToken)

	// Link the folder straight away (not after upload), so a failed upload
	// can be retried into the same site and the claim link isn't lost.
	if canLink {
		_ = localconfig.Write(folderPath, &localconfig.Config{
			Anon:       true,
			SiteID:     created.SiteID,
			ClaimToken: created.ClaimToken,
			ExpiresAt:  created.ExpiresAt,
			LiveURL:    created.LiveURL,
			ClaimURL:   created.ClaimURL,
		})
	}

	site := api.Site{ID: created.SiteID, ProjectName: created.ProjectName, URL: created.LiveURL}
	if err := uploadNewSite(site, discovered); err != nil {
		if !canLink {
			fmt.Printf("Claim link for this site: %s\n", created.ClaimURL)
		}
		return err
	}
	waitForProcessing(site.ID)

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "publish",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
		"anon":        true,
	})
	printAnonSuccess(created.LiveURL, created.ClaimURL, created.ExpiresAt)
	switch {
	case !isFolderMode:
		fmt.Println(anonSingleFilesNote)
	case !canLink:
		fmt.Println("This folder's .flowershow links it to a site in your account, so it was left unchanged and this anonymous site can't be updated from here.")
	}
	return nil
}

// printAnonSuccess prints the live URL and the claim link, each in full on
// its own line (agents relay the claim link to the user).
func printAnonSuccess(liveURL, claimURL, expiresAt string) {
	fmt.Printf("\n%s Published (no account): %s\n", ui.Green("✓"), liveURL)
	fmt.Printf("Claim it to keep it (expires %s): %s\n\n", formatExpiry(expiresAt), claimURL)
}

// formatExpiry formats an ISO 8601 timestamp as e.g. "7 Oct 2026" in local
// time, falling back to the raw value if it can't be parsed.
func formatExpiry(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		return iso
	}
	return t.Local().Format("2 Jan 2006")
}

// clearAnonConfig removes the anonymous-site fields from folderPath's
// .flowershow, deleting the file if nothing else is left.
func clearAnonConfig(folderPath string, cfg *localconfig.Config) {
	if folderPath == "" {
		return
	}
	rest := *cfg
	rest.Anon, rest.SiteID, rest.ClaimToken, rest.ExpiresAt, rest.LiveURL, rest.ClaimURL = false, "", "", "", "", ""
	if rest == (localconfig.Config{}) {
		localconfig.Delete(folderPath)
		return
	}
	_ = localconfig.Write(folderPath, &rest)
}

// isAnonGoneStatus reports whether an HTTP status from a claim-token request
// means the saved anonymous site can no longer be updated: invalid token (401),
// claimed or not this site (403), deleted (404) or expired (410).
func isAnonGoneStatus(status int) bool {
	switch status {
	case 401, 403, 404, 410:
		return true
	}
	return false
}

// doSync performs a delta sync to an existing site with already-discovered files.
func doSync(site api.Site, siteName string, discovered []files.FileInfo, sp *ui.Spinner, startTime time.Time) error {
	return syncToSite(site, siteName, discovered, sp, startTime, true)
}

// syncToSite is doSync. If reportPlanErr is false, an error from the sync
// request itself is returned unprinted, so the caller can explain it.
func syncToSite(site api.Site, siteName string, discovered []files.FileInfo, sp *ui.Spinner, startTime time.Time, reportPlanErr bool) error {
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
		if !reportPlanErr {
			return err
		}
		return failWith(err)
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

	waitForProcessing(site.ID)

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
