package updater

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const (
	cacheFileName    = "update-check.json"
	cacheMaxAge      = 24 * time.Hour
	githubReleaseURL = "https://api.github.com/repos/flowershow/flowershow/releases/latest"
	tagPrefix        = "cli/v"
	checkTimeout     = 5 * time.Second
	waitTimeout      = 500 * time.Millisecond
)

type cacheEntry struct {
	LatestVersion string    `json:"latestVersion"`
	CheckedAt     time.Time `json:"checkedAt"`
}

type githubRelease struct {
	TagName string `json:"tag_name"`
}

var resultCh chan string

// Start begins an async version check against GitHub releases.
func Start(currentVersion string) {
	if os.Getenv("FLOWERSHOW_NO_UPDATE_CHECK") != "" {
		return
	}
	resultCh = make(chan string, 1)
	go func() {
		latest := fetchLatestVersion()
		if latest != "" && isNewer(latest, currentVersion) {
			resultCh <- latest
		} else {
			resultCh <- ""
		}
	}()
}

// PrintIfAvailable waits briefly for the version check and prints a notice if a
// newer version is available. Safe to call even if Start was never called.
func PrintIfAvailable(currentVersion string) {
	if resultCh == nil {
		return
	}
	select {
	case latest := <-resultCh:
		if latest != "" {
			fmt.Fprintf(os.Stderr, "\n💡 A newer version of Flowershow CLI is available: %s → %s\n", currentVersion, latest)
			if runtime.GOOS == "windows" {
				fmt.Fprintf(os.Stderr, "   Upgrade: download the latest release from https://github.com/flowershow/flowershow/releases\n\n")
			} else {
				fmt.Fprintf(os.Stderr, "   Upgrade: curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | sh\n\n")
			}
		}
	case <-time.After(waitTimeout):
	}
}

func fetchLatestVersion() string {
	if cached := readCache(); cached != "" {
		return cached
	}

	client := &http.Client{Timeout: checkTimeout}
	req, err := http.NewRequest("GET", githubReleaseURL, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return ""
	}
	defer resp.Body.Close()

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return ""
	}

	version := strings.TrimPrefix(release.TagName, tagPrefix)
	if version == release.TagName {
		return ""
	}

	writeCache(version)
	return version
}

func cacheFilePath() (string, error) {
	dir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "flowershow", cacheFileName), nil
}

func readCache() string {
	path, err := cacheFilePath()
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	var entry cacheEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		return ""
	}
	if time.Since(entry.CheckedAt) > cacheMaxAge {
		return ""
	}
	return entry.LatestVersion
}

func writeCache(version string) {
	path, err := cacheFilePath()
	if err != nil {
		return
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return
	}
	entry := cacheEntry{LatestVersion: version, CheckedAt: time.Now()}
	data, err := json.Marshal(entry)
	if err != nil {
		return
	}
	os.WriteFile(path, data, 0644)
}

func isNewer(candidate, current string) bool {
	c := parseVersion(candidate)
	v := parseVersion(current)
	for i := range 3 {
		if c[i] > v[i] {
			return true
		}
		if c[i] < v[i] {
			return false
		}
	}
	return false
}

func parseVersion(v string) [3]int {
	parts := strings.SplitN(v, ".", 3)
	var result [3]int
	for i, p := range parts {
		if i >= 3 {
			break
		}
		n, _ := strconv.Atoi(p)
		result[i] = n
	}
	return result
}
