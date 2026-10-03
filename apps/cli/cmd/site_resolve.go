package cmd

import (
	"fmt"
	"os"

	"github.com/flowershow/publish/internal/api"
	"github.com/flowershow/publish/internal/localconfig"
	"github.com/flowershow/publish/internal/ui"
)

// resolveSite picks the site for commands that take --name: the flag, else the
// site linked to the current folder, else the user's only site.
func resolveSite(nameFlag string) (*api.Site, error) {
	siteName := nameFlag
	if siteName == "" {
		if cwd, err := os.Getwd(); err == nil {
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
		return nil, fail(err.Error())
	}
	sp.Stop()

	if siteName == "" {
		if len(sitesData.Sites) == 0 {
			return nil, fail("You have no sites yet.\nRun `fl <path>` to publish your first site.")
		}
		if len(sitesData.Sites) > 1 {
			fmt.Fprintf(os.Stderr, "\n%s\n\n", ui.Bold("Multiple sites found — specify one with --name:"))
			for _, s := range sitesData.Sites {
				fmt.Fprintf(os.Stderr, "  %s\n", ui.Cyan(s.ProjectName))
			}
			fmt.Fprintln(os.Stderr)
			return nil, failSilently("multiple sites found; specify one with --name")
		}
		return &sitesData.Sites[0], nil
	}
	for i := range sitesData.Sites {
		if sitesData.Sites[i].ProjectName == siteName {
			return &sitesData.Sites[i], nil
		}
	}
	return nil, fail(fmt.Sprintf("Site %q not found.\nUse `fl list` to see all sites.", siteName))
}
