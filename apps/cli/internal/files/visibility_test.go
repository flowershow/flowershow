package files

import "testing"

func TestIsPathVisible_NoFilters(t *testing.T) {
	if !IsPathVisible("secret/page.md", nil, nil) {
		t.Fatal("expected visible when no includes/excludes")
	}
}

func TestIsPathVisible_ExcludesDirectory(t *testing.T) {
	excludes := []string{"/secret"}
	if IsPathVisible("secret/page.md", nil, excludes) {
		t.Fatal("expected secret/page.md to be excluded by /secret")
	}
	if !IsPathVisible("public/page.md", nil, excludes) {
		t.Fatal("expected public/page.md to remain visible")
	}
}

func TestIsPathVisible_ExactExclude(t *testing.T) {
	excludes := []string{"/notes/private.md"}
	if IsPathVisible("notes/private.md", nil, excludes) {
		t.Fatal("expected exact-match exclude to hide the file")
	}
	if !IsPathVisible("notes/public.md", nil, excludes) {
		t.Fatal("sibling file should remain visible")
	}
}

func TestIsPathVisible_IncludesOnlyAllowsListed(t *testing.T) {
	includes := []string{"/public"}
	if !IsPathVisible("public/page.md", includes, nil) {
		t.Fatal("expected included path to be visible")
	}
	if IsPathVisible("secret/page.md", includes, nil) {
		t.Fatal("expected path not covered by includes to be hidden")
	}
}

func TestIsPathVisible_ExcludeTakesPrecedenceOverInclude(t *testing.T) {
	includes := []string{"/"}
	excludes := []string{"/secret"}
	if IsPathVisible("secret/page.md", includes, excludes) {
		t.Fatal("expected excludes to win over includes")
	}
}

func TestIsPathVisible_EmptyStringFirstIncludeDefaultsToVisible(t *testing.T) {
	// Mirrors the JS reference's `return !includes[0]`: a falsy first entry
	// (e.g. a stray empty string from a hand-edited config.json) must fall
	// back to "visible", not "hidden", for paths matched by neither list.
	includes := []string{"", "/public"}
	if !IsPathVisible("other/page.md", includes, nil) {
		t.Fatal("expected unmatched path to default to visible when includes[0] is empty")
	}
}

func TestIsPathVisible_ConfigJsonAlwaysVisible(t *testing.T) {
	includes := []string{"/public"}
	excludes := []string{"/"}
	if !IsPathVisible("config.json", includes, excludes) {
		t.Fatal("config.json must always be visible")
	}
	if !IsPathVisible("custom.css", includes, excludes) {
		t.Fatal("custom.css must always be visible")
	}
}

func TestFilterVisible(t *testing.T) {
	input := []FileInfo{
		{Path: "index.md"},
		{Path: "public/page.md"},
		{Path: "secret/page.md"},
	}
	out := FilterVisible(input, nil, []string{"/secret"})
	if len(out) != 2 {
		t.Fatalf("expected 2 visible files, got %d", len(out))
	}
	for _, f := range out {
		if f.Path == "secret/page.md" {
			t.Fatal("secret/page.md should have been filtered out")
		}
	}
}

func TestFilterVisible_PreservesOrderAndNoFilters(t *testing.T) {
	input := []FileInfo{
		{Path: "index.md"},
		{Path: "public/page.md"},
	}
	out := FilterVisible(input, nil, nil)
	if len(out) != 2 {
		t.Fatalf("expected all files to pass through, got %d", len(out))
	}
}
