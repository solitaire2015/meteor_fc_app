'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, RotateCcw, Calculator, Edit2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { type PlayerFeeDisplay, type FeeEditFormData } from './types'

interface FeeEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  player: PlayerFeeDisplay | null
  matchId: string
  onSave: (playerId: string, data: any) => Promise<void>
  onReset: (playerId: string) => Promise<void>
}

export function FeeEditDialog({
  isOpen,
  onOpenChange,
  player,
  matchId,
  onSave,
  onReset
}: FeeEditDialogProps) {
  const [formData, setFormData] = useState<FeeEditFormData>({
    fieldFee: 0,
    videoFee: 0,
    lateFee: 0,
    paymentNote: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [errors, setErrors] = useState<Partial<FeeEditFormData>>({})

  // Reset form when player changes
  useEffect(() => {
    if (player) {
      const override = player.overrideFee
      const calculated = player.calculatedFee

      setFormData({
        fieldFee: Math.round(override?.fieldFee ?? calculated.fieldFee),
        videoFee: Math.round(override?.videoFee ?? calculated.videoFee),
        lateFee: Math.round(override?.lateFee ?? calculated.lateFee),
        paymentNote: player.paymentNote || ''
      })
      setErrors({})
    }
  }, [player])

  const validateForm = (): boolean => {
    const newErrors: Partial<FeeEditFormData> = {}

    if (formData.fieldFee < 0) {
      newErrors.fieldFee = '场地费不能为负数'
    }
    if (formData.videoFee < 0) {
      newErrors.videoFee = '视频费不能为负数'
    }
    if (formData.lateFee < 0) {
      newErrors.lateFee = '迟到罚款不能为负数'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!player || !validateForm()) return

    try {
      setIsSaving(true)

      // Save fee override using the correct API format
      const overrideResponse = await fetch(`/api/admin/matches/${matchId}/fees`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manualOverrides: {
            [player.playerId]: {
              fieldFeeOverride: formData.fieldFee,
              videoFeeOverride: formData.videoFee,
              lateFeeOverride: formData.lateFee,
              notes: formData.paymentNote
            }
          }
        })
      })

      if (!overrideResponse.ok) {
        throw new Error('Failed to save fee override')
      }

      // Call parent callback for optimistic update
      await onSave(player.playerId, {
        ...formData,
        paymentNote: formData.paymentNote
      })

      toast.success('费用已保存')
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving fee:', error)
      toast.error('保存费用时发生错误')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (!player) return

    try {
      setIsResetting(true)

      // Reset fee override by setting all values to null using PUT endpoint
      const response = await fetch(`/api/admin/matches/${matchId}/fees`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manualOverrides: {
            [player.playerId]: {
              fieldFeeOverride: null,
              videoFeeOverride: null,
              lateFeeOverride: null,
              notes: null
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reset fee override')
      }

      // Call parent callback for optimistic update
      await onReset(player.playerId)

      toast.success('费用已重置为自动计算值')
      onOpenChange(false)
    } catch (error) {
      console.error('Error resetting fee:', error)
      toast.error('重置费用时发生错误')
    } finally {
      setIsResetting(false)
    }
  }

  const calculatedTotal = player?.calculatedFee.total || 0
  const overrideTotal = formData.fieldFee + formData.videoFee + formData.lateFee
  const hasChanges = player && (
    formData.fieldFee !== Math.round(player.overrideFee?.fieldFee ?? player.calculatedFee.fieldFee) ||
    formData.videoFee !== Math.round(player.overrideFee?.videoFee ?? player.calculatedFee.videoFee) ||
    formData.lateFee !== Math.round(player.overrideFee?.lateFee ?? player.calculatedFee.lateFee) ||
    formData.paymentNote !== (player.paymentNote || '')
  )

  if (!player) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            编辑球员费用 - {player.playerName}
          </DialogTitle>
          <DialogDescription>
            可以手动调整自动计算的费用，或者重置为系统计算值
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Calculated Fees (Read-only) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-4 w-4" />
                系统计算费用
              </CardTitle>
              <CardDescription>
                基于出勤数据自动计算的费用（只读）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm text-muted-foreground">场地费:</Label>
                  <span className="font-mono">¥{Math.round(player.calculatedFee.fieldFee)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <Label className="text-sm text-muted-foreground">视频费:</Label>
                  <span className="font-mono">¥{Math.round(player.calculatedFee.videoFee)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <Label className="text-sm text-muted-foreground">迟到罚款:</Label>
                  <span className="font-mono">¥{Math.round(player.calculatedFee.lateFee)}</span>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <Label className="font-medium">计算总计:</Label>
                  <span className="font-mono font-bold text-lg">
                    ¥{Math.round(calculatedTotal)}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">参与时长:</span>
                    <span>{player.totalTime} 时段</span>
                  </div>
                  {player.isLate && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs">该球员有迟到记录</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Override Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Edit2 className="h-4 w-4" />
                手动调整费用
              </CardTitle>
              <CardDescription>
                可以手动修改各项费用，留空将使用计算值
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fieldFee">场地费 (元)</Label>
                  <Input
                    id="fieldFee"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.fieldFee}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      fieldFee: Math.round(Number(e.target.value) || 0)
                    }))}
                    className={errors.fieldFee ? 'border-red-500' : ''}
                  />
                  {errors.fieldFee && (
                    <p className="text-sm text-red-500">{errors.fieldFee}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="videoFee">视频费 (元)</Label>
                  <Input
                    id="videoFee"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.videoFee}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      videoFee: Math.round(Number(e.target.value) || 0)
                    }))}
                    className={errors.videoFee ? 'border-red-500' : ''}
                  />
                  {errors.videoFee && (
                    <p className="text-sm text-red-500">{errors.videoFee}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lateFee">迟到罚款 (元)</Label>
                  <Input
                    id="lateFee"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.lateFee}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      lateFee: Math.round(Number(e.target.value) || 0)
                    }))}
                    className={errors.lateFee ? 'border-red-500' : ''}
                  />
                  {errors.lateFee && (
                    <p className="text-sm text-red-500">{errors.lateFee}</p>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <Label className="font-medium">调整后总计:</Label>
                  <span className="font-mono font-bold text-lg">
                    ¥{Math.round(overrideTotal)}
                  </span>
                </div>

                {Math.abs(overrideTotal - calculatedTotal) > 0.01 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      调整后费用与计算费用相差: ¥{Math.abs(overrideTotal - calculatedTotal)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentNote">支付备注</Label>
                <Textarea
                  id="paymentNote"
                  placeholder="代付人姓名或其他备注信息..."
                  value={formData.paymentNote}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentNote: e.target.value
                  }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {player.hasOverride && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isResetting || isSaving}
                    className="text-red-600 hover:text-red-700"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {isResetting ? '重置中...' : '重置为计算值'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认重置费用</AlertDialogTitle>
                    <AlertDialogDescription>
                      这将删除所有手动调整，恢复为系统自动计算的费用。此操作不可撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReset}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      确认重置
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isResetting}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || isResetting}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存更改'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
