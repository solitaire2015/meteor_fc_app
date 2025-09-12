"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PositionSelector } from "@/components/custom/PositionSelector";
import AvatarUpload from "@/components/custom/AvatarUpload";
import { getPositionColor, getPositionLabel } from "@/lib/utils/position";
import { Position } from "@prisma/client";
import { User, Mail, Phone, Trophy, Calendar, Save, Key } from "lucide-react";
import toast from "react-hot-toast";

interface UserProfile {
  id: string;
  name: string;
  shortId: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  jerseyNumber: number | null;
  position: Position | null;
  dominantFoot: 'LEFT' | 'RIGHT' | 'BOTH' | null;
  introduction: string | null;
  joinDate: string | null;
  goals: number;
  assists: number;
  appearances: number;
}

interface FormData {
  email: string;
  phone: string;
  jerseyNumber: string;
  position: Position | '';
  dominantFoot: 'LEFT' | 'RIGHT' | 'BOTH' | 'NONE';
  introduction: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    phone: '',
    jerseyNumber: '',
    position: '',
    dominantFoot: 'NONE',
    introduction: ''
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.name) {
      fetchProfile();
    } else if (status === 'unauthenticated') {
      window.location.href = '/login';
    }
  }, [session, status]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/players');
      const data = await response.json();
      
      if (data.success) {
        // Find current user's profile
        const userProfile = data.data.find((user: UserProfile) => user.name === session?.user?.name);
        if (userProfile) {
          setProfile(userProfile);
          setFormData({
            email: userProfile.email || '',
            phone: userProfile.phone || '',
            jerseyNumber: userProfile.jerseyNumber ? userProfile.jerseyNumber.toString() : '',
            position: userProfile.position || '',
            dominantFoot: userProfile.dominantFoot || 'NONE',
            introduction: userProfile.introduction || ''
          });
        }
      }
    } catch (error) {
      toast.error('加载个人资料失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSaving(true);
    
    const updateData = {
      position: formData.position || undefined,
      dominantFoot: formData.dominantFoot === 'NONE' ? undefined : formData.dominantFoot,
      introduction: formData.introduction || undefined
    };

    try {
      const response = await fetch(`/api/players/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('个人资料更新成功');
        fetchProfile(); // Refresh profile
      } else {
        toast.error('更新失败: ' + data.error.message);
      }
    } catch (error) {
      toast.error('更新个人资料时发生错误');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('新密码与确认密码不匹配');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('新密码至少需要6个字符');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('密码修改成功');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordSection(false);
      } else {
        toast.error('密码修改失败: ' + data.error.message);
      }
    } catch (error) {
      toast.error('密码修改时发生错误');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarUploadSuccess = (avatarUrl: string | null) => {
    if (profile) {
      setProfile({ ...profile, avatarUrl });
    }
    // Refresh the entire profile to ensure data consistency
    fetchProfile();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">未找到个人资料</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">个人资料</h1>
          <p className="text-muted-foreground">管理您的个人信息和球员资料</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload Section */}
            <div className="flex justify-center">
              <AvatarUpload
                currentAvatarUrl={profile.avatarUrl}
                userName={profile.name}
                onUploadSuccess={handleAvatarUploadSuccess}
                size="lg"
              />
            </div>

            <div className="border-t" />

            <div>
              <Label className="text-sm font-medium text-muted-foreground">姓名</Label>
              <p className="text-lg font-medium">{profile.name}</p>
            </div>
            

            {profile.position && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">位置</Label>
                <div className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${getPositionColor(profile.position)}`}>
                  {profile.position} - {getPositionLabel(profile.position)}
                </div>
              </div>
            )}

            <div className="border-t" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Trophy className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{profile.goals}</p>
                <p className="text-xs text-muted-foreground">进球</p>
              </div>
              <div>
                <Trophy className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{profile.assists}</p>
                <p className="text-xs text-muted-foreground">助攻</p>
              </div>
              <div>
                <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{profile.appearances}</p>
                <p className="text-xs text-muted-foreground">出场</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable Profile */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>编辑资料</CardTitle>
              <CardDescription>
                更新您的联系方式和球员信息
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">联系方式</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          placeholder="your.email@example.com"
                          className="pl-10"
                          disabled
                          readOnly
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">手机号</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          placeholder="13800138000"
                          className="pl-10"
                          disabled
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t" />

                {/* Football Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">足球信息</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jerseyNumber">球衣号码</Label>
                      <Input
                        id="jerseyNumber"
                        type="number"
                        value={formData.jerseyNumber}
                        min="1"
                        max="99"
                        placeholder="选择号码"
                        disabled
                        readOnly
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>惯用脚</Label>
                      <Select value={formData.dominantFoot} onValueChange={(value: 'LEFT' | 'RIGHT' | 'BOTH' | 'NONE') => setFormData({ ...formData, dominantFoot: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择惯用脚" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">未设置</SelectItem>
                          <SelectItem value="LEFT">左脚</SelectItem>
                          <SelectItem value="RIGHT">右脚</SelectItem>
                          <SelectItem value="BOTH">双脚</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <PositionSelector
                    value={formData.position}
                    onValueChange={(position) => setFormData({ ...formData, position })}
                  />
                </div>

                <div className="border-t" />

                {/* Personal Introduction */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">个人简介</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="introduction">介绍一下自己</Label>
                    <Textarea
                      id="introduction"
                      value={formData.introduction}
                      onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                      placeholder="分享一些关于自己的信息，比如踢球经历、最喜欢的位置等..."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? '保存中...' : '保存更改'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password Change Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                密码设置
              </CardTitle>
              <CardDescription>
                修改您的登录密码
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showPasswordSection ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordSection(true)}
                >
                  修改密码
                </Button>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">当前密码</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">新密码</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      minLength={6}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">确认新密码</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button type="submit" disabled={changingPassword}>
                      {changingPassword ? '修改中...' : '修改密码'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowPasswordSection(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                    >
                      取消
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}