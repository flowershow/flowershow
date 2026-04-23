---
title: Custom domain
description: Connect your own domain to your Flowershow site
---

> [!note]
> Custom domains are a premium feature. Check out our [pricing page](https://flowershow.app/pricing) to learn more about premium features.

Instead of using a default Flowershow URL like `{sitename}-{username}.flowershow.me`, you can connect your own domain (e.g. `myblog.com` or `docs.mycompany.com`) to give your site a professional appearance.

## What you'll need

- A premium plan on your Flowershow site
- A domain name you own (purchased from a registrar like GoDaddy, Namecheap, Cloudflare, etc.)
- Access to your domain's DNS settings (usually through your registrar's control panel)

## Setup

### 1. Add domain in your site settings

1. Log into [Flowershow dashboard](https://cloud.flowershow.app/)
2. Go to site settings
3. Find "Custom Domain" section
4. Enter domain name (e.g., `mysite.com` or `docs.mysite.com`)
5. Click "Save Changes"

You can use either an **apex domain** (e.g. `myblog.com`) or a **subdomain** (e.g. `docs.mycompany.com`). Subdomains are useful when your main domain is used for another purpose (e.g. your company website).

### 2. Verify domain ownership (if required)

If Flowershow shows a "Pending Verification" status, you need to prove domain ownership by adding a TXT record to your DNS settings.

> [!info]
> Verification is required when Vercel (Flowershow's hosting provider) hasn't seen the domain before, when it was previously used on another platform, or when DNS records have an ambiguity. If DNS records are already correctly pointed or you've verified the domain in another Flowershow site, this step is skipped.

To add the TXT record:

1. Log into your domain registrar
2. Find the DNS management section ("DNS Settings", "Advanced DNS", "DNS Records", etc.)
3. Add a new TXT record with the Name and Value exactly as shown in your Flowershow dashboard
4. Save and wait for DNS propagation (up to 24h)

#### If a TXT record with the same name already exists

If you already have a TXT record with the same name (e.g. `_vercel`) from a previous verification, it can cause the new verification to fail — even if the old value is still present. To fix this:

1. Remove the existing TXT record for that name
2. Add a fresh TXT record with the same name and the exact value shown in your Flowershow dashboard
3. Wait for DNS propagation

### 3. Configure DNS records

Once ownership is verified, point your domain to Flowershow's servers using the values shown in your dashboard.

**For a root domain** (e.g. `myblog.com`):
- Add an **A record**
- Optionally add a **CNAME record** for `www` so that `www.myblog.com` also works

> [!important]
> Remove any other A record with the `@` host. Multiple A records for the same host cause DNS resolvers to round-robin between them — your site will work intermittently. Keep only the one provided by Flowershow.

**For a subdomain** (e.g. `docs.mycompany.com`):
- Add a **CNAME record** as specified in the dashboard

> [!important]
> Include the trailing dot (`.`) in the CNAME value.

The process is the same as adding TXT records: go to DNS management, add a new record with the type, name, value, and TTL shown in the dashboard.

### 4. Wait for propagation

DNS changes can take up to 24 hours to propagate fully (depending on the previous TTL values). The dashboard status updates automatically as Flowershow detects your configuration.

## Domain status

- 🟡 **Pending Verification** — Add TXT record to verify ownership
- 🔴 **Invalid Configuration** — DNS records not set correctly or still propagating
- 🔵 **Valid Configuration** — Domain setup complete

> [!important]
> The status only checks Vercel's SSL configuration. Your domain may show "Valid Configuration" while you're seeing SSL handshake errors in your browser — this can happen when your DNS provider (e.g. Cloudflare) is still provisioning its own SSL certificate. See the SSL section below.

## Troubleshooting

### "Invalid Configuration" won't clear

1. Verify DNS records match the dashboard exactly
2. Remove any conflicting A records for the `@` host
3. Allow more time for DNS propagation (up to 24h)

### "Pending Verification" won't clear

1. Double-check the TXT record matches the dashboard exactly
2. If a TXT record with that name already existed, remove it and re-add with the new value
3. Wait for DNS propagation

### Domain works intermittently

Most likely caused by multiple A records for the root domain. DNS resolvers round-robin between them, so only some requests reach Flowershow. Remove all A records for the `@` host except the one provided by Flowershow.

### SSL handshake errors

Two SSL certificates are involved when you use a DNS proxy like Cloudflare:

1. **Vercel's SSL certificate** — handles HTTPS for direct connections to Vercel's servers
2. **DNS provider's SSL certificate** — handles HTTPS between users and the proxy

Handshake errors occur during initial setup while the DNS provider's certificate is being provisioned. This is temporary and typically resolves within 5–10 minutes. No action needed.

## Understanding DNS

DNS is the internet's directory: when a browser requests `myblog.com`, it queries DNS servers to resolve the domain to an IP address.

Your **domain registrar** (where you bought the domain) may not be the same as your **DNS provider** (where DNS records are stored). Common DNS providers include the registrar itself (GoDaddy, Namecheap), cloud services (Cloudflare, AWS Route 53), or your hosting company's nameservers.

When you update DNS records, resolvers around the world have the old values cached. Each cached record has a TTL (Time To Live). Resolvers wait for TTL to expire before checking for updates — this is **DNS propagation**, and it can take minutes to 24 hours. It cannot be sped up.

### DNS glossary

| Term | Definition |
|------|------------|
| **A Record** | Maps a domain name to an IPv4 address. Used for root/apex domains. |
| **CNAME Record** | Maps a domain name to another domain name. Used for subdomains. |
| **TXT Record** | Holds text data. Used for domain ownership verification and security settings. |
| **TTL (Time To Live)** | How long (in seconds) DNS servers cache a record before checking for updates. |
| **DNS Propagation** | The time it takes for DNS changes to spread across all DNS servers globally. |
| **Root/Apex Domain** | The main domain without any subdomain (e.g. `example.com`). |
| **Subdomain** | A domain prefixed to a larger domain (e.g. `blog.example.com`). |
| **SSL Certificate** | A digital certificate enabling encrypted HTTPS connections. |
| **SSL Handshake** | The process where browser and server establish a secure connection. |
| **DNS Proxy** | A service (e.g. Cloudflare) that sits between users and your server, offering caching, SSL, or security features. |
