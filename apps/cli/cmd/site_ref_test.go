package cmd

import "testing"

func TestParseSiteRef(t *testing.T) {
	for in, want := range map[string][2]string{"notes": {"", "notes"}, "bob/notes": {"bob", "notes"}, "bob/My Notes": {"bob", "My Notes"}} {
		o, n := parseSiteRef(in)
		if o != want[0] || n != want[1] {
			t.Fatalf("%q: got %q,%q", in, o, n)
		}
	}
}
