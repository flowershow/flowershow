---
title: Analytics
description: Configure analytics for your Flowershow site using Google Analytics 4 or Umami.
---

## Google Analytics 4

### Configuration

Add your GA4 Measurement ID to `config.json`:

```json
{
  "analytics": "G-XXXXXXXXXX"
}
```

### Properties

- `analytics`: Your Google Analytics 4 Measurement ID (starts with "G-")

### Data stream setup

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

- **No data in Real-Time reports:** verify your Measurement ID is correct, disable any ad blockers, and ensure `config.json` is valid JSON
- **Console errors:** confirm you're using a GA4 ID (starts with `G-`), not a Universal Analytics ID

---

## Umami

[Umami](https://umami.is/) is a simple, privacy-focused analytics tool. Works with [Umami Cloud](https://cloud.umami.is/) or a self-hosted instance.

### Configuration

Add your Umami website ID to `config.json`:

```json
{
  "umami": "your-website-id"
}
```

Flowershow will inject the Umami tracking script into every page of your site.

### Self-hosted Umami

If you run your own Umami instance, use the extended form to specify the script URL:

```json
{
  "umami": {
    "websiteId": "your-website-id",
    "src": "https://your-umami.example.com/script.js"
  }
}
```

### Getting your website ID

1. Log in to your Umami account
2. Go to **Settings > Websites**
3. Add your site or select an existing one
4. Copy the **Website ID** from the website details

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `websiteId` | string | Yes (extended form) | Your Umami website ID |
| `src` | string | No | Script URL — only needed for self-hosted instances |
