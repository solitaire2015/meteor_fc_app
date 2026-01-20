'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings } from 'lucide-react'
import { type MatchWithFeeRates } from './types'

interface FeeRatesCardProps {
  match: MatchWithFeeRates
}

export function FeeRatesCard({ match }: FeeRatesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          本场比赛费率设置
          <Badge variant="outline" className="ml-auto">
            只读
          </Badge>
        </CardTitle>
        <CardDescription>
          本场比赛使用的费率，由系统全局设置在比赛创建时确定
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">场地费用</p>
            <p className="text-2xl font-bold">¥{Math.ceil(Number(match.fieldFeeTotal || 0))}</p>
            <p className="text-xs text-muted-foreground">总场地费</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">杂费</p>
            <p className="text-2xl font-bold">¥{Math.ceil(Number(match.waterFeeTotal || 0))}</p>
            <p className="text-xs text-muted-foreground">水费等其他费用</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">迟到罚款</p>
            <p className="text-2xl font-bold">¥{Math.ceil(Number(match.lateFeeRate || 0))}</p>
            <p className="text-xs text-muted-foreground">每次迟到罚款</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">视频费</p>
            <p className="text-2xl font-bold">¥{Math.ceil(Number(match.videoFeePerUnit || 0))}</p>
            <p className="text-xs text-muted-foreground">每时段费用</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">基础成本总计</span>
            <span className="text-lg font-semibold">
              ¥{Math.ceil(Number(match.fieldFeeTotal || 0)) + Math.ceil(Number(match.waterFeeTotal || 0))}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            场地费 + 杂费 = 需要通过球员费用回收的成本
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
