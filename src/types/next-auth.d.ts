import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    userType: string;
    accountStatus: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email?: string;
      image?: string;
      userType: string;
      accountStatus: string;
      avatarUrl?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userType: string;
    accountStatus: string;
  }
}