import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHubProvider, { GithubProfile } from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/server/db";
import { env } from "@/env.mjs";
import axios from "axios";
import { sendWelcomeEmail } from "@/lib/email";

const VERCEL_DEPLOYMENT = !!env.VERCEL_URL;

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider<GithubProfile>({
      clientId: env.NEXT_PUBLIC_AUTH_GITHUB_ID as string,
      clientSecret: env.AUTH_GITHUB_SECRET as string,
      authorization: {
        params: {
          scope: "read:user user:email repo read:org",
        },
      },
    }),
  ],
  pages: {
    signIn: `/login`,
    verifyRequest: `/login`,
    error: "/login", // Error code passed in query string as ?error=
  },
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
        domain: VERCEL_DEPLOYMENT
          ? `.${env.NEXT_PUBLIC_CLOUD_DOMAIN}`
          : undefined,
        secure: VERCEL_DEPLOYMENT,
      },
    },
  },
  // events: {
  //   createUser: async (message: any) => {
  //     // Add user to Brevo contact list
  //     try {
  //       await axios.post(
  //         `${env.BREVO_API_URL}`,
  //         {
  //           email: message.user.email,
  //           listIds: [env.BREVO_CONTACT_LISTID],
  //         },
  //         {
  //           headers: {
  //             "api-key": `${env.BREVO_API_KEY}`,
  //             "Content-Type": "application/json",
  //           },
  //         },
  //       );
  //     } catch (error: any) {
  //       // Ignore duplicate contact error
  //       if (error.response?.data?.code !== "duplicate_parameter") {
  //         console.error("Issue adding contact to Brevo:", error.message);
  //       }
  //     }

  //     // Send welcome email
  //     try {
  //       await sendWelcomeEmail(message.user.email, message.user.name);
  //     } catch (error: any) {
  //       console.error("Issue sending welcome email:", error.message);
  //     }
  //   },
  // },
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      // console.log("signIn", { user, account, profile });
      if (!account || !profile) return false;

      const existingAccount = await prisma.account.findFirst({
        where: {
          providerAccountId: account.providerAccountId, // same as profile.id
        },
      });

      if (existingAccount) {
        try {
          await prisma.account.update({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            data: {
              access_token: account.access_token,
              expires_at: account.expires_at,
              id_token: account.id_token,
              refresh_token: account.refresh_token,
              session_state: account.session_state,
              scope: account.scope,
            },
          });
          await prisma.user.update({
            where: { id: user.id },
            data: {
              ghUsername: profile.login,
              username: profile.login,
              name: profile.name || profile.login,
            },
          });
        } catch (error) {
          console.error("SignIn error:", error);
          return false;
        }
      }
      return true;
    },
    jwt: async ({ token, user, account, profile }) => {
      // console.log("jwt", { token, user, account, profile });
      if (account) {
        token.accessToken = account.access_token!;
      }
      if (user) {
        token.id = user.id;
        token.user = user;
      }
      return token;
    },
    session: async ({ session, token }) => {
      // console.log("session", { session, token });
      session.user = {
        ...session.user,
        id: token.user.id,
        name: token.user.name,
        username: token.user.username ?? token.user.ghUsername,
        email: token.user.email,
        image: token.user.image,
        role: token.user.role,
      };
      session.accessToken = token.accessToken!;

      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
}

export function withSiteAuth(action: any) {
  return async (
    formData: FormData | null,
    siteId: string,
    key: string | null,
  ) => {
    const session = await getSession();
    if (!session) {
      return {
        error: "Not authenticated",
      };
    }
    const site = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
    });
    if (!site || site.userId !== session.user.id) {
      return {
        error: "Not authorized",
      };
    }

    return action(formData, site, key);
  };
}
