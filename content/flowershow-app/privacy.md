---
title: Privacy Policy
---

Last updated: 2026-11-11

This policy explains what personal data Flowershow collects, why, who we share it with, how long we keep it, and what you can do about it. It covers flowershow.app, the Flowershow dashboard (cloud.flowershow.app), sites published on Flowershow, the `fl` command line tool, and the Flowershow connector (MCP server) used from AI tools such as Claude and ChatGPT.

Flowershow is run by **Viderum Inc., trading as Datopian**, 303 Twin Dolphin Drive, Suite 600, Redwood City, CA 94065, United States ("we", "us"). We are the controller of the personal data described here. Questions: **support@flowershow.app**.

## The short version

- To publish under your account you sign in with GitHub, Google or an email link. We keep your name, username, email address and profile picture.
- What you publish is public unless you password-protect the site. We store it so we can serve it.
- You can publish without an account. Those sites expire after 7 days unless you claim them.
- We use PostHog for product analytics and Stripe for payments. Analytics cookies are set only if you accept them on flowershow.app or the dashboard, never on published sites. We do not sell your data and we do not use it for advertising.
- You can delete your sites and your account from the dashboard at any time.

## What we collect and why

### Your account

When you sign in we receive from GitHub or Google your name, email address, username (GitHub login) and profile picture URL, and the provider's account ID. If you sign in by email link we receive only your email address. Sign-in with GitHub or Google also gives us an access token for that provider, which we store with your account.

We use this to create and run your account, show your name and picture in the dashboard, link sign-ins from different providers to the same account when the provider has verified the email address, and send you service emails (sign-in links, billing and renewal notices, account and site notices).

Your browser keeps a signed session cookie for up to 30 days.

### Content you publish

We store the files you publish (Markdown, HTML, images and other files), site settings and publish history, and index the text of your pages so site search works. Publish history records who published each change, from where (dashboard, CLI, GitHub, Obsidian or an AI tool) and, for GitHub, the commit message. Published sites are public on the internet, and their pages are also available as raw Markdown, unless you turn on password protection. If you set a password we store only a hash of it.

If you connect a GitHub repository we install the Flowershow GitHub App on the account or organisation you choose and record the installation and the repositories it can access, so we can sync them. You can remove the app from GitHub at any time.

Do not publish personal data about other people unless you have the right to. You are responsible for what you publish; see our [Terms of Service](/terms-of-service).

### Publishing from AI tools (the Flowershow connector)

You can add the Flowershow connector to an AI tool such as Claude or ChatGPT. When you ask the AI tool to publish, it sends Flowershow the files it wrote (for example a page of HTML or Markdown) and a site name. We store and publish those files like any other content. **We do not receive your conversation with the AI tool**, only what the tool sends to publish. The AI tool's own privacy policy covers your conversation.

- **Without signing in**, the connector creates an anonymous site (see below) and returns its address and a claim link.
- **Signed in**, you approve the AI tool on a Flowershow consent page (OAuth). We store a record of that approval: which tool (its name and the web address that identifies it), the permissions granted, when it was granted and last used, and the redirect address. Access and refresh tokens and authorisation codes are stored only as SHA-256 hashes. You can see and revoke each connected tool in your dashboard; revoking stops it from using your account.
- **Signed in**, the AI tool can also list your sites, list the files on a site and read the text of a file, when you ask it to change a site. What it reads is sent to the AI tool and its provider, and their privacy policy covers it from there.

The command line tool (`fl`) and personal access tokens work the same way: we store only hashes of the tokens, with their name and last-used time.

### Anonymous sites (no account)

You can publish without an account from flowershow.app, the CLI or the AI connector. We store the files you publish and a random anonymous owner ID kept in a cookie in your browser (or held by the tool), so you can update the site and claim it later.

To limit abuse we store a one-way hash of your IP address (keyed with a server secret) on the site, and cap how many sites one address can create per hour. We do not store the IP address itself. The sign-in (OAuth) and connector endpoints also count requests per hashed IP address; those counters are deleted when their time window ends.

An anonymous site expires 7 days after it is created unless you claim it into an account. Expired sites, their files and their search index entries are deleted automatically by a daily job. If you claim a site, it becomes part of your account and we delete the IP hash.

### Site editors

A site owner can invite other people to edit a site by email address. We store the invited email address, who sent the invite, when it expires, and a hash of the invite token, and we send the invite by email. Once accepted, we record that the person is an editor of the site. Editors can publish to the site and manage its annotations. The owner can remove an editor, and an editor can leave, at any time.

### Notes left on published pages (annotations)

Where a site owner enables it, visitors can leave a note on a passage of a page, reply to notes, and mark notes resolved. We store the note or reply, the passage it refers to and, if you give one, the name you typed (also when you resolve a note). You do not need an account and we do not store your IP address with the note. Notes and replies are visible to anyone who can open that page, and the site owner and editors can reply, resolve or delete them; replies from the owner are marked as such.

### Payments

Paid plans are billed by **Stripe**. You enter your card details on Stripe's pages; we never see or store your card number. We store the Stripe customer and subscription IDs, the plan, billing interval, status and renewal dates for each paid site.

### Abuse reports and messages to us

If you report a site through the [report abuse form](/report-abuse) we receive the page address, the reason and details you give, your email address if you give one, and a shortened hash of your IP address (to limit repeat reports). If you email us we keep the email to answer you.

### Analytics and logs

We use **PostHog** to understand how Flowershow is used and to fix problems.

- **On flowershow.app and the dashboard** we ask before setting analytics cookies. If you accept, PostHog records events such as page views, clicks, sign-ups, publishes and errors, with your browser and device type and an approximate location (country, region and city) worked out from your IP address; when you are signed in we link these events to your account ID, username and email address. Until you choose, and if you reject, we record the same events without cookies and without linking them to you: PostHog counts visits with a one-way hash of your IP address and browser that changes every day, and we add the same approximate location, which our hosting provider works out from your IP address. In both cases PostHog does not store your IP address. You can change your choice at any time in [cookie settings](#cookie-settings).
- **On sites published on Flowershow** we never set analytics cookies or store anything in your browser for analytics. Visits are counted the same cookieless way, with the same approximate location.

Our servers also record key actions, such as sign-ups, publishes and purchases, against your account ID in PostHog, whatever your cookie choice, to run and improve the service. Requests to PostHog are routed through flowershow.app, and links that contain a claim token are stripped of that token before they are sent. We do not record your screen sessions.

Our servers also keep operational logs (request paths, errors, timing) to run and secure the service.

### Analytics added by site owners

Site owners can add their own Google Analytics, Umami or giscus comments to their sites. Those tools are controlled by the site owner and covered by the owner's privacy policy and the provider's, not this one.

## Cookies

| Cookie | Purpose | Lifetime |
|---|---|---|
| Session (NextAuth) | Keeps you signed in to flowershow.app and the dashboard | 30 days |
| Site owner session | Lets you, as owner, use owner-only features on your own site | 7 days |
| Site password | Remembers that you entered the password for a protected site | Until it expires or you log out |
| Anonymous owner ID | Lets you update and claim sites you published without an account | Up to 1 year |
| PostHog (`ph_…_posthog`) | Analytics on flowershow.app and the dashboard, only if you accept | 1 year |
| PostHog choice (`__ph_opt_in_out_…`) | Remembers whether you accepted or rejected analytics cookies | 1 year |
| PostHog bootstrap (`ph_bootstrap`) | Loads feature flags faster, only if you accepted | 10 minutes |

Sites published on Flowershow set no analytics cookies.

You can block or delete cookies in your browser. Blocking the session or anonymous owner cookie stops sign-in or anonymous editing from working.

## Who we share data with

We do not sell personal data or use it for advertising. We share it only with service providers that run Flowershow for us, under their data processing terms:

| Provider | What for | Data |
|---|---|---|
| Vercel | Hosting the web app | All requests and account data in transit |
| Neon (via Vercel) | Database | Account, site, token-hash and billing records |
| Cloudflare (R2, Workers) | File storage and background publishing jobs | Published files |
| Typesense | Site search index | Text of published pages |
| PostHog | Product analytics, error tracking, logs | Usage events, account ID, username, email |
| Stripe | Payments | Billing details |
| Resend | Sending email | Your email address and the message |
| GitHub, Google | Sign-in; GitHub repository sync | Sign-in data; repository contents you choose to sync |

We may also disclose data if the law requires it, to protect people or the service from harm, or to a buyer or successor if the business is sold or reorganised.

Our providers process data in several places: PostHog in the EU, Typesense in Paris, published files in Cloudflare R2 in Eastern Europe, our database (Neon) in the United States, and Vercel and Cloudflare Workers on their global networks. Transfers outside the UK and EU rely on the providers' standard contractual clauses.

## How long we keep data

- **Account data:** while your account exists. When you delete your account we delete your account record, sign-in links, tokens and connected-tool approvals, and your sites.
- **Published content:** until you delete the site or your account.
- **Anonymous sites:** 7 days unless claimed, then deleted automatically.
- **OAuth codes and pending sign-in requests:** deleted after they expire (minutes). Expired tokens are removed by a regular cleanup job.
- **Billing records:** our copy is deleted with the site or account. Stripe keeps payment and invoice records under its own policy and the tax rules that apply to us.
- **Analytics:** PostHog events for 2 years. PostHog logs for 14 days. Server logs for up to 30 days.
- **Backups:** deleted data remains in our database backups for up to 30 days.

## Your choices and rights

- **Delete a site** from its settings in the dashboard.
- **Delete your account** from Dashboard → Settings. Cancel any active paid subscription first.
- **Disconnect an AI tool** by revoking it in the dashboard, and **revoke CLI tokens** the same way.
- **Remove the GitHub App** from your GitHub settings.
- **Ask us** at support@flowershow.app to access, correct, export or delete your personal data, or to object to or restrict how we use it. We answer within one month.

If you are in the UK or the EU you can also complain to your data protection authority (in the UK, the ICO).

**Legal bases (UK/EU GDPR):** running your account, publishing and billing is necessary to provide the service you asked for (contract). Analytics cookies rely on your consent, which you can withdraw at any time in [cookie settings](#cookie-settings). Cookieless analytics, server-side analytics, security, abuse prevention and service emails rely on our legitimate interest in running a reliable, safe service.

## Security

Passwords for protected sites and all tokens are stored as hashes. Connections are encrypted (HTTPS). Access to production data is limited to the people who run Flowershow. No system is perfectly secure; if you find a vulnerability please email support@flowershow.app.

## Children

Flowershow is not for children under 13 and we do not knowingly collect their data. If you think a child has given us personal data, contact us and we will delete it.

## Changes

We will update this page when our practices change and change the date at the top. For significant changes we will email account holders.

## Contact

Viderum Inc., trading as Datopian, 303 Twin Dolphin Drive, Suite 600, Redwood City, CA 94065, United States. Email **support@flowershow.app**.

Our representative in the UK is Viderum Ltd, trading as Datopian, 49 Greek Street, London W1D 4EG, United Kingdom. Our representative in the EU is Viderum OÜ, trading as Datopian, Ahtri tn 12, 10151 Tallinn, Estonia. You can reach both at the same email address.
