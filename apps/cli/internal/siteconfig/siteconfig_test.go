package siteconfig

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/flowershow/publish/internal/files"
)

func TestRead_ParsesContentExcludeAndInclude(t *testing.T) {
	dir := t.TempDir()
	body := `{"title": "fl exclude test", "contentExclude": ["/secret"], "contentInclude": ["/public"]}`
	if err := os.WriteFile(filepath.Join(dir, FileName), []byte(body), 0644); err != nil {
		t.Fatal(err)
	}
	cfg := Read(dir)
	if cfg == nil {
		t.Fatal("expected config to be parsed")
	}
	if len(cfg.ContentExclude) != 1 || cfg.ContentExclude[0] != "/secret" {
		t.Fatalf("unexpected ContentExclude: %v", cfg.ContentExclude)
	}
	if len(cfg.ContentInclude) != 1 || cfg.ContentInclude[0] != "/public" {
		t.Fatalf("unexpected ContentInclude: %v", cfg.ContentInclude)
	}
}

func TestRead_MissingFile(t *testing.T) {
	dir := t.TempDir()
	if cfg := Read(dir); cfg != nil {
		t.Fatalf("expected nil config for missing file, got %+v", cfg)
	}
}

func TestRead_InvalidJSON(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, FileName), []byte("{not json"), 0644); err != nil {
		t.Fatal(err)
	}
	if cfg := Read(dir); cfg != nil {
		t.Fatalf("expected nil config for invalid JSON, got %+v", cfg)
	}
}

func TestApplyVisibility_FiltersAndPreservesProjectName(t *testing.T) {
	dir := t.TempDir()
	body := `{"contentExclude": ["/secret"]}`
	if err := os.WriteFile(filepath.Join(dir, FileName), []byte(body), 0644); err != nil {
		t.Fatal(err)
	}
	discovered := []files.FileInfo{
		{Path: "secret/page.md", ProjectName: "myproject"},
		{Path: "public/page.md"},
	}
	out := ApplyVisibility(discovered, dir)
	if len(out) != 1 || out[0].Path != "public/page.md" {
		t.Fatalf("expected only public/page.md to survive, got %+v", out)
	}
	if out[0].ProjectName != "myproject" {
		t.Fatalf("expected ProjectName to be carried over to the new first element, got %q", out[0].ProjectName)
	}
}

func TestApplyVisibility_NoConfigReturnsUnchanged(t *testing.T) {
	dir := t.TempDir()
	discovered := []files.FileInfo{{Path: "index.md", ProjectName: "myproject"}}
	out := ApplyVisibility(discovered, dir)
	if len(out) != 1 || out[0].Path != "index.md" || out[0].ProjectName != "myproject" {
		t.Fatalf("expected discovered to pass through unchanged, got %+v", out)
	}
}
