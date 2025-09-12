'use client'

import { type Player } from '@/lib/validations/match'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface PlayerCardProps {
  player: Player
  isSelected?: boolean
  onSelect?: (player: Player) => void
  onRemove?: (player: Player) => void
  showPosition?: boolean
  showStatus?: boolean
  className?: string
}

const getPositionColor = (position?: string) => {
  switch (position) {
    case 'GK': return 'bg-yellow-100 text-yellow-800'
    case 'DF': return 'bg-blue-100 text-blue-800'
    case 'MF': return 'bg-green-100 text-green-800'
    case 'FW': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800'
    case 'INACTIVE': return 'bg-gray-100 text-gray-800'
    case 'PENDING': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'ACTIVE': return '激活'
    case 'INACTIVE': return '停用'
    case 'PENDING': return '待处理'
    default: return status
  }
}

export default function PlayerCard({
  player,
  isSelected = false,
  onSelect,
  onRemove,
  showPosition = true,
  showStatus = false,
  className = ''
}: PlayerCardProps) {
  const handleClick = () => {
    if (isSelected && onRemove) {
      onRemove(player)
    } else if (!isSelected && onSelect) {
      onSelect(player)
    }
  }

  const playerInitials = player.name
    .split('')
    .filter(char => /[\u4e00-\u9fff]/.test(char)) // Chinese characters
    .slice(0, 2)
    .join('')

  return (
    <Card 
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-md
        ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}
        ${className}
      `}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-sm font-medium">
              {playerInitials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{player.name}</h4>
              {player.jerseyNumber && (
                <Badge variant="outline" className="text-xs">
                  #{player.jerseyNumber}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {showPosition && player.position && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getPositionColor(player.position)}`}
                >
                  {player.position}
                </Badge>
              )}
              
              {showStatus && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getStatusColor(player.accountStatus)}`}
                >
                  {getStatusText(player.accountStatus)}
                </Badge>
              )}
            </div>
          </div>
          
          {isSelected && (
            <div className="text-primary">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}