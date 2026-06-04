package cmd

import (
	"fmt"
	"os"
	"time"

	"github.com/flowershow/publish/internal/api"
	"github.com/flowershow/publish/internal/auth"
	"github.com/flowershow/publish/internal/config"
	"github.com/flowershow/publish/internal/localconfig"
	"github.com/flowershow/publish/internal/telemetry"
	"github.com/flowershow/publish/internal/ui"
	"github.com/spf13/cobra"
)

var settingsName string

var settingsCmd = &cobra.Command{
	Use:   "settings",
	Short: "Show settings for a site",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		ui.Header("Site Settings")
		return runSettings(settingsName)
	},
}

func init() {
	rootCmd.AddCommand(settingsCmd)
	settingsCmd.Flags().StringVar(&settingsName, "name", "", "Site name (defaults to site in current directory)")
}

func runSettings(nameFlag string) error {
	startTime := time.Now()
	telemetry.Capture("command_started", map[string]interface{}{
		"command":     "settings",
		"cli_version": config.Version,
	})
	defer func() { telemetry.Flush() }()

	// Authenticate
	tokenData, err := auth.GetToken()
	if err != nil || tokenData == nil {
		ui.PrintError("You must be authenticated to use this command.\nRun `fl login` to authenticate.")
		return nil
	}
	if _, err := auth.GetUserInfo(config.APIURL(), tokenData.Token); err != nil {
		ui.PrintError("You must be authenticated to use this command.\nRun `fl login` to authenticate.")
		return nil
	}

	// Resolve site name
	siteName := nameFlag
	if siteName == "" {
		cwd, err := os.Getwd()
		if err == nil {
			if cfg := localconfig.Read(cwd); cfg != nil {
				siteName = cfg.SiteName
			}
		}
	}

	sp := ui.NewSpinner()
	sp.Start("Fetching sites...")

	sitesData, err := api.GetSites()
	if err != nil {
		sp.Fail("Failed to fetch sites")
		ui.PrintError(err.Error())
		return nil
	}
	sp.Stop()

	// If no name resolved yet, check if there's exactly one site
	if siteName == "" {
		if len(sitesData.Sites) == 0 {
			ui.PrintError("You have no sites yet.\nRun `fl <path>` to publish your first site.")
			return nil
		}
		if len(sitesData.Sites) > 1 {
			fmt.Printf("\n%s\n\n", ui.Bold("Multiple sites found — specify one with --name:"))
			for _, s := range sitesData.Sites {
				fmt.Printf("  %s\n", ui.Cyan(s.ProjectName))
			}
			fmt.Println()
			os.Exit(1)
		}
		siteName = sitesData.Sites[0].ProjectName
	}

	// Find the site ID
	var siteID string
	for _, s := range sitesData.Sites {
		if s.ProjectName == siteName {
			siteID = s.ID
			break
		}
	}

	if siteID == "" {
		ui.PrintError(fmt.Sprintf("Site %q not found.\nUse `fl list` to see all sites.", siteName))
		os.Exit(1)
	}

	// Fetch full site details
	sp.Start(fmt.Sprintf("Fetching settings for %q...", siteName))
	detail, err := api.GetSiteByID(siteID)
	if err != nil {
		sp.Fail("Failed to fetch site settings")
		ui.PrintError(err.Error())
		return nil
	}
	sp.Stop()

	s := detail.Site

	privacyLabel := "public"
	if s.PrivacyMode == "PASSWORD" {
		privacyLabel = "private (password protected)"
	}

	ghRepo := "not connected"
	if s.GhRepository != nil && *s.GhRepository != "" {
		ghRepo = *s.GhRepository
		if s.GhBranch != nil && *s.GhBranch != "" {
			ghRepo += " (" + *s.GhBranch + ")"
		}
	}

	customDomain := "none"
	if s.CustomDomain != nil && *s.CustomDomain != "" {
		customDomain = *s.CustomDomain
	}

	fmt.Printf("\n%s\n\n", ui.Bold(s.ProjectName))
	fmt.Printf("  %s %s\n", ui.Gray("URL:          "), ui.Cyan(s.URL))
	fmt.Printf("  %s %s\n", ui.Gray("Plan:         "), s.Plan)
	fmt.Printf("  %s %s\n", ui.Gray("Privacy:      "), privacyLabel)
	fmt.Printf("  %s %s\n", ui.Gray("Comments:     "), boolLabel(s.ShowComments))
	fmt.Printf("  %s %s\n", ui.Gray("Search:       "), boolLabel(s.EnableSearch))
	fmt.Printf("  %s %s\n", ui.Gray("GitHub:       "), ghRepo)
	fmt.Printf("  %s %s\n", ui.Gray("Custom domain:"), customDomain)
	fmt.Printf("  %s %d files (%.1f KB)\n", ui.Gray("Size:         "), s.FileCount, float64(s.TotalSize)/1024)
	fmt.Println()

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "settings",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})
	return nil
}

func boolLabel(v bool) string {
	if v {
		return "enabled"
	}
	return "disabled"
}
