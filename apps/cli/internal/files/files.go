package files

import (
	"bufio"
	"crypto/sha1"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

var defaultIgnorePatterns = []string{
	".git/",
	".gitignore",
	".flowershow",
	"node_modules/",
	".DS_Store",
	"Thumbs.db",
	".env",
	".env.*",
	"*.log",
	".cache/",
	"dist/",
	"build/",
	".next/",
	".vercel/",
	".turbo/",
	"coverage/",
	".nyc_output/",
}

// FileInfo holds metadata and content for a discovered file.
type FileInfo struct {
	OriginalPath string
	Path         string // normalized relative path (forward slashes)
	Size         int64
	SHA          string
	Extension    string
	Content      []byte
	ProjectName  string // only set on first file
}

// ignoreList is a compiled set of gitignore-style patterns.
type ignoreList struct {
	patterns []pattern
}

type pattern struct {
	raw     string
	negate  bool
	dirOnly bool
	// segments after splitting on '/'
	parts []string
}

func compilePatterns(lines []string) *ignoreList {
	il := &ignoreList{}
	for _, line := range lines {
		line = strings.TrimRight(line, "\r")
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		negate := false
		if strings.HasPrefix(line, "!") {
			negate = true
			line = line[1:]
		}
		dirOnly := strings.HasSuffix(line, "/")
		if dirOnly {
			line = strings.TrimSuffix(line, "/")
		}
		parts := strings.Split(strings.Trim(line, "/"), "/")
		il.patterns = append(il.patterns, pattern{
			raw:     line,
			negate:  negate,
			dirOnly: dirOnly,
			parts:   parts,
		})
	}
	return il
}

func (il *ignoreList) ignores(relPath string, isDir bool) bool {
	matched := false
	for _, p := range il.patterns {
		if p.dirOnly && !isDir {
			continue
		}
		if matchPattern(p, relPath) {
			matched = !p.negate
		}
	}
	return matched
}

func matchPattern(p pattern, relPath string) bool {
	// Normalize to forward slashes
	relPath = strings.ReplaceAll(relPath, string(os.PathSeparator), "/")
	parts := strings.Split(relPath, "/")

	// Single-segment pattern: match against any path component or basename
	if len(p.parts) == 1 {
		seg := p.parts[0]
		// Check against every path component
		for _, part := range parts {
			if globMatch(seg, part) {
				return true
			}
		}
		return false
	}

	// Multi-segment pattern: try to match from any starting position
	patLen := len(p.parts)
	for start := 0; start <= len(parts)-patLen; start++ {
		match := true
		for i, seg := range p.parts {
			if !globMatch(seg, parts[start+i]) {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

// globMatch matches a single path segment against a glob pattern.
func globMatch(pattern, name string) bool {
	// Simple glob: only '*' wildcard supported within a segment
	if pattern == "*" {
		return true
	}
	if !strings.Contains(pattern, "*") {
		return pattern == name
	}
	// Use filepath.Match for glob within a segment
	matched, _ := filepath.Match(pattern, name)
	return matched
}

func loadIgnore(baseDir string) *ignoreList {
	patterns := make([]string, len(defaultIgnorePatterns))
	copy(patterns, defaultIgnorePatterns)

	gitignorePath := filepath.Join(baseDir, ".gitignore")
	if f, err := os.Open(gitignorePath); err == nil {
		defer f.Close()
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			patterns = append(patterns, scanner.Text())
		}
	}

	return compilePatterns(patterns)
}

func sha1Hex(content []byte) string {
	h := sha1.New()
	h.Write(content)
	return fmt.Sprintf("%x", h.Sum(nil))
}

func getExtension(path string) string {
	ext := filepath.Ext(path)
	if ext == "" {
		return ""
	}
	return strings.ToLower(ext[1:])
}

func normalizePath(path string) string {
	return strings.ReplaceAll(path, string(os.PathSeparator), "/")
}

func scanDirectory(dirPath, baseDir string, ig *ignoreList) ([]string, error) {
	var files []string

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if path == dirPath {
			return nil
		}

		relPath, err := filepath.Rel(baseDir, path)
		if err != nil {
			return err
		}

		if ig.ignores(relPath, info.IsDir()) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if !info.IsDir() {
			files = append(files, path)
		}
		return nil
	})

	return files, err
}

// DiscoverFiles discovers files from one or more paths (files or directories).
func DiscoverFiles(inputPaths []string) ([]FileInfo, error) {
	if len(inputPaths) == 0 {
		return nil, fmt.Errorf("no paths provided")
	}

	var allFiles []FileInfo
	var projectName string

	for i, inputPath := range inputPaths {
		info, err := os.Stat(inputPath)
		if err != nil {
			return nil, fmt.Errorf("cannot access path %s: %w", inputPath, err)
		}

		isFirst := i == 0

		if info.Mode().IsRegular() {
			content, err := os.ReadFile(inputPath)
			if err != nil {
				return nil, err
			}
			base := filepath.Base(inputPath)
			ext := getExtension(inputPath)
			if isFirst {
				projectName = strings.TrimSuffix(base, filepath.Ext(base))
			}
			allFiles = append(allFiles, FileInfo{
				OriginalPath: inputPath,
				Path:         normalizePath(base),
				Size:         info.Size(),
				SHA:          sha1Hex(content),
				Extension:    ext,
				Content:      content,
			})
		} else if info.IsDir() {
			if isFirst && projectName == "" {
				projectName = filepath.Base(inputPath)
			}
			ig := loadIgnore(inputPath)
			filePaths, err := scanDirectory(inputPath, inputPath, ig)
			if err != nil {
				return nil, err
			}
			for _, filePath := range filePaths {
				content, err := os.ReadFile(filePath)
				if err != nil {
					return nil, err
				}
				fi, err := os.Stat(filePath)
				if err != nil {
					return nil, err
				}
				relPath, _ := filepath.Rel(inputPath, filePath)
				allFiles = append(allFiles, FileInfo{
					OriginalPath: filePath,
					Path:         normalizePath(relPath),
					Size:         fi.Size(),
					SHA:          sha1Hex(content),
					Extension:    getExtension(filePath),
					Content:      content,
				})
			}
		} else {
			return nil, fmt.Errorf("invalid path: %s is neither a file nor a directory", inputPath)
		}
	}

	if len(allFiles) > 0 && projectName != "" {
		allFiles[0].ProjectName = projectName
	}

	return allFiles, nil
}

// GetProjectName returns the project name derived from the first file.
func GetProjectName(files []FileInfo) (string, error) {
	if len(files) == 0 {
		return "", fmt.Errorf("no files discovered")
	}
	if files[0].ProjectName == "" {
		return "", fmt.Errorf("project name not found in files")
	}
	return files[0].ProjectName, nil
}

// ValidateFiles checks that files were discovered and warns if no markdown/html found.
func ValidateFiles(files []FileInfo) error {
	if len(files) == 0 {
		return fmt.Errorf("no files found to publish")
	}
	hasMarkup := false
	for _, f := range files {
		if f.Extension == "md" || f.Extension == "mdx" || f.Extension == "html" {
			hasMarkup = true
			break
		}
	}
	if !hasMarkup {
		fmt.Fprintln(os.Stderr, "Warning: No markdown or html files found. The site will be empty.")
	}
	return nil
}
