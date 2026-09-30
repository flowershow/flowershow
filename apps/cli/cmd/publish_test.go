package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/flowershow/publish/internal/localconfig"
	"github.com/flowershow/publish/internal/ui"
)

// --- flowershow-gqc: unlinked paths must never sync into an existing site implicitly ---

func TestPublish_UnlinkedFolder_ExistingSite_Yes_RefusesToOverwrite(t *testing.T) {
	f := setupFakeAPI(t, true, "notes")
	dir := makeFolder(t, "notes", "")

	err := runPublish([]string{dir}, "", true, false, false)

	if err == nil {
		t.Fatal("expected an error when an unlinked folder targets an existing site with --yes")
	}
	if f.syncedTo("id-notes") {
		t.Fatal("existing site was synced (and its remote-only files deleted) without explicit opt-in")
	}
	if cfg := localconfig.Read(dir); cfg != nil {
		t.Fatalf("folder should not have been linked to the existing site, got %+v", cfg)
	}
}

func TestPublish_UnlinkedFolder_NameFlagMatchesExistingSite_Yes_RefusesToOverwrite(t *testing.T) {
	f := setupFakeAPI(t, true, "blog")
	dir := makeFolder(t, "drafts", "")

	err := runPublish([]string{dir}, "blog", true, false, false)

	if err == nil {
		t.Fatal("expected an error when --name points an unlinked folder at an existing site")
	}
	if f.syncedTo("id-blog") {
		t.Fatal("existing site was synced without explicit opt-in")
	}
}

func TestPublish_UnlinkedFolder_NewSite_Yes_CreatesSite(t *testing.T) {
	f := setupFakeAPI(t, true)
	dir := makeFolder(t, "fresh", "")

	if err := runPublish([]string{dir}, "", true, false, false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := f.createdNames(); len(got) != 1 || got[0] != "fresh" {
		t.Fatalf("expected site 'fresh' to be created, got %v", got)
	}
	if cfg := localconfig.Read(dir); cfg == nil || cfg.SiteName != "fresh" {
		t.Fatalf("expected folder to be linked to 'fresh', got %+v", cfg)
	}
}

func TestPublish_LinkedFolder_ExistingSite_Yes_Syncs(t *testing.T) {
	f := setupFakeAPI(t, true, "notes")
	dir := makeFolder(t, "whatever", "notes")

	if err := runPublish([]string{dir}, "", true, false, false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !f.syncedTo("id-notes") {
		t.Fatal("linked folder should sync to its site")
	}
}

// --- flowershow-ep6: failures must produce a non-nil error (non-zero exit) ---

func TestPublish_NotAuthenticated_ReturnsError(t *testing.T) {
	setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")

	if err := runPublish([]string{dir}, "", true, false, false); err == nil {
		t.Fatal("expected an error when not authenticated")
	}
}

func TestPublish_PathNotFound_ReturnsError(t *testing.T) {
	setupFakeAPI(t, true)

	if err := runPublish([]string{"/definitely/not/here/xyz"}, "", true, false, false); err == nil {
		t.Fatal("expected an error for a missing path")
	}
}

func TestPublish_LinkedSiteNotFound_Yes_ReturnsError(t *testing.T) {
	setupFakeAPI(t, true)
	dir := makeFolder(t, "notes", "renamed-away")

	if err := runPublish([]string{dir}, "", true, false, false); err == nil {
		t.Fatal("expected an error when the linked site cannot be found")
	}
}

func TestWhoami_NotAuthenticated_ReturnsError(t *testing.T) {
	setupFakeAPI(t, false)

	if err := runAuthStatus(); err == nil {
		t.Fatal("expected whoami to fail when not logged in")
	}
}

func TestWhoami_Authenticated_Succeeds(t *testing.T) {
	setupFakeAPI(t, true)

	if err := runAuthStatus(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestErrorMessagesAreNotLost(t *testing.T) {
	setupFakeAPI(t, false)
	err := runAuthStatus()
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "authenticated") {
		t.Fatalf("error should describe the failure, got %q", err.Error())
	}
}

// --- flowershow-gqc: explicit opt-in and interactive choices ---

func TestPublish_UnlinkedFolder_ExistingSite_OverwriteFlag_Syncs(t *testing.T) {
	f := setupFakeAPI(t, true, "notes")
	dir := makeFolder(t, "notes", "")

	if err := runPublish([]string{dir}, "", true, true, false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !f.syncedTo("id-notes") {
		t.Fatal("--overwrite should publish into the existing site")
	}
	if cfg := localconfig.Read(dir); cfg == nil || cfg.SiteName != "notes" {
		t.Fatalf("expected folder to be linked to 'notes', got %+v", cfg)
	}
}

func TestPublish_OverwriteFlag_NewSite_Creates(t *testing.T) {
	f := setupFakeAPI(t, true)
	dir := makeFolder(t, "fresh", "")

	if err := runPublish([]string{dir}, "", true, true, false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := f.createdNames(); len(got) != 1 || got[0] != "fresh" {
		t.Fatalf("expected site 'fresh' to be created, got %v", got)
	}
}

func TestPublish_Interactive_ExistingSite_ConfirmOverwrite_Syncs(t *testing.T) {
	f := setupFakeAPI(t, true, "notes")
	dir := makeFolder(t, "notes", "")
	ui.SetInput(strings.NewReader("y\n"))
	t.Cleanup(func() { ui.SetInput(nil) })

	if err := runPublish([]string{dir}, "", false, false, false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !f.syncedTo("id-notes") {
		t.Fatal("confirming overwrite should publish into the existing site")
	}
}

func TestPublish_Interactive_ExistingSite_ChooseNewName_CreatesNewSite(t *testing.T) {
	f := setupFakeAPI(t, true, "notes")
	dir := makeFolder(t, "notes", "")
	ui.SetInput(strings.NewReader("n\nnotes-2\n"))
	t.Cleanup(func() { ui.SetInput(nil) })

	if err := runPublish([]string{dir}, "", false, false, false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if f.syncedTo("id-notes") {
		t.Fatal("existing site must not be touched when a new name is chosen")
	}
	if got := f.createdNames(); len(got) != 1 || got[0] != "notes-2" {
		t.Fatalf("expected site 'notes-2' to be created, got %v", got)
	}
	if cfg := localconfig.Read(dir); cfg == nil || cfg.SiteName != "notes-2" {
		t.Fatalf("expected folder to be linked to 'notes-2', got %+v", cfg)
	}
}

func TestPublish_Interactive_NewNameAlsoExists_AsksAgain(t *testing.T) {
	f := setupFakeAPI(t, true, "notes", "blog")
	dir := makeFolder(t, "notes", "")
	ui.SetInput(strings.NewReader("n\nblog\nn\nnotes-3\n"))
	t.Cleanup(func() { ui.SetInput(nil) })

	if err := runPublish([]string{dir}, "", false, false, false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if f.syncedTo("id-notes") || f.syncedTo("id-blog") {
		t.Fatal("no existing site should be touched")
	}
	if got := f.createdNames(); len(got) != 1 || got[0] != "notes-3" {
		t.Fatalf("expected site 'notes-3' to be created, got %v", got)
	}
}

func TestPublish_Interactive_ExistingSite_NoInput_Cancels(t *testing.T) {
	f := setupFakeAPI(t, true, "notes")
	dir := makeFolder(t, "notes", "")
	ui.SetInput(strings.NewReader(""))
	t.Cleanup(func() { ui.SetInput(nil) })

	if err := runPublish([]string{dir}, "", false, false, false); err == nil {
		t.Fatal("expected a non-nil error when the user cancels")
	}
	if f.syncedTo("id-notes") {
		t.Fatal("existing site must not be touched on cancel/EOF")
	}
	if len(f.createdNames()) != 0 {
		t.Fatal("no site should be created on cancel")
	}
}

func TestPublish_Interactive_RenameAtNewSitePromptToExistingSite_Warns(t *testing.T) {
	f := setupFakeAPI(t, true, "blog")
	dir := makeFolder(t, "fresh", "")
	// Rename "fresh" -> "blog" (exists), decline overwrite, then cancel.
	ui.SetInput(strings.NewReader("blog\nn\n\n"))
	t.Cleanup(func() { ui.SetInput(nil) })

	if err := runPublish([]string{dir}, "", false, false, false); err == nil {
		t.Fatal("expected a non-nil error when the user cancels")
	}
	if f.syncedTo("id-blog") {
		t.Fatal("existing site must not be synced without confirmation")
	}
}

func TestShellQuoteAll(t *testing.T) {
	got := shellQuoteAll([]string{"./notes", "my notes/a.md", "it's.md"})
	want := `./notes 'my notes/a.md' 'it'\''s.md'`
	if got != want {
		t.Fatalf("shellQuoteAll = %s, want %s", got, want)
	}
}

// --- flowershow-z4f: anonymous publishing (--anon) ---

// readRawConfig returns the raw .flowershow contents in dir ("" if absent).
func readRawConfig(t *testing.T, dir string) string {
	t.Helper()
	b, err := os.ReadFile(filepath.Join(dir, localconfig.FileName))
	if err != nil {
		if os.IsNotExist(err) {
			return ""
		}
		t.Fatal(err)
	}
	return string(b)
}

// makeAnonFolder creates a folder linked to an anonymous site via .flowershow.
func makeAnonFolder(t *testing.T, name, siteID, claimToken string) string {
	t.Helper()
	dir := makeFolder(t, name, "")
	cfg := &localconfig.Config{
		Anon:       true,
		SiteID:     siteID,
		ClaimToken: claimToken,
		LiveURL:    anonLiveURL,
		ClaimURL:   anonClaimURL,
		ExpiresAt:  anonExpiresAt,
	}
	if err := localconfig.Write(dir, cfg); err != nil {
		t.Fatal(err)
	}
	return dir
}

func TestPublishNotLoggedInWithoutAnonFails(t *testing.T) {
	f := setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")

	_, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, false) })

	if err == nil {
		t.Fatal("expected an error when not logged in and --anon not given")
	}
	if !strings.Contains(err.Error(), "fl login") || !strings.Contains(err.Error(), "--anon") {
		t.Fatalf("message should suggest both `fl login` and `--anon`, got %q", err.Error())
	}
	if f.anonCreateCount() != 0 || len(f.createdNames()) != 0 || len(f.syncIDs()) != 0 {
		t.Fatal("nothing should be created or synced without login or --anon")
	}
	if readRawConfig(t, dir) != "" {
		t.Fatal("no .flowershow should be written")
	}
}

func TestPublishAnonFolder(t *testing.T) {
	f := setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")

	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })

	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if f.anonCreateCount() != 1 {
		t.Fatalf("expected one anon create, got %d", f.anonCreateCount())
	}
	if f.anonCreateAuth[0] != "" {
		t.Fatalf("anon create must be unauthenticated, got Authorization %q", f.anonCreateAuth[0])
	}
	if ids := f.syncIDs(); len(ids) != 1 || ids[0] != anonSiteID {
		t.Fatalf("expected a sync to %s, got %v", anonSiteID, ids)
	}
	if f.syncAuth[0] != "Bearer "+anonClaimToken {
		t.Fatalf("sync should use the claim token, got %q", f.syncAuth[0])
	}
	for _, want := range []string{anonLiveURL, anonClaimURL, "expires", "7 Oct 2026", "✓ Published (no account): " + anonLiveURL} {
		if !strings.Contains(out, want) {
			t.Fatalf("output should contain %q, got:\n%s", want, out)
		}
	}
	raw := readRawConfig(t, dir)
	for _, want := range []string{`"anon": true`, `"siteId": "` + anonSiteID + `"`, `"claimToken": "` + anonClaimToken + `"`, `"claimUrl"`, `"liveUrl"`} {
		if !strings.Contains(raw, want) {
			t.Fatalf(".flowershow should contain %s, got:\n%s", want, raw)
		}
	}
	if len(f.createdNames()) != 0 {
		t.Fatal("anon publish must not create an account site")
	}
}

func TestPublishAnonFolderRepublishUsesSameSite(t *testing.T) {
	f := setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")

	if _, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) }); err != nil {
		t.Fatalf("first publish: %v", err)
	}
	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })
	if err != nil {
		t.Fatalf("second publish: %v\n%s", err, out)
	}
	if f.anonCreateCount() != 1 {
		t.Fatalf("republish must not create a new anon site, got %d creates", f.anonCreateCount())
	}
	if ids := f.syncIDs(); len(ids) != 2 || ids[1] != anonSiteID {
		t.Fatalf("expected second sync to %s, got %v", anonSiteID, ids)
	}
	if f.syncAuth[1] != "Bearer "+anonClaimToken {
		t.Fatalf("republish should use the saved claim token, got %q", f.syncAuth[1])
	}
	if !strings.Contains(out, anonLiveURL) || !strings.Contains(out, anonClaimURL) {
		t.Fatalf("republish output should show live and claim URLs, got:\n%s", out)
	}
}

func TestPublishAnonSingleFile(t *testing.T) {
	f := setupFakeAPI(t, false)
	dir := t.TempDir()
	file := filepath.Join(dir, "report.html")
	if err := os.WriteFile(file, []byte("<h1>Hi</h1>"), 0644); err != nil {
		t.Fatal(err)
	}

	out, err := captureOutput(t, func() error { return runPublish([]string{file}, "", true, false, true) })

	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if f.anonCreateCount() != 1 {
		t.Fatalf("expected one anon create, got %d", f.anonCreateCount())
	}
	if readRawConfig(t, dir) != "" {
		t.Fatal("single-file anon publish must not write .flowershow")
	}
	if !strings.Contains(out, "Single files can't be updated without an account. Publish a folder, or run `fl login`.") {
		t.Fatalf("output should explain single files can't be updated, got:\n%s", out)
	}
	if !strings.Contains(out, anonClaimURL) {
		t.Fatalf("output should include the claim URL, got:\n%s", out)
	}
}

func TestPublishAnonWhileLoggedInDoesNotSendUserToken(t *testing.T) {
	f := setupFakeAPI(t, true)
	dir := makeFolder(t, "notes", "")

	if _, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) }); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if f.anonCreateAuth[0] != "" {
		t.Fatalf("anon create must not send the user's token, got %q", f.anonCreateAuth[0])
	}
	if f.syncAuth[0] != "Bearer "+anonClaimToken {
		t.Fatalf("anon sync must use the claim token, got %q", f.syncAuth[0])
	}
	if len(f.createdNames()) != 0 {
		t.Fatal("--anon must not create an account site")
	}
}

func TestPublishAnonExpiredOrClaimedSiteClearsConfig(t *testing.T) {
	for _, status := range []int{403, 410} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			f := setupFakeAPI(t, false)
			f.siteStatus["anon-gone"] = status
			f.claimTokens["fs_claim_gone"] = "anon-gone"
			dir := makeAnonFolder(t, "notes", "anon-gone", "fs_claim_gone")

			out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })

			if err == nil {
				t.Fatal("expected an error for an expired/claimed anonymous site")
			}
			if !strings.Contains(out, "This anonymous site has expired or been claimed. Run again without the saved config to create a new one, or log in.") {
				t.Fatalf("expected expired/claimed message, got:\n%s", out)
			}
			if f.anonCreateCount() != 0 {
				t.Fatal("must not silently create a new anonymous site")
			}
			if raw := readRawConfig(t, dir); raw != "" {
				t.Fatalf(".flowershow should be removed, got:\n%s", raw)
			}
		})
	}
}

func TestPublishAnonRateLimited(t *testing.T) {
	f := setupFakeAPI(t, false)
	f.anonRateLimited = true
	dir := makeFolder(t, "notes", "")

	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })

	if err == nil {
		t.Fatal("expected an error when rate-limited")
	}
	if !strings.Contains(out, "Too many anonymous sites from this network") {
		t.Fatalf("server message should be surfaced, got:\n%s", out)
	}
	if len(f.syncIDs()) != 0 || readRawConfig(t, dir) != "" {
		t.Fatal("nothing should be synced or written when rate-limited")
	}
}

func TestPublishLoggedInIgnoresAnonConfigAndShowsClaimLink(t *testing.T) {
	f := setupFakeAPI(t, true)
	dir := makeAnonFolder(t, "notes", anonSiteID, anonClaimToken)

	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, false) })

	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if got := f.createdNames(); len(got) != 1 || got[0] != "notes" {
		t.Fatalf("expected account site 'notes' to be created, got %v", got)
	}
	if f.syncedTo(anonSiteID) {
		t.Fatal("logged-in publish must not sync to the anonymous site")
	}
	if !strings.Contains(out, "without an account") || !strings.Contains(out, anonClaimURL) {
		t.Fatalf("output should note the earlier anonymous publish and its claim link, got:\n%s", out)
	}
	if cfg := localconfig.Read(dir); cfg == nil || cfg.SiteName != "notes" || cfg.Anon {
		t.Fatalf("expected folder to be linked to account site 'notes', got %+v", cfg)
	}
}

func TestPublishWithEnvToken(t *testing.T) {
	f := setupFakeAPI(t, false)
	t.Setenv("FLOWERSHOW_TOKEN", testToken)
	dir := makeFolder(t, "fresh", "")

	if _, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, false) }); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := f.createdNames(); len(got) != 1 || got[0] != "fresh" {
		t.Fatalf("expected site 'fresh' to be created with FLOWERSHOW_TOKEN, got %v", got)
	}
}

func TestSyncOnAnonFolderFails(t *testing.T) {
	f := setupFakeAPI(t, true)
	dir := makeAnonFolder(t, "notes", anonSiteID, anonClaimToken)

	_, err := captureOutput(t, func() error { return runSync(dir, "", false, false) })

	if err == nil {
		t.Fatal("expected fl sync to fail on an anonymously published folder")
	}
	if !strings.Contains(err.Error(), "fl --anon") {
		t.Fatalf("message should point to `fl --anon`, got %q", err.Error())
	}
	if len(f.syncIDs()) != 0 {
		t.Fatal("nothing should be synced")
	}
}

func TestWhoamiWithEnvToken(t *testing.T) {
	setupFakeAPI(t, false)
	t.Setenv("FLOWERSHOW_TOKEN", testToken)

	if err := runAuthStatus(); err != nil {
		t.Fatalf("whoami should work with FLOWERSHOW_TOKEN: %v", err)
	}
}

func TestLogoutWithEnvTokenExplains(t *testing.T) {
	setupFakeAPI(t, false)
	t.Setenv("FLOWERSHOW_TOKEN", testToken)

	out, err := captureOutput(t, runAuthLogout)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(out, "FLOWERSHOW_TOKEN") {
		t.Fatalf("logout should explain the token comes from FLOWERSHOW_TOKEN, got:\n%s", out)
	}
}
