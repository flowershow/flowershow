---
title: Analytics
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

Flowershow supports different analytics providers. It might not be as feature rich as the official analytics providers but it should be sufficient for simple use cases.
(See [[docs/config|this chapter]] about basic user configurations.)

```js
// config.mjs
{
	analyticsConfig: {
        plausibleAnalytics: {
            plausibleDataDomain: 'tailwind-nextjs-starter-blog.vercel.app',
        },
        simpleAnalytics: {
            src: "https://scripts.simpleanalyticscdn.com/latest.js"
        },
        umamiAnalytics: {
            umamiWebsiteId: '123e4567-e89b-12d3-a456-426614174000',
        },
        posthogAnalytics: {
            posthogProjectApiKey: '123e4567-e89b-12d3-a456-426614174000',
        },
        googleAnalytics: {
            googleAnalyticsId: 'G-XXXXXXX',
        },
    }
}
```
You can use multiple analytics at the same time or just one. For example, you can add PostHog analytics as follows:
```js
// config.mjs
{
	analyticsConfig: {
        posthogAnalytics: {
            posthogProjectApiKey: '123e4567-e89b-12d3-a456-426614174000',
        }
    }
}
```

# Legacy analytics
> [!warning] Deprecated
> The following feature shouldn't be used, as it's now deprecated

[Google Analytics](https://analytics.google.com/analytics/web/provision/#/provision) ([GA4](https://support.google.com/analytics/answer/10089681?hl=en)) is still supported.

## Google Analytics

Set your google analytics key in the `config.js` file.
(See [[docs/config|this chapter]] about basic user configurations.)

```js
// config.js
// Google analytics key e.g. G-XXXX
{
	analytics: 'your-google-analytics-key',
}
```
