import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { HeaderNavigation } from "@/components/custom/HeaderNavigation";
import { Toaster } from "@/components/ui/sonner";
import GeneralAssistant from "@/components/ai/GeneralAssistant";

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
        className="antialiased"
      >
        <SessionProvider>
          <HeaderNavigation />
          <main className="flex-1">
            {children}
          </main>
          <GeneralAssistant />
          <Toaster position="top-right" richColors closeButton />
        </SessionProvider>
      </body>
    </html>
  );
}
