import { NextRequest } from "next/server";
import prisma from "@/server/db";
import { env } from "@/env.mjs";
import { inngest } from "@/inngest/client";

// TODO https://www.inngest.com/docs/platform/webhooks
export async function POST(req: NextRequest) {
  const event = req.headers.get("x-github-event");

  if (event === "ping") {
    return new Response("Event processed", { status: 200 });
  }

  const secret = env.GH_WEBHOOK_SECRET;
  const signature = req.headers.get("x-hub-signature")!;
  const payload = await req.json();

  if (!verifySignature(secret, signature, payload)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const webhookId = req.headers.get("x-github-hook-id")!;

  const site = await prisma.site.findUnique({
    where: {
      webhookId,
    },
    include: {
      user: true,
    },
  });

  if (!site) {
    return new Response("Site not found", { status: 404 });
  }

  if (payload.ref !== `refs/heads/${site.gh_branch}` || event !== "push") {
    return new Response("Incorrect branch", { status: 404 });
  }

  const account = await prisma.account.findFirst({
    where: {
      userId: site.userId!,
    },
  });

  await prisma.site.update({
    where: { id: site!.id },
    data: {
      syncStatus: "PENDING",
    },
  });

  inngest.send({
    name: "site/sync",
    data: {
      siteId: site.id,
      gh_repository: site.gh_repository,
      gh_branch: site.gh_branch,
      rootDir: site.rootDir,
      access_token: account!.access_token!,
    },
  });

  return new Response("Event processed", { status: 200 });
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
