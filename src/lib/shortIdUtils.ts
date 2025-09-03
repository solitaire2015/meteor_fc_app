/**
 * Utility functions for generating and managing player short IDs
 */

/**
 * Generate a short ID from a Chinese name
 * Rules:
 * - For 3-char names: use last 2 characters (李东辉 -> dh)
 * - For 2-char names: use both characters (东辉 -> dh)
 * - For 1-char names: use the character twice (马 -> ma)
 * - For English/mixed names: use first 2 characters (qc -> qc, 得瑞克 -> dk)
 * - Convert to lowercase
 */
export function generateShortId(name: string): string {
  if (!name || name.trim().length === 0) {
    throw new Error('Name cannot be empty')
  }

  const trimmedName = name.trim()
  
  // Check if name contains Chinese characters
  const chineseChars = trimmedName.match(/[\u4e00-\u9fff]/g) || []
  const isChineseName = chineseChars.length > 0
  
  if (isChineseName) {
    // For Chinese names, use the logic based on character count
    if (trimmedName.length >= 3) {
      // Use last 2 characters for 3+ char names
      return trimmedName.slice(-2).toLowerCase()
    } else if (trimmedName.length === 2) {
      // Use both characters for 2-char names
      return trimmedName.toLowerCase()
    } else {
      // For 1-char names, repeat the character
      return (trimmedName + trimmedName).toLowerCase()
    }
  } else {
    // For English/mixed names, use first 2 characters
    if (trimmedName.length >= 2) {
      return trimmedName.slice(0, 2).toLowerCase()
    } else {
      // For single character, repeat it
      return (trimmedName + trimmedName).toLowerCase()
    }
  }
}

/**
 * Generate a unique short ID by adding numeric suffix if conflicts exist
 * @param baseName - The original name to generate short ID from
 * @param existingShortIds - Array of existing short IDs to avoid conflicts
 * @returns A unique short ID with numeric suffix if needed (e.g., dh01, dh02)
 */
export function generateUniqueShortId(baseName: string, existingShortIds: string[]): string {
  const baseShortId = generateShortId(baseName)
  
  // If no conflict, return the base short ID
  if (!existingShortIds.includes(baseShortId)) {
    return baseShortId
  }
  
  // Find the next available number suffix (01, 02, etc.)
  for (let i = 1; i <= 99; i++) {
    const suffix = i.toString().padStart(2, '0')
    const candidateId = `${baseShortId}${suffix}`
    
    if (!existingShortIds.includes(candidateId)) {
      return candidateId
    }
  }
  
  // If we reach here, we have too many conflicts (unlikely)
  throw new Error(`Unable to generate unique short ID for name: ${baseName}`)
}

/**
 * Parse Excel player name and generate short ID
 * Handles special cases like (试训), suffixes, etc.
 */
export function parseExcelPlayerName(excelName: string): { name: string; shortId: string; isGuest?: boolean } {
  if (!excelName || typeof excelName !== 'string') {
    throw new Error('Invalid Excel name')
  }
  
  let cleanName = excelName.trim()
  let isGuest = false
  
  // Handle special cases
  if (cleanName.includes('(试训)') || cleanName.includes('（试训）')) {
    cleanName = cleanName.replace(/[（(]试训[）)]/g, '').trim()
    isGuest = true
  }
  
  // Remove other parenthetical notes
  cleanName = cleanName.replace(/[（(][^）)]*[）)]/g, '').trim()
  
  if (!cleanName) {
    throw new Error('Name is empty after cleaning')
  }
  
  const shortId = generateShortId(cleanName)
  
  return {
    name: cleanName,
    shortId,
    isGuest
  }
}

/**
 * Test the short ID generation with example names
 */
export function testShortIdGeneration() {
  const testCases = [
    '李东辉',    // Should be 'dh'
    '东辉',      // Should be 'dh'
    '马',        // Should be 'ma'
    '得瑞克',    // Should be 'dk'
    'qc',        // Should be 'qc'
    '林达（试训）', // Should be 'da' with isGuest=true
    '小朱',      // Should be 'zhu'
    '陶叔',      // Should be 'shu'
  ]
  
  console.log('Short ID Generation Tests:')
  testCases.forEach(name => {
    try {
      const result = parseExcelPlayerName(name)
      console.log(`${name} -> ${result.shortId} (name: ${result.name}, guest: ${result.isGuest || false})`)
    } catch (error) {
      console.error(`Error processing ${name}:`, error)
    }
  })
}