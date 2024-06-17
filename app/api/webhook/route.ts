import { NextRequest, NextResponse } from "next/server";
import prisma from "@/server/db";
import { fetchTree, uploadTree } from "@/lib/content-store";
import { fetchGitHubRepoTree } from "@/lib/github";
import { processGitHubTree } from "@/server/api/routers/site";
import { revalidateTag } from "next/cache";
import { env } from "@/env.mjs";

export async function POST(req: NextRequest) {
  const secret = env.GITHUB_WEBHOOK_SECRET;

  const payload = await req.json();

  if (!verifySignature(secret, req.headers.get("x-hub-signature")!, payload)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const webhookId = req.headers.get("x-github-hook-id")!;

  if (event === "ping") {
    return NextResponse.json({ message: "Event processed" });
  }

  const site = await prisma.site.findUnique({
    where: {
      webhookId,
    },
    include: {
      user: true,
    },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // TODO this is temporary solution; it should be queued instead of blocking the request
  if (site.syncStatus === "PENDING") {
    return new Response("Event not processed: sync already in progress", {
      status: 401,
    });
  }

  if (payload.ref !== `refs/heads/${site.gh_branch}` || event !== "push") {
    return new Response("Incorrect branch", { status: 404 });
  }

  const account = await prisma.account.findFirst({
    where: {
      userId: site.userId!,
    },
  });
  const { id, gh_repository, gh_branch } = site!;
  const access_token = account!.access_token!;

  await prisma.site.update({
    where: { id: site!.id },
    data: {
      syncStatus: "PENDING",
    },
  });

  // simulating a long-running process
  // await new Promise((resolve) => setTimeout(resolve, 5 * 1000));

  // this is copied and only slightly modified from the sync TRPC route,
  // as can't call the route directly as it's protected and requires a user session;
  // will be moved to an Inngest workflow soon anyway so it's ok for now
  try {
    const contentStoreTree = await fetchTree(site!.id, site!.gh_branch);
    const gitHubTree = await fetchGitHubRepoTree({
      gh_repository,
      gh_branch,
      access_token,
    });

    const filesMetadata = await processGitHubTree({
      gh_repository,
      gh_branch,
      access_token,
      tree: gitHubTree,
      previousTree: contentStoreTree,
      site,
      filesMetadata: site.files as any, // TODO: fix types
      rootDir: site!.rootDir,
    });

    // If all goes well, update the content store tree to match the GitHub tree
    await uploadTree({
      projectId: id,
      branch: gh_branch,
      tree: gitHubTree,
    });

    await prisma.site.update({
      where: { id: site!.id },
      data: {
        files: filesMetadata as any, // TODO: fix types
        syncStatus: "SUCCESS",
        syncedAt: new Date(),
      },
    });

    // revalidate the site metadata
    revalidateTag(`${site!.user?.gh_username}-${site!.projectName}-metadata`);
    // revalidatee the site's permalinks
    revalidateTag(`${site!.user?.gh_username}-${site!.projectName}-permalinks`);
    // revalidate the site tree
    revalidateTag(`${site?.user?.gh_username}-${site?.projectName}-tree`);
    // revalidate all the pages' content
    revalidateTag(
      `${site!.user?.gh_username}-${site!.projectName}-page-content`,
    );

    return NextResponse.json({ message: "Event processed" });
  } catch (error) {
    await prisma.site.update({
      where: { id: site!.id },
      data: {
        syncStatus: "ERROR",
      },
    });
    return NextResponse.json(
      { error: "Error syncing repository" },
      { status: 500 },
    );
  }
}

const encoder = new TextEncoder();

// Verify the GitHub webhook secret
async function verifySignature(
  secret: string,
  header: string,
  payload: string,
) {
  const parts = header.split("=");
  const sigHex = parts[1]!;

  const algorithm = { name: "HMAC", hash: { name: "SHA-256" } };

  const keyBytes = encoder.encode(secret);
  const extractable = false;
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    algorithm,
    extractable,
    ["sign", "verify"],
  );

  const sigBytes = hexToBytes(sigHex);
  const dataBytes = encoder.encode(payload);
  const equal = await crypto.subtle.verify(
    algorithm.name,
    key,
    sigBytes,
    dataBytes,
  );

  return equal;
}

function hexToBytes(hex: string) {
  const len = hex.length / 2;
  const bytes = new Uint8Array(len);

  let index = 0;
  for (let i = 0; i < hex.length; i += 2) {
    const c = hex.slice(i, i + 2);
    const b = parseInt(c, 16);
    bytes[index] = b;
    index += 1;
  }

  return bytes;
}
