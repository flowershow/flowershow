package auth

import "testing"

func TestGetTokenPrefersEnv(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("FLOWERSHOW_TOKEN", "fs_pat_env")
	td, err := GetToken()
	if err != nil || td == nil || td.Token != "fs_pat_env" {
		t.Fatalf("expected env token, got %+v, %v", td, err)
	}
}

func TestGetTokenPrefersEnvOverFile(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("FLOWERSHOW_TOKEN", "")
	if err := SaveToken("fs_pat_file", "alice"); err != nil {
		t.Fatal(err)
	}
	td, _ := GetToken()
	if td == nil || td.Token != "fs_pat_file" {
		t.Fatalf("expected file token without env, got %+v", td)
	}
	t.Setenv("FLOWERSHOW_TOKEN", "fs_pat_env")
	td, _ = GetToken()
	if td == nil || td.Token != "fs_pat_env" {
		t.Fatalf("expected env token to win over file, got %+v", td)
	}
}

func TestGetTokenTrimsEnv(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("FLOWERSHOW_TOKEN", "  fs_pat_env\n")
	td, _ := GetToken()
	if td == nil || td.Token != "fs_pat_env" {
		t.Fatalf("expected trimmed env token, got %+v", td)
	}
}

func TestBlankEnvTokenIsUnset(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("FLOWERSHOW_TOKEN", " \n\t")
	if TokenFromEnv() {
		t.Fatal("a whitespace-only FLOWERSHOW_TOKEN should count as unset")
	}
	if err := SaveToken("fs_pat_file", "alice"); err != nil {
		t.Fatal(err)
	}
	td, _ := GetToken()
	if td == nil || td.Token != "fs_pat_file" {
		t.Fatalf("expected the saved token, got %+v", td)
	}
}
