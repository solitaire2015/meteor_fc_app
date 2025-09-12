"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface User {
  id: string;
  name: string;
  userType: 'ADMIN' | 'PLAYER';
  jerseyNumber: number | null;
  goals: number;
  assists: number;
  appearances: number;
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: (reason?: string) => void;
}

export function DeleteUserDialog({ open, onOpenChange, user, onConfirm }: DeleteUserDialogProps) {
  const [deletionReason, setDeletionReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(deletionReason || undefined);
    } finally {
      setIsDeleting(false);
      setDeletionReason("");
    }
  };

  const handleCancel = () => {
    setDeletionReason("");
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            删除用户确认
          </DialogTitle>
          <DialogDescription>
            您即将删除用户 <strong>{user.name}</strong>。请仔细阅读以下信息。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* User Info */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium">用户信息</h4>
            <div className="text-sm space-y-1">
              <div>姓名: {user.name}</div>
              <div>类型: {user.userType === 'ADMIN' ? '管理员' : '球员'}</div>
              {user.jerseyNumber && <div>球衣号码: {user.jerseyNumber}</div>}
              <div>出场次数: {user.appearances}</div>
              <div>进球数: {user.goals}</div>
              <div>助攻数: {user.assists}</div>
            </div>
          </div>

          {/* Warning Info */}
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 space-y-2">
            <h4 className="font-medium text-yellow-800">删除后的影响</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 用户将从球员选择列表中移除</li>
              <li>• 用户将从排行榜中消失</li>
              <li>• 历史比赛数据将保留（显示为删除状态）</li>
              <li>• 团队统计数据不会受到影响</li>
              <li>• 可以通过恢复功能撤销删除</li>
            </ul>
          </div>

          {/* Deletion Reason */}
          <div className="space-y-2">
            <Label htmlFor="deletionReason">删除原因 (可选)</Label>
            <Textarea
              id="deletionReason"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="请输入删除原因..."
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}