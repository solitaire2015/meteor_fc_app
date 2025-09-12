'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, Filter, Users, CheckSquare, Square, UserPlus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { type Player } from '@/lib/validations/match'

interface PlayerSelectorProps {
  availablePlayers: Player[]
  selectedPlayers: Player[]
  onSelectionChange: (players: Player[]) => void
  onSave?: () => void
  maxPlayers?: number
  minPlayers?: number
  isDirty?: boolean
  isSaving?: boolean
  className?: string
}

interface FilterState {
  search: string
  position: string
  status: string
}

const POSITIONS = [
  { value: 'all', label: '所有位置' },
  { value: 'GK', label: '门将' },
  { value: 'DF', label: '后卫' },
  { value: 'MF', label: '中场' },
  { value: 'FW', label: '前锋' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: '所有状态' },
  { value: 'ACTIVE', label: '激活' },
  { value: 'INACTIVE', label: '停用' },
  { value: 'PENDING', label: '待处理' },
]

export default function PlayerSelector({
  availablePlayers,
  selectedPlayers,
  onSelectionChange,
  onSave,
  maxPlayers = 30,
  minPlayers = 11,
  isDirty = false,
  isSaving = false,
  className = ''
}: PlayerSelectorProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    position: 'all',
    status: 'ACTIVE'
  })
  const [isExpanded, setIsExpanded] = useState(false)

  // Filter players based on current filters
  const filteredPlayers = useMemo(() => {
    return availablePlayers.filter(player => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesName = player.name.toLowerCase().includes(searchTerm)
        const matchesJersey = player.jerseyNumber?.toString().includes(searchTerm)
        if (!matchesName && !matchesJersey) return false
      }

      // Position filter
      if (filters.position !== 'all' && player.position !== filters.position) {
        return false
      }

      // Status filter
      if (filters.status !== 'all' && player.accountStatus !== filters.status) {
        return false
      }

      return true
    })
  }, [availablePlayers, filters])

  // Get selected player IDs for quick lookup
  const selectedPlayerIds = useMemo(() => 
    new Set(selectedPlayers.map(p => p.id)), 
    [selectedPlayers]
  )

  // Handle individual player selection
  const handlePlayerToggle = useCallback((player: Player) => {
    const isSelected = selectedPlayerIds.has(player.id)
    let newSelection: Player[]

    if (isSelected) {
      newSelection = selectedPlayers.filter(p => p.id !== player.id)
    } else {
      if (selectedPlayers.length >= maxPlayers) {
        // Show toast notification about max players limit
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error(`最多只能选择 ${maxPlayers} 名球员`)
        })
        return
      }
      newSelection = [...selectedPlayers, player]
    }

    onSelectionChange(newSelection)
  }, [selectedPlayers, selectedPlayerIds, maxPlayers, onSelectionChange])

  // Handle select all filtered players
  const handleSelectAllFiltered = useCallback(() => {
    const unselectedFiltered = filteredPlayers.filter(p => !selectedPlayerIds.has(p.id))
    const canAdd = Math.min(unselectedFiltered.length, maxPlayers - selectedPlayers.length)
    
    if (canAdd === 0) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('已达到最大选择数量限制')
      })
      return
    }
    
    const toAdd = unselectedFiltered.slice(0, canAdd)
    onSelectionChange([...selectedPlayers, ...toAdd])
    
    if (canAdd < unselectedFiltered.length) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.warning(`只能再选择 ${canAdd} 名球员，已达到上限`)
      })
    }
  }, [filteredPlayers, selectedPlayerIds, selectedPlayers, maxPlayers, onSelectionChange])

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
    
    if (positionPlayers.length === 0) {
      import('react-hot-toast').then(({ default: toast }) => {
        const positionLabels: Record<string, string> = {
          'GK': '门将',
          'DF': '后卫', 
          'MF': '中场',
          'FW': '前锋'
        }
        toast.error(`没有可选择的${positionLabels[position] || position}球员`)
      })
      return
    }
    
    const canAdd = Math.min(positionPlayers.length, maxPlayers - selectedPlayers.length)
    
    if (canAdd === 0) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('已达到最大选择数量限制')
      })
      return
    }
    
    const toAdd = positionPlayers.slice(0, canAdd)
    onSelectionChange([...selectedPlayers, ...toAdd])
    
    if (canAdd < positionPlayers.length) {
      import('react-hot-toast').then(({ default: toast }) => {
        const positionLabels: Record<string, string> = {
          'GK': '门将',
          'DF': '后卫', 
          'MF': '中场',
          'FW': '前锋'
        }
        toast.warning(`只能再选择 ${canAdd} 名${positionLabels[position] || position}球员`)
      })
    }
  }, [availablePlayers, selectedPlayerIds, selectedPlayers, maxPlayers, onSelectionChange])

  // Update filter state
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // Validation messages
  const validationMessage = useMemo(() => {
    if (selectedPlayers.length < minPlayers) {
      return `至少需要选择 ${minPlayers} 名球员 (当前: ${selectedPlayers.length})`
    }
    if (selectedPlayers.length > maxPlayers) {
      return `最多只能选择 ${maxPlayers} 名球员 (当前: ${selectedPlayers.length})`
    }
    return null
  }, [selectedPlayers.length, minPlayers, maxPlayers])

  const unselectedCount = filteredPlayers.filter(p => !selectedPlayerIds.has(p.id)).length

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            球员选择
            <Badge variant="secondary" className="ml-2">
              {selectedPlayers.length}/{maxPlayers}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {onSave && (
              <Button 
                onClick={onSave}
                disabled={!isDirty || isSaving || selectedPlayers.length < minPlayers}
                size="sm"
                className="gap-1"
              >
                <Save className="h-4 w-4" />
                {isSaving ? '保存中...' : '保存选择'}
              </Button>
            )}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? '收起' : '展开'}
                  <Filter className="ml-1 h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
        
        {validationMessage && (
          <div className={`text-sm px-3 py-2 rounded ${
            selectedPlayers.length < minPlayers ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
          }`}>
            {validationMessage}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索球员姓名或球衣号码..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={selectedPlayers.length === 0}
            >
              清空
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllFiltered}
              disabled={unselectedCount === 0 || selectedPlayers.length >= maxPlayers}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              全选 ({unselectedCount})
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">位置</label>
                <Select value={filters.position} onValueChange={(value) => handleFilterChange('position', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(pos => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">状态</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Select by Position */}
            <div>
              <label className="text-sm font-medium mb-2 block">按位置快速选择</label>
              <div className="flex flex-wrap gap-2">
                {POSITIONS.slice(1).map(pos => {
                  const count = availablePlayers.filter(p => 
                    p.position === pos.value && 
                    p.accountStatus === 'ACTIVE' && 
                    !selectedPlayerIds.has(p.id)
                  ).length
                  return (
                    <Button
                      key={pos.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectByPosition(pos.value)}
                      disabled={count === 0 || selectedPlayers.length >= maxPlayers}
                    >
                      {pos.label} ({count})
                    </Button>
                  )
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Player List */}
        <div className="border rounded-lg">
          <div className="p-3 border-b bg-muted/50">
            <h4 className="font-medium">
              可选球员 ({filteredPlayers.length})
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                没有找到符合条件的球员
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredPlayers.map(player => {
                  const isSelected = selectedPlayerIds.has(player.id)
                  const isDisabled = !isSelected && selectedPlayers.length >= maxPlayers
                  
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer ${
                        isSelected ? 'bg-primary/10' : ''
                      } ${isDisabled ? 'opacity-50' : ''}`}
                      onClick={() => !isDisabled && handlePlayerToggle(player)}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={() => !isDisabled && handlePlayerToggle(player)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{player.name}</span>
                          {player.jerseyNumber && (
                            <Badge variant="outline" className="text-xs">
                              #{player.jerseyNumber}
                            </Badge>
                          )}
                          {player.position && (
                            <Badge variant="secondary" className="text-xs">
                              {player.position}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {player.accountStatus === 'ACTIVE' ? '激活' : 
                           player.accountStatus === 'INACTIVE' ? '停用' : '待处理'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Players Summary */}
        {selectedPlayers.length > 0 && (
          <div className="border rounded-lg p-3 bg-muted/25">
            <h4 className="font-medium mb-2">已选择的球员 ({selectedPlayers.length})</h4>
            <div className="flex flex-wrap gap-1">
              {selectedPlayers.map(player => (
                <Badge 
                  key={player.id} 
                  variant="default" 
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handlePlayerToggle(player)}
                >
                  {player.name}
                  {player.jerseyNumber && ` #${player.jerseyNumber}`}
                  <span className="ml-1">×</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}