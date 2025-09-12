import { PrismaClient } from '@prisma/client'
import { generateUniqueShortId } from '../lib/shortIdUtils'

const prisma = new PrismaClient()

/**
 * Generate shortIds for existing users who don't have one
 */
async function generateShortIdsForExistingUsers() {
  try {
    console.log('Starting shortId generation for existing users...')
    
    // Get all users without shortId
    const usersWithoutShortId = await prisma.user.findMany({
      where: {
        shortId: null
      },
      select: {
        id: true,
        name: true,
        shortId: true
      }
    })
    
    console.log(`Found ${usersWithoutShortId.length} users without shortId`)
    
    if (usersWithoutShortId.length === 0) {
      console.log('All users already have shortIds')
      return
    }
    
    // Get existing shortIds to avoid conflicts
    const existingUsers = await prisma.user.findMany({
      where: {
        shortId: { not: null }
      },
      select: { shortId: true }
    })
    
    const existingShortIds = existingUsers
      .map(u => u.shortId)
      .filter(id => id !== null) as string[]
    
    console.log(`Found ${existingShortIds.length} existing shortIds:`, existingShortIds)
    
    // Generate shortIds for users
    const updates = []
    const currentShortIds = [...existingShortIds]
    
    for (const user of usersWithoutShortId) {
      try {
        const shortId = generateUniqueShortId(user.name, currentShortIds)
        currentShortIds.push(shortId)
        
        updates.push({
          userId: user.id,
          name: user.name,
          shortId
        })
        
        console.log(`Generated shortId for ${user.name}: ${shortId}`)
      } catch (error) {
        console.error(`Failed to generate shortId for ${user.name}:`, error)
      }
    }
    
    // Apply updates to database
    console.log(`\nApplying ${updates.length} shortId updates...`)
    
    for (const update of updates) {
      await prisma.user.update({
        where: { id: update.userId },
        data: { shortId: update.shortId }
      })
      
      console.log(`Updated ${update.name} -> ${update.shortId}`)
    }
    
    console.log('\n✅ ShortId generation completed successfully!')
    
    // Verify results
    const finalCount = await prisma.user.count({
      where: { shortId: { not: null } }
    })
    
    const totalUsers = await prisma.user.count()
    
    console.log(`\nSummary:`)
    console.log(`- Total users: ${totalUsers}`)
    console.log(`- Users with shortId: ${finalCount}`)
    console.log(`- Users without shortId: ${totalUsers - finalCount}`)
    
  } catch (error) {
    console.error('Error generating shortIds:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Test the shortId generation logic
async function testShortIdGeneration() {
  console.log('Testing shortId generation...\n')
  
  const testNames = [
    '李东辉',    // Should be 'dh'
    '东辉',      // Should be 'dh'  
    '马',        // Should be 'ma'
    '得瑞克',    // Should be 'dk'
    'qc',        // Should be 'qc'
    '小朱',      // Should be 'zhu'
    '陶叔',      // Should be 'shu'
    '超',        // Should be 'ch'
    '卜',         // Should be 'bu'
  ]
  
  const existingIds: string[] = []
  
  testNames.forEach(name => {
    try {
      const shortId = generateUniqueShortId(name, existingIds)
      existingIds.push(shortId)
      console.log(`${name.padEnd(10)} -> ${shortId}`)
    } catch (error) {
      console.error(`Error processing ${name}:`, error)
    }
  })
  
  console.log('\n✅ Test completed!')
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--test')) {
    await testShortIdGeneration()
  } else {
    await generateShortIdsForExistingUsers()
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { generateShortIdsForExistingUsers, testShortIdGeneration }