import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migratePositions() {
  console.log('Starting position migration...');
  
  // Get all users with positions
  const users = await prisma.user.findMany({
    where: {
      position: { not: null }
    }
  });
  
  console.log(`Found ${users.length} users with positions`);
  
  // Map old positions to new ones
  const positionMapping: Record<string, string> = {
    'DF': 'CB',  // Default defenders to Center Back
    'MF': 'CMF', // Default midfielders to Central Midfielder
    'FW': 'ST',  // Default forwards to Striker
    'GK': 'GK'   // Goalkeeper stays the same
  };
  
  // First, clear all positions
  await prisma.user.updateMany({
    where: { position: { not: null } },
    data: { position: null }
  });
  
  console.log('Cleared all positions');
  
  // Now we can update the schema
  console.log('Please run: npx prisma db push --accept-data-loss');
  console.log('Then run this script again with --apply flag');
  
  if (process.argv.includes('--apply')) {
    // After schema is updated, set new positions
    for (const user of users) {
      const newPosition = positionMapping[user.position as string] || 'CMF';
      await prisma.user.update({
        where: { id: user.id },
        data: { position: newPosition as any }
      });
      console.log(`Updated ${user.name}: ${user.position} -> ${newPosition}`);
    }
    console.log('Migration complete!');
  }
}

migratePositions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());