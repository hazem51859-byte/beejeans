const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAuditTables() {
  try {
    console.log('🔍 Checking audit tables...\n');
    
    // Try to count audits
    const auditCount = await prisma.inventoryAudit.count();
    console.log(`✅ inventory_audits table exists - ${auditCount} records`);
    
    // Try to count audit items
    const itemCount = await prisma.inventoryAuditItem.count();
    console.log(`✅ inventory_audit_items table exists - ${itemCount} records`);
    
    console.log('\n✅ All audit tables are present!');
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuditTables();
