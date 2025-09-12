'use client'

import { useState, useCallback } from 'react'
import { Shield, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { type Player, type AttendanceGrid, type AttendanceDataItem } from '@/lib/validations/match'

interface EnhancedAttendanceGridProps {
  players: Player[]
  attendanceData: AttendanceGrid
  onChange: (data: AttendanceGrid) => void
  isDirty?: boolean
  className?: string
}

interface SelectedCell {
  section: number
  part: number
}

export default function EnhancedAttendanceGrid({
  players,
  attendanceData,
  onChange,
  isDirty = false,
  className
}: EnhancedAttendanceGridProps) {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Ensure all selected players have complete attendance records
  const ensureCompleteAttendanceData = useCallback(() => {
    const existingPlayerIds = new Set(attendanceData.map(item => item.userId))
    const newAttendanceData = [...attendanceData]
    
    // Add blank records for players without any attendance data
    players.forEach(player => {
      if (!existingPlayerIds.has(player.id)) {
        // Create complete blank attendance structure for each section/part
        for (let section = 1; section <= 3; section++) {
          for (let part = 1; part <= 3; part++) {
            newAttendanceData.push({
              userId: player.id,
              section,
              part,
              value: 0,
              isGoalkeeper: false,
              isLateArrival: false,
              goals: 0,
              assists: 0,
            })
          }
        }
      }
    })
    
    return newAttendanceData
  }, [players, attendanceData])

  // Initialize complete attendance data on component mount or when players change
  const completeAttendanceData = ensureCompleteAttendanceData()

  // Get attendance data for a specific cell
  const getCellAttendance = useCallback((section: number, part: number): AttendanceDataItem[] => {
    return completeAttendanceData.filter(
      item => item.section === section && item.part === part && item.value > 0
    )
  }, [completeAttendanceData])

  // Get attendance value for a specific player in a cell
  const getPlayerAttendanceInCell = useCallback((userId: string, section: number, part: number): AttendanceDataItem | undefined => {
    return completeAttendanceData.find(
      item => item.userId === userId && item.section === section && item.part === part
    )
  }, [completeAttendanceData])

  // Update attendance for a player in a specific cell
  const updatePlayerAttendance = useCallback((
    userId: string,
    section: number,
    part: number,
    value: number,
    isGoalkeeper: boolean = false
  ) => {
    const newAttendanceData = completeAttendanceData.map(item => {
      // Update the specific cell for this player
      if (item.userId === userId && item.section === section && item.part === part) {
        return {
          ...item,
          value,
          isGoalkeeper
        }
      }
      
      // If setting as goalkeeper, remove goalkeeper status from others in this cell
      if (isGoalkeeper && value > 0 && item.section === section && item.part === part && item.isGoalkeeper) {
        return {
          ...item,
          isGoalkeeper: false
        }
      }
      
      return item
    })

    onChange(newAttendanceData)
  }, [completeAttendanceData, onChange])

  // Update late arrival status for a player
  const updatePlayerLateArrival = useCallback((userId: string, isLate: boolean) => {
    const newAttendanceData = completeAttendanceData.map(item => 
      item.userId === userId ? { ...item, isLateArrival: isLate } : item
    )
    onChange(newAttendanceData)
  }, [completeAttendanceData, onChange])


  // Get player's late arrival status
  const getPlayerLateStatus = useCallback((userId: string): boolean => {
    const userAttendance = completeAttendanceData.find(item => item.userId === userId)
    return userAttendance?.isLateArrival || false
  }, [completeAttendanceData])

  // Handle cell click to open assignment modal
  const handleCellClick = useCallback((section: number, part: number) => {
    setSelectedCell({ section, part })
    setIsAssignmentOpen(true)
  }, [])


  // Render a single grid cell
  const renderGridCell = (section: number, part: number) => {
    const cellAttendance = getCellAttendance(section, part)
    const hasAttendance = cellAttendance.length > 0
    const cellId = `cell-${section}-${part}`

    return (
      <Card 
        key={cellId}
        className={cn(
          "min-h-[120px] cursor-pointer transition-all duration-200 hover:shadow-md",
          isDirty && "ring-2 ring-orange-200 ring-offset-2",
          hasAttendance ? "bg-green-50 border-green-200" : "bg-gray-50 hover:bg-gray-100"
        )}
        onClick={() => handleCellClick(section, part)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>第{part}部分</span>
            <Plus className="h-4 w-4 text-gray-400" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {cellAttendance.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                点击添加球员
              </div>
            ) : (
              cellAttendance.map((item) => {
                const player = players.find(p => p.id === item.userId)
                if (!player) return null

                return (
                  <div key={`${item.userId}-${section}-${part}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span className="text-xs font-medium truncate">
                        {player.name}
                        {player.jerseyNumber && ` #${player.jerseyNumber}`}
                      </span>
                      {item.isGoalkeeper && (
                        <Shield className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                      )}
                    </div>
                    <Badge 
                      variant={item.value === 1 ? "default" : "secondary"}
                      className="text-xs py-0"
                    >
                      {item.value === 1 ? "全程" : "半程"}
                    </Badge>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render player assignment interface
  const renderPlayerAssignment = () => {
    if (!selectedCell) return null

    const { section, part } = selectedCell

    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          为第{section}节第{part}部分分配球员
        </div>
        
        <Separator />

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {players.map((player) => {
            const playerAttendance = getPlayerAttendanceInCell(player.id, section, part)
            const currentValue = playerAttendance?.value || 0
            const isGoalkeeper = playerAttendance?.isGoalkeeper || false

            return (
              <div key={player.id} className="space-y-2 p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    {player.name}
                    {player.jerseyNumber && ` #${player.jerseyNumber}`}
                  </div>
                  {player.position && (
                    <Badge variant="outline" className="text-xs">
                      {player.position}
                    </Badge>
                  )}
                </div>

                {/* Attendance Value Buttons */}
                <div className="flex gap-1">
                  {[0, 0.5, 1].map((value) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={currentValue === value ? "default" : "outline"}
                      className="flex-1 text-xs"
                      onClick={() => updatePlayerAttendance(player.id, section, part, value, isGoalkeeper)}
                    >
                      {value === 0 ? "不参与" : value === 0.5 ? "半程" : "全程"}
                    </Button>
                  ))}
                </div>

                {/* Goalkeeper Checkbox */}
                {currentValue > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`gk-${player.id}`}
                      checked={isGoalkeeper}
                      onCheckedChange={(checked) =>
                        updatePlayerAttendance(player.id, section, part, currentValue, !!checked)
                      }
                    />
                    <Label htmlFor={`gk-${player.id}`} className="text-sm">
                      门将
                    </Label>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">出勤网格</h3>
          <Badge variant={isDirty ? "destructive" : "secondary"} className="text-xs">
            {isDirty ? "有未保存更改" : "已保存"}
          </Badge>
        </div>
        
        <div className="text-sm text-gray-600">
          点击网格单元格来分配球员时间
        </div>
      </div>

      {/* 3x3 Grid */}
      <div className="space-y-6">
        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-3">
            <h4 className="font-medium text-base">第{section}节</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((part) => renderGridCell(section, part))}
            </div>
          </div>
        ))}
      </div>

      {/* Late Arrival Management */}
      {players.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">迟到管理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {players.map((player) => {
                const isLate = getPlayerLateStatus(player.id)
                
                return (
                  <div key={player.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="font-medium text-sm">
                      {player.name}
                      {player.jerseyNumber && ` #${player.jerseyNumber}`}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`late-${player.id}`}
                        checked={isLate}
                        onCheckedChange={(checked) => updatePlayerLateArrival(player.id, !!checked)}
                      />
                      <Label htmlFor={`late-${player.id}`} className="text-sm">
                        迟到
                      </Label>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Assignment Modal/Sheet */}
      {isMobile ? (
        <Sheet open={isAssignmentOpen} onOpenChange={setIsAssignmentOpen}>
          <SheetContent side="bottom" className="max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>分配球员</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {renderPlayerAssignment()}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isAssignmentOpen} onOpenChange={setIsAssignmentOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>分配球员</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {renderPlayerAssignment()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}