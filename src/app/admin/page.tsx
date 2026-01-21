'use client'

import { Button } from '@/components/ui/button'

export default function AdminPage() {


  return (
    <div className="container mx-auto py-8 space-y-8 font-geist">
      {/* Modern Admin Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">管理后台</h1>
        <p className="text-muted-foreground">管理用户、比赛和系统设置</p>
      </div>

      {/* Admin Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">比赛管理</h3>
          <p className="text-muted-foreground mb-4">创建、编辑和管理比赛，包括Excel导入功能</p>
          <Button asChild className="w-full">
            <a href="/admin/matches">进入比赛管理</a>
          </Button>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">用户管理</h3>
          <p className="text-muted-foreground mb-4">管理球员信息和用户账户</p>
          <Button asChild className="w-full">
            <a href="/admin/users">进入用户管理</a>
          </Button>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">系统设置</h3>
          <p className="text-muted-foreground mb-4">配置系统参数和其他设置</p>
          <Button asChild className="w-full">
            <a href="/admin/settings">进入系统设置</a>
          </Button>
        </div>
      </div>
    </div>
  )
}