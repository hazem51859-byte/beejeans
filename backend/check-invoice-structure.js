const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvoiceStructure() {
  try {
    console.log('🔍 Checking Office Invoice Structure...\n');

    // Get one recent invoice with all details
    const invoice = await prisma.officeInvoice.findFirst({
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!invoice) {
      console.log('❌ No invoices found!');
      return;
    }

    console.log('📋 Sample Invoice:\n');
    console.log('Invoice Data:', JSON.stringify({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customer?.name,
      total: invoice.total, // الحقل الصحيح
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      profit: invoice.profit,
      totalCost: invoice.totalCost,
      paymentMethod: invoice.paymentMethod,
      status: invoice.status,
      vaultId: invoice.vaultId,
      paidAmount: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
      createdAt: invoice.createdAt,
      itemsCount: invoice.items?.length || 0
    }, null, 2));

    console.log('\n📦 Invoice Items:');
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, idx) => {
        console.log(`\n  Item ${idx + 1}:`);
        console.log(`    Product: ${item.product?.name || 'N/A'}`);
        console.log(`    Quantity: ${item.quantity || 0}`);
        console.log(`    Unit Price: ${item.unitPrice || 0} ج.م`);
        console.log(`    Total: ${item.total || 0} ج.م`);
      });
    } else {
      console.log('  No items found!');
    }

    // Check table structure
    console.log('\n\n🏗️  Checking OfficeInvoice table structure...\n');
    
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'OfficeInvoice'
      ORDER BY ordinal_position;
    `;

    console.log('Table Columns:');
    result.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoiceStructure();
