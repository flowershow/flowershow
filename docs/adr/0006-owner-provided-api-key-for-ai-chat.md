# Owner-provided API key for AI Chat

AI Chat (the RAG-based Q&A feature on published sites) requires the site owner to supply their own Anthropic API key, stored in site settings. The feature is disabled for any site without a configured key. Only Anthropic is supported for now; other providers (OpenAI, Gemini, etc.) may be added later.

We chose this over platform-provided keys (where Flowershow absorbs LLM costs) because AI Chat usage is unbounded per site and per visitor — the platform has no lever to control spend without complex per-query metering. Owner-provided keys make cost and usage the owner's responsibility by default, keep the feature opt-in, and avoid tieing it to a specific billing plan. Flowershow absorbing the cost would require a new pricing tier and usage metering infrastructure before the feature could ship.

## Consequences

Site owners must have an Anthropic account and configure a key before AI Chat appears on their site. This raises the setup bar but avoids blocking the initial release on pricing and cost-control work.
