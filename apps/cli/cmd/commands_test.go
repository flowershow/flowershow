package cmd

import "testing"

// flowershow-ep6: every command must return an error (non-zero exit) on failure.

func TestList_NotAuthenticated_ReturnsError(t *testing.T) {
	setupFakeAPI(t, false)
	if err := runList(); err == nil {
		t.Fatal("expected an error when not authenticated")
	}
}

func TestList_Authenticated_Succeeds(t *testing.T) {
	setupFakeAPI(t, true, "notes")
	if err := runList(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDelete_NotAuthenticated_ReturnsError(t *testing.T) {
	setupFakeAPI(t, false)
	if err := runDelete("notes", true); err == nil {
		t.Fatal("expected an error when not authenticated")
	}
}

func TestDelete_SiteNotFound_ReturnsError(t *testing.T) {
	setupFakeAPI(t, true)
	if err := runDelete("missing", true); err == nil {
		t.Fatal("expected an error when the site does not exist")
	}
}

func TestSettings_NotAuthenticated_ReturnsError(t *testing.T) {
	setupFakeAPI(t, false)
	if err := runSettings("notes"); err == nil {
		t.Fatal("expected an error when not authenticated")
	}
}

func TestSettings_SiteNotFound_ReturnsError(t *testing.T) {
	setupFakeAPI(t, true, "notes")
	if err := runSettings("missing"); err == nil {
		t.Fatal("expected an error when the site does not exist")
	}
}

func TestSync_NotAuthenticated_ReturnsError(t *testing.T) {
	setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")
	if err := runSync(dir, "", false, false); err == nil {
		t.Fatal("expected an error when not authenticated")
	}
}

func TestSync_SiteNotFound_ReturnsError(t *testing.T) {
	setupFakeAPI(t, true)
	dir := makeFolder(t, "notes", "")
	if err := runSync(dir, "", false, false); err == nil {
		t.Fatal("expected an error when the site does not exist")
	}
}
