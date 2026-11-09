package cmd

import (
	"strings"
	"testing"

	"github.com/flowershow/publish/internal/localconfig"
)

func TestPublish_OwnerSlashName_SyncsSharedSite(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	dir := makeFolder(t, "notes", "")
	if err := runPublish([]string{dir}, "bob/notes", true, true, false); err != nil {
		t.Fatal(err)
	}
	if !f.syncedTo("id-bob-notes") {
		t.Fatal("expected sync to the shared site")
	}
	if cfg := localconfig.Read(dir); cfg == nil || cfg.SiteID != "id-bob-notes" || cfg.SiteName != "bob/notes" {
		t.Fatalf("link: %+v", cfg)
	}
	if len(f.createdNames()) != 0 {
		t.Fatal("must not create a site")
	}
}

func TestPublish_OwnerSlashName_Unlinked_NeedsOverwrite(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	dir := makeFolder(t, "notes", "")
	if err := runPublish([]string{dir}, "bob/notes", true, false, false); err == nil {
		t.Fatal("expected an error without --overwrite")
	}
	if f.syncedTo("id-bob-notes") {
		t.Fatal("must not sync without --overwrite")
	}
}

func TestPublish_OwnerSlashName_NotShared_NeverCreates(t *testing.T) {
	f := setupFakeAPI(t, true)
	dir := makeFolder(t, "notes", "")
	if err := runPublish([]string{dir}, "bob/notes", true, true, false); err == nil {
		t.Fatal("expected an error")
	}
	if len(f.createdNames()) != 0 {
		t.Fatal("must not create a site")
	}
}

func TestPublish_OwnerSlashName_PublicFieldsOnly_NeverSyncsOrCreates(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	f.publicOnly["bob/notes"] = true
	dir := makeFolder(t, "notes", "")
	if err := runPublish([]string{dir}, "bob/notes", true, true, false); err == nil {
		t.Fatal("expected an error")
	}
	if f.syncedTo("id-bob-notes") || len(f.createdNames()) != 0 {
		t.Fatal("must neither sync nor create")
	}
}

func TestPublish_OwnerSlashName_Lapsed_ReportsPremiumRequired(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	f.siteStatus["id-bob-notes"] = 403
	dir := makeFolder(t, "notes", "")
	err := runPublish([]string{dir}, "bob/notes", true, true, false)
	if err == nil || !strings.Contains(err.Error(), "Premium") {
		t.Fatalf("got %v", err)
	}
	if len(f.createdNames()) != 0 {
		t.Fatal("must not create a site")
	}
}

func TestPublish_OwnUsernameSlashName_IsOwnSite(t *testing.T) {
	f := setupFakeAPI(t, true, "blog")
	dir := makeFolder(t, "blog", "blog")
	if err := runPublish([]string{dir}, "alice/blog", true, false, false); err != nil {
		t.Fatal(err)
	}
	if !f.syncedTo("id-blog") {
		t.Fatal("expected sync to own site")
	}
}

func TestPublish_BareNameMatchingSharedSite_NeverSyncsShared(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	dir := makeFolder(t, "notes", "")
	_ = runPublish([]string{dir}, "notes", true, false, false)
	if f.syncedTo("id-bob-notes") {
		t.Fatal("bare name synced into a shared site")
	}
}

func TestPublish_LinkedBySiteID_SyncsAfterRename(t *testing.T) {
	f := setupFakeAPI(t, true, "renamed")
	dir := makeFolder(t, "x", "")
	_ = localconfig.Write(dir, &localconfig.Config{SiteName: "old-name", SiteID: "id-renamed"})
	if err := runPublish([]string{dir}, "", true, false, false); err != nil {
		t.Fatal(err)
	}
	if !f.syncedTo("id-renamed") {
		t.Fatal("expected sync by stored siteId")
	}
	if len(f.createdNames()) != 0 {
		t.Fatal("must not create a site")
	}
	if cfg := localconfig.Read(dir); cfg == nil || cfg.SiteName != "renamed" || cfg.SiteID != "id-renamed" {
		t.Fatalf("link not refreshed: %+v", cfg)
	}
}

func TestPublish_StoredSiteID_Gone_NeverCreates(t *testing.T) {
	f := setupFakeAPI(t, true)
	dir := makeFolder(t, "x", "")
	_ = localconfig.Write(dir, &localconfig.Config{SiteName: "old-name", SiteID: "id-missing"})
	if err := runPublish([]string{dir}, "", true, false, false); err == nil {
		t.Fatal("expected an error")
	}
	if len(f.createdNames()) != 0 {
		t.Fatal("must not create a site")
	}
}

func TestPublish_StoredSiteID_Forbidden_NeverCreates(t *testing.T) {
	f := setupFakeAPI(t, true, "mine")
	f.siteStatus["id-mine"] = 403
	dir := makeFolder(t, "x", "")
	_ = localconfig.Write(dir, &localconfig.Config{SiteName: "mine", SiteID: "id-mine"})
	if err := runPublish([]string{dir}, "", true, false, false); err == nil {
		t.Fatal("expected an error")
	}
	if len(f.createdNames()) != 0 || f.syncedTo("id-mine") {
		t.Fatal("must not create or sync")
	}
}

func TestPublish_NewLinkStoresSiteID(t *testing.T) {
	setupFakeAPI(t, true)
	dir := makeFolder(t, "fresh", "")
	if err := runPublish([]string{dir}, "", true, false, false); err != nil {
		t.Fatal(err)
	}
	if cfg := localconfig.Read(dir); cfg == nil || cfg.SiteID != "id-fresh" {
		t.Fatalf("link: %+v", cfg)
	}
}

func TestPublish_SharedSiteLapsed_ReportsPremiumRequired(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	f.siteStatus["id-bob-notes"] = 403
	dir := makeFolder(t, "x", "")
	_ = localconfig.Write(dir, &localconfig.Config{SiteName: "bob/notes", SiteID: "id-bob-notes"})
	err := runPublish([]string{dir}, "", true, false, false)
	if err == nil || !strings.Contains(err.Error(), "Premium") {
		t.Fatalf("got %v", err)
	}
	if len(f.createdNames()) != 0 {
		t.Fatal("must not create a site")
	}
}
