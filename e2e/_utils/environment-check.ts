import { exec as execCallback } from "child_process";
import { promisify } from "util";

const exec = promisify(execCallback);

export default async function environmentSetupCheck() {
  if (!process.env.GH_E2E_TEST_ACCOUNT) {
    throw new Error(
      "❌ GH_E2E_TEST_ACCOUNT not found. Set it to the name of the GitHub account/org that you want to use in the tests (must have access to `flowershow/flowershow-test-repo` repository)",
    );
  }

  await checkServiceHealth("http://cloud.localhost:3000", "Next.js app");
  await checkServiceHealth("http://localhost:8288", "Inngest");
  // await checkServiceHealth("http://localhost:8108/health", "Typesense"); TODO

  if (!process.env.CI) {
    await checkServiceHealth(
      "http://localhost:9000/minio/health/live",
      "MinIO",
    );
    await checkServiceHealth(
      "http://localhost:8787/health",
      "Cloudflare worker",
    );
  }

  try {
    const { stdout } = await exec(
      'pgrep -f "stripe listen --forward-to localhost:3000/api/stripe/webhook"',
    );
    if (!stdout.trim()) {
      throw new Error(
        "Stripe CLI webhook forwarding is not running. Please run: stripe listen --forward-to localhost:3000/api/stripe/webhook",
      );
    }
    console.log(
      `[${new Date().toISOString()}] Stripe CLI webhook forwarding is running`,
    );
  } catch (error: unknown) {
    // If exec fails with a non-zero exit code (command not found or no process found)
    if (error instanceof Error && "code" in error && error.code === 1) {
      throw new Error(
        "Stripe CLI webhook forwarding is not running. Please run: stripe listen --forward-to localhost:3000/api/stripe/webhook",
      );
    }
    throw error;
  }
}

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
