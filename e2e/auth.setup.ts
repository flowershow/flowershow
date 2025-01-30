import { test as setup } from "@playwright/test";
import { env } from "@/env.mjs";

const authFile = "playwright/.auth/user.json";
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

setup("authenticate", async ({ page }) => {
  let lastError: Error | undefined;

  // Check if we have both username and password for automated login
  const hasCredentials = env.E2E_GH_USERNAME && env.E2E_GH_PASSWORD;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`Authentication attempt ${attempt}/${MAX_RETRIES}`);

    try {
      // Navigate to the app's sign-in page
      console.log("Navigating to login page...");
      await page.goto("/login");
      console.log("Current URL:", page.url());

      // Click the "Sign in with GitHub" button
      console.log("Looking for GitHub sign-in button...");
      const signInButton = page.getByRole("button", {
        name: /Login with GitHub/i,
      });
      const isSignInVisible = await signInButton.isVisible();
      console.log("GitHub sign-in button visible:", isSignInVisible);

      if (!isSignInVisible) {
        console.log("Page content:", await page.content());
        throw new Error("GitHub sign-in button not found");
      }

      await signInButton.click();
      console.log("Clicked GitHub sign-in button");

      // Wait for GitHub OAuth page
      console.log("Waiting for GitHub login page...");
      await page.waitForURL("https://github.com/login**");
      console.log("Reached GitHub login page:", page.url());

      if (!hasCredentials) {
        // Manual login mode - wait for user to complete login
        console.log(
          "No credentials provided in env vars. Please login manually in the browser window.",
        );
        // Wait for successful redirect back to our app
        console.log("Waiting for manual login completion and redirect...");
        await page.waitForURL("**/sites", { timeout: 120000 }); // 2 minute timeout for manual login
        console.log("Manual login completed successfully");
      } else {
        // Automated login mode - we know both username and password exist here
        console.log("Using automated login with provided credentials");
        await page
          .getByLabel("Username or email address")
          .fill(env.E2E_GH_USERNAME!);
        await page.getByLabel("Password").fill(env.E2E_GH_PASSWORD!);
        await page
          .locator('css=input[type="submit"][name="commit"][value="Sign in"]')
          .click();
        console.log("Submitted GitHub login form");

        // Handle authorization if needed
        console.log("Checking for authorization button...");
        const authorizeButton = page.getByRole("button", {
          name: /Authorize/i,
        });
        if (await authorizeButton.isVisible()) {
          console.log("Authorization button found, clicking...");
          await authorizeButton.click();
        } else {
          console.log("No authorization button found, continuing...");
        }

        // Wait for redirect back to our app
        console.log("Waiting for redirect to dashboard...");
        await page.waitForURL("**/sites");
        console.log("Reached dashboard:", page.url());
      }

      // Save the authentication state
      console.log("Saving authentication state...");
      await page.context().storageState({ path: authFile });
      console.log("Authentication state saved to:", authFile);

      console.log("Authentication setup completed successfully");
      return; // Success - exit the retry loop
    } catch (error) {
      console.error(`Authentication attempt ${attempt} failed:`, error);
      console.log("Current URL:", page.url());
      console.log("Page content:", await page.content());
      lastError = error as Error;

      if (attempt < MAX_RETRIES) {
        console.log(`Waiting ${RETRY_DELAY}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  // If we get here, all retries failed
  console.error(`Authentication failed after ${MAX_RETRIES} attempts`);
  throw lastError;
});
