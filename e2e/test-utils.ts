export const testUser = {
  username: "e2e-test-user",
  email: "e2e-test@example.com",
  name: "E2E Test User",
};

export const testProject = {
  name: "test-site",
  repository: "datopian/datahub-cloud-test-repo",
  branch: "main",
};

// Site path in the format used by tests (@username/projectName)
export const testSite = `@${testUser.username}/${testProject.name}`;
