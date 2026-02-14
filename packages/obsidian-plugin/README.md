# 💐 Obsidian Flowershow Plugin

Publish your Obsidian vault online easily, quickly and for free directly from your Obsidian vault using [Flowershow](https://flowershow.app).

## Getting Started

Here is how you can publish your Obsidian vault with Flowershow:

**STEP 1: Install the Flowershow Plugin**

1. Open Obsidian.
2. Go to Settings > Community Plugins.
3. Search for "Flowershow" and click Install.
4. Enable the plugin once installed.

**STEP 2: Sign Up for Flowershow Cloud**

1. Sign up for a free account at https://cloud.flowershow.app/login.

**STEP 3: Generate a Personal Access Token**

1. Go to your Flowershow dashboard at https://cloud.flowershow.app/tokens.
2. Create a new Personal Access Token (PAT).
3. Copy the token (it starts with `fs_pat_`).

**STEP 4: Configure the Plugin & Publish**

1. Go back to Obsidian and open the Flowershow plugin settings.
2. Enter your Flowershow PAT token and choose a site name.
3. Use "Flowershow" commands or click on the Flowershow icon in the ribbon and select the notes to publish — and that's it!

**That's it! Your notes are now ready to be shared with the world! 💐**

Full docs at https://flowershow.app/docs/

### Publication Status Panel

The Flowershow icon in your ribbon opens the Publication Status panel, which shows:

- **Changed**: Published files that have been edited locally.
- **New**: New files in your Obsidian vault that have not yet been published.
- **Deleted**: Files that have been deleted from your Obsidian vault but are still published on Flowershow.
- **Unchanged (select to unpublish)**: All unchanged and published files.

### Plugin Settings

#### Flowershow Authentication

- **Personal Access Token**: Your Flowershow PAT token (starts with `fs_pat_`). Generate one at https://cloud.flowershow.app/tokens.
- **Site Name**: The name for your Flowershow site.

#### Publishing Settings

- **Exclude Patterns**: Regex patterns to exclude files and folders from being published.
  - Example: `^private/` excludes the private directory.

#### Configuration Files

Both `custom.css` and `config.json` files can be edited locally and published with the plugin:

- [`custom.css`](https://flowershow.app/docs/custom-css) - Customize your site's styling
- [`config.json`](https://flowershow.app/docs/config-file) - Configure site-wide settings

### Available Commands

- `Flowershow: Publish single note (with embeds)` - Publishes the current note with its embeds. This will publish the current note and any embedded content, but generally won't publish linked notes.
- `Flowershow: Publish all` - Publishes all files in your vault by comparing your local vault with your Flowershow site, taking into account exclude settings. Unlike single note publishing, this doesn't process embeds but rather synchronizes the entire vault content with Flowershow.

### Excalidraw Support

To publish Excalidraw drawings with Flowershow, configure the Excalidraw plugin to:

1. Export drawings as SVG/PNG files
2. Use exported files in note links

In Excalidraw plugin settings:

1. Go to "Embedding Excalidraw into your Notes and Exporting"
2. Go to "Export settings"
3. Go to "Auto-export settings"
4. Enable "Auto-export SVG" or "Auto-export PNG"
5. Enable "Keep the .SVG and/or .PNG filenames in sync..." (if you want)
6. Go to the top of the main section and in "Type of file to insert into the document" select "SVG" or "PNG"

This ensures your drawings will be properly published and displayed on your Flowershow site.

---

## Development

### Local testing

1. Clone the repository.
2. Run `npm i` to install dependencies.
3. Run `npm run build`.
4. Create the plugins directory in your Obsidian vault if it doesn't exist:

```sh
mkdir -p /path/to/obsidian-vault/.obsidian/plugins/flowershow
```

5. Create symlinks to the `main.js`, `manifest.json`, and `styles.css` files in your Obsidian plugins folder:

```sh
ln -s /path/to/obsidian-flowershow/main.js /path/to/obsidian-vault/.obsidian/plugins/flowershow/main.js
ln -s /path/to/obsidian-flowershow/manifest.json /path/to/obsidian-vault/.obsidian/plugins/flowershow/manifest.json
ln -s /path/to/obsidian-flowershow/styles.css /path/to/obsidian-vault/.obsidian/plugins/flowershow/styles.css
```

6. Reload Obsidian, go to Settings > Community Plugins, and enable the plugin.

### Rebuild on change

If you want to automatically rebuild the plugin after you make any changes to the source code, run `npm run dev` instead of `npm run build`. This will start a server that will watch for changes to the source files and rebuild the plugin automatically. However, you will still need to reload Obsidian manually each time to see the changes.

### Hot reloading

If you want true hot reloading, i.e. without needing to disable/enable the plugin:

1. Install [Hot-Reload](https://github.com/pjeby/hot-reload) plugin:

- download the .zip file from the latest release
- extract the .zip file into your Obsidian vault's `.obsidian/plugins` folder
- go to Settings > Community Plugins and enable the plugin

2. Instead of creating symlinks like in step 4 above, copy/clone the plugin project directly into your Obsidian vault's `.obsidian/plugins` folder:

```sh
mv /path/to/obsidian-flowershow /path/to/obsidian-vault/.obsidian/plugins/
```

3. Run `npm i && npm run dev` in the plugin folder to start the development server.

Now, whenever you make any changes to the source code, two things will happen:

1. The plugin will be rebuilt automatically.
2. The Hot-Reload plugin will detect that the plugin has been rebuilt and will reload it in Obsidian.

## Shoutout

Big thanks to [Ole Eskild Steensen](https://github.com/oleeskild) for [his obsidian-digital-garden plugin](https://github.com/oleeskild/obsidian-digital-garden/tree/main) which inspired us and we got to build on.
