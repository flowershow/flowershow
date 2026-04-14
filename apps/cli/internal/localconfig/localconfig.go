package localconfig

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const FileName = ".flowershow"

type Config struct {
	SiteName string `json:"siteName"`
}

// Read reads the .flowershow config from dirPath.
// Returns nil if the file doesn't exist or is invalid.
func Read(dirPath string) *Config {
	data, err := os.ReadFile(filepath.Join(dirPath, FileName))
	if err != nil {
		return nil
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil || cfg.SiteName == "" {
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
