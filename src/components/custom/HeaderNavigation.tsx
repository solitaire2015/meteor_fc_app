"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { UserMenu } from "./UserMenu";
import { Menu, Home, Trophy, Calendar, User, Shield } from "lucide-react";

const navigation = [
  { name: "首页", href: "/", icon: Home },
  { name: "排行榜", href: "/leaderboard", icon: Trophy },
  { name: "比赛", href: "/games", icon: Calendar },
  { name: "个人资料", href: "/profile", icon: User },
];

const adminNavigation = [
  { name: "管理后台", href: "/admin", icon: Shield },
];

export function HeaderNavigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't show header on login page
  if (pathname === "/login") {
    return null;
  }

  // Don't show header if not authenticated (except on login page)
  if (status === "unauthenticated") {
    return null;
  }

  const isAdmin = session?.user?.userType === "ADMIN";
  const allNavigation = isAdmin ? [...navigation, ...adminNavigation] : navigation;

  const isActivePage = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/meteor_fc.png"
            alt="Meteor FC"
            width={27}
            height={32}
            className="h-8 w-auto"
          />
          <span className="hidden font-bold sm:inline-block">
            Meteor FC
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium ml-8">
          {allNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 transition-colors hover:text-foreground/80 ${isActivePage(item.href)
                    ? "text-foreground"
                    : "text-foreground/60"
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop User Menu */}
        <div className="hidden md:flex">
          <UserMenu />
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden">
          <UserMenu />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="ml-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="pr-0">
              <SheetTitle className="sr-only">导航菜单</SheetTitle>
              <div className="px-7">
                <Link
                  href="/"
                  className="flex items-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Image
                    src="/meteor_fc.png"
                    alt="Meteor FC"
                    width={20}
                    height={24}
                    className="mr-2 h-6 w-auto"
                  />
                  <span className="font-bold">Meteor FC</span>
                </Link>
              </div>
              <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
                <div className="flex flex-col space-y-3">
                  {allNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 text-sm font-medium transition-colors hover:text-foreground/80 ${isActivePage(item.href)
                            ? "text-foreground"
                            : "text-foreground/60"
                          }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}