import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHubProvider, { GithubProfile } from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/server/db";
import { env } from "@/env.mjs";
import axios from "axios";
import PostHogClient from "@/lib/server-posthog";

const VERCEL_DEPLOYMENT = !!env.VERCEL_URL;

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: env.NEXT_PUBLIC_AUTH_GITHUB_ID as string,
      clientSecret: env.AUTH_GITHUB_SECRET as string,
      // this will be passed to signIn callback as user
      // important: the object returned will be used by prisma adapter to create the user
      // so it should include required data
      profile(profile: GithubProfile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          ghUsername: profile.login,
          username: profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
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
        domain: VERCEL_DEPLOYMENT ? ".flowershow.app" : undefined, // set to apex domain to make posthog identify/reset work (and to allow some UI indicators that you're logged in and previewing your own site)
        secure: VERCEL_DEPLOYMENT,
      },
    },
  },
  events: {
    createUser: async ({ user }) => {
      // console.log("createUser", { user: message.user });
      // Called AFTER user is created in the DB
      // user: prisma user
      // Add user to Brevo contact list
      try {
        await axios.post(
          "https://api.brevo.com/v3/contacts",
          {
            email: user.email,
            listIds: [parseInt(env.BREVO_CONTACT_LISTID)],
            updateEnabled: true,
            attributes: { NAME: user.name },
          },
          {
            headers: {
              "api-key": `${env.BREVO_API_KEY}`,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error: any) {
        // Ignore duplicate contact error
        if (error.response?.data?.code !== "duplicate_parameter") {
          console.error("Issue adding contact to Brevo:", error.message);
        }
      }

      const posthog = PostHogClient();
      posthog.capture({
        distinctId: user.id,
        event: "sign_up",
      });
      await posthog.shutdown();
    },
  },
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      // console.log("signIn", { user, account, profile });
      // This is called only once
      // user:
      //   on first sign up - value returned from profile method above
      //   on subsequent sign in - prisma user
      // account: prisma account
      // profile: full GitHub profile
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
      // token:
      //   first time it's called (sign up): minimal token with name, email, picture and sub (user ID)
      //   subsequent calls (get session): token with validity properties + any extra ones that we set up in session callback
      // (available only on first call) account: prisma account
      // (available only on first call) user: user account
      // (available only on first call) profile: full GitHub profile
      if (account) {
        token.accessToken = account.access_token!;
      }

      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.username = user.ghUsername;
        token.email = user.email;
        token.image = user.image;
        token.role = user.role!;
      }
      return token;
    },
    session: async ({ session, token }) => {
      // console.log("session", { session, token });
      session.user = {
        id: token.id,
        name: token.name,
        username: token.username,
        email: token.email,
        image: token.image,
        role: token.role,
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
