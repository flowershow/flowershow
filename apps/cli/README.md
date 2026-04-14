# Flowershow CLI (`fl`)

The CLI tool for publishing Markdown files with Flowershow.

## Installation

**macOS / Linux** — run the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | sh
```

This automatically detects your OS and architecture, downloads the correct binary, and installs it to `/usr/local/bin/`.

**Windows** — download `fl_windows_amd64.zip` from the [GitHub Releases](https://github.com/flowershow/flowershow/releases) page and add the extracted binary to your `PATH`.

<details>
<summary>Manual installation</summary>

Download the archive for your platform from the [GitHub Releases](https://github.com/flowershow/flowershow/releases) page and place the binary on your `PATH`.

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

**Linux (arm64)**

```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_linux_arm64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

</details>

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

### 2. Publish or Update Your Content

`fl` is idempotent — the same command creates the site on first run and syncs changes on every subsequent run:

```bash
# Publish a folder (or sync it if already published)
fl ./my-notes

# Publish a single file (or sync it if already published)
fl ./my-note.md
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

Publish files or folders to Flowershow. If the site already exists, `fl` automatically syncs changes instead of erroring — it creates or syncs in one idempotent command.

**Options:**

- `--name <siteName>` - Custom name for the site (defaults to file/folder name). Only needed on the first publish; for folder mode, the name is saved to a local `.flowershow` file and remembered automatically.
- `--yes` - Skip the site name confirmation prompt (useful for scripts and CI).

**Examples:**

```bash
# Publish a single markdown file
fl ./my-note.md

# Publish multiple files
fl ./intro.md ./chapter1.md ./chapter2.md

# Publish a folder
fl ./my-notes

# Publish with a custom site name
fl --name my-custom-site ./my-notes

# Skip confirmation prompt (for automation)
fl --yes ./my-notes
```

**What happens (first publish):**

1. Files are discovered and filtered (ignores `.git`, `node_modules`, etc.; also supports `.gitignore` and will ignore paths listed there)
2. Project name is derived from the first file name or the folder name
3. A confirmation prompt shows the proposed site name and URL — you can accept or change it (skip with `--yes` or `--name`)
4. Site is created via the Flowershow API
5. Presigned URLs are obtained for secure file uploads
6. Files are uploaded directly to Cloudflare R2 storage
7. CLI waits for markdown files to be processed
8. Site URL is displayed
9. For folder mode, site name is saved to `.flowershow` in the folder for future runs

**What happens (subsequent runs):**

`fl` detects the existing site (via `.flowershow` config for folders, or by API lookup) and performs a delta sync — uploading only new or modified files and removing deleted ones.

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

### Site already exists — `fl` auto-syncs it

If you run `fl` on a path whose site already exists on the server, it will automatically sync changes instead of erroring. You don't need to do anything special — just run `fl <path>` every time.

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
cd apps/cli
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
