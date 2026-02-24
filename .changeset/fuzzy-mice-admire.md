---
"@flowershow/publish": minor
---

The CLI now collects anonymous usage data via PostHog to help understand how commands are used and improve the product. Telemetry is sent for all commands: publish, sync, list, delete, auth login, auth logout, and auth status.

No personally identifiable information is collected. Events include the command name and basic outcome (success/error).
