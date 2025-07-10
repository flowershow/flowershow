import NextAuth from "next-auth";
import { GithubProfile } from "next-auth/providers/github";
import { User as PrismaUser } from "@prisma/client";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string;
      username: string;
      email: string;
      image: string;
      role: "USER" | "ADMIN";
    };
    accessToken: string;
  }

  interface Profile extends GithubProfile {}

  interface AdapterUser extends PrismaUser {}
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    user: User;
    accessToken: string;
  }
}
