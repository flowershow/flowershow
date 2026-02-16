# remark-wiki-link

## 3.3.1

### Patch Changes

- - Fix embeds serialization (`toMarkdown`).
  - Fix trailing colons being added to wiki links without aliases at serialization (`toMarkdown`) (#21).

## 3.3.0

### Minor Changes

- - Add support for Obsidian-style permalinks
    - Add new `permalinks` option to map file paths to custom URLs (e.g., `{ "blog/post.md": "/custom-url" }`)
    - Permalinks take precedence over `urlResolver` when defined
    - Works with both regular wiki links and embeds
  - Update documentation.

## 3.2.1

### Patch Changes

- Export findMatchingFilePath

## 3.2.0

### Minor Changes

- Add support for case-insensitive wiki-link resolution (enabled by default for Obsidian parity).

  ## New Features
  - Added `caseInsensitive` option to the plugin configuration (defaults to `true`)
  - Wiki-links now match files regardless of case by default (e.g., `[[wiki link]]` will match `Wiki Link.md`)
  - This behavior matches Obsidian's default wiki-link resolution

  ## Configuration

  To disable case-insensitive matching and require exact case matches:

  ```javascript
  .use(wikiLinkPlugin, {
    files: ["Wiki Link.md"],
    caseInsensitive: false, // Require exact case match
  })
  ```

## 3.1.2

### Patch Changes

- Remove webm from audio file type detection

  WebM is a container format that can contain both audio and video streams. Since there's no way to determine from the file extension alone whether a `.webm` file contains audio or video content, and WebM is more commonly used for video, it has been removed from the audio file type list.

  **Impact:**
  - `![[file.webm]]` will now always render as a `<video>` tag
  - The `<video>` tag can still play audio-only WebM files correctly
  - For explicit audio-only WebM files, users should use dedicated audio formats like `.mp3`, `.ogg`, or `.wav`

## 3.1.1

### Patch Changes

- Add inline styles for width and height dimensions on images and videos

  When dimensions are specified for images or videos using the wiki-link syntax, inline styles are now automatically added alongside the width/height attributes for better rendering control across different contexts.

  **Examples:**
  - `![[image.jpg|200x300]]` now generates `style="width: 200px; height: 300px"`
  - `![[video.mp4|640]]` now generates `style="width: 640px"` (height omitted to maintain aspect ratio)

## 3.1.0

### Minor Changes

- Add support for video and audio media embeds with proper HTML5 tags

  This release adds support for embedding video and audio files using wiki-link syntax:

  **Video Support:**
  - Supported formats: mp4, webm, ogv, mov, mkv
  - Syntax: `![[video.mp4]]` generates `<video>` tag with controls
  - Dimension support: `![[video.mp4|640x480]]` sets width and height
  - Width-only support: `![[video.mp4|640]]` sets width, allowing browser to maintain aspect ratio

  **Audio Support:**
  - Supported formats: mp3, wav, ogg, m4a, flac, 3gp
  - Syntax: `![[audio.mp3]]` generates `<audio>` tag with controls
  - Includes fallback text for browsers that don't support the media tags

  **Breaking Change:**
  - When specifying only width for images and videos (e.g., `![[image.jpg|200]]`), the height attribute is no longer automatically set to match the width. This allows browsers to maintain the original aspect ratio of the media.

## 3.0.1

### Patch Changes

- Wiki-link regex fix

## 3.0.0

### Major Changes

- 🚨 Breaking: New Wiki-Link Resolution Strategy

  This release introduces a more robust wiki-link resolution approach.

  **🔧 Key Changes:**
  - `files` replaces `permalinks`
    - The plugin now accepts a list of `files` (file paths) instead of `permalinks` (published URLs) and applies `urlResolver` only after file path is matched
  - `urlResolver` API updated
    - Updated signature:
      ```
      urlResolver({
        filePath,
        heading,
        isEmbed
      }: {
        filePath: string,
        heading: string,
        isEmbed: boolean
      })
      ```

  **Other changes:**
  - improved shortest path matching

## 2.1.0

### Minor Changes

- Fixes required to make it work with unified 11

## 2.0.4

### Patch Changes

- 0e1dc6c: Remove unneeded console logs.

## 2.0.3

### Patch Changes

- 285449a: Don't resolve embeds with urlResolver.

## 2.0.2

### Patch Changes

- b8f5b07: Fixed release process (missing build output).

## 2.0.1

### Patch Changes

- 4a7311f: Use github-slugger for generating heading slugs in the default `urlResolver` function.

## 2.0.0

### Major Changes

- 0783a73: BREAKING CHANGES:
  - Renamed configuration options for clarity:
    - `pathFormat` -> `format`
    - `wikiLinkClassName` -> `className`
    - `wikiLinkResolver` -> `urlResolver`
  - Changed format values:
    - `"raw"` -> `"regular"`
    - `"obsidian-short"` -> `"shortestPossible"`
    - Removed `"obsidian-absolute"` format
  - Removed deprecated options:
    - `hrefTransformer`
    - `markdownFolder`
  - Updated to work with micromark v4 and mdast-util-from-markdown v2

## 1.1.1

This was the last version of the package before it was moved to the PortalJS monorepo and published under the @portaljs/remark-wiki-link name.
