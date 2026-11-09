package cmd

import (
	"strings"
	"testing"
)

func TestList_ShowsSharedSitesAsOwnerSlashName(t *testing.T) {
	f := setupFakeAPI(t, true, "blog")
	f.share("bob", "notes")
	out, err := captureOutput(t, runList)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "bob/notes") || !strings.Contains(out, "Shared with you") {
		t.Fatalf("missing shared site:\n%s", out)
	}
}

func TestList_AlwaysAsksForSharedSites(t *testing.T) {
	f := setupFakeAPI(t, true, "blog")
	if err := runList(); err != nil {
		t.Fatal(err)
	}
	if len(f.listQueries) == 0 || f.listQueries[0] != "includeShared=true" {
		t.Fatalf("list queries: %v", f.listQueries)
	}
}

func TestResolveSite_BareNameIgnoresSharedSite(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	if _, err := resolveSite("notes"); err == nil {
		t.Fatal("bare name must not resolve to a shared site")
	}
	s, err := resolveSite("bob/notes")
	if err != nil || s.ID != "id-bob-notes" {
		t.Fatalf("got %+v, %v", s, err)
	}
}

func TestResolveSite_OnlySiteShortcutIgnoresSharedSites(t *testing.T) {
	f := setupFakeAPI(t, true, "blog")
	f.share("bob", "notes")
	s, err := resolveSite("")
	if err != nil || s.ProjectName != "blog" {
		t.Fatalf("got %+v, %v", s, err)
	}
}

func TestResolveSite_NoOwnedSitesDoesNotPickSharedSite(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	if s, err := resolveSite(""); err == nil {
		t.Fatalf("must not pick a shared site, got %+v", s)
	}
}

func TestDelete_NeverMatchesSharedSite(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	if err := runDelete("notes", true); err == nil {
		t.Fatal("bare name must not match a shared site")
	}
	out, err := captureOutput(t, func() error { return runDelete("bob/notes", true) })
	if err == nil || !strings.Contains(out+err.Error(), "owner") {
		t.Fatalf("expected an owner-only error, got %v\n%s", err, out)
	}
}
