# Drop manual sync and the autoSync field

All GitHub-connected sites now sync automatically on every push via webhook. The `autoSync` flag on `Site` and the manual Sync button in the dashboard have been removed.

Of ~1,500 GitHub-connected sites, only 25 had `autoSync = false`. The feature added complexity (a separate code path, the OUTDATED status, a settings toggle) for negligible real-world use. The 25 existing opt-out sites were migrated to always-on syncing.

This also allowed removing the OUTDATED publish status entirely — it only existed to signal "a push arrived but the user hasn't manually synced yet," which is no longer a state that can occur.
