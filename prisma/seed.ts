import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a server owner user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const serverOwner = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@battlesync.local',
      passwordHash: hashedPassword,
      role: 'SERVER_OWNER',
      isActive: true,
    },
  });

  console.log('✅ Created server owner:', serverOwner.username);

  // Create a demo gaming group
  const demoGroup = await prisma.gamingGroup.upsert({
    where: { inviteCode: 'DEMO2024' },
    update: {},
    create: {
      name: 'Demo Gaming Group',
      description: 'A demo gaming group for testing BattleSync',
      ownerId: serverOwner.id,
      inviteCode: 'DEMO2024',
      isActive: true,
    },
  });

  console.log('✅ Created demo gaming group:', demoGroup.name);

  // Create a demo campaign
  const demoCampaign = await prisma.campaign.create({
    data: {
      groupId: demoGroup.id,
      name: 'Demo Campaign',
      description: 'A demo campaign for testing BattleSync features',
      narrative: 'The eternal struggle between good and evil continues...',
      status: 'PLANNING',
      settings: {
        pointLimit: 1000,
        underdogBonus: true,
        commandPointsRule: 'standard',
        allowArmyModifications: true,
        experienceMultiplier: 1.0,
        battleRounds: {
          minimum: 4,
          recommended: 6
        }
      },
      createdBy: serverOwner.id,
    },
  });

  console.log('✅ Created demo campaign:', demoCampaign.name);

  console.log('🎉 Database seeding completed!');
  console.log('📝 Server owner credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('   Gaming group invite code: DEMO2024');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });