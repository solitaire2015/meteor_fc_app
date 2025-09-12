"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Helper function to generate player abbreviations
function generateAbbreviation(name: string): string {
  if (!name) return 'UK'
  
  // For Chinese names, take first character and last character
  if (name.length >= 2) {
    return (name.charAt(0) + name.charAt(name.length - 1)).toUpperCase()
  }
  
  // For single character names, repeat it
  if (name.length === 1) {
    return (name + name).toUpperCase()
  }
  
  return 'UK'
}

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }

    // Ensure session is fully established before starting countdown
    // This prevents production environment session sync issues
    const sessionCheckTimer = setTimeout(() => {
      // Start countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(timer);
            return 0;
          }
          return newValue;
        });
      }, 1000);

      // Update progress bar
      const progressTimer = setInterval(() => {
        setProgress((prev) => {
          const newValue = prev - (100 / 30); // 100% over 3 seconds (30 intervals of 100ms)
          if (newValue <= 0) {
            clearInterval(progressTimer);
            return 0;
          }
          return newValue;
        });
      }, 100);

      return () => {
        clearInterval(timer);
        clearInterval(progressTimer);
      };
    }, 500); // Wait 500ms for session to fully establish

    return () => {
      clearTimeout(sessionCheckTimer);
    };
  }, [session, status, router]);

  // Separate effect to handle redirect when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && session && status === "authenticated") {
      // Double-check session is still valid before redirecting
      router.push("/");
    }
  }, [countdown, router, session, status]);

  const handleSkip = () => {
    // Ensure session is valid before manual redirect
    if (session && status === "authenticated") {
      router.push("/");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg font-semibold">加载中...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#7B8EE3] to-[#B8AFFF] px-4 relative overflow-hidden">
      {/* Background watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="text-[15rem] font-black text-white transform rotate-12 select-none">
          METEOR CLUB
        </div>
      </div>

      {/* Welcome card */}
      <Card className="w-full max-w-md bg-white/25 backdrop-blur-lg border border-white/20 shadow-xl">
        <CardHeader className="text-center pb-6">
          {/* User Avatar */}
          <div className="flex justify-center mb-6">
            <Avatar className="w-24 h-24 ring-4 ring-white/30 shadow-lg">
              <AvatarImage src={session.user?.avatarUrl || ""} />
              <AvatarFallback className="text-2xl font-bold bg-white/20 text-white">
                {generateAbbreviation(session.user?.name || "")}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Welcome message */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white drop-shadow-lg">
              球星{session.user?.name}，欢迎回家
            </h1>
            <p className="text-white/80 text-lg font-semibold">
              METEOR FOOTBALL CLUB
            </p>
          </div>
        </CardHeader>

        <CardContent className="text-center space-y-6">
          {/* Countdown display */}
          <div className="space-y-3">
            <div className="text-white/90 font-semibold">
              {countdown}秒后自动跳转到主页...
            </div>
            
            {/* Progress bar */}
            <Progress 
              value={progress} 
              className="w-full h-2 bg-white/20"
            />
          </div>

          {/* Decorative elements */}
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse delay-200"></div>
          </div>
        </CardContent>

        <CardFooter className="justify-center pt-0">
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="text-white hover:bg-white/20 hover:text-white font-semibold px-8"
          >
            立即进入主页
          </Button>
        </CardFooter>
      </Card>

      {/* Floating elements for decoration */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-white/30 rounded-full animate-bounce"></div>
      <div className="absolute top-40 right-16 w-3 h-3 bg-white/20 rounded-full animate-bounce delay-300"></div>
      <div className="absolute bottom-32 left-20 w-5 h-5 bg-white/25 rounded-full animate-bounce delay-700"></div>
      <div className="absolute bottom-20 right-10 w-4 h-4 bg-white/30 rounded-full animate-bounce delay-500"></div>
    </div>
  );
}