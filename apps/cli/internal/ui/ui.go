package ui

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
	"github.com/flowershow/publish/internal/api"
)

var (
	red    = color.New(color.FgRed).SprintFunc()
	green  = color.New(color.FgGreen).SprintFunc()
	yellow = color.New(color.FgYellow).SprintFunc()
	cyan   = color.New(color.FgCyan).SprintFunc()
	gray   = color.New(color.FgHiBlack).SprintFunc()
	bold   = color.New(color.Bold).SprintFunc()
)

// Spinner wraps briandowns/spinner with ora-like API.
type Spinner struct {
	s *spinner.Spinner
}

// NewSpinner creates and returns a new Spinner.
func NewSpinner() *Spinner {
	s := spinner.New(spinner.CharSets[14], 80*time.Millisecond, spinner.WithWriter(os.Stderr))
	return &Spinner{s: s}
}

// Start starts the spinner with a message.
func (sp *Spinner) Start(msg string) {
	sp.s.Suffix = " " + msg
	sp.s.FinalMSG = ""
	sp.s.Start()
}

// Succeed stops the spinner and prints a success message.
func (sp *Spinner) Succeed(msg string) {
	sp.s.FinalMSG = green("✓") + " " + msg + "\n"
	sp.s.Stop()
}

// Fail stops the spinner and prints a failure message.
func (sp *Spinner) Fail(msg string) {
	sp.s.FinalMSG = red("✗") + " " + msg + "\n"
	sp.s.Stop()
}

// Stop stops the spinner without printing anything.
func (sp *Spinner) Stop() {
	sp.s.FinalMSG = ""
	sp.s.Stop()
}

// PrintProgress prints an in-place progress line using \r.
// Call PrintProgressDone when finished to move to the next line.
func PrintProgress(description string, done, total int) {
	fmt.Fprintf(os.Stderr, "\r%s %s... %d/%d files", cyan("⣾"), description, done, total)
}

// PrintProgressDone ends an in-place progress line.
func PrintProgressDone() {
	fmt.Fprintln(os.Stderr)
}

// PrintError prints a formatted error message.
func PrintError(msg string) {
	fmt.Fprintf(os.Stderr, "\n%s %s\n\n", red("✗ Error:"), msg)
}

// PrintWarning prints a formatted warning message.
func PrintWarning(msg string) {
	fmt.Fprintf(os.Stderr, "\n%s %s\n\n", yellow("⚠️  Warning:"), msg)
}

// PrintSuccess prints a site URL after successful publish.
func PrintPublishSuccess(url string) {
	fmt.Printf("\n%s\n\n", cyan("💐 Visit your site at: "+url))
}

// PromptSiteName shows the proposed site name and URL and lets the user change the name.
// Returns the confirmed site name (which may differ from the proposed one).
func PromptSiteName(proposed, siteURL string) (string, error) {
	fmt.Printf("  Site name : %s\n", bold(proposed))
	fmt.Printf("  URL       : %s\n\n", cyan(siteURL))
	fmt.Printf("%s ", yellow("Change name? (press Enter to confirm, or type a new name):"))

	reader := bufio.NewReader(os.Stdin)
	line, err := reader.ReadString('\n')
	if err != nil {
		// EOF or closed stdin — treat as confirmation
		fmt.Println()
		return proposed, nil
	}
	name := strings.TrimSpace(line)
	if name == "" {
		return proposed, nil
	}
	return name, nil
}

// Confirm prompts the user for a yes/no answer (default: no).
func Confirm(prompt string) (bool, error) {
	fmt.Printf("%s [y/N]: ", yellow(prompt))
	reader := bufio.NewReader(os.Stdin)
	line, err := reader.ReadString('\n')
	if err != nil {
		return false, err
	}
	line = strings.TrimSpace(strings.ToLower(line))
	return line == "y" || line == "yes", nil
}

// Header prints the command header.
func Header(subtitle string) {
	fmt.Printf("\n%s\n\n", bold("💐 Flowershow CLI - "+subtitle))
}

// FormatDate formats an ISO date string for display.
func FormatDate(dateStr string) string {
	t, err := time.Parse(time.RFC3339, dateStr)
	if err != nil {
		return dateStr
	}
	return t.Local().Format("2006-01-02 15:04:05")
}

// DashboardURL returns the dashboard URL for a site.
func DashboardURL(siteID string) string {
	return fmt.Sprintf("https://cloud.flowershow.app/site/%s/settings", siteID)
}

// SyncResult holds the outcome of WaitForSync.
type SyncResult struct {
	Success bool
	Timeout bool
	Errors  []api.BlobStatus
}

// WaitForSync polls for site processing completion and shows an inline status line.
func WaitForSync(siteID string, maxWaitSeconds int) SyncResult {
	deadline := time.Now().Add(time.Duration(maxWaitSeconds) * time.Second)
	started := false

	for time.Now().Before(deadline) {
		status, err := api.GetSiteStatus(siteID)
		if err != nil {
			time.Sleep(500 * time.Millisecond)
			continue
		}

		blobs := status.Blobs
		if len(blobs) == 0 {
			if started {
				fmt.Fprintln(os.Stderr)
			}
			return SyncResult{Success: true}
		}

		var pending, errored, succeeded []api.BlobStatus
		for _, b := range blobs {
			switch b.SyncStatus {
			case "UPLOADING", "PROCESSING":
				pending = append(pending, b)
			case "ERROR":
				errored = append(errored, b)
			case "SUCCESS":
				succeeded = append(succeeded, b)
			}
		}

		done := len(succeeded) + len(errored)
		total := len(blobs)
		fmt.Fprintf(os.Stderr, "\r%s Processing... %d/%d files", cyan("⣾"), done, total)
		started = true

		if len(pending) == 0 {
			fmt.Fprintln(os.Stderr)
			if len(errored) > 0 {
				fmt.Printf("\n%s %d file(s) had errors:\n", yellow("⚠️"), len(errored))
				for _, b := range errored {
					errMsg := "unknown error"
					if b.SyncError != nil {
						errMsg = *b.SyncError
					}
					fmt.Printf("  %s %s: %s\n", yellow("-"), b.Path, errMsg)
				}
				return SyncResult{Success: false, Errors: errored}
			}
			fmt.Printf("\n%s All files processed successfully\n", green("✓"))
			return SyncResult{Success: true}
		}

		time.Sleep(500 * time.Millisecond)
	}

	if started {
		fmt.Fprintln(os.Stderr)
	}

	// Timeout - get final status
	status, _ := api.GetSiteStatus(siteID)
	var pending []api.BlobStatus
	if status != nil {
		for _, b := range status.Blobs {
			if b.SyncStatus == "UPLOADING" || b.SyncStatus == "PROCESSING" {
				pending = append(pending, b)
			}
		}
	}

	fmt.Printf("\n%s Timeout: %d file(s) still processing\n", yellow("⚠️"), len(pending))
	for _, b := range pending {
		fmt.Printf("  %s %s\n", yellow("-"), b.Path)
	}

	return SyncResult{Success: false, Timeout: true}
}

// Cyan returns a cyan-colored string.
func Cyan(s string) string { return cyan(s) }

// Green returns a green-colored string.
func Green(s string) string { return green(s) }

// Gray returns a gray-colored string.
func Gray(s string) string { return gray(s) }

// Yellow returns a yellow-colored string.
func Yellow(s string) string { return yellow(s) }

// Bold returns a bold string.
func Bold(s string) string { return bold(s) }
