package localconfig

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const FileName = ".flowershow"

// Config is the .flowershow link file. A folder is linked either to a site in
// the user's account (SiteName) or to an anonymous site (Anon, SiteID,
// ClaimToken, ...), never both.
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

// Read reads the .flowershow config from dirPath.
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

// Write writes the config as .flowershow to dirPath.
func Write(dirPath string, cfg *Config) error {
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dirPath, FileName), data, 0644)
}

// Delete removes the .flowershow file from dirPath, ignoring errors.
func Delete(dirPath string) {
	os.Remove(filepath.Join(dirPath, FileName))
}
