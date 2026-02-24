---
title: Umami analytics
description: Add Umami analytics to your Flowershow site to track visitor behaviour.
---

[Umami](https://umami.is/) is a simple, privacy-focused analytics tool. You can use [Umami Cloud](https://cloud.umami.is/) or a self-hosted instance.

## Basic setup

Add your Umami website ID to `config.json`:

```json
{
  "umami": "your-website-id"
}
```

That's all. Flowershow will inject the Umami tracking script into every page of your site.

## Self-hosted Umami

If you run your own Umami instance, use the extended form to specify the script URL:

```json
{
  "umami": {
    "websiteId": "your-website-id",
    "src": "https://your-umami.example.com/script.js"
  }
}
```

## Getting your website ID

1. Log in to your Umami account
2. Go to **Settings > Websites**
3. Add your site or select an existing one
4. Copy the **Website ID** from the website details

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `websiteId` | string | Yes (extended form) | Your Umami website ID |
| `src` | string | No | Script URL — only needed for self-hosted instances |
