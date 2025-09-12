"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Settings, Shield } from "lucide-react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <div className="hidden sm:block h-4 w-16 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    return (
      <Button
        variant="ghost"
        onClick={() => router.push("/login")}
        className="flex items-center space-x-2"
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">登录</span>
      </Button>
    );
  }

  const user = session.user;
  const isAdmin = user.userType === "ADMIN";

  const handleLogout = async () => {
    try {
      await signOut({ 
        callbackUrl: "/login",
        redirect: true 
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: redirect manually
      window.location.href = "/login";
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={user.avatarUrl || undefined} 
                alt={`${user.name}的头像`}
              />
              <AvatarFallback className="bg-brand-blue text-white text-sm font-medium">
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium leading-none">
                {user.name}
              </span>
              {isAdmin && (
                <span className="text-xs text-muted-foreground mt-1">
                  管理员
                </span>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.name}
              </p>
              {user.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              )}
              {isAdmin && (
                <div className="flex items-center space-x-1 mt-1">
                  <Shield className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">
                    管理员
                  </span>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => router.push("/profile")}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>个人资料</span>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem 
              onClick={() => router.push("/admin")}
              className="cursor-pointer"
            >
              <Shield className="mr-2 h-4 w-4" />
              <span>管理后台</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setLogoutDialogOpen(true)}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>退出登录</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出登录</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要退出登录吗？您需要重新输入用户名和密码才能再次访问系统。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              退出登录
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}