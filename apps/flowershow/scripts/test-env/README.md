# Local test environment

A local copy of Flowershow with its own database, seeded with one user per plan, that a person or an agent can sign in to and drive in a real browser. Use it to check a change in the real app before merging, not only against mocks.

## Start

From `apps/flowershow`:

```bash
bash scripts/test-env/up.sh   # Docker (Colima), Postgres, S3 mock, .env, migrations, seed
pnpm dev                      # the app on :3000
```

`seed.ts`, `login.ts` and `race-cover.ts` refuse any database that is not on localhost, so they can never touch the shared preview or production database.

## Seeded users

| Username | Plan | Sites |
| --- | --- | --- |
| `te-free` | Free | 2 Free |
| `te-premium` | Premium per site | 1 Premium with a custom domain, 1 Free |
| `te-pro` | Pro, 5 sites | 5 covered (one with a custom domain), 1 Free, 1 on its own subscription, 1 granted |
| `te-unlimited` | Unlimited | 3 covered |
| `te-buyer` | none | 2 Free; buy a plan as this user to test real Stripe checkout |

Stripe ids on the seeded subscriptions are fake (`testenv_*`), so anything that calls Stripe for those users fails. Re-running `seed.ts` resets these users.

## Sign in and look

```bash
npx tsx --env-file=.env scripts/test-env/login.ts te-pro            # mints a session, no OAuth
npx tsx scripts/test-env/browse.ts te-pro /settings/billing         # screenshot + page text
```

Output goes to `test-results/test-env/` (gitignored), including the login file. `browse.ts` maps `*.flowershow.local` to 127.0.0.1 inside Chromium, so no `/etc/hosts` changes are needed. To use your own browser instead, add `127.0.0.1 cloud.flowershow.local my.flowershow.local` to `/etc/hosts`.

Account plans are on under `next dev` only (`ACCOUNT_PLANS_LIVE` in `lib/account-plans.ts`); every deployed build keeps them off until launch.

## Checks

- `race-cover.ts`: covers two sites at once with one Pro slot free, against the real database; exactly one must succeed. It fails if the account-row lock in `setSiteCovered` is removed.

## Stripe test mode

Checkout needs a Stripe **test** secret key as `STRIPE_SECRET_KEY` in `.env`, and webhooks forwarded to the app:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook   # prints the whsec_ for STRIPE_WEBHOOK_SECRET
```

Pay with card `4242 4242 4242 4242`, any future date and CVC. The account-plan products and prices in test mode come from `scripts/stripe-account-plans-setup.mjs` in the private product repo. Never pass `--live` to the Stripe CLI here.

## Stop

```bash
docker compose -p fs-testenv down     # keep data
docker rm -f fs-testenv-s3
colima stop
```
