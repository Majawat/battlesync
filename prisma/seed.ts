import { PrismaClient } from '@prisma/client';
import { armyService } from '../src/services/armyService';
import { HealthService } from '../src/services/healthService';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  HealthService.setSeedingStatus('in_progress');

  // Create a server owner user (using same hashing as CryptoUtils)
  const hashedPassword = Buffer.from('admin123' + 'salt').toString('base64');
  
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

  // Create a demo campaign (check if it already exists first)
  const existingCampaign = await prisma.campaign.findFirst({
    where: {
      groupId: demoGroup.id,
      name: 'Demo Campaign',
    },
  });

  let demoCampaign;
  if (existingCampaign) {
    demoCampaign = existingCampaign;
    console.log('✅ Demo campaign already exists:', demoCampaign.name);
  } else {
    demoCampaign = await prisma.campaign.create({
      data: {
        groupId: demoGroup.id,
        name: 'Demo Campaign',
        description: 'A demo campaign for testing BattleSync features',
        narrative: 'The eternal struggle between good and evil continues...',
        status: 'PLANNING',
        settings: {
          pointsLimit: 1000,
          gameSystem: 'grimdark-future',
          experiencePerWin: 10,
          experiencePerLoss: 5,
          experiencePerKill: 1,
          allowMultipleArmies: false,
          requireArmyForgeIntegration: true,
          customRules: []
        },
        createdBy: serverOwner.id,
      },
    });
    console.log('✅ Created demo campaign:', demoCampaign.name);
  }

  // Add the admin user as a member of the demo group
  const groupMembership = await prisma.groupMembership.upsert({
    where: {
      userId_groupId: {
        userId: serverOwner.id,
        groupId: demoGroup.id,
      },
    },
    update: {},
    create: {
      userId: serverOwner.id,
      groupId: demoGroup.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });

  console.log('✅ Added admin to demo group:', groupMembership.userId);

  // Add the admin user as a participant in the demo campaign
  const campaignParticipation = await prisma.campaignParticipation.upsert({
    where: {
      groupMembershipId_campaignId: {
        groupMembershipId: groupMembership.id,
        campaignId: demoCampaign.id,
      },
    },
    update: {},
    create: {
      groupMembershipId: groupMembership.id,
      campaignId: demoCampaign.id,
      campaignRole: 'CREATOR',
      joinedCampaignAt: new Date(),
    },
  });

  console.log('✅ Added admin to demo campaign:', campaignParticipation.groupMembershipId);

  // Create a demo mission (check if it already exists first)
  const existingMission = await prisma.mission.findFirst({
    where: {
      campaignId: demoCampaign.id,
      number: 1,
    },
  });

  let demoMission;
  if (existingMission) {
    demoMission = existingMission;
    console.log('✅ Demo mission already exists:', demoMission.title);
  } else {
    demoMission = await prisma.mission.create({
      data: {
        campaignId: demoCampaign.id,
        number: 1,
        title: 'Demo Mission',
        description: 'A demo mission for testing battle functionality',
        points: 1000,
        status: 'ACTIVE',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        objectives: [
          'Control the center objective',
          'Eliminate enemy commander',
          'Secure the supply depot'
        ],
        specialRules: [
          'Night Fighting: All ranged attacks have -1 to hit',
          'Reinforcements: Units may deploy from turn 2'
        ],
        terrainSuggestions: [
          'Hill in center (provides cover)',
          'Forest on left flank (blocks line of sight)',
          'Ruins on right flank (provides cover)'
        ],
      },
    });
    console.log('✅ Created demo mission:', demoMission.title);
  }

  // Import test army from ArmyForge (check if already exists first)
  const existingArmy = await prisma.army.findFirst({
    where: {
      userId: serverOwner.id,
      armyForgeId: 'IJ1JM_m-jmka',
    },
  });

  if (existingArmy) {
    console.log('✅ Test army already exists:', existingArmy.name);
  } else {
    try {
      const armyImportResult = await armyService.importArmyFromArmyForge(serverOwner.id, {
        armyForgeId: 'IJ1JM_m-jmka',
        campaignId: demoCampaign.id,
        customName: 'Demo Test Army'
      });

      console.log('✅ Imported test army:', armyImportResult.army.name);
      
      if (armyImportResult.warnings.length > 0) {
        console.log('⚠️  Army import warnings:', armyImportResult.warnings);
      }
      
      if (armyImportResult.errors.length > 0) {
        console.log('❌ Army import errors:', armyImportResult.errors);
      }
    } catch (error) {
      console.log('⚠️  Could not import test army from ArmyForge:', error instanceof Error ? error.message : 'Unknown error');
      console.log('   This is not critical for seeding, continuing...');
    }
  }

  console.log('🎉 Database seeding completed!');
  console.log('📝 Server owner credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('   Gaming group invite code: DEMO2024');
  
  HealthService.setSeedingStatus('complete');
  
  // Force exit to prevent hanging due to army service connections
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    HealthService.setSeedingStatus('failed');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });