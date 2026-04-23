---
title: Custom domain
description: Connect your own domain to your Flowershow site
---

> [!note]
> Custom domains are a premium feature. Check out our [pricing page](https://flowershow.app/pricing) to learn more about premium features.

## Setup Process

### 1. Add domain in your site settings

1. Log into [Flowershow dashboard](https://cloud.flowershow.app/)
2. Go to site settings
3. Find "Custom Domain" section
4. Enter domain name (e.g., `mysite.com` or `docs.mysite.com`)

### 2. Verify domain ownership (if required)

If prompted with "Pending Verification" status:
1. Add provided TXT record to your domain's DNS settings
2. Wait for verification (can take up to 24h)

### 3. Configure DNS records

For root domain (e.g., `mysite.com`):
- Add A record as specified in dashboard
- Optional: Add CNAME record for `www` subdomain (to make `www.mysite.com` work)

For subdomain (e.g., `docs.mysite.com`):
- Add CNAME record as specified in dashboard

> Important: Remove any conflicting DNS records (e.g., existing A records for root domain)

### 4. Wait for propagation

Changes can take up to 24 hours to propagate fully (depending on previous TTL values). Status in dashboard will update automatically.

## Domain status guide

- 🟡 **Pending Verification**: Add TXT record
- 🔴 **Invalid Configuration**: DNS records not set correctly or still propagating
- 🔵 **Valid Configuration**: Domain setup complete

## Common issues

1. **Invalid configuration persists**
   - Verify DNS records match dashboard exactly
   - Remove conflicting records
   - Allow time for propagation

2. **Verification not clearing**
   - Double-check TXT record
   - Wait for DNS propagation

3. **Intermittent access**
    - Check for multiple A records
    - Wait for full DNS propagation

4. **SSL handshake errors with Cloudflare**
    - When using Cloudflare as your DNS provider, you may see SSL handshake errors for a few minutes after initial setup
    - This is normal and temporary - Cloudflare needs time to provision and propagate SSL certificates
    - The issue typically resolves itself within 5-10 minutes
    - No action needed, just wait for Cloudflare's SSL certificate provisioning to complete

>[!info]
>For a detailed guide including examples, step-by-step instructions, and troubleshooting tips check out [[how-to-set-custom-domain|this guide]].