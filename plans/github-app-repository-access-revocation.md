# GitHub App Repository Access Revocation - Implementation Plan

## Question

Should we remove `installationId` from a [`Site`](../prisma/schema.prisma:106) if a [`GitHubInstallationRepository`](../prisma/schema.prisma:257) is removed from the database for the associated GitHub repository?

## Answer

**YES** - We should clear `Site.installationId` (set to `NULL`) and disable `autoSync` when repository access is revoked.

## Rationale

### Current Problem

When a user revokes repository access via GitHub's installation settings:

1. GitHub sends an `installation_repositories.removed` webhook event
2. The webhook handler deletes the [`GitHubInstallationRepository`](../app/api/webhooks/github-app/route.ts:277-282) records
3. The affected [`Site`](../prisma/schema.prisma:106) still has `installationId` pointing to an installation that no longer has access to `ghRepository`
4. The site enters a **broken state**:
   - Sync operations will fail (no token available for that repository)
   - Push events won't trigger syncs (repository not in installation)
   - User gets confusing error messages
   - No clear path to recovery

### Why Clear installationId?

#### 1. **Data Integrity**
- A site with `installationId` referencing an installation without repository access is a broken foreign key relationship
- The database constraint is satisfied, but the semantic relationship is invalid
- This creates technical debt and confusing behavior

#### 2. **Fail-Fast Behavior**
- Better to fail immediately with a clear state than mysteriously during operations
- Setting `installationId = NULL` makes the broken state explicit
- UI can show clear "Repository access revoked - reconnect GitHub App" messages

#### 3. **Clean Fallback Path**
From [`server/api/routers/site.ts:266-267`](../server/api/routers/site.ts:266-267), sites without `installationId` fall back to OAuth token behavior:

```typescript
accessToken: ctx.session.accessToken,
installationId: site.installationId ?? undefined,
```

For users with OAuth tokens (legacy users with `repo` scope), the site can continue functioning via OAuth after clearing `installationId`.

#### 4. **Recovery Path**
With `installationId = NULL`:
- User re-grants repository access via GitHub App
- System detects available installations with access via [`migrateSiteToGitHubApp`](../server/api/routers/site.ts:1374-1455)
- User can migrate the site again
- Clean reconnection flow

#### 5. **Consistency with Installation Deletion**
From [`app/api/webhooks/github-app/route.ts:164-184`](../app/api/webhooks/github-app/route.ts:164-184), when an entire installation is deleted:
- Installation is deleted with `onDelete: Cascade`
- Sites using that installation have `installationId` set to `NULL` automatically (foreign key constraint)

Repository removal should follow the same pattern.

## Current Implementation Gap

The webhook handler has a TODO comment acknowledging this issue:

```typescript
// File: app/api/webhooks/github-app/route.ts:284-285
// Note: Check if any sites use the removed repositories
// You may want to add notification or update logic here
```

This is currently **not implemented**, leaving sites in a broken state.

## Proposed Solution

### 1. Update Webhook Handler

Modify [`handleInstallationRepositoriesEvent`](../app/api/webhooks/github-app/route.ts:226-297) in `app/api/webhooks/github-app/route.ts`:

```typescript
case 'removed':
  // Repositories were removed from the installation
  if (repositories_removed && repositories_removed.length > 0) {
    console.log(
      `${repositories_removed.length} repositories removed from installation ${installation.id}`,
    );

    const repoFullNames = repositories_removed.map((repo) => repo.full_name);
    const repoIds = repositories_removed.map((repo) => BigInt(repo.id));

    // Find affected sites BEFORE deleting repositories
    const affectedSites = await prisma.site.findMany({
      where: {
        installationId: dbInstallation.id,
        ghRepository: { in: repoFullNames },
      },
      select: {
        id: true,
        projectName: true,
        ghRepository: true,
        userId: true,
      },
    });

    // Delete repository access records
    await prisma.gitHubInstallationRepository.deleteMany({
      where: {
        installationId: dbInstallation.id,
        repositoryId: { in: repoIds },
      },
    });

    // Clear installationId and disable autoSync for affected sites
    if (affectedSites.length > 0) {
      console.log(
        `Clearing installation access for ${affectedSites.length} affected site(s)`,
      );

      await prisma.site.updateMany({
        where: {
          id: { in: affectedSites.map((s) => s.id) },
        },
        data: {
          installationId: null,
          autoSync: false,
        },
      });

      // TODO: Notify users about revoked access
      // Consider sending email or in-app notification
      for (const site of affectedSites) {
        console.warn(
          `Repository access revoked for site: ${site.projectName} (${site.ghRepository})`,
        );
      }
    }
  }
  break;
```

### 2. Why Disable autoSync?

When clearing `installationId`, we should also set `autoSync = false` because:

1. **No Webhook Capability**: Without installation access, the site can't receive push events
2. **Avoid Confusion**: If user has OAuth token, enabling autoSync would try to create per-repository webhooks (from [`site.ts:284-301`](../server/api/routers/site.ts:284-301)), which might:
   - Fail due to permissions
   - Create confusion about which auth method is active
   - Duplicate webhooks if access is later restored
3. **Explicit Re-enable**: Forces user to consciously re-enable autoSync after reconnecting, ensuring they understand the state change

### 3. Edge Cases to Handle

#### Case A: User Has OAuth Token with Repo Scope
**Scenario**: Legacy user who still has `repo` scope in their OAuth token

**Behavior**:
- Site operations continue working via OAuth fallback
- `autoSync` is disabled (no webhooks)
- User can manually sync
- UI should show "GitHub App access revoked - using legacy OAuth"
- Encourage re-migration to GitHub App for better security

#### Case B: User Has Minimal OAuth Scope (New Users)
**Scenario**: New user with only `read:user user:email` scope

**Behavior**:
- Site becomes non-functional (no repo access via any method)
- UI should show prominent "Repository access revoked" banner
- Clear CTA: "Reconnect GitHub App" button
- Block sync operations with clear error message

#### Case C: User Removes Some Repositories, Not All
**Scenario**: User has multiple sites, revokes access to subset of repos

**Behavior**:
- Only affected sites have `installationId` cleared
- Other sites using the same installation continue working normally
- Each site's state is independent

#### Case D: User Immediately Re-grants Access
**Scenario**: User removes then re-adds repository within minutes

**Behavior**:
- First webhook clears `installationId` from site
- Second webhook adds repository back to installation
- Site remains with `installationId = NULL` (doesn't auto-reconnect)
- User must manually migrate site again via UI
- This is intentional: explicit re-connection is safer

## UI/UX Considerations

### 1. Site Status Display

Update site cards to show access status:

```tsx
{site.ghRepository && !site.installationId && (
  <Alert variant="warning">
    <AlertIcon />
    <AlertTitle>Repository Access Revoked</AlertTitle>
    <AlertDescription>
      GitHub App no longer has access to {site.ghRepository}.
      {hasOAuthRepoAccess ? (
        <span> Using legacy OAuth (limited security).</span>
      ) : (
        <span> Site cannot sync until access is restored.</span>
      )}
    </AlertDescription>
    <Button onClick={handleReconnect} size="sm">
      Reconnect GitHub App
    </Button>
  </Alert>
)}
```

### 2. Settings Page Warning

On site settings page, show clear status:

```tsx
// File: app/(dashboard)/cloud/(dashboard)/settings/[siteId]/page.tsx
{!site.installationId && site.ghRepository !== 'cli-upload' && (
  <Card variant="warning">
    <CardHeader>
      <h3>⚠️ GitHub Access Issue</h3>
    </CardHeader>
    <CardBody>
      <p>
        This site is not connected to a GitHub App installation.
        {hasOAuthAccess
          ? ' It is using legacy OAuth authentication, which provides broader permissions than necessary.'
          : ' It cannot sync with GitHub until you reconnect.'}
      </p>
      <Button onClick={() => router.push('/settings/github')}>
        Manage GitHub Connections
      </Button>
    </CardBody>
  </Card>
)}
```

### 3. Sync Operation Errors

Update sync endpoints to provide clear errors:

```typescript
// File: server/api/routers/site.ts
// In sync mutation
if (!site.installationId && !ctx.session.accessToken) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message:
      'No GitHub access available. Please reconnect the GitHub App to continue.',
  });
}
```

## User Notification Strategy

### Immediate Notification (Phase 1)
- Console logging for monitoring
- Sentry error tracking for site state changes

### Future Enhancement (Phase 2)
- Email notification: "GitHub App access revoked for [site name]"
- In-app notification banner on dashboard
- Include recovery instructions and CTA button

### Notification Template

```
Subject: Action Required: GitHub Access Revoked for [Site Name]

Hi [User],

GitHub App access to [repository] has been revoked, affecting your site "[site name]".

What happened:
- Repository access was removed from the Flowershow GitHub App installation
- Your site can no longer sync automatically

What you need to do:
1. Visit your GitHub settings and re-grant access to [repository]
2. Return to Flowershow dashboard and reconnect your site

[Reconnect GitHub App Button]

Need help? Check our documentation: [link]
```

## Database Queries

### Find Affected Sites (for monitoring)

```sql
-- Sites with installationId but no matching repository access
SELECT s.id, s.project_name, s.gh_repository, s.installation_id
FROM "Site" s
WHERE s.installation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "GitHubInstallationRepository" gir
    WHERE gir.installation_id = s.installation_id
      AND gir.repository_full_name = s.gh_repository
  );
```

### Migration Script (if needed for existing data)

```typescript
// scripts/fix-broken-installation-references.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBrokenInstallationReferences() {
  // Find sites with broken references
  const sites = await prisma.site.findMany({
    where: {
      installationId: { not: null },
    },
    include: {
      installation: {
        include: {
          repositories: true,
        },
      },
    },
  });

  const brokenSites = sites.filter((site) => {
    if (!site.installation) return true;
    return !site.installation.repositories.some(
      (repo) => repo.repositoryFullName === site.ghRepository,
    );
  });

  console.log(`Found ${brokenSites.length} sites with broken references`);

  // Fix them
  if (brokenSites.length > 0) {
    await prisma.site.updateMany({
      where: {
        id: { in: brokenSites.map((s) => s.id) },
      },
      data: {
        installationId: null,
        autoSync: false,
      },
    });

    console.log(`Fixed ${brokenSites.length} sites`);
  }
}

fixBrokenInstallationReferences()
  .then(() => console.log('Done'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Testing Plan

### Unit Tests

```typescript
// __tests__/webhooks/github-app/installation-repositories-removed.test.ts
describe('installation_repositories.removed webhook', () => {
  it('should clear installationId from affected sites', async () => {
    // Setup: Create installation, repository, and site
    const installation = await createTestInstallation();
    const repo = await createTestRepository(installation.id);
    const site = await createTestSite({ installationId: installation.id });

    // Act: Simulate repository removal webhook
    await handleInstallationRepositoriesEvent({
      action: 'removed',
      installation: { id: installation.installationId },
      repositories_removed: [{ id: repo.repositoryId, full_name: repo.repositoryFullName }],
    });

    // Assert
    const updatedSite = await prisma.site.findUnique({ where: { id: site.id } });
    expect(updatedSite.installationId).toBeNull();
    expect(updatedSite.autoSync).toBe(false);
  });

  it('should not affect sites using other repositories', async () => {
    // Test that only affected sites are updated
  });

  it('should handle multiple sites for same repository', async () => {
    // Test batch update of multiple sites
  });
});
```

### Integration Tests

```typescript
// e2e/dashboard/github-app-access-revocation.spec.ts
test('user can reconnect after access revocation', async ({ page }) => {
  // 1. Create site with GitHub App
  // 2. Revoke repository access via GitHub
  // 3. Verify site shows "access revoked" warning
  // 4. Click "Reconnect" button
  // 5. Complete GitHub App flow
  // 6. Verify site is reconnected and functional
});
```

## Monitoring & Alerts

### Metrics to Track
- Count of sites with `installationId = NULL` (broken state)
- Frequency of repository removal events
- Time to recovery (revocation → reconnection)
- User reconnection rate

### Sentry Integration

```typescript
// In webhook handler
if (affectedSites.length > 0) {
  Sentry.captureMessage('GitHub App repository access revoked', {
    level: 'warning',
    extra: {
      installationId: dbInstallation.id,
      accountLogin: dbInstallation.accountLogin,
      repositoriesRemoved: repoFullNames,
      affectedSiteCount: affectedSites.length,
      affectedSites: affectedSites.map((s) => ({
        id: s.id,
        projectName: s.projectName,
        repository: s.ghRepository,
      })),
    },
  });
}
```

## Rollout Plan

### Phase 1: Deploy Fix (Week 1)
- [ ] Update webhook handler with site cleanup logic
- [ ] Deploy to staging and test with test GitHub App
- [ ] Monitor staging for issues
- [ ] Deploy to production with monitoring

### Phase 2: UI Updates (Week 2)
- [ ] Add access revocation warnings to site cards
- [ ] Update settings page with reconnection flow
- [ ] Improve error messages for sync operations
- [ ] Add documentation for recovery process

### Phase 3: User Communication (Week 3+)
- [ ] Implement email notifications
- [ ] Add in-app notification system
- [ ] Create help documentation
- [ ] Monitor and respond to support requests

### Phase 4: Cleanup (Week 4+)
- [ ] Run migration script for existing broken references
- [ ] Update analytics dashboards
- [ ] Document lessons learned

## Alternative Approaches Considered

### Alternative 1: Keep installationId, Add Status Field
**Approach**: Add `installationStatus` enum field to track "active" vs "revoked"

**Pros**:
- Maintains historical relationship
- Could auto-reconnect if access restored

**Cons**:
- Adds schema complexity
- Requires additional queries to check status everywhere
- Auto-reconnection might be unexpected behavior
- Doesn't solve the "what auth to use" question clearly

**Verdict**: Rejected - Explicit NULL is simpler and clearer

### Alternative 2: Do Nothing
**Approach**: Leave installationId as-is, let sync operations fail

**Pros**:
- No code changes needed
- Maintains all relationships

**Cons**:
- Silent failures confuse users
- No clear recovery path
- Debugging is harder
- Accumulates broken state over time

**Verdict**: Rejected - Unacceptable UX

### Alternative 3: Soft Delete Repository Records
**Approach**: Add `deletedAt` timestamp to GitHubInstallationRepository instead of hard delete

**Pros**:
- Historical record of access changes
- Could restore if access re-granted

**Cons**:
- Complicates queries (need `deletedAt IS NULL` everywhere)
- Doesn't solve the core site state problem
- Data grows indefinitely

**Verdict**: Rejected - Doesn't address root issue

## Conclusion

**Recommendation**: Implement the proposed solution to clear `installationId` and disable `autoSync` when repository access is revoked.

This approach provides:
- ✅ Clear, explicit state management
- ✅ Fail-fast error detection
- ✅ Clean recovery path
- ✅ Better user experience
- ✅ Simpler codebase
- ✅ Consistent with existing deletion behavior

The implementation is straightforward, testable, and aligns with the existing system architecture while providing a much better user experience during access revocation scenarios.
