package cmd

import (
	"fmt"
	"time"

	"github.com/flowershow/publish/internal/api"
	"github.com/flowershow/publish/internal/auth"
	"github.com/flowershow/publish/internal/config"
	"github.com/flowershow/publish/internal/telemetry"
	"github.com/flowershow/publish/internal/ui"
	"github.com/spf13/cobra"
)

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List all published sites",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		ui.Header("List Sites")
		return runList()
	},
}

func init() {
	rootCmd.AddCommand(listCmd)
}

func runList() error {
	startTime := time.Now()
	telemetry.Capture("command_started", map[string]interface{}{
		"command":     "list",
		"cli_version": config.Version,
	})
	defer func() { telemetry.Flush() }()

	// Authenticate
	tokenData, err := auth.GetToken()
	if err != nil || tokenData == nil {
		ui.PrintError("You must be authenticated to use this command.\nRun `publish auth login` to authenticate.")
		return nil
	}
	if _, err := auth.GetUserInfo(config.APIURL(), tokenData.Token); err != nil {
		ui.PrintError("You must be authenticated to use this command.\nRun `publish auth login` to authenticate.")
		return nil
	}

	sp := ui.NewSpinner()
	sp.Start("Fetching sites...")

	sitesData, err := api.GetSites()
	if err != nil {
		sp.Fail("Failed to fetch sites")
		ui.PrintError(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "list",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_message": err.Error(),
		})
		return nil
	}
	sp.Stop()

	sites := sitesData.Sites
	if len(sites) == 0 {
		fmt.Printf("\n%s\n\n", ui.Gray("No sites found."))
		return nil
	}

	fmt.Printf("\n%s\n\n", ui.Bold(fmt.Sprintf("Found %d site(s):", len(sites))))

	for _, site := range sites {
		dashboardURL := fmt.Sprintf("%s/site/%s/settings", config.APIURL(), site.ID)
		updatedAt := site.CreatedAt
		if site.UpdatedAt != nil {
			updatedAt = *site.UpdatedAt
		}
		fmt.Printf("  %s\n", ui.Cyan(site.ProjectName))
		fmt.Printf("    %s\n", ui.Gray("URL: "+site.URL))
		fmt.Printf("    %s\n", ui.Gray("Dashboard URL: "+dashboardURL))
		fmt.Printf("    %s\n", ui.Gray("Created: "+formatDisplayDate(site.CreatedAt)))
		fmt.Printf("    %s\n", ui.Gray("Updated: "+formatDisplayDate(updatedAt)))
		fmt.Println()
	}

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "list",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})
	return nil
}

func formatDisplayDate(dateStr string) string {
	t, err := time.Parse(time.RFC3339, dateStr)
	if err != nil {
		return dateStr
	}
	return t.Local().Format("2006-01-02 15:04:05")
}
