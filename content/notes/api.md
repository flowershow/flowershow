---
date: 2023-04-04
---

# API

## Project

### POST `/api/project`

Looks for a GitHub repo, creates a Project object from it and indexes it on Typesense.

**Example request body:**

```json
{
    "owner": "datahubio",
    "name": "test-data-repo-2"
}
```

**Example response:**

```json
{
  "name": "test-data-repo-2",
  "owner": "datahubio",
  "github_repo": "https://github.com/datahubio/test-data-repo-2",
  "id": "15bc6d45d8eb469930bd61a6ee78dddcb20675aa",
  "metadata": {},
  "readme": "CBOE Volatility Index (VIX) time-series dataset including daily open, close,\nhigh and low. The CBOE Volatility Index (VIX) is a key measure of market\nexpectations of near-term volatility conveyed by S&P 500 stock index option\nprices introduced in 1993."
}
```

### GET `/api/project?owner=...&name=...`

Gets a Project object indexed on Typesense based on the `owner` and `name` query params.

**Example URL:**

`/api/project?owner=datahubio&name=test-data-repo-2`

**Example response:**

```json
{
  "name": "test-data-repo-2",
  "owner": "datahubio",
  "github_repo": "https://github.com/datahubio/test-data-repo-2",
  "id": "15bc6d45d8eb469930bd61a6ee78dddcb20675aa",
  "metadata": {},
  "readme": "CBOE Volatility Index (VIX) time-series dataset including daily open, close,\nhigh and low. The CBOE Volatility Index (VIX) is a key measure of market\nexpectations of near-term volatility conveyed by S&P 500 stock index option\nprices introduced in 1993."
}
```