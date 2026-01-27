'use client'

import { useState } from 'react'
import { 
  Target, 
  Award, 
  AlertTriangle, 
  AlertOctagon, 
  XCircle, 
  Shield, 
  Plus, 
  Trash2, 
  Clock 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type Player, type MatchEvent } from '@/lib/validations/match'
import { cn } from '@/lib/utils'

interface DetailedEventLoggerProps {
  players: Player[]
  events: MatchEvent[]
  onAddEvent: (event: MatchEvent) => void
  onRemoveEvent: (eventId: string) => void
  attendanceData: any[] // Used to filter participating players
  isDirty?: boolean
  className?: string
}

export default function DetailedEventLogger({
  players,
  events,
  onAddEvent,
  onRemoveEvent,
  attendanceData,
  isDirty = false,
  className
}: DetailedEventLoggerProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [eventType, setEventType] = useState<string>('GOAL')
  const [section, setSection] = useState<number>(1)
  const [minute, setMinute] = useState<string>('')

  // Filter players who have marked attendance > 0
  const participatingPlayers = players.filter(player => 
    attendanceData.some(item => item.userId === player.id && item.value > 0)
  )

  const handleAddEvent = () => {
    if (!selectedPlayerId || !eventType || !section || !minute) return

    // Calculate absolute match minute based on section (30 mins per section)
    // Section 1: 1-30+ (starts at 0 offset)
    // Section 2: 31-60+ (starts at 30 offset)
    // Section 3: 61-90+ (starts at 60 offset)
    const absoluteMinute = (section - 1) * 30 + parseInt(minute)

    const newEvent: MatchEvent = {
      id: crypto.randomUUID(),
      playerId: selectedPlayerId,
      eventType: eventType as any,
      minute: absoluteMinute,
    }

    onAddEvent(newEvent)
    
    // Reset form but keep player/section selected for rapid entry
    setEventType('GOAL')
    setMinute('')
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'GOAL': return <Target className="h-4 w-4 text-green-600" />
      case 'PENALTY_GOAL': return <Target className="h-4 w-4 text-green-600" />
      case 'ASSIST': return <Award className="h-4 w-4 text-blue-600" />
      case 'YELLOW_CARD': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'RED_CARD': return <AlertOctagon className="h-4 w-4 text-red-600" />
      case 'PENALTY_MISS': return <XCircle className="h-4 w-4 text-red-400" />
      case 'OWN_GOAL': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'SAVE': return <Shield className="h-4 w-4 text-purple-600" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'GOAL': return '进球'
      case 'PENALTY_GOAL': return '点球(进)'
      case 'ASSIST': return '助攻'
      case 'YELLOW_CARD': return '黄牌'
      case 'RED_CARD': return '红牌'
      case 'PENALTY_MISS': return '点球(失)'
      case 'OWN_GOAL': return '乌龙球'
      case 'SAVE': return '扑救'
      default: return type
    }
  }

  // Sort events by minute (if available) or creation order
  const sortedEvents = [...events].sort((a, b) => {
    if (a.minute !== undefined && b.minute !== undefined) {
      return a.minute - b.minute
    }
    return 0
  })

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">比赛详细事件</CardTitle>
            <Badge variant={isDirty ? "destructive" : "secondary"} className="text-xs">
              {isDirty ? "有未保存更改" : "已保存"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            共 {events.length} 个事件
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add Event Form */}
        <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/30 p-4 rounded-lg border">
          <div className="flex-1 space-y-2 w-full">
            <Label>球员</Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger>
                <SelectValue placeholder="选择球员" />
              </SelectTrigger>
              <SelectContent>
                {participatingPlayers.map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name} {player.jerseyNumber ? `(#${player.jerseyNumber})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-40 space-y-2">
            <Label>事件类型</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GOAL">进球</SelectItem>
                <SelectItem value="ASSIST">助攻</SelectItem>
                <SelectItem value="YELLOW_CARD">黄牌</SelectItem>
                <SelectItem value="RED_CARD">红牌</SelectItem>
                <SelectItem value="PENALTY_GOAL">点球(进)</SelectItem>
                <SelectItem value="PENALTY_MISS">点球(失)</SelectItem>
                <SelectItem value="OWN_GOAL">乌龙球</SelectItem>
                <SelectItem value="SAVE">关键扑救</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-48 space-y-2">
            <Label>时间</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select 
                  value={section ? section.toString() : ''} 
                  onValueChange={(val) => setSection(parseInt(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="节数" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">第一节</SelectItem>
                    <SelectItem value="2">第二节</SelectItem>
                    <SelectItem value="3">第三节</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-1">
                <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  min="0" 
                  max="45" 
                  placeholder="分" 
                  className="pl-8"
                  value={minute}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val) && val >= 0 && val <= 45) {
                      setMinute(e.target.value)
                    } else if (e.target.value === '') {
                      setMinute('')
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleAddEvent} disabled={!selectedPlayerId || !section || !minute}>
            <Plus className="h-4 w-4 mr-2" />
            添加
          </Button>
        </div>

        {/* Events List */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">时间</TableHead>
                <TableHead>球员</TableHead>
                <TableHead>事件</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    暂无事件记录
                  </TableCell>
                </TableRow>
              ) : (
                sortedEvents.map((event) => {
                  const player = players.find(p => p.id === event.playerId)
                  
                  // Calculate display time (Section + Minute)
                  let displayTime = '-'
                  if (event.minute !== undefined) {
                    const sec = Math.ceil(event.minute / 30) || 1
                    // Logic: 
                    // 0-30 -> Section 1
                    // 31-60 -> Section 2
                    // 61-90 -> Section 3
                    // But actually we want to reverse the input logic:
                    // absolute = (section-1)*30 + min
                    // so section = floor(absolute/30) + 1? No, 30 is end of sec 1.
                    // Let's assume standard 30min sections as per user request.
                    // If absolute is 45 (Sec 2, 15th min)
                    // Section = Math.floor((45-1)/30) + 1 = 2
                    // Minute = 45 - (2-1)*30 = 15
                    
                    const calculatedSection = Math.floor((event.minute - 1) / 30) + 1
                    const calculatedMinute = event.minute - (calculatedSection - 1) * 30
                    
                    displayTime = `第${calculatedSection}节 ${calculatedMinute}'`
                  }

                  return (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {displayTime}
                      </TableCell>
                      <TableCell className="font-medium">
                        {player?.name || '未知球员'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.eventType)}
                          <span>{getEventLabel(event.eventType)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => event.id && onRemoveEvent(event.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
