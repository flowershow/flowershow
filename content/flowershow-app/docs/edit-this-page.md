---
title: '"Edit this page" links'
description: Display an “Edit this page” link at the bottom of each page that takes users directly to the file in your GitHub repo, ready for editing.
---

## Configuration

> [!important]
> Your GitHub repository must be **public**

To enable the button **on all pages**, this in your site's [[config-file|config file]].

```json
{
  showEditLink: true
}
```

### Per-page control

To hide the link on a specific page when it's enabled site-wide:

```yaml
---
title: My Page
showEditLink: false  # Disable on this page
---
```

You can also show it only on specific pages (without enabling it the site-wide in the config file):

```yaml
---
title: My Page
showEditLink: true  # Enable on this page
---
```

> [!info]
> For a detailed guide including examples and step-by-step instructions, check out [[how-to-add-edit-this-page-button|this blog post]].
