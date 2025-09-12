import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Find user by email
        const user = await prisma.user.findFirst({
          where: { 
            email: credentials.email,
            passwordHash: { not: null }, // Must have password set
            accountStatus: "CLAIMED" // Only allow claimed accounts to login
          }
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          credentials.password, 
          user.passwordHash
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          userType: user.userType,
          accountStatus: user.accountStatus
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userType = user.userType;
        token.accountStatus = user.accountStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.userType = token.userType as string;
        session.user.accountStatus = token.accountStatus as string;
        // Get fresh avatar URL from database
        const user = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: { avatarUrl: true }
        });
        session.user.avatarUrl = user?.avatarUrl;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};