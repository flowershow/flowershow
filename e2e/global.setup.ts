import { test as setup } from "@playwright/test";
import prisma from "../server/db";
import { inngest } from "../inngest/client";

import "dotenv/config";

setup.describe.configure({
  timeout: 180000,
  retries: 0,
});

setup("Sync test site", async () => {
  if (!process.env.CI) {
    return;
  }

  const [user, projectName] = process.env.E2E_TEST_SITE!.split("/");

  const site = await prisma.site.findFirst({
    where: {
      AND: [
        { projectName },
        { user: { gh_username: user!.slice(1) } }, // Remove @ from username
      ],
    },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  await prisma.site.update({
    where: { id: site!.id },
    data: {
      syncStatus: "PENDING",
    },
  });

  const account = await prisma.account.findFirst({
    where: {
      userId: site.userId!,
    },
  });

  await inngest.send({
    name: "site/sync",
    data: {
      siteId: site.id,
      gh_repository: site.gh_repository,
      gh_branch: site.gh_branch,
      rootDir: site.rootDir,
      access_token: account!.access_token!, // TODO Change to PAT
      forceSync: true,
    },
  });

  // check sync status every 5 seconds until it's SUCCESS or ERROR

  const isSyncComplete = async () => {
    const _site = await prisma.site.findUnique({
      where: {
        id: site!.id,
      },
    });

    if (_site?.syncStatus === "SUCCESS") {
      return true;
    }

    if (_site?.syncStatus === "ERROR") {
      throw new Error("Sync error");
    }

    return false;
  };

  const waitForSync = async () => {
    let isComplete = false;
    while (!isComplete) {
      isComplete = await isSyncComplete();
      if (isComplete) {
        break; // Exit loop if sync is successful
      }
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before next check
    }
  };

  await waitForSync();
});
