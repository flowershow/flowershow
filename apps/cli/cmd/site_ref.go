package cmd

import "strings"

// parseSiteRef splits a site reference into owner and name. "bob/notes" is
// owner "bob", name "notes"; a bare "notes" has no owner. Site names cannot
// contain "/", so the first slash always separates the owner.
func parseSiteRef(ref string) (owner, name string) {
	if o, n, ok := strings.Cut(ref, "/"); ok {
		return o, n
	}
	return "", ref
}
