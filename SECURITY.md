# Security Policy

We take the security of Flowershow and the sites it hosts seriously. Thank you
for helping keep Flowershow and its users safe.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, use one of the private channels below:

1. **GitHub private vulnerability reporting (preferred).**
   Go to the [Security tab](https://github.com/flowershow/flowershow/security)
   of this repository and click **"Report a vulnerability"**. This opens a
   private advisory visible only to you and the maintainers.

2. **Email.** If you cannot use GitHub advisories, email
   `support@flowershow.app`.

Please include, where possible:

- A description of the vulnerability and its impact.
- The affected component and version / commit.
- Step-by-step reproduction (a proof-of-concept or `curl` sequence is ideal).
- Any suggested remediation.

## What to expect

- We aim to acknowledge your report within **3 business days**.
- We will confirm the issue, keep you updated on remediation progress, and let
  you know when a fix ships.
- We are happy to coordinate disclosure timing and, where appropriate, to
  request a CVE — or to credit you in the resulting advisory if you'd like.
- Please give us a reasonable opportunity to remediate before any public
  disclosure.

## Scope

In scope: the Flowershow application (`apps/flowershow`), the CLI
(`apps/cli`), the Cloudflare worker (`apps/cloudflare-worker`), and the
published sites they serve.

Out of scope: reports that require physical access to a user's device, social
engineering, or third-party services we do not control.
