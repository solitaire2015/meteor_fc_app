'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Edit2, Clock, AlertTriangle } from 'lucide-react'
import { type PlayerFeeDisplay } from './types'

interface FeeTableProps {
  playerFees: PlayerFeeDisplay[]
  onEditPlayer: (player: PlayerFeeDisplay) => void
}

export function FeeTable({ playerFees, onEditPlayer }: FeeTableProps) {
  if (playerFees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>暂无参与球员数据</p>
        <p className="text-sm">球员费用将在出勤数据录入后自动计算</p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>球员姓名</TableHead>
              <TableHead className="text-center">参与时长</TableHead>
              <TableHead className="text-center">计算费用</TableHead>
              <TableHead className="text-center">实际费用</TableHead>
              <TableHead className="text-center">状态</TableHead>
              <TableHead className="text-center">备注</TableHead>
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {playerFees.map((player) => (
              <TableRow
                key={player.playerId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onEditPlayer(player)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {player.playerName}
                    {player.isLate && (
                      <Badge variant="destructive" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        迟到
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <Badge variant="outline">
                    {player.totalTime} 时段
                  </Badge>
                </TableCell>

                <TableCell className="text-center">
                  <span className="text-muted-foreground">
                    ¥{Math.round(player.calculatedFee.total)}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium">
                      ¥{Math.round(player.displayFee)}
                    </span>
                    {player.hasOverride && (
                      <Badge variant="outline" className="text-xs">
                        <Edit2 className="h-3 w-3 mr-1" />
                        已调整
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  {player.hasOverride && (
                    <Badge variant="secondary" className="text-xs">
                      手动调整
                    </Badge>
                  )}
                  {player.displayFee !== player.calculatedFee.total && !player.hasOverride && (
                    <Badge variant="outline" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      异常
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  {player.paymentNote && (
                    <span className="text-xs text-muted-foreground truncate max-w-[100px] block">
                      {player.paymentNote}
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditPlayer(player)
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {playerFees.map((player) => (
          <Card
            key={player.playerId}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onEditPlayer(player)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{player.playerName}</span>
                  {player.isLate && (
                    <Badge variant="destructive" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      迟到
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditPlayer(player)
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">参与时长:</span>
                  <Badge variant="outline" className="text-xs">
                    {player.totalTime} 时段
                  </Badge>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">计算费用:</span>
                  <span>¥{Math.round(player.calculatedFee.total)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">实际费用:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">¥{Math.round(player.displayFee)}</span>
                    {player.hasOverride && (
                      <Badge variant="outline" className="text-xs">
                        <Edit2 className="h-3 w-3 mr-1" />
                        已调整
                      </Badge>
                    )}
                  </div>
                </div>

                {player.paymentNote && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">备注:</span>
                    <span className="text-xs text-right max-w-[150px] truncate">
                      {player.paymentNote}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
