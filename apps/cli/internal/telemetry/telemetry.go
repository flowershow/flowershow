package telemetry

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/posthog/posthog-go"
	"github.com/flowershow/publish/internal/config"
)

type cliConfig struct {
	DistinctID          string `json:"distinctId,omitempty"`
	TelemetryNoticeShown bool  `json:"telemetryNoticeShown,omitempty"`
}

func configDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".flowershow")
}

func configFile() string {
	return filepath.Join(configDir(), "config.json")
}

func readConfig() cliConfig {
	b, err := os.ReadFile(configFile())
	if err != nil {
		return cliConfig{}
	}
	var cfg cliConfig
	json.Unmarshal(b, &cfg)
	return cfg
}

func writeConfig(cfg cliConfig) {
	dir := configDir()
	os.MkdirAll(dir, 0700)
	b, _ := json.MarshalIndent(cfg, "", "  ")
	os.WriteFile(configFile(), b, 0600)
}

func getOrCreateDistinctID() string {
	cfg := readConfig()
	if cfg.DistinctID != "" {
		return cfg.DistinctID
	}
	id := uuid.NewString()
	cfg.DistinctID = id
	writeConfig(cfg)
	return id
}

func showNoticeIfNeeded() {
	cfg := readConfig()
	if cfg.TelemetryNoticeShown {
		return
	}
	fmt.Println("\nTelemetry Notice: Flowershow CLI collects anonymous usage data to improve the product.")
	fmt.Println("To opt out, set the FLOWERSHOW_TELEMETRY_DISABLED=1 environment variable.\n")
	cfg.TelemetryNoticeShown = true
	writeConfig(cfg)
}

// IsEnabled reports whether telemetry is enabled.
func IsEnabled() bool {
	return os.Getenv("FLOWERSHOW_TELEMETRY_DISABLED") == ""
}

var client posthog.Client

func getClient() posthog.Client {
	if !IsEnabled() {
		return nil
	}
	if client == nil {
		var err error
		client, err = posthog.NewWithConfig(config.PostHogAPIKey(), posthog.Config{
			Endpoint: config.PostHogHost(),
		})
		if err != nil {
			return nil
		}
		showNoticeIfNeeded()
	}
	return client
}

// Capture sends a telemetry event.
func Capture(event string, properties map[string]interface{}) {
	c := getClient()
	if c == nil {
		return
	}
	distinctID := getOrCreateDistinctID()
	props := posthog.NewProperties()
	for k, v := range properties {
		props.Set(k, v)
	}
	c.Enqueue(posthog.Capture{
		DistinctId: distinctID,
		Event:      event,
		Properties: props,
	})
}

// Flush flushes and shuts down the telemetry client.
func Flush() {
	if client != nil {
		client.Close()
		client = nil
	}
}
