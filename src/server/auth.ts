import { env } from "@/env";
import { db } from "@/server/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { nanoid } from "nanoid";
import NextAuth, {
  type DefaultSession,
  type NextAuthConfig,
  type Session,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      hasAccess: boolean;
      location?: string;
      role: string;
      isAdmin: boolean;
      isGuest: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    hasAccess: boolean;
    role: string;
    isGuest?: boolean;
  }
}

const authConfig: NextAuthConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.hasAccess = user.hasAccess ?? true;
        token.name = user.name;
        token.image = user.image;
        token.picture = user.image;
        token.location = (user as Session["user"]).location;
        token.role = user.role || "USER";
        token.isAdmin = user.role === "ADMIN";
        token.isGuest = user.isGuest ?? false;
      }

      if (trigger === "update" && session?.user) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
        });

        if (session.user) {
          token.name = session.user.name;
          token.image = session.user.image;
          token.picture = session.user.image;
          token.location = session.user.location;
          token.role = session.user.role || "USER";
          token.isAdmin = session.user.role === "ADMIN";
        }

        if (dbUser) {
          token.hasAccess = dbUser.hasAccess ?? true;
          token.role = dbUser.role;
          token.isAdmin = dbUser.role === "ADMIN";
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.hasAccess = token.hasAccess as boolean;
      session.user.location = token.location as string;
      session.user.role = token.role as string;
      session.user.isAdmin = token.role === "ADMIN";
      session.user.isGuest = token.isGuest as boolean;
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email },
          select: { id: true, hasAccess: true, role: true },
        });

        if (dbUser) {
          user.hasAccess = dbUser.hasAccess;
          user.role = dbUser.role;
        } else {
          user.hasAccess = true;
          user.role = "USER";
        }
      }

      return true;
    },
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db) as any,
  providers: [],
};

const providers: NextAuthConfig["providers"] = [];

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (env.NODE_ENV === "development" || !env.GOOGLE_CLIENT_ID) {
  providers.push(
    CredentialsProvider({
      id: "guest",
      name: "Guest Access",
      credentials: {
        name: {
          label: "Name",
          type: "text",
          placeholder: "Enter your name (optional)",
        },
      },
      async authorize(credentials) {
        const guestId = `guest_${nanoid(12)}`;
        const guestName =
          (credentials?.name as string) ||
          `Guest_${Math.random().toString(36).slice(2, 7)}`;

        return {
          id: guestId,
          name: guestName,
          email: `${guestId}@guest.local`,
          image: null,
          hasAccess: true,
          role: "USER",
          isGuest: true,
        };
      },
    }),
  );

  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Development Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.email === "admin@allweone.com" &&
          credentials?.password === "admin123"
        ) {
          const adminUser = await db.user.findUnique({
            where: { email: credentials.email },
          });

          if (adminUser) {
            return {
              id: adminUser.id,
              name: adminUser.name,
              email: adminUser.email,
              image: adminUser.image,
              hasAccess: adminUser.hasAccess,
              role: adminUser.role,
            };
          }

          return {
            id: "admin_dev",
            name: "Admin User",
            email: credentials.email,
            hasAccess: true,
            role: "ADMIN",
          };
        }

        if (
          credentials?.email === "demo@allweone.com" &&
          credentials?.password === "demo123"
        ) {
          const demoUser = await db.user.findUnique({
            where: { email: credentials.email },
          });

          if (demoUser) {
            return {
              id: demoUser.id,
              name: demoUser.name,
              email: demoUser.email,
              image: demoUser.image,
              hasAccess: demoUser.hasAccess,
              role: demoUser.role,
            };
          }

          return {
            id: "demo_dev",
            name: "Demo User",
            email: credentials.email,
            hasAccess: true,
            role: "USER",
          };
        }

        const existingUser = await db.user.findUnique({
          where: { email: credentials?.email },
        });

        if (existingUser) {
          return {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            image: existingUser.image,
            hasAccess: existingUser.hasAccess,
            role: existingUser.role,
          };
        }

        return null;
      },
    }),
  );
}

authConfig.providers = providers;

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
