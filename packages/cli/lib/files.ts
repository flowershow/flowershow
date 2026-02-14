import { readFileSync, statSync, readdirSync, existsSync } from "fs";
import { join, basename, extname, relative, sep } from "path";
import { createHash } from "crypto";
import ignore from "ignore";

// Default patterns to ignore when scanning directories (fallback if no .gitignore)
const DEFAULT_IGNORE_PATTERNS = [
  ".git/",
  ".gitignore",
  "node_modules/",
  ".DS_Store",
  "Thumbs.db",
  ".env",
  ".env.*",
  "!.env.example",
  "*.log",
  ".cache/",
  "dist/",
  "build/",
  ".next/",
  ".vercel/",
  ".turbo/",
  "coverage/",
  ".nyc_output/",
];

export interface FileInfo {
  originalPath: string;
  path: string;
  size: number;
  sha: string;
  extension: string;
  content: Buffer;
  projectName?: string;
}

/**
 * Load and parse .gitignore file from a directory
 */
function loadGitignore(baseDir: string): ReturnType<typeof ignore> {
  const ig = ignore();

  // Add default patterns
  ig.add(DEFAULT_IGNORE_PATTERNS);

  // Look for .gitignore in the base directory
  const gitignorePath = join(baseDir, ".gitignore");

  if (existsSync(gitignorePath)) {
    try {
      const gitignoreContent = readFileSync(gitignorePath, "utf-8");
      ig.add(gitignoreContent);
    } catch (error) {
      console.warn(`Warning: Could not read .gitignore file: ${error}`);
    }
  }

  return ig;
}

/**
 * Check if a file path should be included
 */
function shouldIncludeFile(
  filePath: string,
  ig: ReturnType<typeof ignore>,
): boolean {
  // Normalize path separators for consistent matching
  const normalizedPath = filePath.split(sep).join("/");
  return !ig.ignores(normalizedPath);
}

/**
 * Calculate SHA hash of file content
 */
function calculateSha(content: Buffer): string {
  return createHash("sha1").update(content).digest("hex");
}

/**
 * Get file extension without the dot
 */
function getExtension(filePath: string): string {
  const ext = extname(filePath);
  return ext ? ext.slice(1).toLowerCase() : "";
}

/**
 * Normalize path to use forward slashes (for consistency across platforms)
 */
function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

/**
 * Recursively scan a directory and return all files
 */
function scanDirectory(dirPath: string, baseDir: string = dirPath): string[] {
  const files: string[] = [];
  const ig = loadGitignore(baseDir);

  function scan(currentPath: string): void {
    const entries = readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      const relativePath = relative(baseDir, fullPath);

      if (!shouldIncludeFile(relativePath, ig)) {
        continue;
      }

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  scan(dirPath);
  return files;
}

/**
 * Discover files from a path or array of paths (files or directories)
 * Returns array of file objects with metadata
 */
export function discoverFiles(inputPaths: string | string[]): FileInfo[] {
  // Normalize to array
  const paths = Array.isArray(inputPaths) ? inputPaths : [inputPaths];

  if (paths.length === 0) {
    throw new Error("No paths provided");
  }

  const allFiles: FileInfo[] = [];
  let projectName: string | null = null;

  // Process each path
  for (let i = 0; i < paths.length; i++) {
    const inputPath = paths[i];
    if (!inputPath) continue;

    const stats = statSync(inputPath);
    const isFirstPath = i === 0;

    if (stats.isFile()) {
      // Single file - keep original filename
      const extension = getExtension(inputPath);
      const fileName = basename(inputPath, extname(inputPath));
      const content = readFileSync(inputPath);
      const targetPath = basename(inputPath);

      // Infer project name from first file
      if (isFirstPath) {
        projectName = fileName;
      }

      allFiles.push({
        originalPath: inputPath,
        path: normalizePath(targetPath),
        size: stats.size,
        sha: calculateSha(content),
        extension,
        content,
      });
    } else if (stats.isDirectory()) {
      // Directory
      const dirName = basename(inputPath);
      const dirFiles = scanDirectory(inputPath);

      // If this is the first path, use directory name as project name
      if (isFirstPath && !projectName) {
        projectName = dirName;
      }

      for (const filePath of dirFiles) {
        const content = readFileSync(filePath);
        const extension = getExtension(filePath);
        const relativePath = relative(inputPath, filePath);
        const fileStats = statSync(filePath);

        allFiles.push({
          originalPath: filePath,
          path: normalizePath(relativePath),
          size: fileStats.size,
          sha: calculateSha(content),
          extension,
          content,
        });
      }
    } else {
      throw new Error(
        `Invalid path: ${inputPath} is neither a file nor a directory`,
      );
    }
  }

  // Store project name in first file
  if (allFiles.length > 0 && projectName) {
    allFiles[0]!.projectName = projectName;
  }

  return allFiles;
}

/**
 * Get project name from discovered files
 */
export function getProjectName(files: FileInfo[]): string {
  if (files.length === 0) {
    throw new Error("No files discovered");
  }
  const projectName = files[0]?.projectName;
  if (!projectName) {
    throw new Error("Project name not found in files");
  }
  return projectName;
}

/**
 * Validate that files were discovered
 */
export function validateFiles(files: FileInfo[]): boolean {
  if (files.length === 0) {
    throw new Error("No files found to publish");
  }

  const hasMarkdownOrHtml = files.some((f) =>
    ["md", "mdx", "html"].includes(f.extension),
  );
  if (!hasMarkdownOrHtml) {
    console.warn(
      "Warning: No markdown or html files found. The site will be empty.",
    );
  }

  return true;
}
