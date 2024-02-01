import { getServerSession, type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/server/db";
import { env } from "@/env.mjs"

const VERCEL_DEPLOYMENT = !!env.VERCEL_URL;

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: env.AUTH_GITHUB_ID as string,
      clientSecret: env.AUTH_GITHUB_SECRET as string,
      authorization: {
        params: {
          scope: 'read:user user:email public_repo read:org',
        },
      },
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          gh_username: profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
  ],
  pages: {
    signIn: `/login`,
    verifyRequest: `/login`,
    error: "/login", // Error code passed in query string as ?error=
  },
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
        domain: VERCEL_DEPLOYMENT
          ? `.${env.NEXT_PUBLIC_ROOT_DOMAIN}`
          : undefined,
        secure: VERCEL_DEPLOYMENT,
      },
    },
  },
  callbacks: {
    signIn: async ({ user, account }) => {
      if (user && account) {
        try {
          const dbUser = await prisma.user.findFirst(
            {
              where: {
                id: user.id,
              },
            },
          );
          if (dbUser) {
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
          }
        } catch (err) {
          if (err instanceof Error) {
            console.error(err.message);
          }
        }
      }
      return true;
    },
    jwt: async ({ token, user, account }) => {
      if (account) {
        token.id = user.id
        token.accessToken = account.access_token;
      }
      if (user) {
        token.user = user;
      }


      return token;
    },
    session: async ({ session, token }) => {
      session.user = {
        ...session.user,
        // @ts-expect-error
        id: token.sub,
        // @ts-expect-error
        username: token?.user?.username || token?.user?.gh_username,
      };
      // @ts-expect-error
      session.accessToken = token.accessToken;

      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions) as Promise<{
    user: {
      id: string;
      name: string;
      username: string;
      email: string;
      image: string;
    };
    accessToken: string;
  } | null>;
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

// export function withPostAuth(action: any) {
//   return async (
//     formData: FormData | null,
//     postId: string,
//     key: string | null,
//   ) => {
//     const session = await getSession();
//     if (!session?.user.id) {
//       return {
//         error: "Not authenticated",
//       };
//     }
//     const post = await prisma.post.findUnique({
//       where: {
//         id: postId,
//       },
//       include: {
//         site: true,
//       },
//     });
//     if (!post || post.userId !== session.user.id) {
//       return {
//         error: "Post not found",
//       };
//     }

//     return action(formData, post, key);
//   };
// }
