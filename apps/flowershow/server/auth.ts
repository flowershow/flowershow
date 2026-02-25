import { PrismaAdapter } from '@next-auth/prisma-adapter';
import axios from 'axios';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import GitHubProvider, { GithubProfile } from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { env } from '@/env.mjs';
import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';

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
          // Removed 'repo' scope - GitHub App will handle repository access
          scope: 'read:user user:email read:org',
        },
      },
    }),
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_ID as string,
      clientSecret: env.AUTH_GOOGLE_SECRET as string,
      profile(profile) {
        const username =
          profile.email?.split('@')[0] ||
          profile.name?.replace(/\s+/g, '-').toLowerCase() ||
          profile.sub;
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          username: username,
        };
      },
    }),
  ],
  pages: {
    signIn: `/login`,
    verifyRequest: `/login`,
    error: '/login', // Error code passed in query string as ?error=
  },
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${VERCEL_DEPLOYMENT ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // In production: .flowershow.app allows cookies across all subdomains
        // In development: .flowershow.local requires adding entries to /etc/hosts:
        //   127.0.0.1 flowershow.local cloud.flowershow.local my.flowershow.local
        domain: VERCEL_DEPLOYMENT ? '.flowershow.app' : '.flowershow.local',
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
          'https://api.brevo.com/v3/contacts',
          {
            email: user.email,
            listIds: [parseInt(env.BREVO_CONTACT_LISTID)],
            updateEnabled: true,
            attributes: { NAME: user.name },
          },
          {
            headers: {
              'api-key': `${env.BREVO_API_KEY}`,
              'Content-Type': 'application/json',
            },
          },
        );
      } catch (error: any) {
        // Ignore duplicate contact error
        if (error.response?.data?.code !== 'duplicate_parameter') {
          console.error('Issue adding contact to Brevo:', error.message);
        }
      }

      // Look up the OAuth account that was just created to determine the auth provider
      const account = await prisma.account.findFirst({
        where: { userId: user.id },
        select: { provider: true },
      });

      const posthog = PostHogClient();
      posthog.capture({
        distinctId: user.id,
        event: 'sign_up',
        properties: {
          auth_provider: account?.provider ?? 'unknown',
        },
      });
      await posthog.shutdown();
    },
  },
  callbacks: {
    redirect: async ({ url, baseUrl }) => {
      // Allow redirects to trusted domains (for claim flow across subdomains)
      try {
        const redirectUrl = new URL(url, baseUrl);
        const base = new URL(baseUrl);

        // Allow same origin redirects
        if (redirectUrl.origin === base.origin) {
          return url;
        }

        // Extract base domain (e.g., "flowershow.local" from "cloud.flowershow.local:3000")
        // NEXT_PUBLIC_HOME_DOMAIN includes port, so extract just the hostname
        const homeDomain = env.NEXT_PUBLIC_HOME_DOMAIN.split(':')[0];

        // Allow redirects to any subdomain of the home domain (or the home domain itself)
        const targetHost = redirectUrl.hostname;
        if (
          targetHost === homeDomain ||
          targetHost.endsWith(`.${homeDomain}`)
        ) {
          return redirectUrl.href;
        }

        // For relative URLs, use baseUrl
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }

        // Default: return base URL for safety
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
    signIn: async ({ user, account, profile }) => {
      // console.log("signIn", { user, account, profile });
      // This is called only once
      // user:
      //   on first sign up - value returned from profile method above
      //   on subsequent sign in - prisma user
      // account: OAuth response with fresh tokens from provider
      // profile: full GitHub or Google profile
      if (!account || !profile) return false;

      const existingAccount = await prisma.account.findFirst({
        where: {
          provider: account.provider,
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

          // Update user data based on provider
          // Note: We never update username on sign-in - it's only set on initial account creation
          // and can only be changed manually by the user
          const updateData: any = {};

          if (account.provider === 'github') {
            updateData.ghUsername = (profile as any).login;
            updateData.name = (profile as any).name || (profile as any).login;
          } else if (account.provider === 'google') {
            updateData.name = (profile as any).name;
          }

          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        } catch (error) {
          console.error('SignIn error:', error);
          return false;
        }
      }
      return true;
    },
    jwt: async ({ token, user, account, profile, trigger, session }) => {
      // console.log("jwt", { token, user, account, profile, trigger, session });
      // token:
      //   first time it's called (sign in): minimal token with name, email, picture and sub (user ID)
      //   subsequent calls (get session): token with validity properties + any extra ones that we added first time in this callback
      // (available only on first call) account: OAuth response with fresh tokens from provider
      // (available only on first call) user: prisma user
      // (available only on first call) profile: full GitHub profile
      // trigger: "signIn" | "signUp" | "update" - indicates why this callback was called
      // session: data passed to update() function

      if (trigger === 'update' && session?.username) {
        token.username = session.username;
      }

      if (account) {
        token.accessToken = account.access_token!;
      }

      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.username = user.username;
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
        error: 'Not authenticated',
      };
    }
    const site = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
    });
    if (!site || site.userId !== session.user.id) {
      return {
        error: 'Not authorized',
      };
    }

    return action(formData, site, key);
  };
}
