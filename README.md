# DataHub Cloud Developer Guide 🚧

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

1. Clone the repository.
2. Set up the local development environment by creating a `.env` file from `.env.example`.
3. Install dependencies with `pnpm i`.
4. Run the development server with `pnpm dev`.
