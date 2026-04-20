---
title: How to Configure Google Analytics
description: Learn how to add Google Analytics tracking to your Flowershow site
date: 2025-04-21
authors:
  - olayway
---

This guide will walk you through the process of adding Google Analytics tracking to your Flowershow site. You'll learn how to configure your Google Analytics ID and verify that it's working properly.

## Prerequisites

Before you begin, make sure you have:
- A Flowershow site set up
- A Google Analytics 4 account
- Your Google Analytics Measurement ID (starts with "G-")

## Step 1: Get Your Google Analytics Measurement ID

1. Go to Admin > Data Streams
2. Click "Add Stream" if no stream exists
3. Select "Web" as your platform
4. Enter your website's URL (e.g. "my.flowershow.app/@johndoe/abc") and a stream name (e.g. "My Flowershow Site")
5. Click "Create and continue"
6. Your Measurement ID will be displayed in the stream details (it starts with "G-")

>[!note]
> Make sure data collection is enabled for your property. You can check this in Admin > Data Collection and Modigication > Data Collection.

## Step 2: Configure Analytics in config.json

1. Open your site's `config.json` file
2. Add the `analytics` field with your Measurement ID

Example:
```json
{
  "analytics": "G-XXXXXXXXXX"
}
```

3. Sync your site in your Flowershow dashboard.

## Step 3: Verify the Configuration

There are several ways to verify that Google Analytics is working correctly:

1. **Using Google Analytics Real-Time Reports:**
   - Go to your Google Analytics dashboard
   - Click on "Reports" > "Realtime overview"
   - Open your site in a new tab
   - You should see yourself as an active user (and actions you perform, like navigations to different pages reflected in event counts section of the report)

2. **Using Chrome DevTools:**
   - Open your site in Chrome
   - Open DevTools (press F12 or Cmd+Shift+C or Ctrl+Shift+C)
   - Go to the Network tab
   - Reload the page in your browser
   - Filter for "analytics"
   - You should see requests to Google Analytics that include your Measurment ID

## Troubleshooting

Common issues and solutions:

1. **No data appearing in Real-Time reports?**
   - Verify your Measurement ID is correct
   - Check if you have an ad blocker enabled (it should be disabled for data tracking to be sent successfully)
   - Ensure your config.json is properly formatted

2. **Getting errors in the console?**
   - Make sure you're using a GA4 Measurement ID (starts with "G-")
   - Verify your config.json has no syntax errors

