'use client'

import { useState } from 'react'
import { Target, Award, Edit3, Save, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Player, type AttendanceGrid } from '@/lib/validations/match'

interface EventSummaryProps {
  players: Player[]
  attendanceData: AttendanceGrid
  onChange: (data: AttendanceGrid) => void
  isDirty?: boolean
  className?: string
}

interface PlayerEvents {
  goals: number
  assists: number
}

export default function EventSummary({
  players,
  attendanceData,
  onChange,
  isDirty = false,
  className
}: EventSummaryProps) {
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null)
  const [tempValues, setTempValues] = useState<PlayerEvents>({ goals: 0, assists: 0 })
  const [isExpanded, setIsExpanded] = useState(true)

  // Get participating players (those with attendance > 0)
  const participatingPlayers = players.filter(player => 
    attendanceData.some(item => item.userId === player.id && item.value > 0)
  )

  // Get events for a specific player
  const getPlayerEvents = (userId: string): PlayerEvents => {
    const userAttendance = attendanceData.filter(item => item.userId === userId)
    
    // Sum up goals and assists from all attendance records for this player
    const goals = userAttendance.reduce((sum, item) => sum + (item.goals || 0), 0)
    const assists = userAttendance.reduce((sum, item) => sum + (item.assists || 0), 0)
    
    return { goals, assists }
  }

  // Update events for a player
  const updatePlayerEvents = (userId: string, events: PlayerEvents) => {
    const newAttendanceData = [...attendanceData]
    
    // Find all attendance records for this player
    const userAttendanceIndices = newAttendanceData
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.userId === userId)
    
    if (userAttendanceIndices.length === 0) return

    // Clear goals/assists from all records for this player
    userAttendanceIndices.forEach(({ index }) => {
      newAttendanceData[index].goals = 0
      newAttendanceData[index].assists = 0
    })

    // Set goals/assists on the first attendance record for this player
    const firstRecordIndex = userAttendanceIndices[0].index
    newAttendanceData[firstRecordIndex].goals = events.goals
    newAttendanceData[firstRecordIndex].assists = events.assists

    onChange(newAttendanceData)
  }

  // Start editing a player's events
  const startEditing = (userId: string) => {
    const events = getPlayerEvents(userId)
    setTempValues(events)
    setEditingPlayer(userId)
  }

  // Save editing changes
  const saveEditing = () => {
    if (editingPlayer) {
      updatePlayerEvents(editingPlayer, tempValues)
      setEditingPlayer(null)
    }
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingPlayer(null)
    setTempValues({ goals: 0, assists: 0 })
  }

  // Calculate total events
  const totalEvents = participatingPlayers.reduce((totals, player) => {
    const events = getPlayerEvents(player.id)
    return {
      goals: totals.goals + events.goals,
      assists: totals.assists + events.assists
    }
  }, { goals: 0, assists: 0 })

  return (
    <Card className={cn("w-full", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-semibold">比赛事件</CardTitle>
                <Badge variant={isDirty ? "destructive" : "secondary"} className="text-xs">
                  {isDirty ? "有未保存更改" : "已保存"}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                {/* Total Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    <span>{totalEvents.goals} 进球</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    <span>{totalEvents.assists} 助攻</span>
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {participatingPlayers.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-sm">暂无参与球员</div>
                <div className="text-xs text-gray-400 mt-1">请先在出勤网格中添加球员</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">
                  管理参与球员的进球和助攻数据
                </div>

                {participatingPlayers.map((player) => {
                  const events = getPlayerEvents(player.id)
                  const isEditing = editingPlayer === player.id
                  const hasEvents = events.goals > 0 || events.assists > 0

                  return (
                    <div 
                      key={player.id} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-colors",
                        hasEvents ? "bg-green-50 border-green-200" : "bg-gray-50",
                        isEditing && "ring-2 ring-blue-500 ring-offset-2"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="font-medium text-sm">
                          {player.name}
                          {player.jerseyNumber && ` #${player.jerseyNumber}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isEditing ? (
                          <>
                            {/* Editing Mode */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Label htmlFor={`goals-${player.id}`} className="text-xs">
                                  进球:
                                </Label>
                                <Input
                                  id={`goals-${player.id}`}
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={tempValues.goals}
                                  onChange={(e) => setTempValues(prev => ({
                                    ...prev,
                                    goals: parseInt(e.target.value) || 0
                                  }))}
                                  className="w-16 h-8 text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <Label htmlFor={`assists-${player.id}`} className="text-xs">
                                  助攻:
                                </Label>
                                <Input
                                  id={`assists-${player.id}`}
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={tempValues.assists}
                                  onChange={(e) => setTempValues(prev => ({
                                    ...prev,
                                    assists: parseInt(e.target.value) || 0
                                  }))}
                                  className="w-16 h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="sm" onClick={saveEditing} className="h-8 w-8 p-0">
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing} className="h-8 w-8 p-0">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Display Mode */}
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3 text-green-600" />
                                <span>{events.goals}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Award className="h-3 w-3 text-blue-600" />
                                <span>{events.assists}</span>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => startEditing(player.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}