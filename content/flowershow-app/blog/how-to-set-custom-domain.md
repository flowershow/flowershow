---
title: How to Connect Your Own Domain
description: A complete guide for setting up a custom domain on your Flowershow site
date: 2025-06-11
authors:
  - olayway
image: /assets/custom-domain.png
---

> [!note]
> Custom domains are a premium feature. Check out our [pricing page](https://flowershow.app/pricing) to learn more about premium features.


Having your own custom domain gives your Flowershow site a professional appearance and makes it easier for visitors to find and remember. Instead of using a default Flowershow URL for your site like `my.flowershow.app/@username/sitename`, you can use your own domain like `myblog.com` or `docs.mycompany.com`.

This guide will walk you through the entire process of connecting your custom domain to your Flowershow site.

## What You'll Need

Before we start, make sure you have:

- **A premium plan on your Flowershow site** (custom domains are a premium feature)
- **A domain name** that you own (purchased from a domain registrar like GoDaddy, Namecheap, Cloudflare, etc.)
- **Access to your domain's DNS settings** (usually through your domain registrar's control panel)

## Understanding the Process

When you connect a custom domain, there are typically two to three main steps:

1. **Add your domain** to your Flowershow site settings
2. **Verify domain ownership** by adding a special TXT record (only if required)
3. **Configure DNS records** to point your domain to Flowershow's servers

Don't worry if these terms sound technical – we'll explain everything step by step!

## Step 1: Add Your Domain in Flowershow

1. Log into your [Flowershow dashboard](https://cloud.flowershow.app/)
2. Navigate to your site's settings
3. Find the "Custom Domain" section
4. Enter your domain name (e.g., `mycompany.com` or `docs.mycompany.com` if using a subdomain)
5. Click "Save Changes"

### Choosing Between Apex Domain and Subdomain

When entering your domain, you can choose between two options:

**Apex Domain (Root Domain):**

- This is your main domain without any prefix (e.g., `myblog.com`, `mycompany.com`)
- Also called the "root domain" or "naked domain"
- Best when you want your site to be the main presence for your domain

**Subdomain:**

- This is a prefix added to your main domain (e.g., `blog.mycompany.com`, `docs.mybusiness.com`, `wiki.mysite.com`)
- Useful when you want to dedicate a specific section of your domain to your Flowershow site
- Allows you to keep your main domain for other purposes
- Example: `docs.mycompany.com` for documentation while `mycompany.com` hosts your main business site

The choice depends on how you want to use your domain. Both options work equally well with Flowershow!

After adding your domain, Flowershow will show you the current status and any configuration steps needed.

## Step 2: Verify Domain Ownership (When Prompted)

In some cases, you may need to prove that you own the domain before it can be used. This step is only required when Flowershow shows a "Pending Verification" status with a TXT record requirement.

![[Pasted image 20250610150800.png]]

If you see a "Pending Verification" status, Flowershow will provide you with a **TXT record** that you need to add to your domain's DNS settings. A TXT record is a type of DNS record that contains text information. It's like leaving a note that proves you control the domain.

> [!info]
> **When is ownership verification needed?**
> - You're adding a domain that Vercel (Flowershow uses Vercel to host your sites) has never seen before.
> - The domain was previously configured in another platform or service.
> - Vercel's system detects any mismatch or ambiguity in existing DNS records.
> - Your domain has some high-security feature enabled (e.g. custom certificates or advanced routing) that imposes extra checks.
> 
> **When is ownership verification NOT needed?**
> - You've already verified this exact domain in another Flowershow site or another Vercel project.
> - DNS records (A / CNAME) are already correctly pointed and status shows "Active".
> - You're only making non-critical changes (e.g. adding subdomains under an already-verified root domain).

#### Adding the TXT Record to Your DNS:

1. **Log into your domain registrar** (where you purchased your domain)
2. **Find the DNS management section** - this might be called:
   - "DNS Management" or "DNS Settings"
   - "Advanced DNS"
   - "Domain Management"
   - "Name Servers" or "DNS Records"
   - etc.
3. **Add a new record** - look for buttons like "Add Record", "Add New Record", or "+"
4. **Select "TXT" as the record type**
5. **Enter the Name (aka Host) field** exactly as provided in Flowershow dashboard
6. **Enter the Value (aka Content/Target/Data) field** exactly as provided in Flowershow dashboard
7. **Set the TTL value** as provided in Flowershow dashboard (or use highest possible value)
8. **Save the record**

### What if there's already a TXT record with the same name?

If your DNS records already contain a TXT record named exactly what Flowershow asks for (for example, `_vercel`), it means you've used that name for a previous verification. Although DNS can store multiple TXT values under one name, Flowershow's check only looks for the new token it just generated. Any old value—even if it's still present—can cause verification to fail.

To fix this:

1. Remove or overwrite the existing TXT record for that name (`_vercel`).
2. Add a fresh TXT record with the same name (`_vercel`) and the exact value shown in your Flowershow dashboard.
3. Allow time for DNS propagation.
4. Flowershow (Vercel) will then detect the correct token and switch your domain status from "Pending Verification" to "Invalid Configuration" (as you'll configure it in the next step).

>[!question] What about other TXT records under different names?
>You don't need to worry about any TXT records that use different names. Flowershow's verification process:

## Step 3: Configure DNS Records

Once your domain ownership is verified, you'll need to configure either an **A record** or **CNAME record** to point your domain to Flowershow's servers.

![[Pasted image 20250610151538.png]]

> [!note]
> Flowershow will automatically recommend the correct record type (it will be marked as "Recommended") in your dashboard based on weather you entered a root domain or a subdomain.

### Root Domain DNS Setting

For your apex domain (e.g. `myblog.com`), you'll need to add:

1. **A Record**
2. **Optional "www" CNAME** record (to ensure `www.myblog.com` also works).

Add both records with the exact same values as provided in your Flowershow dashboard.

> [!important] Remove any other A record with @ host 
> Having multiple A records for the same host can cause conflicts and unpredictable behavior. The @ host represents your root domain, and it should only point to Flowershow's servers. If you have other A records (like pointing to a previous hosting provider), your domain will work intermittently because DNS resolvers use round-robin load balancing - they alternate between the available A records. This means sometimes requests will go to Flowershow's servers (working correctly) and other times to the other server (not working). You must remove all other A records to ensure consistent behavior.

### Subdomain DNS Settings

For a subdomain (such as `docs.mycompany.com`), add a CNAME record with the values provided in your Flowershow dashboard.

>[!important]
>Make sure to include the trailing dot (`.`) in the CNAME value!

### Adding DNS Records

The process is similar to adding TXT records as described earlier (see section above):

1. Go to your domain registrar's DNS management page
2. Add a new record with the type, name, value and TTL as shown in your Flowershow dashboard
3. Save the record

## Step 4: Wait for Propagation

After adding your DNS records, you'll need to wait for the changes to propagate across the internet.

If you had existing DNS records with a long TTL (Time To Live) value, you may need to wait for that TTL to expire before the changes take effect. For example, if your previous records had a TTL of 24 hours (86400 seconds), it could take up to 24 hours for all DNS servers to pick up the new records, even after you've deleted the old ones.

During this time, Flowershow will automatically check your domain configuration every few seconds and update the status.

![[Pasted image 20250611003056.png]]

## Understanding Domain Status

In your Flowershow dashboard, you'll see one of these statuses:

- **🟡 Pending Verification**: You need to add the TXT record to verify ownership
- **🔴 Invalid Configuration**: Your DNS records aren't set up correctly (or your changes hasn't propagated yet)
- **🔵 (Valid Configuration)**: Everything is working! Your domain is live.

> [!important]
> The domain status in your Flowershow dashboard only checks the SSL configuration on Vercel (our hosting provider). This means your domain may show as "Valid Configuration" even if you're seeing SSL handshake errors in your browser. This happens because Flowershow can only verify the SSL status on its own servers, not any additional SSL certificates that might be in the process of being set up by your DNS provider. If you're using a DNS provider that offers SSL/proxy services (like Cloudflare), you might experience temporary SSL handshake errors while their certificates are being provisioned. See the "SSL Certificates and Handshake Errors" section below for more details.

## Troubleshooting Common Issues

### "Invalid Configuration" Status Won't Clear

1. Double-check that your DNS records match exactly what's shown in your Flowershow dashboard.
2. See if you don't have another A record for your domain (with @ or empty host). If so, you'll need to remove it and leave only the one provided by Flowershow.
3. Wait a bit longer. DNS changes can take up to 24 hours to propagate.

### "Pending Verification" Status Won't Clear

1. Double-check that your TXT record matches exactly what's shown in your Flowershow dashboard.
2. Wait a bit longer. DNS changes can take up to 24 hours to propagate.

### Domain Works Sometimes But Not Always

This could happen for two reasons:

1. **DNS Propagation**: If you just made the changes, DNS propagation might still be in progress. Wait up to 24 hours for it to stabilize.

2. **Multiple A Records**: If you have multiple A records for your root domain (@), DNS resolvers will use round-robin load balancing between them. This means some requests will go to Flowershow's servers (working) while others go to different servers (not working). Check your DNS settings and remove any extra A records for the @ host.

### SSL Certificates and Handshake Errors

You might encounter SSL handshake errors during the initial setup if you're using a DNS provider that offers SSL/proxy services. This happens because there are actually two SSL certificates involved in securing your site:

1. **Vercel's SSL Certificate**:
   - Vercel (Flowershow's hosting provider) automatically provisions an SSL certificate for your domain
   - This certificate handles HTTPS for direct connections to Vercel's servers
   - It's used when traffic goes directly to Vercel (when not using a DNS provider's proxy)

2. **DNS Provider's SSL Certificate**:
   - If you're using your DNS provider's proxy/SSL features (like Cloudflare's proxy or similar services) your DNS provider provisions its own SSL certificate
   - This certificate handles HTTPS between users and the DNS provider's servers
   - The DNS provider then forwards traffic to Vercel using Vercel's SSL certificate

The SSL handshake errors occur because:
- Users connect to your DNS provider's servers first
- During initial setup, your DNS provider's certificate isn't ready yet
- This causes temporary handshake failures until their certificate is fully provisioned
- Once both certificates are in place, you get end-to-end HTTPS encryption: User ↔️ DNS Provider ↔️ Vercel

For example, with Cloudflare:
- This happens when using their proxy feature (orange cloud icon in DNS settings)
- The errors are temporary and typically resolve within 5-10 minutes
- No action is needed - just wait for Cloudflare's SSL certificate provisioning to complete

Similar temporary SSL handshake errors can occur with other DNS providers that offer SSL/proxy services. These issues typically resolve themselves once the provider's SSL certificate is fully provisioned.

## Understanding DNS

### What is DNS?

DNS is like the internet's phone book. When someone types your domain name (e.g., `myblog.com`) in their browser:

1. Their computer asks a DNS resolver (usually provided by their internet service provider) for your domain's IP address
2. The resolver checks its cache for a recent answer
3. If not found or expired, it asks authoritative DNS servers for the information
4. Once it gets the IP address, the browser can connect to your website

### DNS Records and Providers

- Your **domain registrar** (where you bought your domain) might not be your **DNS provider**
- DNS records are stored on your DNS provider's servers (called "nameservers")
- Common DNS providers include:
  - Your domain registrar (e.g., GoDaddy, Namecheap)
  - Cloud providers (e.g., Cloudflare, AWS Route 53)
  - Your hosting company's nameservers

### Why Changes Take Time

When you update DNS records:

1. Your changes are saved to your DNS provider's nameservers
2. DNS resolvers around the world have old information cached
3. Each cached record has a TTL (Time To Live) value
4. Resolvers must wait for the TTL to expire before checking for new records
5. Different resolvers expire their cache at different times
6. This is why some users might see your changes before others

This process, called "DNS propagation," typically takes a few minutes to a few hours, but can take up to 24 hours depending on the previous TTL values.

> [!info]
> You can't speed up DNS propagation - it's a fundamental part of how the internet works to reduce load on DNS servers and make domain name resolution faster for everyone.

### DNS Glossary

- **DNS (Domain Name System)**: The internet's directory system that converts human-readable domain names (like myblog.com) into IP addresses that computers use to communicate.
- **DNS Record**: An instruction that lives on DNS servers and provides information about a domain, including where to direct traffic.
- **A Record**: A fundamental DNS record that points a domain directly to an IP address. It's primarily used for root/apex domains.
- **CNAME Record**: A DNS record that points one domain name to another domain name (rather than to an IP address). Commonly used for subdomains.
- **TXT Record**: A DNS record type that holds text information. Often used for domain ownership verification and security settings.
- **TTL (Time To Live)**: The amount of time (in seconds) that DNS servers should cache a DNS record before checking for updates.
- **DNS Propagation**: The time it takes for DNS changes to spread across all DNS servers globally.
- **Root/Apex Domain**: The main domain without any subdomain (e.g., example.com).
- **Subdomain**: A domain that's part of a larger domain (e.g., blog.example.com).
- **DNS Provider/Nameserver**: Servers that store your DNS records and respond to DNS queries about your domain.
- **SSL Certificate**: A digital certificate that enables secure HTTPS connections by encrypting data between a user's browser and a web server.
- **SSL Handshake**: The process where a browser and server establish a secure connection by verifying SSL certificates and agreeing on encryption methods.
- **DNS Proxy**: A service offered by some DNS providers that sits between users and your web server, potentially offering additional features like caching, SSL, or security.

## Summary

While the process involves several technical steps, each one is straightforward when you follow the instructions carefully. Take your time, double-check each setting, and don't hesitate to reach out for help if needed.
