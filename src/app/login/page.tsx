"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginInput, loginSchema } from "@/lib/validations/auth";
import { ZodError } from "zod";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: ""
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Validate input
      const validatedData = loginSchema.parse(formData);
      
      const result = await signIn("credentials", {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("用户不存在或密码错误");
      } else {
        router.push("/welcome");
        router.refresh();
      }
    } catch (validationError: unknown) {
      if (validationError instanceof ZodError) {
        setError("请填写完整信息");
      } else {
        setError("登录过程中发生错误，请重试");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">球队管理系统</CardTitle>
          <CardDescription>
            使用您的邮箱和密码登录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱地址"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>没有账号？请联系管理员创建</p>
            <p className="mt-1">忘记密码？请联系管理员重置</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}