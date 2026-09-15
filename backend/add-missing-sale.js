/**
 * إضافة الـ Sale المفقودة إلى Railway
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function addSale() {
  try {
    console.log('📥 إضافة Sale إلى Railway...\n');
    
    // قراءة ملف الـ export
    const filepath = path.join(__dirname, 'backup', 'full-database-export-2026-07-27T17-46-19-509Z.json');
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    if (!data.sales || data.sales.length === 0) {
      console.log('❌ لا يوجد sales في الملف');
      return;
    }
    
    const sale = data.sales[0];
    const { items, shiftId, id, ...saleData } = sale;
    
    // إزالة saleId من الـ items
    const cleanItems = items.map(({ saleId, id: itemId, ...item }) => item);
    
    console.log('📝 إنشاء Sale...');
    console.log(`   Invoice: ${sale.invoiceNumber}`);
    console.log(`   Total: ${sale.total}`);
    console.log(`   Items: ${items.length}`);
    
    // إنشاء Sale بدون shiftId و id
    await prisma.sale.create({
      data: {
        ...saleData,
        shiftId: null,
        items: {
          create: cleanItems
        }
      }
    });
    
    console.log('\n✅ تم إضافة Sale بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addSale()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
