import type { Metadata } from "next";
import { Geist, Geist_Mono, Mulish } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { HeaderNavigation } from "@/components/custom/HeaderNavigation";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: "Meteor FC - Football Club Management System",
  description: "Modern football club management system for Meteor FC - track matches, statistics, finances, and team performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${mulish.variable} antialiased`}
      >
        <SessionProvider>
          <HeaderNavigation />
          <main className="flex-1">
            {children}
          </main>
          <Toaster position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
