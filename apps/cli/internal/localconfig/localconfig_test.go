package localconfig

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/flowershow/publish/internal/claims"
)

func isolate(t *testing.T) {
	t.Helper()
	home := t.TempDir()
	t.Setenv("HOME", home)
	t.Setenv("XDG_CONFIG_HOME", filepath.Join(home, ".config"))
}

func TestWriteNeverStoresSecrets(t *testing.T) {
	isolate(t)
	dir := t.TempDir()
	cfg := &Config{Anon: true, SiteID: "s1", ClaimToken: "tok", ClaimURL: "https://x/claim#token=tok", LiveURL: "https://s1.example"}
	if err := Write(dir, cfg); err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(filepath.Join(dir, FileName))
	if strings.Contains(string(b), "tok") {
		t.Fatalf(".flowershow contains a secret:\n%s", b)
	}
	if cfg.ClaimToken != "tok" {
		t.Fatal("Write must not modify the caller's config")
	}
}

func TestWriteAnonAndLoad(t *testing.T) {
	isolate(t)
	dir := t.TempDir()
	if err := WriteAnon(dir, &Config{Anon: true, SiteID: "s1", ClaimToken: "tok", ClaimURL: "u#token=tok"}); err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(filepath.Join(dir, FileName))
	if strings.Contains(string(b), "tok") {
		t.Fatalf(".flowershow contains a secret:\n%s", b)
	}
	cfg, res := Load(dir)
	if res.Migrated || res.SecretInFile {
		t.Fatalf("unexpected load result %+v", res)
	}
	if cfg.ClaimToken != "tok" || cfg.ClaimURL != "u#token=tok" {
		t.Fatalf("Load should fill in the claim, got %+v", cfg)
	}
	p, _ := claims.Path()
	fi, err := os.Stat(p)
	if err != nil || fi.Mode().Perm() != 0600 {
		t.Fatalf("claims file should be 0600, got %v (%v)", fi, err)
	}
}

func TestGitStateOutsideRepo(t *testing.T) {
	if st := Git(t.TempDir()); st.InRepo {
		t.Fatalf("temp dir should not be a git repo, got %+v", st)
	}
}
