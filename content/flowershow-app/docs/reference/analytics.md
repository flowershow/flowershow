---
title: Analytics
description: Configure analytics for your Flowershow site using Google Analytics 4 or Umami.
---

Configure analytics for your site from the **Flowershow dashboard** under **Site Settings → Analytics**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

## Google Analytics 4

Go to **Settings → Analytics → Google Analytics** and enter your GA4 Measurement ID (e.g. `G-XXXXXXXXXX`).

### Setting up a data stream

If you don't have a Measurement ID yet:

1. Go to Google Analytics **Admin > Data Streams**
2. Click **Add Stream > Web**
3. Enter your site URL (e.g. `my.flowershow.app/@johndoe/abc`) and a stream name
4. Click **Create and continue** — your Measurement ID will appear in the stream details

> [!note]
> Make sure data collection is enabled for your property: **Admin > Data Collection and Modification > Data Collection**.

### Verifying the configuration

**Real-Time Reports:**

1. Go to **Reports > Realtime overview** in Google Analytics
2. Open your site in a new tab — you should appear as an active user

**Chrome DevTools:**

1. Open your site and press `F12` to open DevTools
2. Go to the **Network** tab and reload the page
3. Filter for "analytics" — you should see requests that include your Measurement ID

### Troubleshooting

- **No data in Real-Time reports:** verify your Measurement ID is correct, disable any ad blockers, and ensure your configuration is valid
- **Console errors:** confirm you're using a GA4 ID (starts with `G-`), not a Universal Analytics ID

---

## Umami

[Umami](https://umami.is/) is a simple, privacy-focused analytics tool. Works with [Umami Cloud](https://cloud.umami.is/) or a self-hosted instance.

Go to **Settings → Analytics → Umami Analytics** and enter your Umami Website ID (e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

### Getting your website ID

1. Log in to your Umami account
2. Go to **Settings > Websites**
3. Add your site or select an existing one
4. Copy the **Website ID** from the website details

### Self-hosted Umami

If you run your own Umami instance, also go to **Settings → Analytics → Umami Script URL** and enter your custom script URL (e.g. `https://your-umami.example.com/script.js`). Leave blank to use the default Umami Cloud script.

---

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "analytics": "G-XXXXXXXXXX",
  "umami": {
    "websiteId": "your-website-id",
    "src": "https://your-umami.example.com/script.js"
  }
}
```

- `analytics`: Your Google Analytics 4 Measurement ID (starts with `G-`)
- `umami.websiteId`: Your Umami website ID
- `umami.src`: Script URL for self-hosted Umami instances — omit to use the default Umami Cloud script
