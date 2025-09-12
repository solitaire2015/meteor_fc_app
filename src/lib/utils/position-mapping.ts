export type PositionCategory = 'GK' | '后卫' | '中场' | '前锋'

export interface PositionMapping {
  [key: string]: PositionCategory
}

export interface PositionInfo {
  code: string
  name: string
  category: PositionCategory
}

// Position mappings based on requirements
export const POSITION_MAPPINGS: PositionMapping = {
  // Goalkeeper
  'GK': 'GK',
  
  // 后卫 (Defenders)
  'CB': '后卫',   // Center Back
  'LB': '后卫',   // Left Back
  'RB': '后卫',   // Right Back
  'LWB': '后卫',  // Left Wing Back
  'RWB': '后卫',  // Right Wing Back
  
  // 中场 (Midfielders)
  'DMF': '中场',  // Defensive Midfielder
  'CM': '中场',   // Central Midfielder
  'CMF': '中场',  // Central Midfielder
  'AM': '中场',   // Attacking Midfielder
  'AMF': '中场',  // Attacking Midfielder
  'LM': '中场',   // Left Midfielder
  'LMF': '中场',  // Left Midfielder
  'RM': '中场',   // Right Midfielder
  'RMF': '中场',  // Right Midfielder
  
  // 前锋 (Forwards)
  'CF': '前锋',   // Center Forward
  'ST': '前锋',   // Striker
  'SS': '前锋',   // Second Striker
  'LW': '前锋',   // Left Winger
  'LWF': '前锋',  // Left Wing Forward
  'RW': '前锋',   // Right Winger
  'RWF': '前锋',  // Right Wing Forward
}

export const POSITION_DETAILS: Record<PositionCategory, PositionInfo[]> = {
  'GK': [
    { code: 'GK', name: '门将', category: 'GK' }
  ],
  '后卫': [
    { code: 'CB', name: '中后卫', category: '后卫' },
    { code: 'LB', name: '左后卫', category: '后卫' },
    { code: 'RB', name: '右后卫', category: '后卫' },
    { code: 'LWB', name: '左翼卫', category: '后卫' },
    { code: 'RWB', name: '右翼卫', category: '后卫' },
  ],
  '中场': [
    { code: 'DMF', name: '防守型中场', category: '中场' },
    { code: 'CM', name: '中前卫', category: '中场' },
    { code: 'CMF', name: '中场', category: '中场' },
    { code: 'AM', name: '进攻型中场', category: '中场' },
    { code: 'AMF', name: '进攻型中场', category: '中场' },
    { code: 'LM', name: '左前卫', category: '中场' },
    { code: 'LMF', name: '左前卫', category: '中场' },
    { code: 'RM', name: '右前卫', category: '中场' },
    { code: 'RMF', name: '右前卫', category: '中场' },
  ],
  '前锋': [
    { code: 'CF', name: '中锋', category: '前锋' },
    { code: 'ST', name: '前锋', category: '前锋' },
    { code: 'SS', name: '影子前锋', category: '前锋' },
    { code: 'LW', name: '左边锋', category: '前锋' },
    { code: 'LWF', name: '左边锋', category: '前锋' },
    { code: 'RW', name: '右边锋', category: '前锋' },
    { code: 'RWF', name: '右边锋', category: '前锋' },
  ],
}

export const POSITION_CATEGORIES: PositionCategory[] = ['GK', '后卫', '中场', '前锋']

/**
 * Get position category from position code
 */
export function getPositionCategory(position: string | undefined): PositionCategory | null {
  if (!position) return null
  return POSITION_MAPPINGS[position.toUpperCase()] || null
}

/**
 * Get position display name from position code
 */
export function getPositionDisplayName(position: string): string {
  const positionInfo = Object.values(POSITION_DETAILS)
    .flat()
    .find(p => p.code === position.toUpperCase())
  
  return positionInfo?.name || position
}

/**
 * Check if a position code is valid/recognized
 */
export function isValidPosition(position: string | undefined): boolean {
  if (!position) return false
  return position.toUpperCase() in POSITION_MAPPINGS
}

/**
 * Get all position codes for a given category
 */
export function getPositionCodesForCategory(category: PositionCategory): string[] {
  return POSITION_DETAILS[category].map(p => p.code)
}