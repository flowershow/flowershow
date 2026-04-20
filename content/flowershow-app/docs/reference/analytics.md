---
title: Analytics
description: Add Google Analytics or Umami to track visitor behaviour on your Flowershow site.
---

## Google Analytics

Add your GA4 Measurement ID (starts with `G-`) to `config.json`:

```json
{
  "analytics": "G-XXXXXXXXXX"
}
```

### Data stream setup

Before configuring analytics, you need a Google Analytics 4 data stream:

1. Go to Google Analytics Admin > Data Streams
2. Click "Add Stream" > "Web"
3. Configure the stream:
   - URL: Your Flowershow site URL (e.g., `my.flowershow.app/@johndoe/abc`)
   - Stream name: A descriptive name (e.g., "My Flowershow Site")

Your Measurement ID will be displayed in the stream details after creation.

> [!info]
> For a step-by-step walkthrough including Real-Time verification, see the [[configure-google-analytics|Google Analytics setup guide]].

## Umami

[Umami](https://umami.is/) is a simple, privacy-focused analytics tool. Supports [Umami Cloud](https://cloud.umami.is/) and self-hosted instances.

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
