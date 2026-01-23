
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, RefreshCcw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface SystemSetting {
    key: string
    value: string
    description: string | null
}

const KEY_LABELS: Record<string, string> = {
    'DEFAULT_FIELD_FEE': '默认场地费',
    'DEFAULT_WATER_FEE': '默认水费/杂费',
    'LATE_FEE_RATE': '迟到费率',
    'VIDEO_FEE_RATE': '视频费率 (每节)'
}

export default function SystemSettingsPage() {
    const [settings, setSettings] = useState<SystemSetting[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/admin/settings')
            const data = await response.json()
            if (data.success) {
                setSettings(data.data)
            } else {
                toast.error('获取设置失败: ' + data.error)
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
            toast.error('获取设置时发生错误')
        } finally {
            setLoading(false)
        }
    }

    const handleValueChange = (key: string, newValue: string) => {
        setSettings(prev =>
            prev.map(s => s.key === key ? { ...s, value: newValue } : s)
        )
    }

    const handleDescriptionChange = (key: string, newDesc: string) => {
        setSettings(prev =>
            prev.map(s => s.key === key ? { ...s, description: newDesc } : s)
        )
    }

    const saveSettings = async () => {
        setSaving(true)
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            })
            const data = await response.json()
            if (data.success) {
                toast.success('设置已成功保存')
                setSettings(data.data)
            } else {
                toast.error('保存设置失败: ' + data.error)
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error('保存设置时发生错误')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 space-y-8 font-geist">

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Settings className="h-8 w-8 text-primary" />
                            系统设置
                        </h1>
                        <p className="text-muted-foreground">配置全局费用参数和系统行为</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchSettings} disabled={saving}>
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        刷新
                    </Button>
                    <Button onClick={saveSettings} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        保存修改
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settings.map((setting) => (
                    <Card key={setting.key}>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>{KEY_LABELS[setting.key] || setting.key}</span>
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {setting.key}
                                </span>
                            </CardTitle>
                            <CardDescription>{setting.description || '无描述'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor={`value-${setting.key}`}>配置值</Label>
                                <Input
                                    id={`value-${setting.key}`}
                                    value={setting.value}
                                    onChange={(e) => handleValueChange(setting.key, e.target.value)}
                                    placeholder="请输入配置值"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`desc-${setting.key}`}>描述 (可选)</Label>
                                <Input
                                    id={`desc-${setting.key}`}
                                    value={setting.description || ''}
                                    onChange={(e) => handleDescriptionChange(setting.key, e.target.value)}
                                    placeholder="配置项描述"
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {settings.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                        <p className="text-muted-foreground">暂无配置项</p>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 text-blue-800">
                <div className="shrink-0">
                    <svg className="h-5 w-5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="text-sm">
                    <p className="font-semibold">使用提示</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>费用设置会作为新比赛创建时的默认值。</li>
                        <li>修改这些设置不会自动更新已存在的比赛数据。</li>
                        <li>视频费用率通常是指每3时段的基础单位费用。</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
