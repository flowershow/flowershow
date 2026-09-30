package cmd

import (
	"strings"
	"testing"

	"github.com/flowershow/publish/internal/localconfig"
	"github.com/flowershow/publish/internal/ui"
)

// --- flowershow-gqc: unlinked paths must never sync into an existing site implicitly ---

func TestPublish_UnlinkedFolder_ExistingSite_Yes_RefusesToOverwrite(t *testing.T) {
	f := setupFakeAPI(t, true, "notes")
	dir := makeFolder(t, "notes", "")

	err := runPublish([]string{dir}, "", true, false)

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

	err := runPublish([]string{dir}, "blog", true, false)

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

	if err := runPublish([]string{dir}, "", true, false); err != nil {
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

	if err := runPublish([]string{dir}, "", true, false); err != nil {
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

	if err := runPublish([]string{dir}, "", true, false); err == nil {
		t.Fatal("expected an error when not authenticated")
	}
}

func TestPublish_PathNotFound_ReturnsError(t *testing.T) {
	setupFakeAPI(t, true)

	if err := runPublish([]string{"/definitely/not/here/xyz"}, "", true, false); err == nil {
		t.Fatal("expected an error for a missing path")
	}
}

func TestPublish_LinkedSiteNotFound_Yes_ReturnsError(t *testing.T) {
	setupFakeAPI(t, true)
	dir := makeFolder(t, "notes", "renamed-away")

	if err := runPublish([]string{dir}, "", true, false); err == nil {
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

	if err := runPublish([]string{dir}, "", true, true); err != nil {
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

	if err := runPublish([]string{dir}, "", true, true); err != nil {
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

	if err := runPublish([]string{dir}, "", false, false); err != nil {
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

	if err := runPublish([]string{dir}, "", false, false); err != nil {
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

	if err := runPublish([]string{dir}, "", false, false); err != nil {
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

	if err := runPublish([]string{dir}, "", false, false); err == nil {
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

	if err := runPublish([]string{dir}, "", false, false); err == nil {
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
