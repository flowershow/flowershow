package cmd

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/flowershow/publish/internal/api"
	"github.com/flowershow/publish/internal/claims"
	"github.com/flowershow/publish/internal/localconfig"
)

// --- flowershow-wkc: claim tokens live in the user's config dir, not the project folder ---

const migratedMsg = "Moved this site's claim token out of .flowershow"

// assertClaimStored checks the claims store holds token for siteID, in a
// private file (0600) in a private dir (0700) under the user's config dir.
func assertClaimStored(t *testing.T, siteID, token string) {
	t.Helper()
	c := claims.Get(siteID)
	if c == nil || c.ClaimToken != token {
		t.Fatalf("expected claim token %q stored for %s, got %+v", token, siteID, c)
	}
	p, err := claims.Path()
	if err != nil {
		t.Fatal(err)
	}
	base, _ := os.UserConfigDir()
	if p != filepath.Join(base, "flowershow", "claims.json") {
		t.Fatalf("claims file at %s, want under %s/flowershow", p, base)
	}
	fi, err := os.Stat(p)
	if err != nil {
		t.Fatal(err)
	}
	if mode := fi.Mode().Perm(); mode != 0600 {
		t.Fatalf("claims file mode = %o, want 600", mode)
	}
	di, err := os.Stat(filepath.Dir(p))
	if err != nil {
		t.Fatal(err)
	}
	if mode := di.Mode().Perm(); mode != 0700 {
		t.Fatalf("claims dir mode = %o, want 700", mode)
	}
}

// writeLegacyAnonConfig writes .flowershow the way fl <= 2.7 did, with the
// claim token and claim URL in it.
func writeLegacyAnonConfig(t *testing.T, dir string) {
	t.Helper()
	raw := `{
  "anon": true,
  "siteId": "` + anonSiteID + `",
  "claimToken": "` + anonClaimToken + `",
  "expiresAt": "` + anonExpiresAt + `",
  "liveUrl": "` + anonLiveURL + `",
  "claimUrl": "` + anonClaimURL + `"
}`
	if err := os.WriteFile(filepath.Join(dir, localconfig.FileName), []byte(raw), 0644); err != nil {
		t.Fatal(err)
	}
}

func git(t *testing.T, dir string, args ...string) {
	t.Helper()
	full := append([]string{"-C", dir, "-c", "user.email=t@example.test", "-c", "user.name=t", "-c", "commit.gpgsign=false"}, args...)
	if out, err := exec.Command("git", full...).CombinedOutput(); err != nil {
		t.Fatalf("git %v: %v\n%s", args, err, out)
	}
}

func requireGit(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not installed")
	}
}

func TestPublishAnonRepublishUsesStoredClaim(t *testing.T) {
	f := setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")
	if _, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) }); err != nil {
		t.Fatal(err)
	}
	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if f.anonCreateCount() != 1 {
		t.Fatalf("republish should update the same site, created %d", f.anonCreateCount())
	}
	if last := f.syncAuth[len(f.syncAuth)-1]; last != "Bearer "+anonClaimToken {
		t.Fatalf("republish should use the stored claim token, got %q", last)
	}
	if !strings.Contains(out, anonClaimURL) {
		t.Fatalf("republish should still print the claim link, got:\n%s", out)
	}
	if strings.Contains(out, migratedMsg) {
		t.Fatalf("nothing to migrate, got:\n%s", out)
	}
}

func TestLegacyClaimTokenIsMigratedOnce(t *testing.T) {
	f := setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")
	writeLegacyAnonConfig(t, dir)

	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if f.anonCreateCount() != 0 || !f.syncedTo(anonSiteID) {
		t.Fatalf("migrated folder should update its anonymous site (created %d, synced %v)", f.anonCreateCount(), f.syncIDs())
	}
	if f.syncAuth[0] != "Bearer "+anonClaimToken {
		t.Fatalf("sync should use the claim token, got %q", f.syncAuth[0])
	}
	if strings.Count(out, migratedMsg) != 1 {
		t.Fatalf("expected the migration notice once, got:\n%s", out)
	}
	if strings.Contains(out, "committed to git") {
		t.Fatalf("not a git repo: no git warning expected, got:\n%s", out)
	}
	raw := readRawConfig(t, dir)
	if strings.Contains(raw, anonClaimToken) || strings.Contains(raw, "claimUrl") {
		t.Fatalf(".flowershow should no longer hold the claim token, got:\n%s", raw)
	}
	if cfg := localconfig.Read(dir); !cfg.IsAnon() || cfg.SiteID != anonSiteID || cfg.LiveURL != anonLiveURL {
		t.Fatalf(".flowershow should keep the non-secret link, got %+v", cfg)
	}
	assertClaimStored(t, anonSiteID, anonClaimToken)

	out, err = captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if strings.Contains(out, migratedMsg) {
		t.Fatalf("migration notice should be shown only once, got:\n%s", out)
	}
	if f.anonCreateCount() != 0 {
		t.Fatal("second run should still update the same site")
	}
}

func TestLegacyClaimTokenCommittedToGitWarns(t *testing.T) {
	requireGit(t)
	setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")
	writeLegacyAnonConfig(t, dir)
	git(t, dir, "init", "-q")
	git(t, dir, "add", ".")
	git(t, dir, "commit", "-q", "-m", "init")

	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if !strings.Contains(out, migratedMsg) || !strings.Contains(out, "committed to git") || !strings.Contains(out, anonClaimURL) {
		t.Fatalf("expected migration notice and a git-history warning with the claim link, got:\n%s", out)
	}
}

// If the claim can't be moved to the config dir, the token stays in
// .flowershow (still usable) and a git repo that doesn't ignore it gets a
// warning.
func TestSecretLeftInFileWarnsWhenNotGitIgnored(t *testing.T) {
	requireGit(t)
	for _, ignored := range []bool{false, true} {
		name := "not-ignored"
		if ignored {
			name = "ignored"
		}
		t.Run(name, func(t *testing.T) {
			f := setupFakeAPI(t, false)
			dir := makeFolder(t, "notes", "")
			writeLegacyAnonConfig(t, dir)
			git(t, dir, "init", "-q")
			if ignored {
				if err := os.WriteFile(filepath.Join(dir, ".gitignore"), []byte(".flowershow\n"), 0644); err != nil {
					t.Fatal(err)
				}
			}
			// Block the claims store: a file where its directory should be.
			cdir, _ := claims.Dir()
			if err := os.MkdirAll(filepath.Dir(cdir), 0755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(cdir, nil, 0644); err != nil {
				t.Fatal(err)
			}

			out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })
			if err != nil {
				t.Fatalf("unexpected error: %v\n%s", err, out)
			}
			if !f.syncedTo(anonSiteID) || f.anonCreateCount() != 0 {
				t.Fatal("the folder should still update its anonymous site")
			}
			warned := strings.Contains(out, "isn't git-ignored")
			if warned == ignored {
				t.Fatalf("ignored=%v: warning shown=%v, got:\n%s", ignored, warned, out)
			}
			if !strings.Contains(readRawConfig(t, dir), anonClaimToken) {
				t.Fatal("token should stay in .flowershow when it can't be moved")
			}
		})
	}
}

func TestAnonFolderWithoutStoredClaimPublishesNewSite(t *testing.T) {
	f := setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")
	// Linked to an anonymous site published on another computer: the
	// committed .flowershow has no token and this computer has no claim.
	if err := localconfig.Write(dir, &localconfig.Config{Anon: true, SiteID: "anon-elsewhere", LiveURL: "https://elsewhere-anon.flowershow.me"}); err != nil {
		t.Fatal(err)
	}

	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if f.anonCreateCount() != 1 || f.syncedTo("anon-elsewhere") {
		t.Fatalf("expected a new anonymous site, created %d, synced %v", f.anonCreateCount(), f.syncIDs())
	}
	if !strings.Contains(out, "isn't saved here") {
		t.Fatalf("expected a note that the claim token isn't on this computer, got:\n%s", out)
	}
	if cfg := localconfig.Read(dir); cfg == nil || cfg.SiteID != anonSiteID {
		t.Fatalf("folder should be linked to the new site, got %+v", cfg)
	}
}

func TestRelinkAfterClaimForgetsStoredClaim(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.sites["quiet-otter"] = api.Site{ID: anonSiteID, ProjectName: "quiet-otter", URL: "https://quiet-otter.flowershow.me"}
	dir := makeAnonFolder(t, "notes", anonSiteID, anonClaimToken)

	if out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, false) }); err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if c := claims.Get(anonSiteID); c != nil {
		t.Fatalf("claim for a claimed site should be removed, got %+v", c)
	}
}

func TestExpiredAnonSiteForgetsStoredClaim(t *testing.T) {
	f := setupFakeAPI(t, false)
	f.siteStatus[anonSiteID] = 410
	dir := makeAnonFolder(t, "notes", anonSiteID, anonClaimToken)

	if _, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) }); err == nil {
		t.Fatal("expected an error for an expired site")
	}
	if c := claims.Get(anonSiteID); c != nil {
		t.Fatalf("claim for an expired site should be removed, got %+v", c)
	}
}
