package cmd

import (
	"fmt"
	"os"
	"time"

	"github.com/flowershow/publish/internal/api"
	"github.com/flowershow/publish/internal/auth"
	"github.com/flowershow/publish/internal/config"
	"github.com/flowershow/publish/internal/telemetry"
	"github.com/flowershow/publish/internal/ui"
	"github.com/spf13/cobra"
)

var deleteCmd = &cobra.Command{
	Use:   "delete <project-name>",
	Short: "Delete a published site",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		ui.Header("Delete Site")
		return runDelete(args[0])
	},
}

func init() {
	rootCmd.AddCommand(deleteCmd)
}

func runDelete(projectName string) error {
	startTime := time.Now()
	telemetry.Capture("command_started", map[string]interface{}{
		"command":     "delete",
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
	sp.Start(fmt.Sprintf("Looking for site '%s'...", projectName))

	sitesData, err := api.GetSites()
	if err != nil {
		sp.Fail("Failed to fetch sites")
		ui.PrintError(err.Error())
		return nil
	}

	var siteToDelete *api.Site
	for i := range sitesData.Sites {
		if sitesData.Sites[i].ProjectName == projectName {
			siteToDelete = &sitesData.Sites[i]
			break
		}
	}

	if siteToDelete == nil {
		sp.Fail(fmt.Sprintf("Site '%s' not found", projectName))
		ui.PrintError(fmt.Sprintf("Site '%s' not found.\nUse 'publish list' to see all sites.", projectName))
		os.Exit(1)
	}

	sp.Succeed(fmt.Sprintf("Found site: %s", projectName))
	fmt.Printf("%s\n\n", ui.Gray("URL: "+siteToDelete.URL))

	// Block deletion of premium sites
	if siteToDelete.Plan == "PREMIUM" {
		dashboardURL := fmt.Sprintf("%s/site/%s/settings", config.APIURL(), siteToDelete.ID)
		ui.PrintError(fmt.Sprintf(
			"This site has an active premium subscription.\n"+
				"You must cancel the subscription before deleting the site.\n"+
				"Please visit your dashboard to manage your subscription:\n\n%s",
			dashboardURL,
		))
		os.Exit(1)
	}

	// Confirm deletion
	fmt.Printf("%s\n\n", ui.Yellow("⚠️  This will permanently delete the site and all its content."))
	confirmed, err := ui.Confirm("Are you sure you want to delete this site?")
	if err != nil || !confirmed {
		fmt.Printf("%s\n", ui.Gray("Deletion cancelled."))
		os.Exit(0)
	}

	sp.Start("Deleting site...")
	result, err := api.DeleteSite(siteToDelete.ID)
	if err != nil {
		sp.Fail("Failed to delete site")
		ui.PrintError(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "delete",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_message": err.Error(),
		})
		return nil
	}

	sp.Succeed(fmt.Sprintf("Successfully deleted site '%s'", projectName))
	if result.DeletedFiles > 0 {
		fmt.Printf("  %s\n\n", ui.Gray(fmt.Sprintf("Deleted %d file(s)", result.DeletedFiles)))
	}

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "delete",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})
	return nil
}
