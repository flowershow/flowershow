export const testUser = {
  username: "e2e-test-user",
  email: "e2e-test@example.com",
  name: "E2E Test User",
};

// GitHub repository details
export const githubScope = "datopian";
export const githubRepo = "datahub-cloud-test-repo";

export const testProject = {
  name: "test-site",
  repository: `${githubScope}/${githubRepo}`,
  branch: "main",
};

export const testSite = `@${testUser.username}/${testProject.name}`;
