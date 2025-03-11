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

export const premiumProject = {
  name: "premium-test-site",
  repository: "datopian/datahub-cloud-test-repo",
  branch: "main",
};

// Site paths in the format used by tests (@username/projectName)
export const testSite = `@${testUser.username}/${testProject.name}`;
export const premiumSite = `@${testUser.username}/${premiumProject.name}`;

export async function checkServiceHealth(url: string, serviceName: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${serviceName} returned status ${response.status}`);
    }
    console.log(`[${new Date().toISOString()}] ${serviceName} is running`);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ${serviceName} is not running:`,
      error,
    );
    throw new Error(
      `${serviceName} is not running. Please start the service before running tests.`,
    );
  }
}
