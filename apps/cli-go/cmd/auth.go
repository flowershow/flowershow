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

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Manage authentication",
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

var authLoginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate with Flowershow via browser",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		ui.Header("Authentication")
		return runAuthLogin()
	},
}

var authLogoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Remove stored authentication token",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		ui.Header("Logout")
		return runAuthLogout()
	},
}

var authStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Check authentication status",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		ui.Header("Auth Status")
		return runAuthStatus()
	},
}

func init() {
	authCmd.AddCommand(authLoginCmd)
	authCmd.AddCommand(authLogoutCmd)
	authCmd.AddCommand(authStatusCmd)
	rootCmd.AddCommand(authCmd)
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
		ui.PrintError(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "auth_login",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_message": err.Error(),
		})
		return nil
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
		ui.PrintError(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "auth_login",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_message": err.Error(),
		})
		return nil
	}

	userInfo, err := auth.GetUserInfo(config.APIURL(), accessToken)
	if err != nil {
		sp.Fail("Failed to get user info")
		ui.PrintError(err.Error())
		return nil
	}

	displayName := userInfo.DisplayName()
	if err := auth.SaveToken(accessToken, displayName); err != nil {
		sp.Fail("Failed to save token")
		ui.PrintError(err.Error())
		return nil
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
		ui.PrintError(err.Error())
		return nil
	}
	if tokenData == nil {
		fmt.Printf("\n%s\n\n", ui.Yellow("You are not currently logged in."))
		return nil
	}

	if err := auth.RemoveToken(); err != nil {
		ui.PrintError(err.Error())
		telemetry.Capture("command_failed", map[string]interface{}{
			"command":       "auth_logout",
			"cli_version":   config.Version,
			"duration_ms":   time.Since(startTime).Milliseconds(),
			"error_message": err.Error(),
		})
		return nil
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
		ui.PrintError(err.Error())
		return nil
	}
	if tokenData == nil {
		fmt.Printf("\n%s Not authenticated\n\n", ui.Yellow("✗"))
		fmt.Printf("%s\n", ui.Gray("Run `publish auth login` to authenticate."))
		return nil
	}

	sp := ui.NewSpinner()
	sp.Start("Checking authentication status...")

	userInfo, err := auth.GetUserInfo(config.APIURL(), tokenData.Token)
	if err != nil {
		sp.Fail("Authentication token is invalid or expired")
		fmt.Printf("%s\n", ui.Gray("Run `publish auth login` to re-authenticate."))
		return nil
	}

	sp.Succeed("Authenticated")
	fmt.Printf("%s\n", ui.Gray(fmt.Sprintf("Logged in as: %s", ui.Cyan(userInfo.DisplayName()))))

	telemetry.Capture("command_succeeded", map[string]interface{}{
		"command":     "auth_status",
		"cli_version": config.Version,
		"duration_ms": time.Since(startTime).Milliseconds(),
	})
	return nil
}
