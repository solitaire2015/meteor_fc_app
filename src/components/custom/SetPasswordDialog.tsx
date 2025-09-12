"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminSetPasswordInput, adminSetPasswordSchema } from "@/lib/validations/auth";
import { Key } from "lucide-react";
import { ZodError } from "zod";

interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onSuccess?: () => void;
}

export function SetPasswordDialog({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  onSuccess 
}: SetPasswordDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      setIsLoading(false);
      return;
    }

    try {
      const validatedData: AdminSetPasswordInput = {
        userId,
        password
      };
      
      // Validate with schema
      adminSetPasswordSchema.parse(validatedData);
      
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess?.();
        onOpenChange(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "设置密码失败");
      }
    } catch (validationError: unknown) {
      if (validationError instanceof ZodError) {
        setError(validationError.errors[0].message);
      } else {
        setError("密码格式不正确");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            为 {userName} 设置密码
          </DialogTitle>
          <DialogDescription>
            设置初始密码，用户首次登录后可以修改。
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少8个字符，包含字母和数字"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "设置中..." : "设置密码"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}