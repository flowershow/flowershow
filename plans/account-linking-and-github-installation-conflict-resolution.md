# GitHub Installation Many-to-Many Linking

## Problem Statement

The application now supports multiple sign-in methods (Google and GitHub OAuth with minimal scopes), followed by a separate GitHub App connection flow for repository access. Users can intentionally have multiple Flowershow accounts (e.g., one signed in with Google, one with GitHub), but they use the same GitHub account for repository access. This creates a conflict scenario:

1. User signs in with Google → Creates `User A` with Google Account (email: user@gmail.com)
2. User connects GitHub App → Creates `GitHubInstallation` linked to `User A` (via GitHub account ID X, email: user@work.com)
3. User later signs in with GitHub → Creates `User B` with GitHub Account (same GitHub account ID X, email: user@work.com)
4. User tries to connect GitHub App from `User B` → **FAILS** because `installationId` is unique for a single GitHub account and already exists for `User A`

**Key Requirement:** Users should be able to have multiple separate Flowershow accounts but use the same GitHub installation across them. The installation should be accessible from whichever account is currently connecting it, as long as the GitHub account ID matches.

## Current Architecture Analysis

### Database Schema
```prisma
model User {
  id                  String               @id @default(cuid())
  email               String?              @unique
  accounts            Account[]            // Multiple provider accounts
  githubInstallations GitHubInstallation[] // GitHub App installations
}

model GitHubInstallation {
  id             String    @id @default(cuid())
  installationId BigInt    @unique  // ← PROBLEM: Only one user can link this installation
  accountId      BigInt               // GitHub account ID
  userId         String               // ← One-to-many: Many installations to one user
  user           User      @relation(fields: [userId], references: [id])
}
```

### Current Flow Issues

**Issue 1: One-to-Many Prevents Multiple Users**
- Current schema: One installation belongs to one user (but one user can have many installations)
- The `@unique` constraint on `installationId` prevents a second user from linking the same installation
- When second user tries to connect, the upsert updates metadata but doesn't create a link to the second user

**Issue 2: No Verification Before Linking**
- No check to verify if the GitHub `accountId` of the installation matches the current user's GitHub account
- Cannot determine if the user has permission to link to this installation

**Issue 3: Different Emails, Same GitHub Account**
- User signs in with Google (user@gmail.com), connects GitHub (user@work.com) - OK
- User later signs in with GitHub (user@work.com), tries to connect - FAILS
- Even though it's the same GitHub account, the system doesn't recognize they should both have access

## How This Should Work

### Desired Behavior

**Many-to-Many Relationship:**
- Same GitHub installation can be linked to multiple Flowershow user accounts
- As long as the user has a GitHub account that matches the installation's `accountId`, they can link
- Example: Person has 2 Flowershow accounts, both can access the same GitHub installation

**Security:**
- Only users with a GitHub OAuth account matching the installation's `accountId` can link
- Cannot link to someone else's GitHub installation

**Use Cases:**
1. **Personal Multiple Accounts**: User has separate Google and GitHub sign-ins, both should access same repos
2. **Work/Personal Split**: User wants separate Flowershow accounts but uses same GitHub
3. **Team Member**: Multiple team members (different Flowershow accounts) can all link to org installation

## Proposed Solution

### Strategy Overview

**Many-to-Many Relationship Approach:**

Instead of having one installation owned by one user, allow the same GitHub installation to be linked to multiple Flowershow users. This is the cleanest solution because:

1. ✅ Same GitHub installation accessible from multiple Flowershow accounts
2. ✅ No data loss - all connections preserved
3. ✅ Matches the actual use case - same GitHub account, multiple Flowershow accounts
4. ✅ Relatively simple to implement - schema change + callback logic update
5. ✅ Enables team collaboration (bonus feature)

**Implementation Phases:**
1. **Phase 1: Schema Migration** - Change to many-to-many relationship
2. **Phase 2: Callback Logic Update** - Link instead of transfer
3. **Phase 3: Verification Logic** - Ensure only authorized users can link
4. **Optional Phase 4:** UI improvements

---

## Phase 1: Schema Migration (Many-to-Many)

### Goal
Change the database schema to support one GitHub installation being linked to multiple users, and one user linking to multiple installations.

### Current Schema Problem
```prisma
model GitHubInstallation {
  id             String   @id
  installationId BigInt   @unique  // ← This prevents multiple users from linking same installation
  userId         String           // ← Foreign key to single user
  user           User     @relation(fields: [userId], references: [id])
}
```

**Problem:** The `@unique` constraint on `installationId` means only ONE record can exist for each GitHub installation. Since the record also has `userId`, only one user can be linked.

### Solution: Composite Unique Key

**Remove single `installationId` unique constraint** and add a **composite unique key** on `[installationId, userId]`:

```prisma
model GitHubInstallation {
  id             String    @id @default(cuid())
  installationId BigInt    // ← Removed @unique - now multiple records can have same installationId
  accountType    String
  accountLogin   String
  accountId      BigInt    // GitHub account ID
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  suspendedAt    DateTime?
  suspendedBy    String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  repositories GitHubInstallationRepository[]
  sites        Site[]
  
  @@unique([installationId, userId])  // ← NEW: Same installation can link to multiple users
                                       //        but each user can only link once
  @@index([userId])
  @@index([installationId])           // ← Keep for query performance
  @@index([accountId])                // ← NEW: For finding installations by GitHub account
}
```

**Key Changes:**
1. Removed `@unique` from `installationId` field
2. Added `@@unique([installationId, userId])` - Prevents duplicate links but allows multiple users
3. Added `@@index([accountId])` - For efficient lookups by GitHub account ID

### Migration SQL

Create a new migration file: `prisma/migrations/YYYYMMDD_many_to_many_github_installations/migration.sql`

```sql
-- Drop the unique constraint on installation_id
ALTER TABLE "GitHubInstallation" DROP CONSTRAINT "GitHubInstallation_installation_id_key";

-- Add composite unique constraint on (installation_id, user_id)
ALTER TABLE "GitHubInstallation" ADD CONSTRAINT "GitHubInstallation_installation_id_user_id_key" 
  UNIQUE ("installation_id", "user_id");

-- Add index on account_id for efficient lookups
CREATE INDEX "GitHubInstallation_account_id_idx" ON "GitHubInstallation"("account_id");
```

**Migration Safety:**
- ✅ Existing data works as-is (no data changes needed)
- ✅ Existing queries work the same way
- ✅ New functionality enabled without breaking changes

---

## Phase 2: Callback Logic Update

### Goal
Update the GitHub App callback to create a link between the installation and current user instead of using upsert that updates existing records.

### Current Code Problem

In [`app/api/github-app/callback/route.ts:117-142`](app/api/github-app/callback/route.ts:117):

```typescript
const dbInstallation = await prisma.gitHubInstallation.upsert({
  where: {
    installationId: BigInt(installation.id),  // ← Finds existing by installationId
  },
  create: {
    installationId: BigInt(installation.id),
    accountType: installation.account.type,
    accountLogin: installation.account.login,
    accountId: BigInt(installation.account.id),
    userId: userId,  // ← Links to current user
    // ...
  },
  update: {
    accountType: installation.account.type,
    accountLogin: installation.account.login,
    accountId: BigInt(installation.account.id),
    // NOTE: userId is NOT updated! Installation stays with original user
    suspendedAt: installation.suspended_at ? new Date(installation.suspended_at) : null,
    suspendedBy: installation.suspended_by,
    updatedAt: new Date(),
  },
});
```

**Problem:** 
- `upsert` with `where: { installationId }` finds the FIRST user's record
- On `update`, it updates that record but doesn't create a new link for current user
- Current user never gets linked to the installation

### Solution: Find or Create Link

Change from `upsert` to **find existing link OR create new link**:

```typescript
// Step 1: Check if current user already has this installation linked
let dbInstallation = await prisma.gitHubInstallation.findUnique({
  where: {
    installationId_userId: {
      installationId: BigInt(installation.id),
      userId: userId,
    },
  },
});

if (dbInstallation) {
  // User already has this installation linked - update metadata
  dbInstallation = await prisma.gitHubInstallation.update({
    where: { id: dbInstallation.id },
    data: {
      accountType: installation.account.type,
      accountLogin: installation.account.login,
      accountId: BigInt(installation.account.id),
      suspendedAt: installation.suspended_at 
        ? new Date(installation.suspended_at) 
        : null,
      suspendedBy: installation.suspended_by,
      updatedAt: new Date(),
    },
  });
} else {
  // New link - create it
  dbInstallation = await prisma.gitHubInstallation.create({
    data: {
      installationId: BigInt(installation.id),
      accountType: installation.account.type,
      accountLogin: installation.account.login,
      accountId: BigInt(installation.account.id),
      userId: userId,
      suspendedAt: installation.suspended_at 
        ? new Date(installation.suspended_at) 
        : null,
      suspendedBy: installation.suspended_by,
    },
  });
  
  console.log(`Created new installation link: Installation ${installation.id} → User ${userId}`);
}
```

**Benefits:**
- ✅ Creates new link if user doesn't have one yet
- ✅ Updates existing link if user already has one
- ✅ Doesn't affect other users' links to same installation
- ✅ Clear logging for debugging

---

## Phase 3: Verification Logic

### Goal
Ensure only users with the matching GitHub account can link to an installation. Security is critical!

### Security Check

Before creating a link, verify the user has a GitHub OAuth account that matches the installation's `accountId`:

```typescript
// After fetching installation from GitHub API...
const installation = await installationResponse.json() as GitHubInstallation;

// SECURITY CHECK: Verify user has GitHub account matching installation
const userGitHubAccount = await prisma.account.findFirst({
  where: {
    userId: userId,
    provider: 'github',
  },
});

// Check if user's GitHub account matches installation's GitHub account
const canLink = userGitHubAccount && 
  BigInt(userGitHubAccount.providerAccountId) === installation.account.id;

if (!canLink && !userGitHubAccount) {
  // User doesn't have a GitHub account linked - they need to sign in with GitHub first
  console.error(`User ${userId} tried to link installation but has no GitHub account`);
  return NextResponse.redirect(
    `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}?error=no_github_account&message=Please+sign+in+with+GitHub+first`,
  );
}

if (!canLink) {
  // User has a GitHub account but it doesn't match the installation
  console.error(
    `User ${userId} GitHub account ${userGitHubAccount.providerAccountId} ` +
    `doesn't match installation account ${installation.account.id}`
  );
  return NextResponse.redirect(
    `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}?error=github_account_mismatch&message=Installation+belongs+to+different+GitHub+account`,
  );
}

// Proceed with creating/updating link...
```

### Special Case: Organization Installations

For organization installations, the `installation.account.id` is the **organization's ID**, not a personal account. In this case:

**Option A: Strict** - Only allow if user's GitHub account ID matches
- PRO: Simple, secure
- CON: Prevents team members from linking

**Option B: Permissive** - Allow any user to link
- PRO: Enables team collaboration
- CON: Less secure, anyone can claim org installation

**Option C: Hybrid** - Check if user has access to installation
- PRO: Secure and enables teams
- CON: Requires additional API call to verify

**Recommendation: Start with Option A, add Option C later**

```typescript
// Determine if this is personal or org installation
const isOrgInstallation = installation.account.type === 'Organization';

if (isOrgInstallation) {
  // For now, require user to have GitHub OAuth linked
  // Future enhancement: verify user is org member
  if (!userGitHubAccount) {
    return NextResponse.redirect(
      `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}?error=org_installation_requires_github`,
    );
  }
  
  // TODO: Verify user is org member by checking installation permissions
  console.log(`User ${userId} linking to org installation ${installation.id}`);
} else {
  // Personal installation - strict check
  if (BigInt(userGitHubAccount.providerAccountId) !== installation.account.id) {
    return NextResponse.redirect(
      `${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}?error=github_account_mismatch`,
    );
  }
}
```

---

## Phase 4: UI Improvements (Optional)

### Installation Management UI

**Location:** Settings page or dashboard

**Features:**
1. **Show Linked Installations**
   - List all GitHub installations the user has linked
   - Show account name, type (personal/org), and repositories count
   - Display last updated date

2. **Unlink Installations**
   - Allow user to remove their link to an installation
   - Only removes THEIR link, doesn't affect other users
   - Confirm before unlinking

3. **Multi-Account Indicator**
   - Show if installation is linked to multiple of the user's accounts
   - Helpful for debugging and understanding state

### Error Messages

Update error handling to be more helpful:

```typescript
// In callback route
const errorMessages = {
  no_github_account: {
    title: 'GitHub Account Required',
    message: 'Please sign in with GitHub first to link your repositories.',
    action: 'Sign in with GitHub',
  },
  github_account_mismatch: {
    title: 'Different GitHub Account',
    message: 'This installation belongs to a different GitHub account.',
    action: 'Sign in with the correct GitHub account',
  },
  already_linked: {
    title: 'Already Connected',
    message: 'This installation is already linked to your account.',
    action: 'Go to dashboard',
  },
};
```

---

## Implementation Roadmap

### Minimal Viable Solution (MVS)
**Priority: HIGH** - Solves the immediate problem

**Todo Items:**
- [x] Analyze current schema and identify problem
- [x] Design many-to-many solution
- [ ] Create database migration to change unique constraints
- [ ] Update callback logic to create links instead of upsert
- [ ] Add basic verification (GitHub account exists)
- [ ] Test with multiple user accounts
- [ ] Deploy to staging and test

**Files to Modify:**
1. [`prisma/schema.prisma`](prisma/schema.prisma) - Schema changes
2. [`app/api/github-app/callback/route.ts`](app/api/github-app/callback/route.ts) - Callback logic
3. Create new migration file

**Estimated Time:** 1-2 days

---

### Recommended Solution (MVS + Security)
**Priority: MEDIUM** - Adds proper security checks

**Todo Items:**
- [ ] Add verification logic for GitHub account ID matching
- [ ] Handle organization installations appropriately
- [ ] Add error handling with helpful messages
- [ ] Add logging for audit trail
- [ ] Test edge cases (orgs, missing accounts, etc.)

**Additional Files:**
- [`app/api/github-app/callback/route.ts`](app/api/github-app/callback/route.ts) - Enhanced security checks

**Estimated Time:** +1-2 days

---

### Enhanced Solution (Full UX)
**Priority: LOW** - Nice to have

**Todo Items:**
- [ ] Create installations list UI in settings
- [ ] Add unlink functionality
- [ ] Show installation status on dashboard
- [ ] Add helpful tooltips and documentation
- [ ] Improve error messages with actionable next steps
- [ ] Add tests for all scenarios

**New Files:**
- `app/(dashboard)/cloud/(dashboard)/settings/installations/page.tsx`
- `components/dashboard/installation-list.tsx`
- `components/dashboard/installation-card.tsx`

**Estimated Time:** +3-5 days

---

## Technical Considerations

### Query Changes

**Finding User's Installations:**
```typescript
// OLD: Works the same
const installations = await prisma.gitHubInstallation.findMany({
  where: { userId: user.id },
});

// Still works! Returns all installations linked to this user
```

**Finding All Users with an Installation:**
```typescript
// NEW: Now possible!
const usersWithInstallation = await prisma.gitHubInstallation.findMany({
  where: { installationId: BigInt(installationId) },
  include: { user: true },
});

// Returns all users who have linked this installation
```

**Checking if Specific User Has Installation:**
```typescript
// NEW: Use composite key
const link = await prisma.gitHubInstallation.findUnique({
  where: {
    installationId_userId: {
      installationId: BigInt(installationId),
      userId: userId,
    },
  },
});
```

### Performance Considerations

**Indexes:**
- `@@index([userId])` - Fast lookups for "user's installations"
- `@@index([installationId])` - Fast lookups for "users with installation"
- `@@index([accountId])` - Fast lookups for "installations by GitHub account"

**Query Performance:**
- All existing queries work the same or faster
- New queries enabled by indexes perform well
- Composite unique key has minimal overhead

### Edge Cases

1. **User Uninstalls GitHub App**
   - GitHub sends webhook to delete installation
   - Need to delete ALL links (all users' records)
   - Update webhook handler to delete by `installationId`

2. **User Removes Repository Access**
   - GitHub sends webhook with updated repository list
   - Need to update ALL users' records with same `installationId`
   - Current code handles this (deletes/recreates repositories)

3. **Multiple Tabs/Race Conditions**
   - Composite unique key prevents duplicate links
   - Database will reject duplicate `(installationId, userId)` pairs
   - Safe from race conditions

4. **Migration Rollback**
   - Can safely rollback migration
   - Data remains valid with old schema
   - Would just prevent multiple users again

---

## Testing Strategy

### Unit Tests
```typescript
describe('GitHub Installation Many-to-Many', () => {
  it('should allow multiple users to link same installation', async () => {
    // User A links installation
    // User B links same installation
    // Both should succeed
  });
  
  it('should prevent duplicate links for same user', async () => {
    // User A links installation
    // User A tries to link again
    // Second attempt should update, not create duplicate
  });
  
  it('should only allow users with matching GitHub account', async () => {
    // User A (GitHub account X) tries to link installation for account Y
    // Should fail with proper error
  });
  
  it('should update existing link metadata', async () => {
    // User A links installation
    // Installation metadata changes on GitHub
    // User A reconnects
    // Should update existing record
  });
});
```

### Integration Tests
```typescript
describe('Multi-Account Installation Flow', () => {
  it('should work for same person with Google and GitHub accounts', async () => {
    // Sign in with Google → Connect GitHub → Sign out
    // Sign in with GitHub → Connect GitHub → Should succeed
    // Both accounts should have access to same repositories
  });
  
  it('should handle organization installations', async () => {
    // Sign in as org member
    // Connect org installation
    // Should succeed (with appropriate checks)
  });
});
```

### Manual Testing Checklist
- [ ] Sign in with Google → Connect GitHub installation
- [ ] Sign out → Sign in with GitHub (same GitHub account)
- [ ] Try to connect same GitHub installation → Should succeed
- [ ] Verify both Flowershow accounts can see the repositories
- [ ] Try with different GitHub account → Should fail
- [ ] Test organization installation scenario
- [ ] Test repository updates are reflected for all users

---

## Migration Plan for Existing Users

### No Breaking Changes

**Good news:** This migration is backwards compatible!

**Existing Data:**
- All current `GitHubInstallation` records remain valid
- Users keep their existing connections
- No data migration or transformation needed

**After Migration:**
- Existing users: Continue working normally
- New behavior: Users can now link to installations already linked by others
- Gradual rollout: As users reconnect, they'll benefit from new behavior

### Communication

**User Messaging:**
Not needed for MVS - this is an internal improvement that fixes a bug. Users will simply notice that connecting GitHub works better.

**For Enhanced Version:**
When adding UI, can show helpful messages:
- "This installation is also linked to your other account"
- "You can access these repositories from multiple accounts"

---

## Success Metrics

### Immediate (MVS)
- ✅ Users can connect same GitHub installation from multiple Flowershow accounts
- ✅ No more "installation already exists" errors
- ✅ Existing functionality continues to work

### Medium-term (Recommended)
- ✅ No unauthorized access to installations (security checks working)
- ✅ Reduced support tickets about GitHub connection issues
- ✅ Audit logs show clean connection patterns

### Long-term (Enhanced)
- ✅ Users understand multi-account setup from UI
- ✅ Easy installation management from settings
- ✅ Team collaboration possible (org installations)

---

## Security Considerations

### ✅ Addressed

1. **GitHub Account Verification** - Only users with matching GitHub account can link
2. **Composite Unique Key** - Prevents duplicate links
3. **Audit Logging** - All link operations logged
4. **Cascade Deletion** - When user deleted, their links are removed

### ⚠️ Future Enhancements

1. **Organization Member Verification** - Verify user is actually org member before linking org installation
2. **Rate Limiting** - Prevent brute force linking attempts
3. **Webhook Security** - Ensure webhook operations update all linked users
4. **Access Revocation** - Handle when user loses access to GitHub account

---

## References

### Related Files
- [`app/api/github-app/callback/route.ts`](app/api/github-app/callback/route.ts) - GitHub App callback handler
- [`server/auth.ts`](server/auth.ts) - NextAuth configuration
- [`prisma/schema.prisma`](prisma/schema.prisma) - Database schema
- [`lib/github.ts`](lib/github.ts) - GitHub API utilities

### Similar Implementations
- **GitHub Apps**: Same app can be installed in multiple contexts
- **Slack Apps**: Workspace apps can be connected to multiple user accounts
- **Vercel**: Same Git provider account can link to multiple Vercel accounts

---

## Decision Log

### Why Many-to-Many Instead of Transfer?
**Transfer approach** (Phase 1 of original plan) has problems:
- Loses connection to original user
- Original user suddenly can't access their repos
- Have to track and transfer back if they switch accounts again

**Many-to-many approach**:
- ✅ No data loss
- ✅ Both accounts maintain access
- ✅ Simpler logic (no transfer, just link)
- ✅ Better matches real-world usage

### Why Not Account Linking?
User explicitly doesn't want automatic account linking. They want separate accounts for organizational reasons but need same GitHub access. Respecting this requirement leads to cleaner solution.

### Why Composite Unique Key?
Could use a junction table pattern:
```prisma
model UserInstallationLink {
  userId String
  installationId String
  @@unique([userId, installationId])
}
```

But current approach:
- ✅ Simpler - fewer models
- ✅ Keeps installation metadata with link
- ✅ Existing queries work the same
- ✅ Less database overhead

### Why Verify GitHub Account ID?
Security! Without verification:
- ❌ User A could claim User B's installation
- ❌ Anyone could link to any installation

With verification:
- ✅ Only legitimate GitHub account owner can link
- ✅ Clear error messages for mismatches
- ✅ Audit trail of who linked what

---

## Next Steps

1. **Review this plan** - Confirm approach makes sense for your use case
2. **Start with Phase 1** - Schema migration (safe, backwards compatible)
3. **Implement Phase 2** - Updated callback logic
4. **Add Phase 3** - Security verification
5. **Test thoroughly** - Multiple accounts, edge cases
6. **Deploy to production** - Monitor for issues
7. **Consider Phase 4** - UI improvements based on user feedback

**Estimated Total Time:**
- Phase 1-3 (MVS + Security): 2-4 days
- Phase 4 (Enhanced UI): +3-5 days if needed

**Risk Assessment:** LOW
- Schema change is backwards compatible
- Existing functionality preserved
- Easy to rollback if needed
- Clear security boundaries
