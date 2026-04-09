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

var publishOverwrite bool
var publishName string

func init() {
	rootCmd.Args = cobra.ArbitraryArgs
	rootCmd.Flags().BoolVar(&publishOverwrite, "overwrite", false, "Overwrite existing site if it already exists")
	rootCmd.Flags().StringVar(&publishName, "name", "", "Custom name for the site")
	rootCmd.RunE = func(cmd *cobra.Command, args []string) error {
		if len(args) == 0 {
			return cmd.Help()
		}
		ui.Header("Publish")
		return runPublish(args, publishOverwrite, publishName)
	}
}

func runPublish(inputPaths []string, overwrite bool, siteName string) error {
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
		ui.PrintError("You must be authenticated to use this command.\nRun `publish auth login` to authenticate.")
		return nil
	}
	userInfo, err := auth.GetUserInfo(config.APIURL(), tokenData.Token)
	if err != nil {
		sp.Fail("Authentication failed")
		ui.PrintError("You must be authenticated to use this command.\nRun `publish auth login` to authenticate.")
		return nil
	}
	sp.Succeed(fmt.Sprintf("Publishing as: %s", userInfo.DisplayName()))

	// Resolve and validate paths
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
	sp.Succeed(fmt.Sprintf("Found %d file(s) to publish.", len(discovered)))

	// Check for existing site
	existingSite, err := api.GetSiteByName(userInfo.Username, projectName)
	if err != nil {
		ui.PrintError(err.Error())
		return nil
	}
	if existingSite != nil && !overwrite {
		ui.PrintError(fmt.Sprintf(
			"A site named '%s' already exists.\n"+
				"Please choose a different name or delete the existing site first.\n"+
				"Use 'publish list' to see all sites.\n\n"+
				"💡 Tip: Use the --overwrite flag to publish over an existing site.",
			existingSite.Site.ProjectName,
		))
		os.Exit(1)
	}

	// Create site
	sp.Start("Creating site...")
	siteData, err := api.CreateSite(projectName, overwrite)
	if err != nil {
		sp.Fail("Failed to create site")
		ui.PrintError(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "publish",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_message": err.Error(),
		})
		return nil
	}
	site := siteData.Site
	sp.Succeed(fmt.Sprintf("Site created (ID: %s)", site.ID))

	// Build file metadata
	var fileMetadata []api.FileMetadata
	for _, f := range discovered {
		fileMetadata = append(fileMetadata, api.FileMetadata{
			Path: f.Path,
			Size: f.Size,
			SHA:  f.SHA,
		})
	}

	// Get sync plan
	syncPlan, err := api.SyncFiles(site.ID, fileMetadata, false)
	if err != nil {
		ui.PrintError(err.Error())
		return nil
	}

	// Upload files
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

func pathExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}
