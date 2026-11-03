# Plugin packages

`flowershow/` is the package for the ChatGPT and Codex plugin directory ([submission guide](https://developers.openai.com/plugins/deploy/submission)). It connects the signed-in MCP server, `https://flowershow.app/api/mcp/account`, over OAuth.

Build the ZIP from inside the package folder, so `plugin.json` is at the ZIP root:

```sh
cd plugins/flowershow && zip -r ../../flowershow-plugin.zip . -x '.*' && cd -
```

Reviewer credentials never go in the package (the portal rejects `test_credentials`). They go in **Review information → Review details** on the [Plugins](https://platform.openai.com/plugins) page, for the account `apps/flowershow/scripts/seed-review-account.ts` sets up. The test cases in `plugin.json` use that account's sample sites, so run its `seed` command before each review.

Domain verification: put the portal's token in the `OPENAI_APPS_CHALLENGE` env var on production and redeploy; `https://flowershow.app/.well-known/openai-apps-challenge` then serves it.

Changes to `plugin.json` or `assets/` need a new ZIP (bump `version`). Tool changes on the MCP server don't: OpenAI rescans the server.
