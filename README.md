# Developer guide

DataHub Cloud is a NextJS multitenant application designed for seamlessly publishing markdown content from GitHub repositories. This README serves as a comprehensive guide for developers working on the project.

## Environment

The NextJS app is deployed on Vercel and utilizes several services, including PostgreSQL for database and R2 Cloudflare buckets for content storage. Authentication is built using NextAuth and GitHub OAuth app.

## Branching Strategy

The repository maintains two major branches for development:

- **`main` (production)**:
  - This is a protected branch. Direct pushes are prohibited. Changes should progress from local development to a pull request against the `staging` branch, undergo testing, and finally merge into `main`.
- **`staging`**:
  - Serves as the staging branch for testing before production deployment.

## Databases

We use Vercel's PostgreSQL databases for storing user accounts and sites metadata. There are two separate databases:

- `datahub-cloud` for production
- `datahub-cloud-staging` for staging

For local development it's best to set up a local PostgreSQL database.

> Or maybe also create `datahub-cloud-dev` since we still need to use R2 bucket cuz it's not possible to emulate that?

## Content Storage

For storing copies of user sites content (from GitHub repositories), we utilize R2 Cloudflare buckets:

- `datahub-cloud` for production
- `datahub-cloud-staging` for staging
- `datahub-cloud-dev` for local development

For app-wide config and assets we use `datahub-assets` R2 bucket which includes specifically:
- favicon
- logo
- thumbnail
- `config.json` with app's config (see more info below)

## OAuth Applications

There are three separate OAuth apps registered under the Datopian account for different purposes:

- `DataHub Cloud` for production
- `DataHub Cloud - Staging` for staging
- `DataHub Cloud - Dev` for local development

Ensure the correct OAuth app is linked based on your development environment.

## Domain and DNS settings

### Root domain: datahub.io

There are two separate projects that are using datahub.io **root** domain:
1. DataHub Cloud app: For user sites available at `https://datahub.io/@<username>/<projectname>` (Vercel project: https://vercel.com/datopian1/datahub-next-new)
2. DataHub.io website: For datahub.io landing pages - `/`, `/publish`, `/pricing`, `/collections` (Vercel project: https://vercel.com/datopian1/datahub-io)

Since both of these projects are using the single root datahub.io domain, there is a reverse proxy worker on Cloudflare set up to serve content from a relevant app based on the path, like so:
- `/`, `/publish`, `/pricing`, `/collections` are routed to `datahub-io` Vercel project
- any other paths are routed to `datahub-next-new` Vercel project

Worker: https://dash.cloudflare.com/83025b28472d6aa2bf5ae59f3724aa78/workers/services/view/datahub-io-reverse-proxy

### Subdomains

DataHub Cloud dashboard uses `cloud` subdomain and `staging-cloud` for staging environment.

## Environment Variables

All the necessary environment variables should be defined in a `.env` file. Create this file based on the provided `.env.example`.

- It is crucial to reflect any changes or additions to the environment variables in `env.mjs`.
- Use `import { env } from './env.mjs'` for accessing environment variables to ensure proper handling and avoid direct access through `process.env`.

Note: you can find most of the development variable values in Vercel https://vercel.com/datopian1/datahub-next-new/settings/environment-variables (filter for "Development" variables).

## App config

`datahub-next` is now a product-agnostic project that can be used to deploy other apps like DataHub Cloud using the same codebase and configuring it via environment variables and a special `config.json` file (path to it can be set with `APP_CONFIG_URL` environment variable and is currently stored in `datahub-io` R2 bucket with other app's assets)

The config file can be used to set app's:
- title,
- description,
- favicon URL,
- logo URL,
- thumbnail URL,
- nav links,
- social links,
- site aliases (see "Caveats" section below)
- etc.

Here is DataHub Cloud's config.json file: https://dash.cloudflare.com/83025b28472d6aa2bf5ae59f3724aa78/r2/default/buckets/datahub-assets/objects/config.json/details

If you want to modify app's settings, download the config file, adjust it and re-upload to the bucket.

## Development Workflow

1. For new features or bug fixes, start by creating a new branch from `staging`.
2. Make your changes locally, ensuring adherence to coding standards and thorough testing.
3. Create a pull request against `staging` for review and further testing.
4. Once approved and tested on `staging`, a project maintainer will merge the changes into `main` for production deployment.

### Squash-based system

1. Developers work on their branches, where they can have as many commits as they want with any commit messages they like.
2. Developers submit PRs against `staging` branch.
3. Main developer reviews every PR and squash-merges it to the `staging` branch using a commit message following "conventional commits" specification (or similar; currently following our old syntax; TBD). (Possibly many PRs are merged to the `staging` branch before step 4.) Also: the main developer adds a link to the related gh issue if relevant.
4. Main developer rebases changes from staging branch to main.

In case the main dev is OOF: 
Follow the same process, i.e.:
- branch --(squash merge)-->staging
- staging --(rebase)-->main
Don't worry about the squash merge commit message too much. The main dev can adjust it later if needed. 

## Setup for Local Development

1. Clone the [repository](https://github.com/datopian/datahub-next).
2. Set up the local development environment by creating a `.env` file from `.env.example`.
3. Set up local Postgres database.
4. Edit database variables in `.env` file
5. Run `pnpm fetch-config` or create your own `config.json` file in the root of the app with app's settings.
5. Install pnpm: `npm install -g pnpm`
6. Install project dependencies with `pnpm i`.
7. Generate prisma schema with `npx prisma generate`
8. Create schema in local database with `npx prisma db push`
9. Run the development server with `pnpm dev`.
10. Run `npx inngest-cli@latest dev --no-discovery -u http://localhost:3000/api/inngest` to start local Inngest instance and connect it the the app.
11. Visit app at `cloud.localhost:3000` (port may vary).

## Tests

1. Make sure you have access to this repository: https://github.com/datopian/datahub-cloud-test-repo

2. Start the app:

```sh
pnpm dev
```

3. Create a new site using the above mentioned repository in your local DataHub Cloud.

4. Run the following command to run the tests.

```sh
# pnpm test:e2e
npx playwright test
```

Note, that when running the tests locally, you need to make sure to sync the site manually each time you make changes to the test repository.

### Running in debug mode

```sh
npx playwright test --debug
```

### Running in UI mode

```sh
npx playwright test --ui
```

## Caveats

### Special `datahub.io/xxx` pages

- `/core/xxx`
  - alias for `/@olayway/xxx`
  - sites published on `olayway`'s account off of GitHub repositories found in https://github.com/datasets organisation
  - e.g. `/core/airport-codes` is a site named `airport-codes` published on `olayway` user account
- `/blog`
  - alias for `@olayway/blog`
  - site published on `olayway`'s account off of https://github.com/datahubio/blog
  - auto-syncs so no need for the site owner to manually sync after changes
- `/collections`
  - alias for `@olayway/collections`
  - site published on `olayway`'s account off of https://github.com/datasets/awesome-data
  - auto-syncs so no need for the site owner to manually sync after changes
- `/docs`
  - alias for `@olayway/docs`
  - site published on `olayway`'s account off of https://github.com/datahubio/datahub-cloud-template
  - auto-syncs so no need for the site owner to manually sync after changes
- `/notes`
  - alias for `@rufuspollock/data-notes`
  - site published on `rufuspollock`'s account off of https://datahub.io/@rufuspollock/data-notes

Q: Why the above aliases are used?
A: All the above mentioned pages are just "sites" built using DataHub Cloud (dogfooding). Since we don't want them to be available at `@some-dh-team-member/abc-site` we created aliases for them.

Q: How can these be modified/extended?
A: Through `siteAliases` field in the app's `config.json` file.
