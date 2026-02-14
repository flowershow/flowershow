/**
 * Pure utility functions for Publisher
 * Extracted for testability
 */

import { App, FrontMatterCache, Notice, TFile } from "obsidian";
import { IFlowershowSettings } from "src/settings";

/**
 * Normalize a file path by removing leading slashes and stripping rootDir prefix
 */
export function normalizePath(path: string, rootDir: string): string {
  let normalizedPath = path.replace(/^\/+/, "");

  if (rootDir) {
    const rootDirNormalized = rootDir.replace(/^\/+|\/+$/g, "");
    if (normalizedPath.startsWith(rootDirNormalized + "/")) {
      normalizedPath = normalizedPath.slice(rootDirNormalized.length + 1);
    } else if (normalizedPath === rootDirNormalized) {
      normalizedPath = "";
    }
  }

  return normalizedPath;
}

/**
 * Check if a path is within the specified root directory
 */
export function isWithinRootDir(path: string, rootDir: string): boolean {
  if (!rootDir) {
    return true;
  }

  const rootDirNormalized = rootDir.replace(/^\/+|\/+$/g, "");
  const pathNormalized = path.replace(/^\/+/, "");

  return (
    pathNormalized.startsWith(rootDirNormalized + "/") ||
    pathNormalized === rootDirNormalized
  );
}

/**
 * Check if a path matches any of the exclude patterns
 */
export function matchesExcludePatterns(
  path: string,
  excludePatterns: string[],
): boolean {
  if (!excludePatterns || excludePatterns.length === 0) {
    return false;
  }

  return excludePatterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(path);
    } catch (e) {
      console.error(`Invalid regex pattern: ${pattern}`, e);
      return false;
    }
  });
}

export function isPlainTextExtension(ext: string): boolean {
  const plainTextExtensions = [
    "md",
    "mdx",
    "txt",
    "json",
    "yaml",
    "yml",
    "css",
    "js",
    "ts",
    "html",
    "xml",
    "csv",
    "tsv",
  ];
  return plainTextExtensions.includes(ext.toLowerCase());
}

/** Check if a file has publish: false in frontmatter */
export function hasPublishFalse(file: TFile, app: App): boolean {
  if (file.extension !== "md" && file.extension !== "mdx") {
    return false;
  }
  const cachedFile = app.metadataCache.getCache(file.path);
  return cachedFile?.frontmatter?.["publish"] === false;
}

/**
 * Check if a file should be skipped from publishing
 * Combines checks for exclusion patterns and publish: false frontmatter
 */
export function shouldSkipFile(
  file: TFile,
  app: App,
  rootDir: string,
  excludePatterns: string[],
): boolean {
  return (
    !isWithinRootDir(file.path, rootDir) ||
    matchesExcludePatterns(file.path, excludePatterns) ||
    hasPublishFalse(file, app)
  );
}

export function validatePublishFrontmatter(
  frontMatter: FrontMatterCache,
): boolean {
  if (frontMatter && frontMatter["publish"] === false) {
    new Notice("Note is marked as not publishable.");
    return false;
  }
  return true;
}

export function validateSettings(settings: IFlowershowSettings): boolean {
  if (!settings.flowershowToken) {
    new Notice(
      "Config error: You need to define a Flowershow PAT Token in the plugin settings",
    );
    return false;
  }
  if (!settings.siteName) {
    new Notice(
      "Config error: You need to define a Site Name in the plugin settings",
    );
    return false;
  }
  if (!settings.flowershowToken.startsWith("fs_pat_")) {
    new Notice(
      "Config error: Invalid token format. Token should start with 'fs_pat_'",
    );
    return false;
  }
  return true;
}
