---
title: "Your sites now live on flowershow.me"
date: 2026-04-02
description: Published Flowershow sites have moved to clean subdomains on flowershow.me — your site is now at sitename-username.flowershow.me.
authors:
  - olayway
image: "[[assets/flowershow-me-subdomain.png]]"
---

Every published Flowershow site now has its own subdomain on `flowershow.me`. Old URLs redirect automatically, so nothing breaks for your existing readers.

## New URL format

Your site address is now:

```
https://{sitename}-{username}.flowershow.me
```

For example, `garden-johndoe.flowershow.me` instead of `my.flowershow.app/@johndoe/garden`.

Subdomains are assigned automatically at site creation and are not user-modifiable. Custom domains are unaffected.

## Old URLs still work

Existing `my.flowershow.app/@username/sitename` links redirect to the new subdomain. No need to update anything — but it's a good time to share your new URL.

## Update your CLI

Run the latest CLI to see new URLs in `flowershow list` output:

```sh
npm install -g @flowershow/publish@latest
```
