package siteconfig

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/flowershow/publish/internal/files"
)

const FileName = "config.json"

// Config holds the subset of config.json fields the CLI needs to replicate
// GitHub-sync's content visibility rules.
type Config struct {
	ContentInclude []string `json:"contentInclude"`
	ContentExclude []string `json:"contentExclude"`
}

// Read reads config.json from dirPath.
// Returns nil if the file doesn't exist or is invalid.
func Read(dirPath string) *Config {
	data, err := os.ReadFile(filepath.Join(dirPath, FileName))
	if err != nil {
		return nil
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil
	}
	return &cfg
}

// ApplyVisibility reads config.json from dirPath (if present) and filters
// discovered down to the files visible under its contentInclude/contentExclude
// rules, matching the GitHub-sync build's behavior for the same config.json.
// If dirPath has no valid config.json, discovered is returned unchanged.
func ApplyVisibility(discovered []files.FileInfo, dirPath string) []files.FileInfo {
	cfg := Read(dirPath)
	if cfg == nil {
		return discovered
	}
	var projectName string
	if len(discovered) > 0 {
		projectName = discovered[0].ProjectName
	}
	filtered := files.FilterVisible(discovered, cfg.ContentInclude, cfg.ContentExclude)
	if len(filtered) > 0 {
		filtered[0].ProjectName = projectName
	}
	return filtered
}
