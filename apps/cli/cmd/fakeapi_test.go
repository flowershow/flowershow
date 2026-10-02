package cmd

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/flowershow/publish/internal/api"
	"github.com/flowershow/publish/internal/localconfig"
)

const testUser = "alice"
const testToken = "test-token"

// Values returned by the fake POST /api/sites/anon.
const (
	anonSiteID     = "anon-site-1"
	anonClaimToken = "fs_claim_test"
	anonLiveURL    = "https://quiet-otter-anon.flowershow.me"
	anonClaimURL   = "https://cloud.flowershow.app/claim?siteId=anon-site-1#token=fs_claim_test"
	anonExpiresAt  = "2026-10-07T12:00:00.000Z"
)

// fakeGoneServerMsg is the error message the fake returns for a forced
// siteStatus.
const fakeGoneServerMsg = "fake server: site unavailable"

// fakeAPI is an in-memory stand-in for the Flowershow API, so publish tests
// never talk to production. It records every mutating call.
type fakeAPI struct {
	mu        sync.Mutex
	sites     map[string]api.Site // by project name
	syncCalls []string            // site IDs that received a sync request
	created   []string            // project names created via POST /api/sites
	server    *httptest.Server

	anonCreates     int               // calls to POST /api/sites/anon
	anonCreateAuth  []string          // Authorization header of each anon create
	syncAuth        []string          // Authorization header of each sync request
	anonRateLimited bool              // POST /api/sites/anon returns 429
	uploadFails     bool              // PUT /upload/... returns 500
	siteStatus      map[string]int    // site ID -> forced HTTP status for sync/status (e.g. 410)
	claimTokens     map[string]string // claim token -> the one site ID it authorises
}

func (f *fakeAPI) anonCreateCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.anonCreates
}

func (f *fakeAPI) syncIDs() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.syncCalls...)
}

func (f *fakeAPI) syncedTo(siteID string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, id := range f.syncCalls {
		if id == siteID {
			return true
		}
	}
	return false
}

func (f *fakeAPI) createdNames() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]string(nil), f.created...)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (f *fakeAPI) handler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	authz := r.Header.Get("Authorization")
	authed := authz == "Bearer "+testToken
	// A claim token authorises sync/status for its one anonymous site only.
	if strings.HasPrefix(authz, "Bearer fs_claim_") {
		f.mu.Lock()
		id, ok := f.claimTokens[strings.TrimPrefix(authz, "Bearer ")]
		f.mu.Unlock()
		if ok && strings.HasPrefix(path, "/api/sites/id/"+id+"/") {
			authed = true
		}
	}
	if strings.HasPrefix(path, "/api/sites/id/") {
		rest := strings.TrimPrefix(path, "/api/sites/id/")
		id := strings.SplitN(rest, "/", 2)[0]
		f.mu.Lock()
		status, forced := f.siteStatus[id]
		f.mu.Unlock()
		if forced {
			writeJSON(w, status, map[string]string{"message": fakeGoneServerMsg})
			return
		}
	}

	switch {
	case strings.HasPrefix(path, "/upload/") && r.Method == "PUT":
		f.mu.Lock()
		failUpload := f.uploadFails
		f.mu.Unlock()
		if failUpload {
			w.WriteHeader(500)
			return
		}
		w.WriteHeader(200)
		return
	case path == "/api/sites/anon" && r.Method == "POST":
		f.mu.Lock()
		f.anonCreates++
		f.anonCreateAuth = append(f.anonCreateAuth, authz)
		limited := f.anonRateLimited
		f.mu.Unlock()
		if limited {
			writeJSON(w, 429, map[string]string{"error": "rate_limited", "message": "Too many anonymous sites from this network. Try again later, or run `fl login`."})
			return
		}
		writeJSON(w, 200, map[string]string{
			"siteId":      anonSiteID,
			"projectName": "quiet-otter",
			"liveUrl":     anonLiveURL,
			"claimToken":  anonClaimToken,
			"claimUrl":    anonClaimURL,
			"expiresAt":   anonExpiresAt,
		})
		return
	case !authed:
		writeJSON(w, 401, map[string]string{"message": "unauthorized"})
		return
	case path == "/api/user" && r.Method == "GET":
		writeJSON(w, 200, map[string]string{"username": testUser})
	case path == "/api/sites" && r.Method == "GET":
		f.mu.Lock()
		list := []api.Site{}
		for _, site := range f.sites {
			list = append(list, site)
		}
		f.mu.Unlock()
		writeJSON(w, 200, map[string]interface{}{"sites": list, "total": len(list)})
	case path == "/api/sites" && r.Method == "POST":
		var body struct {
			ProjectName string `json:"projectName"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		f.mu.Lock()
		site := api.Site{ID: "id-" + body.ProjectName, ProjectName: body.ProjectName, URL: "https://example.test/@" + testUser + "/" + body.ProjectName}
		f.sites[body.ProjectName] = site
		f.created = append(f.created, body.ProjectName)
		f.mu.Unlock()
		writeJSON(w, 200, map[string]interface{}{"site": site})
	case strings.HasPrefix(path, "/api/sites/"+testUser+"/") && r.Method == "GET":
		name := strings.TrimPrefix(path, "/api/sites/"+testUser+"/")
		f.mu.Lock()
		site, ok := f.sites[name]
		f.mu.Unlock()
		if !ok {
			writeJSON(w, 404, map[string]string{"message": "not found"})
			return
		}
		writeJSON(w, 200, map[string]interface{}{"site": site})
	case strings.HasPrefix(path, "/api/sites/id/") && !strings.Contains(strings.TrimPrefix(path, "/api/sites/id/"), "/") && r.Method == "GET":
		// Mirrors GET /api/sites/id/:id: 200 for the user's own site, 403 for
		// someone else's (an anonymous site is owned by the anonymous user),
		// 404 if it doesn't exist.
		id := strings.TrimPrefix(path, "/api/sites/id/")
		f.mu.Lock()
		var found *api.Site
		for _, site := range f.sites {
			if site.ID == id {
				site := site
				found = &site
			}
		}
		anonOwned := false
		for _, siteID := range f.claimTokens {
			if siteID == id {
				anonOwned = true
			}
		}
		f.mu.Unlock()
		switch {
		case found != nil:
			writeJSON(w, 200, map[string]interface{}{"site": map[string]interface{}{
				"id": found.ID, "projectName": found.ProjectName, "subdomain": found.ProjectName, "url": found.URL,
			}})
		case anonOwned:
			writeJSON(w, 403, map[string]string{"error": "forbidden", "message": "You do not have access to this site"})
		default:
			writeJSON(w, 404, map[string]string{"error": "not_found", "message": "Site not found"})
		}
	case strings.HasPrefix(path, "/api/sites/id/") && strings.HasSuffix(path, "/sync") && r.Method == "POST":
		id := strings.TrimSuffix(strings.TrimPrefix(path, "/api/sites/id/"), "/sync")
		var body struct {
			Files []api.FileMetadata `json:"files"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		f.mu.Lock()
		f.syncCalls = append(f.syncCalls, id)
		f.syncAuth = append(f.syncAuth, authz)
		f.mu.Unlock()
		var uploads []api.UploadURL
		for _, file := range body.Files {
			uploads = append(uploads, api.UploadURL{Path: file.Path, UploadURL: f.server.URL + "/upload/" + file.Path, ContentType: "text/markdown"})
		}
		resp := map[string]interface{}{
			"toUpload":  uploads,
			"toUpdate":  []api.UploadURL{},
			"deleted":   []string{"remote-only.md"},
			"unchanged": []string{},
			"summary":   map[string]int{"toUpload": len(uploads), "toUpdate": 0, "deleted": 1, "unchanged": 0},
		}
		writeJSON(w, 200, resp)
	case strings.HasPrefix(path, "/api/sites/id/") && strings.HasSuffix(path, "/status"):
		writeJSON(w, 200, map[string]interface{}{"siteId": "x", "status": "SUCCESS", "blobs": []interface{}{}})
	default:
		writeJSON(w, 404, map[string]string{"message": "no route " + r.Method + " " + path})
	}
}

// setupFakeAPI points the CLI at a fake API server and an isolated HOME.
// If loggedIn is true, a token file is written so the CLI is authenticated.
// existing lists project names that already exist on the server.
func setupFakeAPI(t *testing.T, loggedIn bool, existing ...string) *fakeAPI {
	t.Helper()
	f := &fakeAPI{
		sites:       map[string]api.Site{},
		siteStatus:  map[string]int{},
		claimTokens: map[string]string{anonClaimToken: anonSiteID},
	}
	for _, name := range existing {
		f.sites[name] = api.Site{ID: "id-" + name, ProjectName: name, URL: "https://example.test/@" + testUser + "/" + name}
	}
	f.server = httptest.NewServer(http.HandlerFunc(f.handler))
	t.Cleanup(f.server.Close)

	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("API_URL", f.server.URL)
	t.Setenv("FLOWERSHOW_TELEMETRY_DISABLED", "1")
	t.Setenv("FLOWERSHOW_NO_UPDATE_CHECK", "1")
	// Never let a developer's real env token leak into tests.
	t.Setenv("FLOWERSHOW_TOKEN", "")
	t.Cleanup(func() { api.SetTokenOverride("") })

	if loggedIn {
		dir := filepath.Join(home, ".flowershow")
		if err := os.MkdirAll(dir, 0700); err != nil {
			t.Fatal(err)
		}
		tok, _ := json.Marshal(map[string]string{"token": testToken, "username": testUser})
		if err := os.WriteFile(filepath.Join(dir, "token.json"), tok, 0600); err != nil {
			t.Fatal(err)
		}
	}
	return f
}

// makeFolder creates a content folder called name containing one markdown file.
// If linkedTo is non-empty a .flowershow link file pointing at that site is written.
func makeFolder(t *testing.T, name, linkedTo string) string {
	t.Helper()
	dir := filepath.Join(t.TempDir(), name)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "index.md"), []byte("# Hello\n"), 0644); err != nil {
		t.Fatal(err)
	}
	if linkedTo != "" {
		if err := localconfig.Write(dir, &localconfig.Config{SiteName: linkedTo}); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

// captureOutput runs fn with os.Stdout and os.Stderr redirected to a pipe and
// returns everything written to either, plus fn's error.
func captureOutput(t *testing.T, fn func() error) (string, error) {
	t.Helper()
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	origOut, origErr := os.Stdout, os.Stderr
	os.Stdout, os.Stderr = w, w
	done := make(chan string)
	go func() {
		b, _ := io.ReadAll(r)
		done <- string(b)
	}()
	runErr := fn()
	os.Stdout, os.Stderr = origOut, origErr
	w.Close()
	out := <-done
	r.Close()
	return out, runErr
}
