'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ArrowUpDown, Users, Timer, Target, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  PositionCategoryStats, 
  PlayerPositionStats, 
  SortOrder, 
  sortPlayersByTime,
  groupPlayersBySpecificPosition
} from '@/lib/utils/position-statistics'
import { getPositionDisplayName } from '@/lib/utils/position-mapping'

interface PositionCardProps {
  categoryStats: PositionCategoryStats
  className?: string
}

export default function PositionCard({ categoryStats, className = '' }: PositionCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  
  const sortedPlayers = sortPlayersByTime(categoryStats.players, sortOrder)
  const groupedPlayers = groupPlayersBySpecificPosition(sortedPlayers)
  
  const handleSortToggle = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
  }
  
  const getPositionBadgeVariant = (category: string) => {
    switch (category) {
      case 'GK': return 'default'
      case '后卫': return 'secondary'
      case '中场': return 'outline'
      case '前锋': return 'destructive'
      default: return 'default'
    }
  }
  
  return (
    <Card className={`hover:shadow-lg transition-shadow ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={getPositionBadgeVariant(categoryStats.category)} className="text-sm">
              {categoryStats.displayName}
            </Badge>
            <span className="text-lg font-semibold">{categoryStats.totalPlayers} 人</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSortToggle}
              className="h-8"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              {sortOrder === 'desc' ? '时长↓' : '时长↑'}
            </Button>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Category Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">{categoryStats.totalPlayers}</div>
              <div className="text-muted-foreground">球员</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">{categoryStats.averageTime}</div>
              <div className="text-muted-foreground">平均时长</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">{categoryStats.totalGoals}</div>
              <div className="text-muted-foreground">总进球</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">{categoryStats.totalAssists}</div>
              <div className="text-muted-foreground">总助攻</div>
            </div>
          </div>
        </div>
        
        {/* All Players List */}
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => (
            <div key={player.userId} className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{index + 1}.</span>
                <span className="text-sm">{player.name}</span>
                <Badge variant="outline" className="text-xs">
                  {getPositionDisplayName(player.position)}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{player.totalTime} 时长</span>
                {player.goals > 0 && <span>{player.goals} 球</span>}
                {player.assists > 0 && <span>{player.assists} 助攻</span>}
              </div>
            </div>
          ))}
        </div>
        
        {/* Detailed View - Collapsible */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="mt-4">
            <div className="space-y-4">
              {Object.entries(groupedPlayers).map(([position, players]) => (
                <div key={position} className="border-l-2 border-muted pl-4">
                  <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getPositionDisplayName(position)}
                    </Badge>
                    <span className="text-muted-foreground">({players.length} 人)</span>
                  </h5>
                  
                  <div className="space-y-1">
                    {players.map(player => (
                      <div key={player.userId} className="flex items-center justify-between py-1 px-2 hover:bg-muted/20 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <span>{player.name}</span>
                          <div className="flex gap-1">
                            {player.isGoalkeeper && (
                              <Badge variant="secondary" className="text-xs">门将</Badge>
                            )}
                            {player.isLate && (
                              <Badge variant="destructive" className="text-xs">迟到</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>{player.totalTime}</span>
                          {(player.goals > 0 || player.assists > 0) && (
                            <span>{player.goals}球 {player.assists}助攻</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}