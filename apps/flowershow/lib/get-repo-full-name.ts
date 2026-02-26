/**
 * Returns the authoritative repository full name for a site.
 *
 * Prefers the name from the linked GitHubInstallationRepository (kept
 * up-to-date via the `repository.renamed` webhook), falling back to
 * the legacy `ghRepository` column on Site.
 */
export function getRepoFullName(site: {
  ghRepository?: string | null;
  installationRepository?: { repositoryFullName: string } | null;
}): string | null {
  return (
    site.installationRepository?.repositoryFullName ?? site.ghRepository ?? null
  );
}
