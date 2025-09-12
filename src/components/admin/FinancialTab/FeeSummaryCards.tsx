'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, DollarSign, TrendingUp, Calculator } from 'lucide-react'
import { type FeeSummaryData, type MatchWithFeeRates } from './types'

interface FeeSummaryCardsProps {
  data: FeeSummaryData
  match: MatchWithFeeRates
}

export function FeeSummaryCards({ data, match }: FeeSummaryCardsProps) {
  const isProfitable = data.profitLoss > 0
  const isBreakEven = data.profitLoss === 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Participants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">参与人数</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalParticipants}</div>
          <p className="text-xs text-muted-foreground">
            本场比赛参与球员总数
          </p>
        </CardContent>
      </Card>

      {/* Total Collected Fees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">收费总计</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">¥{data.totalCollectedFees}</div>
          <p className="text-xs text-muted-foreground">
            所有球员费用总和
          </p>
        </CardContent>
      </Card>

      {/* Average Fee */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">人均费用</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">¥{data.averageFeePerPlayer}</div>
          <p className="text-xs text-muted-foreground">
            平均每人支付费用
          </p>
        </CardContent>
      </Card>

      {/* Profit/Loss */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">收支结果</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              {isProfitable ? '+' : ''}¥{Math.abs(data.profitLoss)}
            </div>
            <Badge 
              variant={isProfitable ? "default" : isBreakEven ? "secondary" : "destructive"}
              className="text-xs"
            >
              {isProfitable ? '盈余' : isBreakEven ? '平衡' : '亏损'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            收费 - 成本 = {isProfitable ? '可分配资金' : isBreakEven ? '收支平衡' : '需要补贴'}
          </p>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-lg">费用明细分析</CardTitle>
          <CardDescription>收入与支出详细对比</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Income */}
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700">收入明细</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">球员费用:</span>
                  <span>¥{data.totalCollectedFees}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>收入总计:</span>
                  <span className="text-green-700">¥{data.totalCollectedFees}</span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div className="space-y-2">
              <h4 className="font-semibold text-red-700">支出明细</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">场地费:</span>
                  <span>¥{Number(match.fieldFeeTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">杂费:</span>
                  <span>¥{Number(match.waterFeeTotal)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>支出总计:</span>
                  <span className="text-red-700">¥{data.totalFieldCosts}</span>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="space-y-2">
              <h4 className="font-semibold">结果分析</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">参与人数:</span>
                  <span>{data.totalParticipants} 人</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">人均负担:</span>
                  <span>¥{(data.totalFieldCosts / data.totalParticipants).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">人均收费:</span>
                  <span>¥{data.averageFeePerPlayer}</span>
                </div>
                <div className={`flex justify-between font-medium border-t pt-1 ${
                  isProfitable ? 'text-green-700' : isBreakEven ? 'text-gray-700' : 'text-red-700'
                }`}>
                  <span>净结果:</span>
                  <span>
                    {isProfitable ? '+' : ''}¥{data.profitLoss}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}