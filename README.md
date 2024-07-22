# DataHub Cloud Developer Guide 🚧 🚧

Welcome to the DataHub Cloud developer guide. DataHub Cloud is a NextJS multitenant application designed for seamlessly publishing markdown content from GitHub repositories. This README serves as a comprehensive guide for developers working on the project.

## Environment

The NextJS app is deployed on Vercel and utilizes several services, including PostgreSQL for database needs and R2 Cloudflare buckets for content storage. Authentication is built using NextAuth and GitHub OAuth app.

## Branching Strategy

The repository maintains two major branches for development:

- **`r2` (production)**: This is a protected branch. Direct pushes are prohibited. Changes should progress from local development to a pull request against the `staging` branch, undergo testing, and finally merge into `r2`. Deployed to:

  - https://cloud.datahub.io/ for user dashboard,
  - https://dev.datahub.io/ for product pages (e.g. landing page).

- **`staging`**: Serves as the staging branch for testing before production deployment. Deployed to:
  - https://staging-cloud.datahub.io/ for user dashboard,
  - https://staging-dev.datahub.io/ for product pages (e.g. landing page).

## Databases

We use Vercel's PostgreSQL databases for storing user accounts and sites metadata. There are separate databases for different environments:

- `datahub-cloud` for production
- `datahub-cloud-staging` for staging

For local development it's best to set up a local PostgreSQL database.

> Or maybe also create `datahub-cloud-dev` since we still need to use R2 bucket cuz it's not possible to emulate that?

## Content Storage

For storing copies of user sites content, we utilize R2 Cloudflare buckets:

- `datahub-cloud` for production
- `datahub-cloud-staging` for staging
- `datahub-cloud-dev` for local development

## OAuth Applications

There are three separate OAuth apps registered under the Datopian account for different purposes:

- `DataHub Cloud` for production
- `DataHub Cloud - Staging` for staging
- `DataHub Cloud - Dev` for local development

Ensure the correct OAuth app is linked based on your development environment.

## Environment Variables

All necessary environment variables should be defined in a `.env` file. Create this file based on the provided `.env.example`.

- It is crucial to reflect any changes or additions to the environment variables in `env.mjs`.
- Use `import { env } from './env.mjs'` for accessing environment variables to ensure proper handling and avoid direct access through `process.env`.

## Development Workflow

1. For new features or bug fixes, start by creating a new branch from `staging`.
2. Make your changes locally, ensuring adherence to coding standards and thorough testing.
3. Create a pull request against `staging` for review and further testing.
4. Once approved and tested on `staging`, a project maintainer will merge the changes into `r2` for production deployment.

## Setup for Local Development

1. Clone the [repository](https://github.com/datopian/datahub-next).
2. Set up the local development environment by creating a `.env` file from `.env.example`.
3. Create Postgres database
4. Edit database variables in `.env` file
5. Install pnpm: `npm install -g pnpm`
6. Install project dependencies with `pnpm i`.
7. Generate prisma schema with `npx prisma generate`
8. Create schema in local database with `npx prisma db push`
9. Run the development server with `pnpm dev`.
10. Run `npx inngest-cli@latest dev --no-discovery -u http://localhost:3000/api/inngest` to start local Inngest instance and connect it the the app.

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

Main DataHub Cloud landing page as well as `/opensource` and `/enterprise` can be located in `/app/home` folder. These are regular Next.js pages.

However, there are some pages available under `/xxx` (as compared to `/@<username>/<sitename>`) and are not Next.js pages written in tsx files. These include:

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
A: All the above mentioned pages are just "sites" built using DataHub Cloud (dogfooding). Since we don't want them to be available at `@some-dh-team-member/abc-site` we created aliases for them. This is probably a temporary solution and on top of URL rewrites require a few hacks scattered throughout the code to make things work.

Q: How can these be modified/extended?
A: Take a look at `/middleware.ts` file.
