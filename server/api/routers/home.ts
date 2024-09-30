import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { submitGitHubIssue } from "@/lib/github";
import { OrganizationType } from "../types";
import { env } from "@/env.mjs";

export const homeRouter = createTRPCRouter({
  sendDataRequest: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        organization_type: z.nativeEnum(OrganizationType),
        description: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // submit an issue to the github repo
      if (env.NEXT_PUBLIC_VERCEL_ENV === "production") {
        await submitGitHubIssue({
          gh_repository: "datopian/sales",
          title: `New request from ${input.name}`,
          body: `**Name:** ${input.name}
**Email:** ${input.email}
**Organization Type:** ${input.organization_type}

${input.description}`,
          labels: ["data-request"],
          access_token: env.GH_ACCESS_TOKEN,
        });
      }
    }),
  subscribeToNewsletter: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      return await fetch(`${env.BREVO_API_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": `${env.BREVO_API_KEY}`,
        },
        body: JSON.stringify({
          email: input.email,
          listIds: [env.BREVO_CONTACT_LISTID],
        }),
      });
    }),
});
