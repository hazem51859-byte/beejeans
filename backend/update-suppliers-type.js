const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSuppliersType() {
  console.log('🔄 Updating suppliers to add type field...\n');
  
  try {
    // Get all suppliers without type
    const suppliers = await prisma.supplier.findMany();
    
    console.log(`Found ${suppliers.length} suppliers`);
    
    // Update each supplier with default type
    for (const supplier of suppliers) {
      if (!supplier.type) {
        await prisma.supplier.update({
          where: { id: supplier.id },
          data: { type: 'FABRIC' } // Default to FABRIC
        });
        console.log(`✓ Updated: ${supplier.name} → FABRIC`);
      }
    }
    
    console.log('\n✅ All suppliers updated!');
    console.log('📝 You can now change their types from the Suppliers page:\n');
    console.log('   - FABRIC: موردين القماش');
    console.log('   - MANUFACTURING: موردين التصنيع');
    console.log('   - WASHING: موردين الغسيل\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateSuppliersType();
