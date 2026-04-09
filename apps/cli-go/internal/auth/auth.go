package auth

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type TokenData struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	SavedAt  string `json:"savedAt"`
}

type UserInfo struct {
	Username string `json:"username,omitempty"`
	Email    string `json:"email,omitempty"`
	ID       string `json:"id,omitempty"`
}

func configDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".flowershow")
}

func tokenFile() string {
	return filepath.Join(configDir(), "token.json")
}

func SaveToken(token, username string) error {
	dir := configDir()
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	data := TokenData{
		Token:    token,
		Username: username,
		SavedAt:  time.Now().UTC().Format(time.RFC3339),
	}
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(tokenFile(), b, 0600)
}

func GetToken() (*TokenData, error) {
	b, err := os.ReadFile(tokenFile())
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, nil
		}
		return nil, err
	}
	var data TokenData
	if err := json.Unmarshal(b, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func RemoveToken() error {
	err := os.Remove(tokenFile())
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}

type DeviceTokenResponse struct {
	AccessToken      string `json:"access_token,omitempty"`
	Error            string `json:"error,omitempty"`
	ErrorDescription string `json:"error_description,omitempty"`
}

func PollForToken(apiURL, deviceCode string, interval, expiresIn int) (string, error) {
	deadline := time.Now().Add(time.Duration(expiresIn) * time.Second)
	currentInterval := time.Duration(interval)*500*time.Millisecond

	for time.Now().Before(deadline) {
		time.Sleep(currentInterval)

		body, _ := json.Marshal(map[string]string{
			"device_code": deviceCode,
			"grant_type":  "urn:ietf:params:oauth:grant-type:device_code",
		})

		resp, err := http.Post(apiURL+"/api/cli/device/token", "application/json", bytes.NewReader(body))
		if err != nil {
			continue
		}
		var data DeviceTokenResponse
		json.NewDecoder(resp.Body).Decode(&data)
		resp.Body.Close()

		if resp.StatusCode == 200 && data.AccessToken != "" {
			return data.AccessToken, nil
		}

		switch data.Error {
		case "authorization_pending":
			continue
		case "slow_down":
			currentInterval += 5 * time.Second
			continue
		case "expired_token":
			return "", errors.New("the device code has expired. Please try again")
		case "access_denied":
			return "", errors.New("authorization was denied")
		case "":
			// no error field, keep polling
		default:
			msg := data.ErrorDescription
			if msg == "" {
				msg = data.Error
			}
			return "", errors.New(msg)
		}
	}

	return "", errors.New("authorization timed out. Please try again")
}

func GetUserInfo(apiURL, token string) (*UserInfo, error) {
	req, err := http.NewRequest("GET", apiURL+"/api/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to get user info: %s", resp.Status)
	}

	var info UserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	return &info, nil
}

// DisplayName returns the best display name for a user.
func (u *UserInfo) DisplayName() string {
	if u.Username != "" {
		return u.Username
	}
	if u.Email != "" {
		return u.Email
	}
	return "user"
}
