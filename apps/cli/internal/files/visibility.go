package files

import "strings"

// IsPathVisible mirrors the GitHub-sync workflow's isPathVisible logic
// (apps/cloudflare-worker/src/github-sync-workflow.js) so `fl publish`
// respects the same contentInclude/contentExclude rules as the GitHub-sync
// build for the same config.json.
func IsPathVisible(path string, includes, excludes []string) bool {
	normalized := normalizeURLPath(path)
	if normalized == "/config.json" || normalized == "/custom.css" {
		return true
	}
	if isPathIncluded(path, excludes) {
		return false
	}
	if isPathIncluded(path, includes) {
		return true
	}
	// Mirrors JS `return !includes[0]`: falls back to visible unless the
	// first entry is a non-empty string. An empty-string first entry (an
	// edge case a hand-edited config.json could produce) must default to
	// visible, matching the GitHub-sync build exactly.
	return len(includes) == 0 || includes[0] == ""
}

func normalizeURLPath(p string) string {
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	return strings.TrimSuffix(p, "/")
}

func isPathIncluded(path string, collection []string) bool {
	p := normalizeURLPath(path)
	for _, item := range collection {
		item = normalizeURLPath(item)
		if item == p || strings.HasPrefix(p, item+"/") {
			return true
		}
	}
	return false
}

// FilterVisible returns the subset of files visible under the given
// contentInclude/contentExclude rules, preserving order.
func FilterVisible(fileList []FileInfo, includes, excludes []string) []FileInfo {
	if len(includes) == 0 && len(excludes) == 0 {
		return fileList
	}
	out := make([]FileInfo, 0, len(fileList))
	for _, f := range fileList {
		if IsPathVisible(f.Path, includes, excludes) {
			out = append(out, f)
		}
	}
	return out
}
