// Package claims stores the claim tokens of anonymous sites (published with
// `fl --anon`) in the user's config directory, keyed by site ID. A claim
// token lets anyone holding it update or claim the site, so it is kept out
// of the project folder (where .flowershow is often committed to git) and in
// a file only the user can read (flowershow-wkc).
package claims

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

// FileName is the claims file inside Dir.
const FileName = "claims.json"

// Claim is the secret part of an anonymous site's link. The claim URL embeds
// the token, so it is secret too.
type Claim struct {
	ClaimToken string `json:"claimToken"`
	ClaimURL   string `json:"claimUrl,omitempty"`
}

// Dir returns the directory holding the claims file:
// os.UserConfigDir()/flowershow (e.g. ~/.config/flowershow on Linux,
// ~/Library/Application Support/flowershow on macOS).
func Dir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "flowershow"), nil
}

// Path returns the full path of the claims file.
func Path() (string, error) {
	dir, err := Dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, FileName), nil
}

func load() (map[string]Claim, error) {
	p, err := Path()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(p)
	if errors.Is(err, os.ErrNotExist) {
		return map[string]Claim{}, nil
	}
	if err != nil {
		return nil, err
	}
	m := map[string]Claim{}
	if len(data) > 0 {
		if err := json.Unmarshal(data, &m); err != nil {
			return nil, err
		}
	}
	return m, nil
}

func store(m map[string]Claim) error {
	dir, err := Dir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	_ = os.Chmod(dir, 0700)
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}
	// Write a private temp file and rename it into place, so the tokens are
	// never readable by others, even briefly, and a crash can't truncate the
	// file.
	tmp, err := os.CreateTemp(dir, ".claims-*.json")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if err := tmp.Chmod(0600); err != nil {
		tmp.Close()
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), filepath.Join(dir, FileName))
}

// Get returns the saved claim for siteID, or nil if there is none.
func Get(siteID string) *Claim {
	if siteID == "" {
		return nil
	}
	m, err := load()
	if err != nil {
		return nil
	}
	c, ok := m[siteID]
	if !ok || (c.ClaimToken == "" && c.ClaimURL == "") {
		return nil
	}
	return &c
}

// Save stores the claim for siteID, replacing any earlier one.
func Save(siteID string, c Claim) error {
	if siteID == "" {
		return errors.New("claims: empty site ID")
	}
	m, err := load()
	if err != nil {
		return err
	}
	m[siteID] = c
	return store(m)
}

// Delete removes the claim for siteID, if any.
func Delete(siteID string) error {
	if siteID == "" {
		return nil
	}
	m, err := load()
	if err != nil {
		return err
	}
	if _, ok := m[siteID]; !ok {
		return nil
	}
	delete(m, siteID)
	return store(m)
}
