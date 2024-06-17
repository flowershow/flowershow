// import { buffer } from 'micro';
// import crypto from 'crypto';
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/server/db";
import { fetchTree, uploadTree } from "@/lib/content-store";
import { fetchGitHubRepoTree } from "@/lib/github";
import { processGitHubTree } from "@/server/api/routers/site";
import { revalidateTag } from "next/cache";

// Verify the GitHub webhook secret
// const isValidGitHubSignature = (req: NextRequest, secret: string): boolean => {
//     const signature = req.headers['x-hub-signature-256'] as string;
//     const payload = buffer(req);
//     const hash = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
//     return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
// };

// Disable body parsing to handle raw payload
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  // const secret = env.GITHUB_WEBHOOK_SECRET;

  // if (!isValidGitHubSignature(req, secret)) {
  //     return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  // }

  const event = req.headers.get("x-github-event");
  const webhookId = req.headers.get("x-github-hook-id")!;
  const payload = await req.json();

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
      status: 204,
    });
  }

  if (event === "ping") {
    return NextResponse.json({ message: "Event processed" });
  }

  if (payload.ref !== `refs/heads/${site.gh_branch}` || event !== "push") {
    return new Response("Event not processed", { status: 204 });
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
  await new Promise((resolve) => setTimeout(resolve, 30 * 1000));

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
