import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const players = [
  { name: '一只', shortId: 'yz01' },
  { name: '一忱', shortId: 'yc01' },
  { name: '冷俊源', shortId: 'xl01' },
  { name: '刘正信', shortId: 'zx01' },
  { name: '刘畅', shortId: 'lc02' },
  { name: '卜文军', shortId: 'xb01' },
  { name: '叶飞', shortId: 'yf01' },
  { name: '大赵', shortId: 'dz01' },
  { name: '天籁', shortId: 'tl01' },
  { name: '姜天', shortId: 'jt01' },
  { name: '孔子箭', shortId: 'kz01' },
  { name: '孙叔', shortId: 'ss01' },
  { name: '小乐', shortId: 'xl02' },
  { name: '小冯', shortId: 'xf01' },
  { name: '小王', shortId: 'xw01' },
  { name: '小罗', shortId: 'xl03' },
  { name: '小范', shortId: 'xf02' },
  { name: '尼基塔', shortId: 'nj01' },
  { name: '巴蒂', shortId: 'bd01' },
  { name: '张阔', shortId: 'zk01' },
  { name: '徐永健', shortId: 'xy01' },
  { name: '得瑞克', shortId: 'dr01' },
  { name: '成龙', shortId: 'cl01' },
  { name: '戴鑫', shortId: 'dx01' },
  { name: '捉五魁', shortId: 'wk01' },
  { name: '文刀刘', shortId: 'dg01' },
  { name: '斌哥', shortId: 'bg01' },
  { name: '方一心', shortId: 'lf01' },
  { name: '朱晨㶟', shortId: 'xz03' },
  { name: '李东辉', shortId: 'dh01' },
  { name: '李曦', shortId: 'lx01' },
  { name: '李柏龙', shortId: 'bl01' },
  { name: '李满', shortId: 'lm01' },
  { name: '李玉衡', shortId: 'yh01' },
  { name: '李超', shortId: 'lc01' },
  { name: '林达', shortId: 'ld01' },
  { name: '段龙龙', shortId: 'dl01' },
  { name: '沈黎', shortId: 'sl01' },
  { name: '渠成', shortId: 'qc01' },
  { name: '狗哥', shortId: 'gg01' },
  { name: '王拓', shortId: 'wt02' },
  { name: '王柯', shortId: 'wk02' },
  { name: '王涛', shortId: 'wt01' },
  { name: '王若锡', shortId: 'wr01' },
  { name: '王鑫', shortId: 'wx01' },
  { name: '石宗林', shortId: 'sz01' },
  { name: '老狼', shortId: 'll01' },
  { name: '肖波', shortId: 'xb02' },
  { name: '胖孙', shortId: 'ps01' },
  { name: '董伟', shortId: 'dw01' },
  { name: '董珵珵', shortId: 'dc01' },
  { name: '袁帅', shortId: 'ys01' },
  { name: '贾庆华', shortId: 'xj01' },
  { name: '赵汉卿', shortId: 'xz01' },
  { name: '陶叔', shortId: 'ts01' },
  { name: '陶鑫羽', shortId: 'xt01' },
  { name: '马若飞', shortId: 'xm01' },
  { name: '试训丙', shortId: 'sx03' },
  { name: '试训乙', shortId: 'sx02' },
  { name: '试训丁', shortId: 'sx04' },
  { name: '试训戊', shortId: 'SX05' }, // Keeping original casing from input
  { name: '试训庚', shortId: 'sx06' },
  { name: '试训甲', shortId: 'sx01' },
  { name: '试训己', shortId: 'sx07' },
];

async function main() {
  console.log('Starting player import process...');

  // 1. Delete all matches (and cascading data)
  console.log('Deleting all existing matches...');
  try {
    await prisma.match.deleteMany({});
    console.log('All matches deleted successfully.');
  } catch (error) {
    console.error('Error deleting matches:', error);
    process.exit(1);
  }

  // 2. Insert players
  console.log('Inserting/Checking players...');
  let createdCount = 0;
  let skippedCount = 0;

  for (const player of players) {
    try {
      // Check if player with this shortId exists
      const existingPlayer = await prisma.user.findUnique({
        where: { shortId: player.shortId },
      });

      if (existingPlayer) {
        // console.log(`Skipping existing player: ${player.name} (${player.shortId})`);
        skippedCount++;
        continue;
      }

      // Create new player
      await prisma.user.create({
        data: {
          name: player.name,
          shortId: player.shortId,
          userType: 'PLAYER',
          accountStatus: 'GHOST', // Default for imported players
        },
      });
      // console.log(`Created player: ${player.name} (${player.shortId})`);
      createdCount++;
    } catch (error) {
      console.error(`Error processing player ${player.name} (${player.shortId}):`, error);
    }
  }

  console.log('Player import completed.');
  console.log(`Created: ${createdCount}`);
  console.log(`Skipped (Already Existed): ${skippedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
