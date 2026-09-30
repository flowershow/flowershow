package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/flowershow/publish/internal/auth"
	"github.com/flowershow/publish/internal/config"
	"github.com/flowershow/publish/internal/telemetry"
	"github.com/flowershow/publish/internal/ui"
	"github.com/spf13/cobra"
)

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate with Flowershow via browser",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		ui.Header("Authentication")
		return runAuthLogin()
	},
}

var logoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Remove stored authentication token",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		ui.Header("Logout")
		return runAuthLogout()
	},
}

var whoamiCmd = &cobra.Command{
	Use:   "whoami",
	Short: "Show the currently authenticated user",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		ui.Header("Auth Status")
		return runAuthStatus()
	},
}

func init() {
	rootCmd.AddCommand(loginCmd)
	rootCmd.AddCommand(logoutCmd)
	rootCmd.AddCommand(whoamiCmd)
}

type deviceAuthResponse struct {
	DeviceCode              string `json:"device_code"`
	UserCode                string `json:"user_code"`
	VerificationURI         string `json:"verification_uri"`
	VerificationURIComplete string `json:"verification_uri_complete,omitempty"`
	ExpiresIn               int    `json:"expires_in"`
	Interval                int    `json:"interval"`
}

func requestDeviceCode(apiURL string) (*deviceAuthResponse, error) {
	body, _ := json.Marshal(map[string]string{
		"client_name": "flowershow-cli",
	})
	resp, err := http.Post(apiURL+"/api/cli/device/authorize", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Flowershow API: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to initiate authentication: %s", resp.Status)
	}
	var data deviceAuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	return &data, nil
}

func runAuthLogin() error {
	startTime := time.Now()
	telemetry.Capture("command_started", map[string]interface{}{
		"command":     "auth_login",
		"cli_version": config.Version,
	})
	defer func() { telemetry.Flush() }()

	sp := ui.NewSpinner()
	sp.Start("Initiating authentication...")

	data, err := requestDeviceCode(config.APIURL())
	if err != nil {
		sp.Fail("Failed to initiate authentication")
		loginErr := fail(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "auth_login",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_type":    fmt.Sprintf("%T", err),
			"error_message": err.Error(),
		})
		return loginErr
	}
	sp.Stop()

	// Display instructions
	fmt.Printf("\n%s\n\n", ui.Bold("Please complete authentication in your browser:"))
	verifyURL := data.VerificationURIComplete
	if verifyURL == "" {
		verifyURL = data.VerificationURI
	}
	fmt.Printf("  %s\n\n", ui.Cyan(verifyURL))

	if data.VerificationURIComplete == "" {
		fmt.Printf("\n%s\n\n", ui.Bold("Enter this code when prompted:"))
		fmt.Printf("  %s\n\n", ui.Green(data.UserCode))
	}

	fmt.Printf("%s\n\n", ui.Gray(fmt.Sprintf("This code expires in %d minutes", data.ExpiresIn/60)))

	sp.Start("Waiting for authorization...")

	accessToken, err := auth.PollForToken(config.APIURL(), data.DeviceCode, data.Interval, data.ExpiresIn)
	if err != nil {
		sp.Fail("Authorization failed")
		loginErr := fail(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "auth_login",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_type":    fmt.Sprintf("%T", err),
			"error_message": err.Error(),
		})
		return loginErr
	}

	userInfo, err := auth.GetUserInfo(config.APIURL(), accessToken)
	if err != nil {
		sp.Fail("Failed to get user info")
		return fail(err.Error())
	}

	displayName := userInfo.DisplayName()
	if err := auth.SaveToken(accessToken, displayName); err != nil {
		sp.Fail("Failed to save token")
		return fail(err.Error())
	}

	sp.Succeed("Successfully authenticated!")

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "auth_login",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})

	fmt.Printf("%s\n", ui.Gray(fmt.Sprintf("Logged in as: %s", ui.Cyan(displayName))))
	fmt.Printf("%s\n\n", ui.Gray("You can now use the CLI to publish your sites."))
	return nil
}

func runAuthLogout() error {
	startTime := time.Now()
	telemetry.Capture("command_started", map[string]interface{}{
		"command":     "auth_logout",
		"cli_version": config.Version,
	})
	defer func() { telemetry.Flush() }()

	tokenData, err := auth.GetToken()
	if err != nil {
		return fail(err.Error())
	}
	if tokenData == nil {
		fmt.Printf("\n%s\n\n", ui.Yellow("You are not currently logged in."))
		return nil
	}
	if auth.TokenFromEnv() {
		// Remove any saved login too, but the env token stays in effect.
		_ = auth.RemoveToken()
		fmt.Printf("\n%s\n", ui.Yellow("You're authenticated via the FLOWERSHOW_TOKEN environment variable, which `fl logout` can't remove."))
		fmt.Printf("%s\n\n", ui.Gray("Unset FLOWERSHOW_TOKEN to log out."))
		return nil
	}

	if err := auth.RemoveToken(); err != nil {
		logoutErr := fail(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "auth_logout",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_type":    fmt.Sprintf("%T", err),
			"error_message": err.Error(),
		})
		return logoutErr
	}

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "auth_logout",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})

	fmt.Printf("\n%s Successfully logged out\n\n", ui.Green("✓"))
	fmt.Printf("%s\n", ui.Gray("Your authentication token has been removed."))
	return nil
}

func runAuthStatus() error {
	startTime := time.Now()
	telemetry.Capture("command_started", map[string]interface{}{
		"command":     "auth_status",
		"cli_version": config.Version,
	})
	defer func() { telemetry.Flush() }()

	tokenData, err := auth.GetToken()
	if err != nil {
		return fail(err.Error())
	}
	if tokenData == nil {
		fmt.Printf("\n%s Not authenticated\n\n", ui.Yellow("✗"))
		fmt.Printf("%s\n", ui.Gray("Run `fl login` to authenticate."))
		return failSilently("not authenticated")
	}

	sp := ui.NewSpinner()
	sp.Start("Checking authentication status...")

	userInfo, err := auth.GetUserInfo(config.APIURL(), tokenData.Token)
	if err != nil {
		sp.Fail("Authentication token is invalid or expired")
		fmt.Printf("%s\n", ui.Gray("Run `fl login` to re-authenticate."))
		return failSilently("not authenticated: token is invalid or expired")
	}

	sp.Succeed("Authenticated")
	fmt.Printf("%s\n", ui.Gray(fmt.Sprintf("Logged in as: %s", ui.Cyan(userInfo.DisplayName()))))
	if auth.TokenFromEnv() {
		fmt.Printf("%s\n", ui.Gray("Using the token from FLOWERSHOW_TOKEN."))
	}

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "auth_status",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})
	return nil
}
