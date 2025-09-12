'use client'

import { useCallback } from 'react'
import { CheckSquare, Square, Users, Shield, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { type Player } from '@/lib/validations/match'

interface QuickSelectActionsProps {
  availablePlayers: Player[]
  selectedPlayers: Player[]
  onSelectionChange: (players: Player[]) => void
  maxPlayers?: number
  className?: string
}

interface PositionCount {
  position: string
  label: string
  available: number
  selected: number
}

const POSITION_LABELS: Record<string, string> = {
  'GK': '门将',
  'DF': '后卫',
  'MF': '中场',
  'FW': '前锋',
}

export default function QuickSelectActions({
  availablePlayers,
  selectedPlayers,
  onSelectionChange,
  maxPlayers = 30,
  className = ''
}: QuickSelectActionsProps) {
  const selectedPlayerIds = new Set(selectedPlayers.map(p => p.id))

  // Calculate position statistics
  const positionStats: PositionCount[] = Object.entries(POSITION_LABELS).map(([position, label]) => {
    const availableCount = availablePlayers.filter(p => 
      p.position === position && p.accountStatus === 'ACTIVE'
    ).length
    const selectedCount = selectedPlayers.filter(p => p.position === position).length
    
    return {
      position,
      label,
      available: availableCount,
      selected: selectedCount
    }
  })

  // Handle select all active players
  const handleSelectAll = useCallback(() => {
    const activeAvailable = availablePlayers.filter(p => 
      p.accountStatus === 'ACTIVE' && !selectedPlayerIds.has(p.id)
    )
    const canAdd = Math.min(activeAvailable.length, maxPlayers - selectedPlayers.length)
    const toAdd = activeAvailable.slice(0, canAdd)
    onSelectionChange([...selectedPlayers, ...toAdd])
  }, [availablePlayers, selectedPlayerIds, selectedPlayers, maxPlayers, onSelectionChange])

  // Handle clear all selections
  const handleClearAll = useCallback(() => {
    onSelectionChange([])
  }, [onSelectionChange])

  // Handle select by position
  const handleSelectByPosition = useCallback((position: string) => {
    const positionPlayers = availablePlayers.filter(p => 
      p.position === position && 
      p.accountStatus === 'ACTIVE' && 
      !selectedPlayerIds.has(p.id)
    )
    const canAdd = Math.min(positionPlayers.length, maxPlayers - selectedPlayers.length)
    const toAdd = positionPlayers.slice(0, canAdd)
    onSelectionChange([...selectedPlayers, ...toAdd])
  }, [availablePlayers, selectedPlayerIds, selectedPlayers, maxPlayers, onSelectionChange])

  // Handle remove by position
  const handleRemoveByPosition = useCallback((position: string) => {
    const newSelection = selectedPlayers.filter(p => p.position !== position)
    onSelectionChange(newSelection)
  }, [selectedPlayers, onSelectionChange])

  // Calculate counts for display
  const activeAvailable = availablePlayers.filter(p => 
    p.accountStatus === 'ACTIVE' && !selectedPlayerIds.has(p.id)
  ).length

  const canSelectMore = selectedPlayers.length < maxPlayers

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Select All Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSelectAll}
        disabled={activeAvailable === 0 || !canSelectMore}
        className="gap-1"
      >
        <CheckSquare className="h-4 w-4" />
        全选
        <Badge variant="secondary" className="ml-1">
          {activeAvailable}
        </Badge>
      </Button>

      {/* Clear All Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleClearAll}
        disabled={selectedPlayers.length === 0}
        className="gap-1"
      >
        <Square className="h-4 w-4" />
        清空
        <Badge variant="secondary" className="ml-1">
          {selectedPlayers.length}
        </Badge>
      </Button>

      {/* Position-based Quick Select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <Users className="h-4 w-4" />
            按位置选择
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>按位置选择球员</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {positionStats.map(stat => {
            const availableToSelect = stat.available - stat.selected
            const canSelect = availableToSelect > 0 && canSelectMore
            
            return (
              <DropdownMenuItem
                key={stat.position}
                onClick={() => canSelect && handleSelectByPosition(stat.position)}
                disabled={!canSelect}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {stat.position === 'GK' && <Shield className="h-4 w-4" />}
                  <span>{stat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {stat.selected}/{stat.available}
                  </Badge>
                  {availableToSelect > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      +{availableToSelect}
                    </Badge>
                  )}
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Position-based Remove (only show if there are selected players) */}
      {selectedPlayers.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <UserMinus className="h-4 w-4" />
              按位置移除
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>按位置移除球员</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {positionStats.map(stat => {
              const canRemove = stat.selected > 0
              
              return (
                <DropdownMenuItem
                  key={`remove-${stat.position}`}
                  onClick={() => canRemove && handleRemoveByPosition(stat.position)}
                  disabled={!canRemove}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {stat.position === 'GK' && <Shield className="h-4 w-4" />}
                    <span>移除 {stat.label}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {stat.selected}
                  </Badge>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Selection Summary */}
      <div className="flex items-center gap-2 ml-auto">
        <Badge variant="default">
          已选: {selectedPlayers.length}/{maxPlayers}
        </Badge>
        {!canSelectMore && (
          <Badge variant="destructive">
            已达上限
          </Badge>
        )}
      </div>
    </div>
  )
}