'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Users, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type Player } from '@/lib/validations/match'

interface SimplePlayerSelectorProps {
  availablePlayers: Player[]
  selectedPlayers: Player[]
  onSelectionChange: (players: Player[]) => void
  onSave?: () => void
  isDirty?: boolean
  isSaving?: boolean
  className?: string
}

export default function SimplePlayerSelector({
  availablePlayers,
  selectedPlayers,
  onSelectionChange,
  onSave,
  isDirty = false,
  isSaving = false,
  className = ''
}: SimplePlayerSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Filter out players who are on vacation
  const filteredAvailablePlayers = availablePlayers.filter(p => p.playerStatus !== 'VACATION');

  // Get selected player IDs for quick lookup
  const selectedPlayerIds = new Set(selectedPlayers.map(p => p.id))

  // Handle individual player toggle
  const handlePlayerToggle = (player: Player) => {
    const isSelected = selectedPlayerIds.has(player.id)
    let newSelection: Player[]

    if (isSelected) {
      newSelection = selectedPlayers.filter(p => p.id !== player.id)
    } else {
      newSelection = [...selectedPlayers, player]
    }

    onSelectionChange(newSelection)
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-left hover:text-primary transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Users className="h-5 w-5" />
            <span className="font-semibold">选择球员</span>
            <Badge variant="secondary" className="ml-2">
              {selectedPlayers.length}/{filteredAvailablePlayers.length}
            </Badge>
          </button>

          {onSave && (
            <Button
              onClick={onSave}
              disabled={!isDirty || isSaving}
              size="sm"
              className="gap-1"
            >
              <Save className="h-4 w-4" />
              {isSaving ? '保存中...' : '保存选择'}
            </Button>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {filteredAvailablePlayers.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                没有可选择的球员
              </div>
            ) : (
              filteredAvailablePlayers.map(player => {
                const isSelected = selectedPlayerIds.has(player.id)

                return (
                  <div
                    key={player.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => handlePlayerToggle(player)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handlePlayerToggle(player)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{player.name}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}