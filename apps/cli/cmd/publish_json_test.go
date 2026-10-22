package cmd

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/flowershow/publish/internal/auth"
	"github.com/flowershow/publish/internal/ui"
)

// runJSON runs `fl --json` and returns the decoded stdout result and
// everything else (stderr).
func runJSON(t *testing.T, args []string, anon bool) (publishResult, string, error) {
	t.Helper()
	var stdout bytes.Buffer
	stderr, err := captureOutput(t, func() error { return runPublishJSON(&stdout, args, "", false, anon) })
	var res publishResult
	if jerr := json.Unmarshal(stdout.Bytes(), &res); jerr != nil {
		t.Fatalf("stdout is not one JSON object (%v):\n%s\nstderr:\n%s", jerr, stdout.String(), stderr)
	}
	return res, stderr, err
}

func TestPublishJSONAnon(t *testing.T) {
	setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")

	res, stderr, err := runJSON(t, []string{dir}, true)

	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, stderr)
	}
	want := publishResult{OK: true, URL: anonLiveURL, SiteID: anonSiteID, SiteName: "quiet-otter", Anon: true, ClaimURL: anonClaimURL, ExpiresAt: anonExpiresAt}
	if res != want {
		t.Fatalf("got %+v, want %+v", res, want)
	}
	if !strings.Contains(stderr, "Published (no account)") {
		t.Fatalf("human-readable output should go to stderr, got:\n%s", stderr)
	}
}

func TestPublishJSONAccount(t *testing.T) {
	setupFakeAPI(t, true)
	dir := makeFolder(t, "notes", "")

	res, stderr, err := runJSON(t, []string{dir}, false)

	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, stderr)
	}
	if !res.OK || res.Anon || res.SiteID != "id-notes" || res.SiteName != "notes" || res.URL == "" || res.ClaimURL != "" {
		t.Fatalf("unexpected result %+v", res)
	}
}

func TestPublishJSONReportsClaim(t *testing.T) {
	setupFakeAPI(t, true)
	dir := makeAnonFolder(t, "notes", anonSiteID, anonClaimToken)

	res, stderr, err := runJSON(t, []string{dir}, false)

	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, stderr)
	}
	if !res.OK || !res.Claimed || res.SiteID != anonSiteID || res.Anon {
		t.Fatalf("expected the claimed site in the result, got %+v", res)
	}
}

func TestPublishJSONFailureKeepsClaimLink(t *testing.T) {
	f := setupFakeAPI(t, false)
	f.uploadFails = true
	dir := makeFolder(t, "notes", "")

	res, _, err := runJSON(t, []string{dir}, true)

	if err == nil {
		t.Fatal("expected an error")
	}
	if res.OK || res.Error == "" || res.ClaimURL != anonClaimURL || res.SiteID != anonSiteID {
		t.Fatalf("a failed publish should still report the site and claim link, got %+v", res)
	}
}

func TestPublishJSONNotLoggedIn(t *testing.T) {
	setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")

	res, _, err := runJSON(t, []string{dir}, false)

	if err == nil || res.OK || !strings.Contains(res.Error, "--anon") {
		t.Fatalf("expected a not-logged-in error mentioning --anon, got %+v (%v)", res, err)
	}
}

// L6: the claim link is printed as soon as the site exists, before upload.
func TestPublishAnonPrintsClaimLinkBeforeUpload(t *testing.T) {
	setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "")

	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, true) })

	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	claim, upload := strings.Index(out, anonClaimURL), strings.Index(out, "Uploaded")
	if claim < 0 || upload < 0 || claim > upload {
		t.Fatalf("claim link should be printed before the upload, got:\n%s", out)
	}
}

// P6: --anon in a folder linked to an account site warns before creating.
func TestPublishAnonInAccountLinkedFolderWarns(t *testing.T) {
	setupFakeAPI(t, false)
	dir := makeFolder(t, "notes", "my-notes")

	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, true, true) })

	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	warn, created := strings.Index(out, `linked to "my-notes" in your account`), strings.Index(out, anonClaimURL)
	if warn < 0 || created < 0 || warn > created {
		t.Fatalf("expected a warning before the site is created, got:\n%s", out)
	}
	if !strings.Contains(out, "--overwrite is ignored with --anon") {
		t.Fatalf("expected --overwrite to be reported as ignored, got:\n%s", out)
	}
}

// P5 / L1: a rejected login says what to do, including --anon, and names
// FLOWERSHOW_TOKEN when that is the token in use.
func TestAuthFailedMsg(t *testing.T) {
	rejected := fmt.Errorf("%w: 401 Unauthorized", auth.ErrUnauthorized)
	if msg := authFailedMsg(rejected, false); !strings.Contains(msg, "fl login") || !strings.Contains(msg, "--anon") {
		t.Fatalf("saved login: %q", msg)
	}
	if msg := authFailedMsg(rejected, true); !strings.Contains(msg, "FLOWERSHOW_TOKEN") || !strings.Contains(msg, "--anon") {
		t.Fatalf("env token: %q", msg)
	}
	if msg := authFailedMsg(errors.New("dial tcp: no route"), false); strings.Contains(msg, "expired") || !strings.Contains(msg, "connection") {
		t.Fatalf("network error: %q", msg)
	}
}

func TestPublishRejectedEnvTokenNamesIt(t *testing.T) {
	setupFakeAPI(t, false)
	t.Setenv("FLOWERSHOW_TOKEN", "  fs_pat_wrong\n")
	dir := makeFolder(t, "notes", "")
	defer ui.SetInput(nil)

	out, err := captureOutput(t, func() error { return runPublish([]string{dir}, "", true, false, false) })

	if err == nil || !strings.Contains(out, "FLOWERSHOW_TOKEN is set but Flowershow rejected it") {
		t.Fatalf("expected the env token to be named, got:\n%s", out)
	}
}
