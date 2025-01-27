import { test as setup } from "@playwright/test";
import prisma from "../server/db";
import { inngest } from "../inngest/client";
import { testUser, testProject } from "./test-utils";

import "dotenv/config";
import { env } from "@/env.mjs";

setup.describe.configure({
  timeout: 180000,
  retries: 0,
});

async function checkServiceHealth(url: string, serviceName: string) {
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

async function checkRequiredServices() {
  await checkServiceHealth("http://cloud.localhost:3000", "Next.js app");
  await checkServiceHealth("http://localhost:8288", "Inngest");
  await checkServiceHealth("http://localhost:9000/minio/health/live", "MinIO");
}

setup("Setup test site", async () => {
  // Check if all required services are running
  await checkRequiredServices();

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: testUser.email },
    update: {},
    create: {
      email: testUser.email,
      name: testUser.name,
      gh_username: testUser.username,
    },
  });

  // Create GitHub account for the user
  const account = await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "github",
        providerAccountId: testUser.username,
      },
    },
    update: {
      access_token: env.GH_ACCESS_TOKEN,
    },
    create: {
      userId: user.id,
      type: "oauth",
      provider: "github",
      providerAccountId: testUser.username,
      access_token: env.GH_ACCESS_TOKEN,
    },
  });

  // Create test site
  const site = await prisma.site.upsert({
    where: {
      userId_projectName: {
        userId: user.id,
        projectName: testProject.name,
      },
    },
    update: {},
    create: {
      userId: user.id,
      projectName: testProject.name,
      gh_repository: testProject.repository,
      gh_branch: testProject.branch,
      syncStatus: "PENDING",
    },
  });

  await inngest.send({
    name: "site/sync",
    data: {
      siteId: site.id,
      gh_repository: site.gh_repository,
      gh_branch: site.gh_branch,
      rootDir: site.rootDir,
      access_token: account.access_token!,
      forceSync: true,
    },
  });

  // check sync status every second until it's SUCCESS or ERROR
  const isSyncComplete = async () => {
    const _site = await prisma.site.findUnique({
      where: {
        id: site.id,
      },
    });

    console.log(
      `[${new Date().toISOString()}] Current sync status:`,
      _site?.syncStatus,
    );

    if (_site?.syncStatus === "SUCCESS") {
      return true;
    }

    if (_site?.syncStatus === "ERROR") {
      console.error("Sync failed. Error:", _site.syncError);
      throw new Error(`Sync error. Site ID: ${site.id}`);
    }

    return false;
  };

  const waitForSync = async () => {
    console.log(`[${new Date().toISOString()}] Starting sync wait...`);
    let isComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 1 minute timeout (checking every second)

    while (!isComplete && attempts < maxAttempts) {
      attempts++;
      isComplete = await isSyncComplete();
      if (isComplete) {
        console.log(
          `[${new Date().toISOString()}] Sync completed successfully after ${attempts} attempts`,
        );
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!isComplete) {
      console.error(
        `[${new Date().toISOString()}] Sync timed out after ${attempts} attempts`,
      );
      throw new Error("Sync timed out after 60 seconds");
    }
  };

  await waitForSync();
});
