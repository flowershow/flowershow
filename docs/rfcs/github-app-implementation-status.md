# GitHub App Granular Permissions - Implementation Status

## Overview

This document tracks the implementation status of the GitHub App granular permissions feature as outlined in [`plans/github-app-granular-permissions.md`](../../plans/github-app-granular-permissions.md).

**Last Updated:** 2026-01-06

## Implementation Progress

### ✅ Completed (Phase 1 - Backend Infrastructure)

#### 1. Database Schema Changes

**File:** [`prisma/schema.prisma`](../../prisma/schema.prisma)

Added two new models:

- **GitHubInstallation**: Stores GitHub App installation data per user/organization

  - Tracks installation ID, account type, login, and suspension status
  - Links to User and Site models

- **GitHubInstallationRepository**: Tracks accessible repositories per installation
  - Stores repository ID, name, full name, and privacy status
  - Links to GitHubInstallation model

Modified **Site** model:

- Added optional `installationId` field to link sites to GitHub App installations
- Added index for performance

**Next Steps:**

- Run `npx prisma migrate dev --name add-github-app-models` to create migration
- Run `npx prisma generate` to regenerate Prisma client
- The TypeScript errors will resolve after regeneration

#### 2. Environment Variables

**Files:**

- [`env.mjs`](../../env.mjs) - Already configured
- [`.env.example`](../../.env.example) - Already documented

Environment variables required:

```bash
GITHUB_APP_ID=123456
GITHUB_APP_CLIENT_ID=Iv1.abc123def456
GITHUB_APP_CLIENT_SECRET=abc123def456xyz789
GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_TOKEN_ENCRYPTION_KEY=random_hex_string
```

#### 3. Token Management Utilities

**File:** [`lib/github.ts`](../../lib/github.ts)

Implemented:

- `generateGitHubAppJWT()`: Generate JWT for GitHub App authentication
- `refreshInstallationToken()`: Refresh installation access tokens with mutex locking
- `getInstallationToken()`: Get cached token or refresh if expired (< 5 min)
- `clearInstallationTokenCache()`: Clear cached token for an installation

Features:

- In-memory token caching
- Automatic refresh before expiration (5-minute buffer)
- Mutex to prevent concurrent refresh
- Sentry tracing and error logging

**Note:** Package dependency required:

```bash
npm install jsonwebtoken @types/jsonwebtoken
```

#### 4. API Endpoints

All endpoints include Sentry tracing and comprehensive error handling.

##### POST `/api/github-app/installation-url`

**File:** [`app/api/github-app/installation-url/route.ts`](../../app/api/github-app/installation-url/route.ts)

- Generates GitHub App installation URL with CSRF state token
- Supports optional `suggestedTargetId` parameter
- Returns installation URL and state for verification

##### GET `/api/github-app/callback`

**File:** [`app/api/github-app/callback/route.ts`](../../app/api/github-app/callback/route.ts)

- Handles redirect after GitHub App installation
- Fetches installation details and accessible repositories
- Stores/updates installation and repositories in database
- Redirects to appropriate page (settings or new site creation)

##### GET `/api/github-app/installations`

**File:** [`app/api/github-app/installations/route.ts`](../../app/api/github-app/installations/route.ts)

- Lists user's GitHub App installations
- Includes all accessible repositories per installation
- Sorted by creation date (newest first)
- Repositories sorted alphabetically

##### POST `/api/github-app/sync-repositories`

**File:** [`app/api/github-app/sync-repositories/route.ts`](../../app/api/github-app/sync-repositories/route.ts)

- Manually syncs repositories for an installation
- Fetches latest accessible repositories from GitHub
- Updates database with current state
- Returns count of synced repositories

##### DELETE `/api/github-app/installations/:id`

**File:** [`app/api/github-app/installations/[id]/route.ts`](../../app/api/github-app/installations/[id]/route.ts)

- Removes installation from database
- Clears cached tokens
- Cascade deletes repositories
- Verifies user ownership before deletion

#### 5. Webhook Handler

**File:** [`app/api/webhooks/github-app/route.ts`](../../app/api/webhooks/github-app/route.ts)

Handles GitHub App webhook events:

**Installation Events:**

- `installation.created`: Log installation creation
- `installation.deleted`: Remove from database, clear cache
- `installation.suspend`: Mark as suspended, clear cache
- `installation.unsuspend`: Remove suspension status

**Repository Events:**

- `installation_repositories.added`: Add new repositories to database
- `installation_repositories.removed`: Remove repositories from database

Security:

- HMAC SHA-256 signature verification
- Constant-time comparison to prevent timing attacks

#### 6. OAuth Scope Update

**File:** [`server/auth.ts`](../../server/auth.ts)

Changed OAuth scope from:

```typescript
scope: "read:user user:email repo read:org";
```

To:

```typescript
scope: "read:user user:email read:org"; // Removed 'repo'
```

This change affects **new users only**. Existing users retain their `repo` scope until they re-authenticate or migrate to GitHub App.

---

## 🚧 Pending Implementation (Phase 1 - Frontend)

### 7. UI Components

#### GitHub Connection Card Component

**Location:** Create new component in `components/dashboard/github-connection-card.tsx`

Purpose:

- Display GitHub App connection status
- Button to initiate GitHub App installation
- Show connected installations count
- Link to manage installations

#### Repository Selector Component

**Location:** Update [`components/dashboard/create-site.tsx`](../../components/dashboard/create-site.tsx)

Changes needed:

- Fetch installations from `/api/github-app/installations`
- Display repositories grouped by installation
- Show private repository indicator (🔒)
- Disable if no installations connected

#### Installation Management Page

**Location:** Create `app/(dashboard)/cloud/(dashboard)/settings/github/page.tsx`

Features:

- List all user's GitHub App installations
- Show repositories per installation
- Sync button for each installation
- Manage on GitHub link
- Remove installation button
- Last synced timestamp

#### Migration Banner Component

**Location:** Create `components/dashboard/migration-banner.tsx`

Purpose:

- Show to users with OAuth `repo` scope
- Explain benefits of GitHub App
- Button to migrate to GitHub App
- Dismissible option

### 8. Site Creation Flow Updates

**Files to modify:**

- `app/(dashboard)/cloud/(dashboard)/new/page.tsx`
- `server/api/routers/site.ts`

Changes needed:

- Check if user has GitHub App installations
- Show GitHub connection card if no installations
- Pass `installationId` when creating site with GitHub App repository
- Update site creation logic to store `installationId`

---

## 📋 Deployment Checklist

### Before Deployment

- [ ] Install required npm package: `npm install jsonwebtoken @types/jsonwebtoken`
- [ ] Create GitHub App in GitHub settings
  - [ ] Set permissions: `contents: read`, `metadata: read`, `webhooks: write`
  - [ ] Set webhook URL: `https://cloud.flowershow.app/api/webhooks/github-app`
  - [ ] Generate and save private key
- [ ] Set all environment variables in production
- [ ] Run database migration: `npx prisma migrate deploy`
- [ ] Regenerate Prisma client: `npx prisma generate`
- [ ] Test endpoints in staging environment
- [ ] Verify webhook signature validation

### After Deployment

- [ ] Test new user signup flow (should not request `repo` scope)
- [ ] Test GitHub App installation flow
- [ ] Test repository syncing
- [ ] Monitor webhook events
- [ ] Monitor token refresh operations
- [ ] Check Sentry for errors

---

## 🔄 Migration Strategy (Phase 2)

### For Existing Users

1. **Detection**

   - Check if user's Account has `repo` scope in token
   - Show migration banner on dashboard

2. **Migration Flow**

   - User clicks "Upgrade to GitHub App"
   - Redirect to GitHub App installation
   - After installation, prompt to migrate existing sites
   - For each site, check if installation has access to repository
   - Update `site.installationId` for applicable sites

3. **Backward Compatibility**
   - Sites without `installationId` continue using OAuth token
   - Support both token types in GitHub API functions
   - Gradual migration over 8-12 weeks

### Code Changes Needed

Update [`lib/github.ts`](../../lib/github.ts) functions to support both token types:

```typescript
export const fetchGitHubRepoTree = async ({
  ghRepository,
  ghBranch,
  accessToken, // OAuth token (legacy)
  installationId, // GitHub App installation (new)
}: {
  ghRepository: string;
  ghBranch: string;
  accessToken?: string;
  installationId?: string;
}) => {
  // Prefer installation token over OAuth token
  const token = installationId
    ? await getInstallationToken(installationId)
    : accessToken;

  return await githubJsonFetch<GitHubAPIRepoTree>({
    url: `/repos/${ghRepository}/git/trees/${ghBranch}?recursive=1`,
    accessToken: token,
    cacheOptions: { cache: "no-store" },
  });
};
```

Apply similar changes to:

- `fetchGitHubFile()`
- `fetchGitHubFileRaw()`
- `checkIfBranchExists()`
- `createGitHubRepoWebhook()`
- `deleteGitHubRepoWebhook()`

---

## 🐛 Known Issues & Limitations

### Current TypeScript Errors

All Prisma-related TypeScript errors are expected and will resolve after:

1. Running database migration
2. Regenerating Prisma client

Example error:

```
Property 'gitHubInstallation' does not exist on type 'PrismaClient'
```

### Limitations

1. **Token Caching**: Currently uses in-memory cache

   - Consider Redis for production multi-instance deployments
   - Tokens expire after 1 hour, auto-refresh at 55 minutes

2. **CSRF Protection**: State token not persisted

   - Consider using encrypted cookies or session storage
   - Current implementation relies on user session for verification

3. **Rate Limiting**: No explicit rate limiting on endpoints

   - Consider adding rate limiting for webhook endpoint
   - Monitor GitHub API rate limits

4. **Notification System**: No user notifications for:
   - Installation suspended
   - Repositories removed
   - Site affected by installation changes

---

## 🔒 Security Considerations

### Implemented

✅ Webhook signature verification with constant-time comparison
✅ User authentication required for all endpoints
✅ Installation ownership verification before operations
✅ HTTPS-only in production (via VERCEL_DEPLOYMENT check)
✅ Sentry error logging and monitoring

### Recommended Enhancements

- [ ] Add rate limiting to webhook endpoint
- [ ] Implement CSRF token persistence
- [ ] Add audit logging for installation changes
- [ ] Monitor failed webhook deliveries
- [ ] Set up alerts for token refresh failures

---

## 📊 Monitoring & Observability

### Sentry Spans Created

All operations include Sentry tracing:

- `POST /api/github-app/installation-url`
- `GET /api/github-app/callback`
- `GET /api/github-app/installations`
- `POST /api/github-app/sync-repositories`
- `DELETE /api/github-app/installations/:id`
- `POST /api/webhooks/github-app`
- `github.app.jwt` - JWT generation
- `github.app.token.refresh` - Token refresh

### Key Metrics to Track

- Installation token refresh success rate
- Webhook processing success rate
- API endpoint response times
- User migration rate (OAuth → GitHub App)
- Sites using GitHub App vs OAuth

---

## 🧪 Testing Recommendations

### Unit Tests

Create tests for:

- Token generation and refresh logic
- Webhook signature verification
- Installation token caching and expiration

### Integration Tests

Create tests for:

- GitHub App installation flow
- Repository sync functionality
- Webhook event processing
- Site creation with installation

### E2E Tests

Create tests for:

- New user signup (verify no `repo` scope requested)
- GitHub App installation and callback
- Site creation with GitHub App repository
- Repository access after installation change

---

## 📚 Additional Resources

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [Installation Access Tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
- [GitHub App Webhooks](https://docs.github.com/en/webhooks/webhook-events-and-payloads?actionType=created#installation)

---

## 🎯 Next Steps

1. **Complete Frontend Implementation** (Estimated: 1-2 days)

   - GitHub connection card component
   - Repository selector updates
   - Installation management page
   - Migration banner

2. **Testing & QA** (Estimated: 2-3 days)

   - Create and configure test GitHub App
   - Test all flows in staging
   - Fix any issues discovered

3. **Deploy to Production** (Estimated: 1 day)

   - Create production GitHub App
   - Configure environment variables
   - Run database migrations
   - Deploy and monitor

4. **Phase 2: Migration** (Estimated: 8-12 weeks)
   - Roll out migration UI to existing users
   - Monitor migration progress
   - Provide support for migration issues
   - Deprecate OAuth repo access

**Total Estimated Time to Production:** ~1 week for Phase 1
