---
title: '"Edit this page" links'
description: Display an "Edit this page" link at the bottom of each page that takes users directly to the file in your GitHub repo, ready for editing.
---

## Configuration

> [!important]
> Your GitHub repository must be **public**

To enable the button **on all pages**, add this to your site's [[config-file|config file]]:

```json
{
  "showEditLink": true
}
```

![[edit-this-page-button.png]]

### Per-page control

To hide the link on a specific page when it's enabled site-wide:

```yaml
---
title: My Page
showEditLink: false
---
```

You can also show it only on specific pages (without enabling it site-wide in the config file):

```yaml
---
title: My Page
showEditLink: true
---
```
