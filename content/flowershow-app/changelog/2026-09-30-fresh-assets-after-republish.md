---
title: Updated CSS, JS and images show up right after you republish
date: 2026-09-30
description: Republishing a site no longer leaves old stylesheets, scripts, images or deleted files cached for minutes.
authors:
  - rufuspollock
showToc: false
---

When you republished a site with `fl`, from the dashboard or with anonymous publish, pages updated straight away but stylesheets, scripts and images could keep showing the old version for several minutes. Deleted files could also still load. Each file's URL now changes whenever its content changes, so the new version is served as soon as publishing finishes. This is especially useful when you republish an HTML site built with an AI tool. You don't need to change anything, and older versions of the CLI benefit too.
