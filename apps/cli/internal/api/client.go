package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/fatih/color"
	"github.com/flowershow/publish/internal/auth"
	"github.com/flowershow/publish/internal/config"
)

// Site represents a Flowershow site.
type Site struct {
	ID          string  `json:"id"`
	ProjectName string  `json:"projectName"`
	URL         string  `json:"url"`
	UserID      string  `json:"userId"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   *string `json:"updatedAt,omitempty"`
	FileCount   *int    `json:"fileCount,omitempty"`
	TotalSize   *int64  `json:"totalSize,omitempty"`
	Plan        string  `json:"plan,omitempty"`
}

type CreateSiteResponse struct {
	Site Site `json:"site"`
}

type GetSitesResponse struct {
	Sites []Site `json:"sites"`
	Total int    `json:"total"`
}

type GetSiteResponse struct {
	Site Site `json:"site"`
}

type DeleteSiteResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	DeletedFiles int    `json:"deletedFiles"`
}

type FileMetadata struct {
	Path string `json:"path"`
	Size int64  `json:"size"`
	SHA  string `json:"sha"`
}

type UploadURL struct {
	Path        string `json:"path"`
	UploadURL   string `json:"uploadUrl"`
	BlobID      string `json:"blobId"`
	ContentType string `json:"contentType"`
}

type SyncFilesResponse struct {
	ToUpload  []UploadURL `json:"toUpload"`
	ToUpdate  []UploadURL `json:"toUpdate"`
	Deleted   []string    `json:"deleted"`
	Unchanged []string    `json:"unchanged"`
	Summary   struct {
		ToUpload  int `json:"toUpload"`
		ToUpdate  int `json:"toUpdate"`
		Deleted   int `json:"deleted"`
		Unchanged int `json:"unchanged"`
	} `json:"summary"`
	DryRun bool `json:"dryRun,omitempty"`
}

type BlobStatus struct {
	ID         string  `json:"id"`
	Path       string  `json:"path"`
	SyncStatus string  `json:"syncStatus"`
	SyncError  *string `json:"syncError"`
	Extension  *string `json:"extension"`
}

type SiteStatusResponse struct {
	SiteID string `json:"siteId"`
	Status string `json:"status"`
	Files  struct {
		Total   int `json:"total"`
		Pending int `json:"pending"`
		Success int `json:"success"`
		Failed  int `json:"failed"`
	} `json:"files"`
	Blobs []BlobStatus `json:"blobs"`
}

type outdatedClientError struct {
	Error          string `json:"error"`
	Message        string `json:"message"`
	CurrentVersion string `json:"currentVersion"`
	MinimumVersion string `json:"minimumVersion"`
}

func handleOutdatedClient(resp *http.Response) {
	if resp.StatusCode != 426 {
		return
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return
	}
	resp.Body = io.NopCloser(bytes.NewReader(body))

	var data outdatedClientError
	if json.Unmarshal(body, &data) != nil || data.Error != "client_outdated" {
		return
	}

	width := 56
	top := color.New(color.FgRed).Sprintf("╔%s╗", strings.Repeat("═", width))
	bottom := color.New(color.FgRed).Sprintf("╚%s╝", strings.Repeat("═", width))
	border := color.New(color.FgRed).Sprint("║")

	lines := []string{
		"",
		color.New(color.FgRed, color.Bold).Sprintf("  !  Your Flowershow CLI is outdated (v%s) ", data.CurrentVersion),
		"",
		fmt.Sprintf("  This version no longer works with the Flowershow API."),
		fmt.Sprintf("  Please upgrade to v%s or newer.", data.MinimumVersion),
		"",
		color.New(color.FgCyan).Sprint("  → go install github.com/flowershow/publish@latest"),
		"",
	}

	fmt.Println()
	fmt.Println(top)
	for _, line := range lines {
		stripped := stripANSI(line)
		padding := width - len(stripped)
		if padding < 0 {
			padding = 0
		}
		fmt.Printf("%s%s%s%s\n", border, line, strings.Repeat(" ", padding), border)
	}
	fmt.Println(bottom)
	fmt.Println()
	os.Exit(1)
}

// stripANSI removes ANSI escape codes from a string for length calculation.
func stripANSI(s string) string {
	result := strings.Builder{}
	inEscape := false
	for _, r := range s {
		if r == '\x1b' {
			inEscape = true
			continue
		}
		if inEscape {
			if r == 'm' {
				inEscape = false
			}
			continue
		}
		result.WriteRune(r)
	}
	return result.String()
}

// Request makes an authenticated API request.
func Request(method, endpoint string, body interface{}) (*http.Response, error) {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, config.APIURL()+endpoint, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Flowershow-CLI-Version", config.Version)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	tokenData, err := auth.GetToken()
	if err == nil && tokenData != nil && tokenData.Token != "" {
		req.Header.Set("Authorization", "Bearer "+tokenData.Token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}

	handleOutdatedClient(resp)

	return resp, nil
}

func apiError(resp *http.Response) error {
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	var errResp struct {
		Message string `json:"message"`
	}
	if json.Unmarshal(body, &errResp) == nil && errResp.Message != "" {
		return fmt.Errorf("%s", errResp.Message)
	}
	return fmt.Errorf("HTTP %s", resp.Status)
}

func CreateSite(projectName string, overwrite bool) (*CreateSiteResponse, error) {
	resp, err := Request("POST", "/api/sites", map[string]interface{}{
		"projectName": projectName,
		"overwrite":   overwrite,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create site: %w", err)
	}
	defer resp.Body.Close()
	if !isOK(resp) {
		return nil, fmt.Errorf("failed to create site: %w", apiError(resp))
	}
	var result CreateSiteResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func GetSites() (*GetSitesResponse, error) {
	resp, err := Request("GET", "/api/sites", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sites: %w", err)
	}
	defer resp.Body.Close()
	if !isOK(resp) {
		return nil, fmt.Errorf("failed to fetch sites: %w", apiError(resp))
	}
	var result GetSitesResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func GetSiteByName(username, siteName string) (*GetSiteResponse, error) {
	resp, err := Request("GET", fmt.Sprintf("/api/sites/%s/%s", username, siteName), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch site: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == 404 {
		return nil, nil
	}
	if !isOK(resp) {
		return nil, fmt.Errorf("failed to fetch site: %w", apiError(resp))
	}
	var result GetSiteResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func DeleteSite(siteID string) (*DeleteSiteResponse, error) {
	resp, err := Request("DELETE", fmt.Sprintf("/api/sites/id/%s", siteID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to delete site: %w", err)
	}
	defer resp.Body.Close()
	if !isOK(resp) {
		return nil, fmt.Errorf("failed to delete site: %w", apiError(resp))
	}
	var result DeleteSiteResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func SyncFiles(siteID string, files []FileMetadata, dryRun bool) (*SyncFilesResponse, error) {
	endpoint := fmt.Sprintf("/api/sites/id/%s/sync", siteID)
	if dryRun {
		endpoint += "?dryRun=true"
	}
	resp, err := Request("POST", endpoint, map[string]interface{}{
		"files": files,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to sync files: %w", err)
	}
	defer resp.Body.Close()
	if !isOK(resp) {
		return nil, fmt.Errorf("failed to sync files: %w", apiError(resp))
	}
	var result SyncFilesResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func UploadToR2(uploadURL string, content []byte, contentType string) error {
	req, err := http.NewRequest("PUT", uploadURL, bytes.NewReader(content))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", contentType)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}
	defer resp.Body.Close()
	if !isOK(resp) {
		return fmt.Errorf("failed to upload file: %s", resp.Status)
	}
	return nil
}

func GetSiteStatus(siteID string) (*SiteStatusResponse, error) {
	resp, err := Request("GET", fmt.Sprintf("/api/sites/id/%s/status", siteID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get site status: %w", err)
	}
	defer resp.Body.Close()
	if !isOK(resp) {
		return nil, fmt.Errorf("failed to get site status: %w", apiError(resp))
	}
	var result SiteStatusResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func isOK(resp *http.Response) bool {
	return resp.StatusCode >= 200 && resp.StatusCode < 300
}
