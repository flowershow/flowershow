package localconfig

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/flowershow/publish/internal/claims"
)

const FileName = ".flowershow"

// Config is the .flowershow link file. A folder is linked either to a site in
// the user's account (SiteName) or to an anonymous site (Anon, SiteID, ...),
// never both.
//
// ClaimToken and ClaimURL (which embeds the token) are secrets: they are kept
// in the user's config dir (package claims), never written to .flowershow.
// They are still read from .flowershow files written by older versions, and
// Load moves them out (flowershow-wkc).
type Config struct {
	SiteName string `json:"siteName,omitempty"`

	// Anonymous site (published with `fl --anon`).
	Anon       bool   `json:"anon,omitempty"`
	SiteID     string `json:"siteId,omitempty"`
	ClaimToken string `json:"claimToken,omitempty"`
	ExpiresAt  string `json:"expiresAt,omitempty"`
	LiveURL    string `json:"liveUrl,omitempty"`
	ClaimURL   string `json:"claimUrl,omitempty"`
}

// IsAnon reports whether the config links to an anonymous site.
func (c *Config) IsAnon() bool {
	return c != nil && c.Anon && c.SiteID != ""
}

// HasSecret reports whether the config carries a claim token or claim URL.
func (c *Config) HasSecret() bool {
	return c != nil && (c.ClaimToken != "" || c.ClaimURL != "")
}

// Read reads the .flowershow config from dirPath, as stored (an anonymous
// site's claim is not filled in: use Load for that).
// Returns nil if the file doesn't exist or is invalid. A valid config names
// an account site (SiteName) or an anonymous site (Anon and SiteID).
func Read(dirPath string) *Config {
	data, err := os.ReadFile(filepath.Join(dirPath, FileName))
	if err != nil {
		return nil
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil
	}
	if cfg.SiteName == "" && !cfg.IsAnon() {
		return nil
	}
	return &cfg
}

// Write writes the config as .flowershow to dirPath, without its secrets
// (use WriteAnon to keep an anonymous site's claim).
func Write(dirPath string, cfg *Config) error {
	public := *cfg
	public.ClaimToken, public.ClaimURL = "", ""
	data, err := json.MarshalIndent(&public, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dirPath, FileName), data, 0644)
}

// Delete removes the .flowershow file from dirPath, ignoring errors.
func Delete(dirPath string) {
	os.Remove(filepath.Join(dirPath, FileName))
}

// WriteAnon links dirPath to an anonymous site: the claim token and URL go to
// the user's claims store, and .flowershow gets only the non-secret fields.
// If the claim can't be saved, nothing is written.
func WriteAnon(dirPath string, cfg *Config) error {
	if cfg.HasSecret() {
		if err := claims.Save(cfg.SiteID, claims.Claim{ClaimToken: cfg.ClaimToken, ClaimURL: cfg.ClaimURL}); err != nil {
			return err
		}
	}
	return Write(dirPath, cfg)
}

// ForgetClaim removes the saved claim for siteID, ignoring errors.
func ForgetClaim(siteID string) {
	_ = claims.Delete(siteID)
}

// LoadResult says what Load did besides reading .flowershow.
type LoadResult struct {
	// Migrated is true if .flowershow held a claim token (written by an older
	// fl) that was moved to the user's claims store.
	Migrated bool
	// SecretInFile is true if .flowershow still holds a claim token because
	// moving it failed.
	SecretInFile bool
}

// Load reads .flowershow from dirPath like Read and, for an anonymous site,
// fills in its claim from the user's claims store. A claim token still in
// .flowershow (from an older fl) is moved to the store and removed from the
// file.
func Load(dirPath string) (*Config, LoadResult) {
	var res LoadResult
	cfg := Read(dirPath)
	if !cfg.IsAnon() {
		return cfg, res
	}
	if cfg.HasSecret() {
		if cfg.ClaimToken == "" {
			// Only a claim URL: keep a stored token if there is one.
			if c := claims.Get(cfg.SiteID); c != nil && c.ClaimToken != "" {
				cfg.ClaimToken = c.ClaimToken
			}
		}
		if err := WriteAnon(dirPath, cfg); err != nil {
			res.SecretInFile = true
		} else {
			res.Migrated = true
		}
		return cfg, res
	}
	if c := claims.Get(cfg.SiteID); c != nil {
		cfg.ClaimToken, cfg.ClaimURL = c.ClaimToken, c.ClaimURL
	}
	return cfg, res
}

// GitState describes how git sees a folder's .flowershow.
type GitState struct {
	InRepo  bool // the folder is inside a git work tree
	Tracked bool // .flowershow is committed or staged
	Ignored bool // .flowershow is git-ignored
}

// Git reports how git sees dirPath's .flowershow. Without git, or outside a
// repository, it returns the zero GitState.
func Git(dirPath string) GitState {
	var st GitState
	out, err := exec.Command("git", "-C", dirPath, "rev-parse", "--is-inside-work-tree").Output()
	if err != nil || strings.TrimSpace(string(out)) != "true" {
		return st
	}
	st.InRepo = true
	st.Tracked = exec.Command("git", "-C", dirPath, "ls-files", "--error-unmatch", "--", FileName).Run() == nil
	st.Ignored = exec.Command("git", "-C", dirPath, "check-ignore", "-q", "--", FileName).Run() == nil
	return st
}
