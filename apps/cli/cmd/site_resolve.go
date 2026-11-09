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
//
// A bare name, and the "only site" shortcut, only ever pick sites the user
// owns: a site shared with the user is reached only as "owner/name", so a
// command can never act on someone else's site by accident.
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

	var owned []*api.Site
	for i := range sitesData.Sites {
		if !sitesData.Sites[i].IsShared() {
			owned = append(owned, &sitesData.Sites[i])
		}
	}

	if siteName == "" {
		if len(owned) == 0 {
			return nil, fail("You have no sites yet.\nRun `fl <path>` to publish your first site.")
		}
		if len(owned) > 1 {
			fmt.Fprintf(os.Stderr, "\n%s\n\n", ui.Bold("Multiple sites found — specify one with --name:"))
			for _, s := range owned {
				fmt.Fprintf(os.Stderr, "  %s\n", ui.Cyan(s.DisplayName()))
			}
			fmt.Fprintln(os.Stderr)
			return nil, failSilently("multiple sites found; specify one with --name")
		}
		return owned[0], nil
	}

	owner, name := parseSiteRef(siteName)
	if owner == "" {
		for _, s := range owned {
			if s.ProjectName == name {
				return s, nil
			}
		}
	} else {
		for i := range sitesData.Sites {
			s := &sitesData.Sites[i]
			if s.DisplayName() == siteName || (s.Owner != nil && s.Owner.Username == owner && s.ProjectName == name) {
				return s, nil
			}
		}
	}
	return nil, fail(fmt.Sprintf("Site %q not found.\nUse `fl list` to see all sites.", siteName))
}
