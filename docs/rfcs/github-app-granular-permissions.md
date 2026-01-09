# GitHub App Granular Permissions Implementation Plan

## Overview

Migrate from GitHub OAuth App with broad repository permissions to a GitHub App with fine-grained, user-controlled repository access, similar to Vercel's authorization model.

## Current State

**Problem:**

- OAuth App requests `repo` scope at signup, granting access to ALL public and private repositories
- Users must grant broad permissions before they can use Flowershow
- No way to grant access to specific repositories only
- Poor security posture and user trust

**Current Flow:**

1. User signs up → OAuth requests `read:user user:email repo read:org`
2. Single access token stored in [`Account`](../prisma/schema.prisma:60) table
3. Token used for all GitHub operations (list repos, read files, create webhooks)

**Current Scope Usage:**

- `read:user` - Get user profile
- `user:email` - Get user email
- `repo` - **Full control of all repos** (the problem)
- `read:org` - Read organization membership

## Target State

**Solution:**

- OAuth App requests ONLY `read:user user:email` for user authentication
- GitHub App provides fine-grained repository access
- User explicitly authorizes which repos/orgs Flowershow can access
- Separate installation tokens per repository selection

**New Flow:**

1. User signs up → OAuth requests only `read:user user:email` (no repo access)
2. User wants to create site → Click "Connect GitHub Repositories"
3. Redirect to GitHub App installation page
4. User selects specific repos/orgs to authorize
5. GitHub App installation token stored and used for repo operations

## Architecture Comparison

### GitHub OAuth App (Current)

- **Token Type:** User-to-server tokens
- **Scope:** Broad (repo = all repos)
- **Control:** All-or-nothing at signup
- **Lifetime:** Long-lived (with refresh)
- **Revocation:** Revokes all access

### GitHub App (Target)

- **Token Type:** Installation tokens
- **Scope:** Fine-grained per installation
- **Control:** Per-repository or per-organization
- **Lifetime:** 1 hour (requires refresh)
- **Revocation:** Can revoke specific repos

## Database Schema Changes

### New Tables

#### GitHubInstallation

Stores GitHub App installation data per user/organization.

```prisma
model GitHubInstallation {
  id                  String    @id @default(cuid())
  installationId      BigInt    @unique @map("installation_id") // GitHub's installation ID
  accountType         String    @map("account_type") // 'User' | 'Organization'
  accountLogin        String    @map("account_login") // username or org name
  accountId           BigInt    @map("account_id") // GitHub account ID
  userId              String    @map("user_id")
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  suspendedAt         DateTime? @map("suspended_at")
  suspendedBy         String?   @map("suspended_by")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  repositories        GitHubInstallationRepository[]
  sites               Site[]

  @@index([userId])
  @@index([installationId])
}
```

#### GitHubInstallationRepository

Tracks which repositories each installation has access to.

```prisma
model GitHubInstallationRepository {
  id                  String             @id @default(cuid())
  installationId      String             @map("installation_id")
  installation        GitHubInstallation @relation(fields: [installationId], references: [id], onDelete: Cascade)
  repositoryId        BigInt             @map("repository_id") // GitHub repo ID
  repositoryName      String             @map("repository_name")
  repositoryFullName  String             @map("repository_full_name") // 'owner/repo'
  isPrivate           Boolean            @default(false) @map("is_private")
  createdAt           DateTime           @default(now()) @map("created_at")

  @@unique([installationId, repositoryId])
  @@index([installationId])
  @@index([repositoryFullName])
}
```

### Modified Tables

#### Site

Add optional reference to GitHub App installation.

```prisma
model Site {
  // ... existing fields ...

  // New field for GitHub App installations
  installationId      String?            @map("installation_id")
  installation        GitHubInstallation? @relation(fields: [installationId], references: [id])

  // Existing ghRepository field remains for backward compatibility
  // Sites without installationId use OAuth token from Account table

  @@index([installationId])
}
```

#### Account

No schema changes needed - continues to store OAuth tokens.
For new users, the `scope` field will be `read:user,user:email` instead of including `repo`.

## API Endpoints

### Installation Management

#### `POST /api/github-app/installation-url`

Generate GitHub App installation URL.

**Request:**

```typescript
{
  // Optional: pre-select repos or org
  suggestedTargetId?: string;
}
```

**Response:**

```typescript
{
  url: string; // GitHub App installation URL
  state: string; // CSRF token
}
```

#### `GET /api/github-app/callback`

Handle redirect after GitHub App installation.

**Query Params:**

- `installation_id` - GitHub installation ID
- `setup_action` - 'install' | 'update'
- `state` - CSRF token

**Actions:**

1. Verify state token
2. Fetch installation details from GitHub
3. Store installation in database
4. Fetch and store accessible repositories
5. Redirect to dashboard or site creation page

#### `GET /api/github-app/installations`

List user's GitHub App installations and accessible repositories.

**Response:**

```typescript
{
  installations: Array<{
    id: string;
    accountLogin: string;
    accountType: "User" | "Organization";
    repositories: Array<{
      id: string;
      name: string;
      fullName: string;
      isPrivate: boolean;
    }>;
    createdAt: string;
  }>;
}
```

#### `POST /api/github-app/sync-repositories`

Manually sync repositories for an installation.

**Request:**

```typescript
{
  installationId: string;
}
```

#### `DELETE /api/github-app/installations/:id`

Remove installation from database (user can also uninstall on GitHub).

### Token Management

#### `POST /api/github-app/installations/:id/token`

Internal endpoint to get/refresh installation access token.

**Response:**

```typescript
{
  token: string;
  expiresAt: string; // ISO 8601
}
```

**Caching:**

- Cache tokens in memory/Redis
- Auto-refresh when expiring (< 5 minutes)
- Mutex to prevent concurrent refresh

## Webhook Handlers

### `POST /api/webhooks/github-app`

Handle GitHub App webhook events.

**Events to Handle:**

#### `installation.created`

- Store new installation in database
- Fetch and store accessible repositories
- Optionally notify user

#### `installation.deleted`

- Mark installation as deleted
- Update affected sites status
- Notify users with sites using this installation

#### `installation.suspend` / `installation.unsuspend`

- Update `suspendedAt` field
- Disable/enable affected sites
- Notify users

#### `installation_repositories.added`

- Add repositories to `GitHubInstallationRepository`
- Update available repos list

#### `installation_repositories.removed`

- Remove repositories from database
- Check if any sites use removed repos
- Mark affected sites for re-authorization

#### `push`

**This eliminates the need for per-repository webhooks!**

- Extract repository full name and branch from webhook payload
- Find all sites using this repository/branch with GitHub App installation and `autoSync: true`
- Trigger `site/sync` events for all matching sites
- GitHub App receives push events for ALL repositories in the installation automatically

**Webhook Security:**

- Verify webhook signature using `GITHUB_APP_WEBHOOK_SECRET`
- Use constant-time comparison to prevent timing attacks

## UI/UX Flow

### New User Signup Flow

```mermaid
sequenceDiagram
    participant User
    participant Flowershow
    participant GitHub OAuth

    User->>Flowershow: Click "Sign up with GitHub"
    Flowershow->>GitHub OAuth: Request read:user, user:email
    GitHub OAuth->>User: Show permission screen (minimal)
    User->>GitHub OAuth: Approve
    GitHub OAuth->>Flowershow: Return access token
    Flowershow->>Flowershow: Create user account
    Flowershow->>User: Show dashboard
```

### Site Creation Flow (GitHub App)

```mermaid
sequenceDiagram
    participant User
    participant Flowershow
    participant GitHub App
    participant GitHub API

    User->>Flowershow: Click "Create New Site"
    Flowershow->>User: Show "Connect GitHub Repositories" button
    User->>Flowershow: Click "Connect GitHub Repositories"
    Flowershow->>GitHub App: Redirect to installation page
    GitHub App->>User: Show repo/org selection
    User->>GitHub App: Select repos to authorize
    GitHub App->>Flowershow: Redirect with installation_id
    Flowershow->>GitHub API: Fetch installation details
    Flowershow->>Flowershow: Store installation & repos
    Flowershow->>User: Show repo selector (authorized repos only)
    User->>Flowershow: Select repo & create site
```

### UI Components Needed

#### 1. GitHub Connection Card

Location: [`/app/(dashboard)/cloud/(dashboard)/new/page.tsx`](<../app/(dashboard)/cloud/(dashboard)/new/page.tsx:15>)

```tsx
<Card>
  <CardHeader>
    <h3>Connect GitHub Repositories</h3>
    <p>Grant Flowershow access to selected repositories</p>
  </CardHeader>
  <CardBody>
    {installations.length === 0 ? (
      <Button onClick={handleInstallGitHubApp}>
        <GitHubIcon /> Connect GitHub Repositories
      </Button>
    ) : (
      <>
        <p>Connected: {installations.length} installation(s)</p>
        <Button variant="secondary" onClick={handleManageInstallations}>
          Manage Access
        </Button>
        <Button onClick={handleInstallGitHubApp}>Add More Repositories</Button>
      </>
    )}
  </CardBody>
</Card>
```

#### 2. Repository Selector

Enhanced version of current selector in [`create-site.tsx`](../components/dashboard/create-site.tsx:18)

```tsx
<Select name="ghRepository" disabled={installations.length === 0}>
  {installations.length === 0 ? (
    <option>Connect GitHub first</option>
  ) : (
    installations.flatMap((inst) =>
      inst.repositories.map((repo) => (
        <option key={repo.id} value={repo.fullName}>
          {repo.fullName} {repo.isPrivate ? "🔒" : ""}
        </option>
      ))
    )
  )}
</Select>
```

#### 3. Installation Management Page

New page: `/app/(dashboard)/cloud/(dashboard)/settings/github/page.tsx`

Shows:

- List of installations
- Repositories per installation
- Last synced time
- Actions: Sync, Manage on GitHub, Remove

#### 4. Migration Banner

For existing OAuth users:

```tsx
<Banner variant="info" dismissible>
  <p>
    Switch to secure repository access. Grant Flowershow access to only the
    repositories you choose.
  </p>
  <Button onClick={handleMigrateToGitHubApp}>Upgrade to GitHub App</Button>
</Banner>
```

## Token Management Strategy

### Installation Token Lifecycle

1. **Token Creation:**

   - Generated when installation is created/accessed
   - Stored encrypted in database or cache
   - Expires after 1 hour

2. **Token Refresh:**

   - Check expiration before each GitHub API call
   - Refresh if expires in < 5 minutes
   - Use mutex to prevent concurrent refresh

3. **Token Usage:**
   - All GitHub API calls use installation token (not OAuth token)
   - Helper function: `getInstallationToken(installationId)`
   - Automatic refresh handling

### Implementation: Token Helper

Location: [`lib/github.ts`](../lib/github.ts:1)

```typescript
import jwt from "jsonwebtoken";
import { env } from "@/env.mjs";

// In-memory cache (consider Redis for production)
const tokenCache = new Map<
  string,
  {
    token: string;
    expiresAt: Date;
  }
>();

// Mutex to prevent concurrent refresh
const refreshLocks = new Map<string, Promise<string>>();

async function generateJWT(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 600, // 10 minutes
    iss: env.GITHUB_APP_ID,
  };

  return jwt.sign(payload, env.GITHUB_APP_PRIVATE_KEY, {
    algorithm: "RS256",
  });
}

async function refreshInstallationToken(
  installationId: string
): Promise<string> {
  // Check if refresh is already in progress
  const existingLock = refreshLocks.get(installationId);
  if (existingLock) {
    return existingLock;
  }

  // Create new refresh promise
  const refreshPromise = (async () => {
    try {
      const jwt = await generateJWT();

      const response = await fetch(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwt}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data = await response.json();
      const expiresAt = new Date(data.expires_at);

      // Cache the token
      tokenCache.set(installationId, {
        token: data.token,
        expiresAt,
      });

      return data.token;
    } finally {
      refreshLocks.delete(installationId);
    }
  })();

  refreshLocks.set(installationId, refreshPromise);
  return refreshPromise;
}

export async function getInstallationToken(
  installationId: string
): Promise<string> {
  const cached = tokenCache.get(installationId);

  // Refresh if token expires in < 5 minutes
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (!cached || cached.expiresAt < fiveMinutesFromNow) {
    return refreshInstallationToken(installationId);
  }

  return cached.token;
}
```

### Updating GitHub API Calls

Modify [`lib/github.ts`](../lib/github.ts:1) functions to use installation tokens:

```typescript
export const fetchGitHubRepoTree = async ({
  ghRepository,
  ghBranch,
  accessToken,
  installationId, // NEW
}: {
  ghRepository: string;
  ghBranch: string;
  accessToken?: string; // Legacy OAuth token
  installationId?: string; // NEW: GitHub App installation
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

## Migration Strategy

### Phase 1: Parallel Operation (Weeks 1-2)

**Objectives:**

- Deploy GitHub App alongside OAuth App
- No breaking changes for existing users
- New users get better experience

**Actions:**

1. **Create GitHub App**

   - Register new GitHub App in GitHub settings
   - Configure permissions: `contents: read`, `metadata: read`, `webhooks: write`
   - Set webhook URL: `https://cloud.flowershow.app/api/webhooks/github-app`
   - Generate and store private key

2. **Add Environment Variables**

   ```bash
   GITHUB_APP_ID=123456
   GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
   GITHUB_APP_CLIENT_ID=Iv1.abc123
   GITHUB_APP_CLIENT_SECRET=abc123
   GITHUB_APP_WEBHOOK_SECRET=abc123
   ```

3. **Deploy Database Changes**

   - Run migrations to add new tables
   - Add `installationId` to Site table
   - No data migration yet

4. **Deploy Backend Changes**

   - Add GitHub App API endpoints
   - Add webhook handlers
   - Add token management utilities
   - Keep OAuth flow unchanged

5. **Update OAuth Scope for New Users Only**

   - Change [`server/auth.ts`](../server/auth.ts:30) line 31:
     ```typescript
     // Old: scope: 'read:user user:email repo read:org',
     // New:
     scope: 'read:user user:email read:org',
     ```
   - Existing users keep their `repo` scope

6. **Feature Flag**

   ```typescript
   // lib/feature-flags.ts
   export const Features = {
     // ...
     GITHUB_APP_ENABLED: "github_app_enabled",
   } as const;
   ```

7. **Deploy UI Changes**
   - Add "Connect GitHub Repositories" flow
   - Show GitHub App option to users with flag enabled
   - Keep OAuth fallback for existing users

**Testing:**

- New user signup → minimal OAuth permissions ✓
- GitHub App installation flow ✓
- Site creation with GitHub App ✓
- Existing sites still work with OAuth ✓

### Phase 2: Gradual Migration (Weeks 3-8)

**Objectives:**

- Migrate existing users to GitHub App
- Provide clear migration path
- No forced disruption

**Actions:**

1. **Add Migration UI**

   - Banner on dashboard: "Switch to secure repository access"
   - Migration page explaining benefits
   - Per-site migration button

2. **Automated Migration Triggers**

   - When OAuth token expires → prompt to install GitHub App
   - When OAuth token is revoked → require GitHub App
   - When user adds new site → suggest GitHub App

3. **Migration Flow**

   ```typescript
   async function migrateSiteToGitHubApp(siteId: string) {
     const site = await prisma.site.findUnique({ where: { id: siteId } });

     // Find matching installation that has access to this repo
     const installation = await prisma.gitHubInstallation.findFirst({
       where: {
         userId: site.userId,
         repositories: {
           some: {
             repositoryFullName: site.ghRepository,
           },
         },
       },
       include: { repositories: true },
     });

     if (!installation) {
       throw new Error("No installation found with access to this repository");
     }

     // Update site to use installation
     await prisma.site.update({
       where: { id: siteId },
       data: { installationId: installation.id },
     });
   }
   ```

4. **Communication**

   - Email campaign explaining benefits
   - In-app notifications
   - Documentation updates
   - Blog post announcement

5. **Monitoring**
   - Track migration rates
   - Monitor OAuth vs GitHub App usage
   - Identify blockers and pain points

**Metrics to Track:**

- % of users migrated
- % of sites using GitHub App
- Migration funnel drop-offs
- Support tickets related to migration

### Phase 3: Deprecation (Weeks 9-12+)

**Objectives:**

- Complete migration to GitHub App
- Sunset OAuth App repository access
- Maintain backward compatibility for user identity

**Actions:**

1. **Announce Deprecation (Week 9)**

   - Email all remaining OAuth users
   - Set migration deadline (e.g., 90 days)
   - Provide clear migration instructions

2. **Warning Period (Weeks 9-11)**

   - Show warning banner to OAuth users
   - Weekly reminder emails
   - Countdown to deadline

3. **Enforcement (Week 12+)**

   - OAuth-only sites become read-only
   - Require GitHub App installation to make changes
   - Maintain site rendering functionality

4. **Final Cleanup**
   - Remove feature flags
   - Remove OAuth-specific code paths
   - Update documentation
   - Archive OAuth App (keep for user identity only)

**Note:** OAuth App stays active for user authentication (read:user, user:email), only repository access moves to GitHub App.

## Security Considerations

### Token Storage

- Encrypt installation tokens at rest
- Use environment variable for encryption key
- Never expose tokens to client-side code
- Implement proper token rotation

### Webhook Verification

```typescript
import crypto from "crypto";

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");

  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

### CSRF Protection

- Generate state token for installation flow
- Verify state on callback
- Store in session or encrypted cookie

### Rate Limiting

- Monitor GitHub API rate limits
- Implement exponential backoff
- Cache responses where appropriate

## Environment Variables

Add to [`env.mjs`](../env.mjs:1):

```typescript
server: {
  // ... existing ...

  // GitHub App
  GITHUB_APP_ID: z.string(),
  GITHUB_APP_PRIVATE_KEY: z.string(), // RSA private key
  GITHUB_APP_CLIENT_ID: z.string(),
  GITHUB_APP_CLIENT_SECRET: z.string(),
  GITHUB_APP_WEBHOOK_SECRET: z.string(),
  GITHUB_TOKEN_ENCRYPTION_KEY: z.string(), // For encrypting tokens
}
```

## Testing Strategy

### Unit Tests

- Token refresh logic
- Webhook signature verification
- Token expiration handling
- CSRF token generation/validation

### Integration Tests

- GitHub App installation flow
- Repository sync
- Webhook event processing
- Site creation with installation

### E2E Tests

- New user signup (minimal permissions)
- GitHub App installation
- Site creation with GitHub App
- Migration from OAuth to GitHub App
- Site operations after migration

### Manual Testing Checklist

- [ ] New user can sign up with minimal permissions
- [ ] GitHub App installation redirects properly
- [ ] Repositories sync correctly
- [ ] Site creation works with GitHub App
- [ ] Token refresh happens automatically
- [ ] Webhooks update installation state
- [ ] Migration preserves site functionality
- [ ] OAuth sites continue to work
- [ ] Error messages are user-friendly

## Rollback Plan

If critical issues arise during rollout:

1. **Disable GitHub App Feature**

   - Turn off feature flag
   - Revert OAuth scope to include `repo`
   - New users go through OAuth flow

2. **Keep Data Intact**

   - Don't delete installation data
   - Sites using installations continue working
   - Can re-enable after fixing issues

3. **Communication**
   - Notify affected users
   - Explain rollback reason
   - Provide timeline for resolution

## Success Metrics

### User Experience

- Signup completion rate (should improve)
- Time to first site creation (should decrease)
- User trust indicators (survey feedback)

### Technical

- % of new users using GitHub App: Target 100%
- % of existing users migrated: Target 80% by end of Phase 2
- Token refresh success rate: Target 99%+
- Webhook processing success rate: Target 99%+

### Security

- Reduced permission scope for new users: 100%
- No security incidents related to permissions
- Audit log compliance

## Timeline Summary

| Phase                       | Duration    | Key Milestones                                 |
| --------------------------- | ----------- | ---------------------------------------------- |
| Phase 1: Parallel Operation | Weeks 1-2   | GitHub App deployed, new users get better flow |
| Phase 2: Gradual Migration  | Weeks 3-8   | Migration UI live, users transitioning         |
| Phase 3: Deprecation        | Weeks 9-12+ | OAuth deprecated, cleanup complete             |

**Total Timeline:** ~12+ weeks for full migration

## Open Questions

1. **Token Caching:** Use in-memory cache or Redis for production?

   - Recommendation: Start with in-memory, add Redis if scaling issues

2. **Migration Incentives:** Offer any benefits for early migration?

   - Could highlight in changelog/product updates

3. **OAuth App Sunset:** Keep OAuth App for identity only?

   - Yes, keep for NextAuth user authentication

4. **Multi-tenancy:** How to handle users in multiple orgs?

   - Each org gets separate installation, user can have multiple

5. **Per-Repository Webhooks:** Do GitHub App installations need per-repository webhooks?
   - **No!** GitHub App installations receive push events at the installation level for ALL repositories
   - The app webhook receives `push` events for every repository in the installation automatically
   - Only legacy OAuth sites need per-repository webhooks
   - This simplifies site creation and eliminates webhook management complexity

## References

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [GitHub App Authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app)
- [Installation Access Tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
- [GitHub App Webhooks](https://docs.github.com/en/webhooks/webhook-events-and-payloads?actionType=created#installation)
- [Vercel GitHub App](https://vercel.com/docs/concepts/git/github-integration) (for UX reference)

## Next Steps

1. Review and approve this plan
2. Create GitHub App in GitHub settings
3. Set up development environment with test GitHub App
4. Begin Phase 1 implementation
5. Prepare communication materials for users
