package cmd

import (
	"fmt"
	"time"

	"github.com/flowershow/publish/internal/api"
	"github.com/flowershow/publish/internal/config"
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

	if err := requireLogin(); err != nil {
		return err
	}
	site, err := resolveSite(nameFlag)
	if err != nil {
		return err
	}
	siteName, siteID := site.ProjectName, site.ID
	sp := ui.NewSpinner()

	// Fetch full site details
	sp.Start(fmt.Sprintf("Fetching settings for %q...", siteName))
	detail, err := api.GetSiteByID(siteID)
	if err != nil {
		sp.Fail("Failed to fetch site settings")
		return fail(err.Error())
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
	if s.AnnotationsEnabled {
		fmt.Printf("  %s\n", ui.Yellow(annotationsOnLine))
	} else {
		fmt.Printf("  %s %s\n", ui.Gray("Annotations:  "), "disabled")
	}
	fmt.Printf("  %s %s\n", ui.Gray("GitHub:       "), ghRepo)
	fmt.Printf("  %s %s\n", ui.Gray("Custom domain:"), customDomain)
	fmt.Printf("  %s %d files (%.1f KB)\n", ui.Gray("Size:         "), s.FileCount, float64(s.TotalSize)/1024)
	printAnnotationStatus(false, s.OpenAnnotations, nil)
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
