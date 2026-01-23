"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PositionSelector } from "@/components/custom/PositionSelector";
import { SetPasswordDialog } from "@/components/custom/SetPasswordDialog";
import { EditUserDialog } from "@/components/custom/EditUserDialog";
import { DeleteUserDialog } from "@/components/custom/DeleteUserDialog";
import AssistantWidget from "@/components/ai/AssistantWidget";
import { getPositionColor, getPositionLabel } from "@/lib/utils/position";
import { type PatchEnvelope } from "@/lib/ai/schema";
import { Position } from "@prisma/client";
import { Plus, Key, Mail, Phone, Edit, Target, Award, BarChart3, Trash2, RotateCcw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  shortId: string | null;
  email: string | null;
  phone: string | null;
  userType: 'ADMIN' | 'PLAYER';
  accountStatus: 'GHOST' | 'CLAIMED';
  playerStatus: 'REGULAR' | 'TRIAL' | 'VACATION';
  jerseyNumber: number | null;
  position: Position | null;
  dominantFoot: 'LEFT' | 'RIGHT' | 'BOTH' | null;
  avatarUrl: string | null;
  introduction: string | null;
  joinDate: string | null;
  hasPassword: boolean;
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  deletionReason: string | null;
  goals: number;
  assists: number;
  appearances: number;
}

interface CreateUserForm {
  name: string;
  shortId: string;
  email: string;
  phone: string;
  userType: 'ADMIN' | 'PLAYER';
  accountStatus: 'GHOST' | 'CLAIMED';
  playerStatus: 'REGULAR' | 'TRIAL' | 'VACATION';
  jerseyNumber: string;
  position: Position | '';
}

type UserActionChange = Extract<PatchEnvelope["changes"][number], { type: "user_action" }>;
type UserActionData = UserActionChange["data"]["data"];

const buildUserPayload = (data?: UserActionData) => {
  if (!data) return {};
  const payload: Record<string, unknown> = {};
  const fields: (keyof NonNullable<UserActionData>)[] = [
    "name",
    "shortId",
    "email",
    "phone",
    "userType",
    "accountStatus",
    "playerStatus",
    "jerseyNumber",
    "position",
    "dominantFoot",
    "introduction",
    "joinDate",
  ];

  fields.forEach((field) => {
    if (data[field] !== undefined) {
      payload[field] = data[field];
    }
  });

  return payload;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const [formData, setFormData] = useState<CreateUserForm>({
    name: '',
    shortId: '',
    email: '',
    phone: '',
    userType: 'PLAYER',
    accountStatus: 'GHOST',
    playerStatus: 'REGULAR',
    jerseyNumber: '',
    position: ''
  });

  useEffect(() => {
    fetchUsers();
  }, [showDeleted]);

  const fetchUsers = async () => {
    try {
      const url = showDeleted ? '/api/players?includeDeleted=true' : '/api/players';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const applyUserActionPatch = async (patch: PatchEnvelope) => {
    if (patch.target !== "user_admin") return;

    const requestJson = async (url: string, options: RequestInit) => {
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
          data?.error ||
          data?.message ||
          "请求失败"
        );
      }

      if ("success" in data && data.success === false) {
        throw new Error(data?.error?.message || "请求失败");
      }

      return data;
    };

    try {
      for (const change of patch.changes) {
        if (change.type !== "user_action") continue;

        const { action, userId, data } = change.data;

        if (action === "create_user") {
          if (!data?.name) {
            throw new Error("创建用户需要姓名");
          }
          const payload = buildUserPayload(data);
          await requestJson("/api/players", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          continue;
        }

        if (action === "update_user") {
          if (!userId) {
            throw new Error("更新用户需要指定用户");
          }
          const payload = buildUserPayload(data);
          if (Object.keys(payload).length === 0) {
            throw new Error("没有可更新的字段");
          }
          await requestJson(`/api/players/${userId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
          continue;
        }

        if (action === "delete_user") {
          if (!userId) {
            throw new Error("删除用户需要指定用户");
          }
          await requestJson(`/api/users/${userId}`, {
            method: "DELETE",
            body: JSON.stringify({ deletionReason: data?.deletionReason }),
          });
          continue;
        }

        if (action === "restore_user") {
          if (!userId) {
            throw new Error("恢复用户需要指定用户");
          }
          await requestJson(`/api/users/${userId}/restore`, {
            method: "POST",
            body: JSON.stringify({ confirmed: true }),
          });
          continue;
        }

        if (action === "set_password") {
          if (!userId) {
            throw new Error("设置密码需要指定用户");
          }
          if (!data?.password) {
            throw new Error("设置密码需要提供密码");
          }
          await requestJson("/api/auth/set-password", {
            method: "POST",
            body: JSON.stringify({ userId, password: data.password }),
          });
          continue;
        }
      }

      toast.success(patch.summary || "已执行 AI 操作");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 操作执行失败";
      toast.error(message);
      throw error;
    } finally {
      await fetchUsers();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData = {
      name: formData.name,
      shortId: formData.shortId || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      userType: formData.userType,
      accountStatus: formData.accountStatus,
      playerStatus: formData.playerStatus,
      jerseyNumber: formData.jerseyNumber ? parseInt(formData.jerseyNumber) : undefined,
      position: formData.position || undefined
    };

    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        setUsers([...users, { ...data.data, goals: 0, assists: 0, appearances: 0 }]);
        setFormData({
          name: '',
          shortId: '',
          email: '',
          phone: '',
          userType: 'PLAYER',
          accountStatus: 'GHOST',
          playerStatus: 'REGULAR',
          jerseyNumber: '',
          position: ''
        });
        setShowCreateDialog(false);
        toast.success('用户创建成功');
      } else {
        toast.error('创建用户失败: ' + data.error.message);
      }
    } catch (error) {
      toast.error('创建用户时发生错误');
    }
  };

  const handleSetPassword = (user: User) => {
    setSelectedUser({ id: user.id, name: user.name });
    setShowPasswordDialog(true);
  };

  const handlePasswordSuccess = () => {
    toast.success('密码设置成功');
    fetchUsers(); // Refresh user list
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditDialog(true);
  };

  const handleEditSuccess = () => {
    fetchUsers(); // Refresh user list
    setEditingUser(null);
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = async (reason?: string) => {
    if (!deletingUser) return;

    try {
      const response = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletionReason: reason })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('用户删除成功');
        fetchUsers(); // Refresh user list
      } else {
        toast.error('删除用户失败: ' + data.error?.message);
      }
    } catch (error) {
      toast.error('删除用户时发生错误');
    } finally {
      setShowDeleteDialog(false);
      setDeletingUser(null);
    }
  };

  const handleRestoreUser = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('用户恢复成功');
        fetchUsers(); // Refresh user list
      } else {
        toast.error('恢复用户失败: ' + data.error?.message);
      }
    } catch (error) {
      toast.error('恢复用户时发生错误');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <AssistantWidget
        context={{
          page: "admin/users",
          locale: "zh-CN",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          availableUsers: users.map(user => ({
            id: user.id,
            name: user.name,
            jerseyNumber: user.jerseyNumber,
            position: user.position,
            email: user.email,
            phone: user.phone,
            userType: user.userType,
            accountStatus: user.accountStatus,
            playerStatus: user.playerStatus,
          })),
          formState: {
            showDeleted,
          },
        }}
        onApplyPatch={applyUserActionPatch}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">用户管理</h1>
          <p className="text-muted-foreground">管理球员和管理员账户</p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowDeleted(!showDeleted)}
            className="flex items-center space-x-2"
          >
            {showDeleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showDeleted ? '隐藏已删除' : '显示已删除'}</span>
          </Button>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                创建新用户
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>创建新用户</DialogTitle>
                <DialogDescription>
                  创建新的球员或管理员账户
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>球员身份</Label>
                    <Select value={formData.playerStatus} onValueChange={(value: 'REGULAR' | 'TRIAL' | 'VACATION') => setFormData({ ...formData, playerStatus: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REGULAR">正式球员</SelectItem>
                        <SelectItem value="TRIAL">试训球员</SelectItem>
                        <SelectItem value="VACATION">长假球员</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                </div>

                <PositionSelector
                  value={formData.position}
                  onValueChange={(position) => setFormData({ ...formData, position })}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    取消
                  </Button>
                  <Button type="submit">
                    创建用户
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户列表 ({users.length})</CardTitle>
          <CardDescription>
            管理所有球员和管理员账户
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>短ID</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>球衣号</TableHead>
                  <TableHead>位置</TableHead>
                  <TableHead>联系方式</TableHead>
                  <TableHead>统计</TableHead>
                  <TableHead>密码</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      暂无用户数据
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className={user.deletedAt ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        <span className={user.deletedAt ? "line-through" : ""}>
                          {user.name}
                        </span>
                        {user.deletedAt && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            已删除
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.shortId ? (
                          <Badge variant="secondary">{user.shortId}</Badge>
                        ) : (
                          <span className="text-muted-foreground">未设置</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.userType === 'ADMIN' ? 'destructive' : 'default'}>
                          {user.userType === 'ADMIN' ? '管理员' : '球员'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={user.accountStatus === 'CLAIMED' ? 'default' : 'outline'}>
                            {user.accountStatus === 'GHOST' ? '幽灵' : '已认领'}
                          </Badge>
                          <Badge variant={user.playerStatus === 'REGULAR' ? 'secondary' : user.playerStatus === 'TRIAL' ? 'outline' : 'destructive'}>
                            {user.playerStatus === 'REGULAR' ? '正式' : user.playerStatus === 'TRIAL' ? '试训' : '长假'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{user.jerseyNumber || '-'}</TableCell>
                      <TableCell>
                        {user.position ? (
                          <Badge className={getPositionColor(user.position)}>
                            {user.position} - {getPositionLabel(user.position)}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="mr-1 h-3 w-3" />
                              {user.email}
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="mr-1 h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                          {!user.email && !user.phone && '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center">
                            <Target className="mr-1 h-3 w-3" />
                            {user.goals}
                          </div>
                          <div className="flex items-center">
                            <Award className="mr-1 h-3 w-3" />
                            {user.assists}
                          </div>
                          <div className="flex items-center">
                            <BarChart3 className="mr-1 h-3 w-3" />
                            {user.appearances}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.hasPassword ? 'default' : 'destructive'}>
                          {user.hasPassword ? '已设置' : '未设置'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {!user.deletedAt ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetPassword(user)}
                              >
                                <Key className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteUser(user)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestoreUser(user)}
                              className="text-green-600 hover:text-green-600"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {
        selectedUser && (
          <SetPasswordDialog
            open={showPasswordDialog}
            onOpenChange={setShowPasswordDialog}
            userId={selectedUser.id}
            userName={selectedUser.name}
            onSuccess={handlePasswordSuccess}
          />
        )
      }

      <EditUserDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={editingUser}
        onSuccess={handleEditSuccess}
      />

      <DeleteUserDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        user={deletingUser}
        onConfirm={confirmDeleteUser}
      />
    </div >
  );
}
