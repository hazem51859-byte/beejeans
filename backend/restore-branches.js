const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreBranches() {
  try {
    console.log('🔄 Restoring branches...\n');
    
    const branches = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'المخزن الرئيسي',
        code: 'MAIN',
        url: 'MAIN',
        address: null,
        phone: null,
        city: null,
        isActive: true,
        vaultBalance: 0,
        cardVaultBalance: 0,
        walletBalance: 0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'شبرا 1',
        code: 'SHOBRA1',
        url: 'shobra-1',
        address: null,
        phone: null,
        city: null,
        isActive: true,
        vaultBalance: 0,
        cardVaultBalance: 0,
        walletBalance: 0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'شبرا الكبير',
        code: 'SHOBRA_KABIR',
        url: 'shobra-kabir',
        address: null,
        phone: null,
        city: null,
        isActive: true,
        vaultBalance: 0,
        cardVaultBalance: 0,
        walletBalance: 0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'امبابه الكبير',
        code: 'IMBABA_KABIR',
        url: 'imbaba-kabir',
        address: null,
        phone: null,
        city: null,
        isActive: true,
        vaultBalance: 0,
        cardVaultBalance: 0,
        walletBalance: 0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'شبرا النص',
        code: 'SHOBRA_NOSS',
        url: 'shobra-noss',
        address: null,
        phone: null,
        city: null,
        isActive: true,
        vaultBalance: 0,
        cardVaultBalance: 0,
        walletBalance: 0
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'امبابه الصغير',
        code: 'IMBABA_SAGHIR',
        url: 'imbaba-saghir',
        address: null,
        phone: null,
        city: null,
        isActive: true,
        vaultBalance: 0,
        cardVaultBalance: 0,
        walletBalance: 0
      }
    ];
    
    // Update or create branches
    for (const branch of branches) {
      // Try to find by code (since code is unique)
      const existingByCode = await prisma.branch.findUnique({
        where: { code: branch.code }
      });
      
      if (existingByCode) {
        // Update existing branch
        const updated = await prisma.branch.update({
          where: { code: branch.code },
          data: {
            id: branch.id, // Update ID too
            name: branch.name,
            url: branch.url,
            address: branch.address,
            phone: branch.phone,
            city: branch.city,
            isActive: branch.isActive
          }
        });
        console.log(`✅ Updated branch: ${updated.name} (${updated.code})`);
      } else {
        // Create new branch
        const created = await prisma.branch.create({
          data: branch
        });
        console.log(`✅ Created branch: ${created.name} (${created.code})`);
      }
    }
    
    console.log('\n📊 Final branches list:');
    const allBranches = await prisma.branch.findMany({
      orderBy: { code: 'asc' }
    });
    
    allBranches.forEach(b => {
      console.log(`   - ${b.name} (${b.code})`);
    });
    
    console.log(`\n✅ Successfully restored ${allBranches.length} branches!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreBranches();
