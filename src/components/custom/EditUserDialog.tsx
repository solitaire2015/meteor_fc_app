"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PositionSelector } from "./PositionSelector";
import { Position } from "@prisma/client";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  shortId: string | null;
  email: string | null;
  phone: string | null;
  userType: 'ADMIN' | 'PLAYER';
  accountStatus: 'GHOST' | 'CLAIMED';
  jerseyNumber: number | null;
  position: Position | null;
  dominantFoot: 'LEFT' | 'RIGHT' | 'BOTH' | null;
  introduction: string | null;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  shortId: string;
  email: string;
  phone: string;
  userType: 'ADMIN' | 'PLAYER';
  accountStatus: 'GHOST' | 'CLAIMED';
  jerseyNumber: string;
  position: Position | '';
  dominantFoot: 'LEFT' | 'RIGHT' | 'BOTH' | 'NONE';
  introduction: string;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSuccess
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    shortId: '',
    email: '',
    phone: '',
    userType: 'PLAYER',
    accountStatus: 'GHOST',
    jerseyNumber: '',
    position: '',
    dominantFoot: 'NONE',
    introduction: ''
  });

  const [loading, setLoading] = useState(false);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        shortId: user.shortId || '',
        email: user.email || '',
        phone: user.phone || '',
        userType: user.userType,
        accountStatus: user.accountStatus,
        jerseyNumber: user.jerseyNumber ? user.jerseyNumber.toString() : '',
        position: user.position || '',
        dominantFoot: user.dominantFoot || 'NONE',
        introduction: user.introduction || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    const updateData = {
      name: formData.name,
      shortId: formData.shortId || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      userType: formData.userType,
      accountStatus: formData.accountStatus,
      jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber) : undefined,
      position: formData.position || undefined,
      dominantFoot: formData.dominantFoot === 'NONE' ? undefined : formData.dominantFoot,
      introduction: formData.introduction || undefined
    };

    try {
      const response = await fetch(`/api/players/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('用户信息更新成功');
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('更新失败: ' + data.error.message);
      }
    } catch (error) {
      toast.error('更新用户时发生错误');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑用户信息</DialogTitle>
          <DialogDescription>
            修改 {user.name} 的详细信息
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">基本信息</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shortId">短ID</Label>
                <Input
                  id="shortId"
                  value={formData.shortId}
                  onChange={(e) => setFormData({ ...formData, shortId: e.target.value })}
                  placeholder="例如: dh, qc"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">账户信息</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>用户类型</Label>
                <Select value={formData.userType} onValueChange={(value: 'ADMIN' | 'PLAYER') => setFormData({ ...formData, userType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLAYER">球员</SelectItem>
                    <SelectItem value="ADMIN">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>账户状态</Label>
                <Select value={formData.accountStatus} onValueChange={(value: 'GHOST' | 'CLAIMED') => setFormData({ ...formData, accountStatus: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GHOST">幽灵账户</SelectItem>
                    <SelectItem value="CLAIMED">已认领</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

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
                  onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                  min="1"
                  max="99"
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

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">个人信息</h3>
            
            <div className="space-y-2">
              <Label htmlFor="introduction">个人简介</Label>
              <Textarea
                id="introduction"
                value={formData.introduction}
                onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                placeholder="简单介绍一下自己..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : '保存更改'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};