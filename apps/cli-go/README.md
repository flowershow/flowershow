# Flowershow CLI (`fl`)

The CLI tool for publishing Markdown files with Flowershow.

## Installation

Download the latest binary for your platform from the [GitHub Releases](https://github.com/flowershow/flowershow/releases) page and place it on your `PATH`.

**macOS (Apple Silicon)**
```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_darwin_arm64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

**macOS (Intel)**
```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_darwin_amd64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

**Linux (amd64)**
```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_linux_amd64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

**Windows** — download `fl_windows_amd64.zip` from the Releases page and add the extracted binary to your `PATH`.

Then use the `fl` command anywhere:

```bash
fl login
fl ./my-notes
```

## Quick Start

### 1. Authenticate

Before using any commands, you must authenticate:

```bash
fl login
```

This will:

1. Display a URL and verification code
2. Open your browser to authorize the CLI
3. Store your authentication token locally

### 2. Publish Your Content

```bash
# Publish a folder
fl ./my-notes

# Publish a single file
fl ./my-note.md
```

### 3. Sync after changes

```bash
# Sync a folder site
fl sync ./my-notes

# Sync a single file site
fl sync ./my-note.md
```

## Commands

### Authentication

#### `fl login`

Authenticate with Flowershow via browser OAuth flow.

```bash
fl login
```

#### `fl whoami`

Show the currently authenticated user.

```bash
fl whoami
```

#### `fl logout`

Remove your stored authentication token.

```bash
fl logout
```

### Publishing

#### `fl <path> [morePaths...] [options]`

Publish files or folders to Flowershow.

**Options:**

- `--overwrite` - Overwrite existing site if it already exists
- `--name <siteName>` - Custom name for the site (defaults to file/folder name). Note: If you use it, you need to pass it also to the `sync` command later on, so that Flowershow knows content of which site you're trying to sync.

**Examples:**

```bash
# Publish a single markdown file
fl ./my-note.md

# Publish multiple files
fl ./intro.md ./chapter1.md ./chapter2.md

# Publish a folder
fl ./my-notes

# Overwrite an existing site
fl --overwrite ./my-notes

# Publish with a custom site name
fl --name my-custom-site ./my-notes

# Combine options
fl --name my-custom-site --overwrite ./my-notes
```

**What happens:**

1. Files are discovered and filtered (ignores `.git`, `node_modules`, etc.; also supports `.gitignore` and will ignore paths listed there)
2. Project name is derived from the first file name or the folder name
3. Site is created via the Flowershow API
4. Presigned URLs are obtained for secure file uploads
5. Files are uploaded directly to Cloudflare R2 storage
6. CLI waits for markdown files to be processed
7. Site URL is displayed

**Single file behavior:**

- Filename becomes the project name (e.g. `fl about.md` will create a site named `about`)
- File keeps its original name
- Site accessible at `/@{username}/{filename}` (e.g. `/@johndoe/about`)

**Multiple files behavior:**

- First filename becomes the project name (e.g. `fl about.md team.md abc.md` will create a site named `about`)
- Site accessible at `/@{username}/{first-filename}` (e.g. `/@johndoe/about`)

**Folder behavior:**

- Folder name becomes the project name (e.g. `fl my-digital-garden/blog` will create a site named `blog`)
- Site accessible at `/@{username}/{foldername}` (e.g. `/@johndoe/blog`)

#### `fl sync <path> [options]`

Sync changes to an existing published site. Only uploads new or modified files, and deletes files that no longer exist locally.

**Options:**

- `--name <siteName>` - Specify site name if different from folder name
- `--dry-run` - Show what would be synced without making changes
- `--verbose` - Show detailed list of all files in each category

**Examples:**

```bash
# Sync changes to a folder
fl sync ./my-notes

# Preview changes without syncing
fl sync --dry-run ./my-notes

# Show detailed file lists including unchanged files
fl sync --verbose ./my-notes

# Sync to a specific site name
fl sync --name my-custom-site ./my-notes

# Combine options
fl sync --dry-run --verbose ./my-notes
```

**What happens:**

1. Files are discovered and SHA hashes calculated
2. File list is sent to the API for comparison
3. API compares with existing files and determines:
   - New files (not in database)
   - Modified files (different SHA hash)
   - Deleted files (in database but not in request)
   - Unchanged files (same SHA hash)
4. Sync summary is displayed
5. Only new/modified files are uploaded
6. Deleted files are removed by the API
7. CLI waits for markdown files to be processed
8. Site URL is displayed

**When to use sync vs publish:**

- **Use `fl`** for initial site creation or complete site replacement
- **Use `fl sync`** for updates to existing sites

### Site Management

#### `fl list`

List all sites published by your authenticated user.

```bash
fl list
```

Shows site names, URLs, and timestamps.

#### `fl delete <project-name>`

Delete a site and all its files.

```bash
fl delete my-notes
```

Removes the site and all its files via the Flowershow API.

## File Filtering

The CLI automatically ignores common non-content files and directories:

- `.git/`, `node_modules/`, `.cache/`, `dist/`, `build/`
- `.DS_Store`, `Thumbs.db`
- `.env*`, `*.log`
- `.next/`, `.vercel/`, `.turbo/`

If a `.gitignore` file is present in the published folder, the Flowershow CLI will also ignore files matched by it.

## Telemetry

The CLI collects anonymous usage data to help improve the product. No personally identifiable information is collected.

On first run, you'll see a notice about this. To opt out, set the following environment variable:

```bash
FLOWERSHOW_TELEMETRY_DISABLED=1
```

## Site URLs

All CLI-published sites are accessible at:

```
https://my.flowershow.app/@{username}/{project-name}
```

Where `{username}` is your authenticated username.

## Troubleshooting

### "You must be authenticated to use this command"

Run `fl login` to authenticate.

### "Authentication token is invalid or expired"

Your token may have been revoked. Re-authenticate:

```bash
fl login
```

### "Site already exists"

A site with that name already exists. You can:

- Use the `--overwrite` flag: `fl --overwrite <path>`
- Delete it first: `fl delete <name>`
- Rename your file/folder
- Use `fl list` to see all existing sites
- **Or use `fl sync`** to update an existing site incrementally

### "Site not found" (when using sync)

The sync command requires the site to already exist. If you get this error:

- Use `fl` to create the site first
- Check the site name with `fl list`
- Specify the correct site name with `--name`

### Files still processing after timeout

The site is live, but some pages may not be ready yet. The Cloudflare worker processes files asynchronously. Check your site again in a moment.

## Architecture

All CLI commands communicate with the Flowershow API:

- **Authentication**: OAuth device flow endpoints
- **Site Management**: Create, list, and delete sites
- **File Upload**: Presigned URL generation and status polling
- **User Info**: Retrieve authenticated user details

### Security

- **Token Storage**: Authentication tokens are stored in `~/.flowershow/token.json`
- **Token Format**: CLI tokens use the `fs_cli_` prefix
- **Token Expiration**: Tokens do not expire by default
- **Token Revocation**: Revoke tokens from the [Flowershow dashboard](https://cloud.flowershow.app/tokens) or via `fl logout`
- **Secure Uploads**: Files are uploaded using time-limited presigned URLs
- **No Credentials**: CLI never stores database or storage credentials

## Development

### Setup

1. **Clone the repository and navigate to the CLI directory:**

```bash
cd apps/cli-go
```

2. **Install dependencies:**

```bash
go mod tidy
```

3. **Configure environment** (optional — for using a local or non-production API):

```bash
export API_URL="http://cloud.localhost:3000"
export POSTHOG_API_KEY=abc
```

4. **Run commands directly:**

```bash
go run . login
go run . ./my-notes
go run . sync ./my-notes
```

5. **Build and install globally:**

```bash
go build -o fl .
# Move to a directory on your PATH, e.g.:
mv fl /usr/local/bin/fl
```
