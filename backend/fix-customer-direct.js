const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:jYrfaMNJbJuExJHgePjMhjkfeDoqYUFd@tokaido.proxy.rlwy.net:29985/railway',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    console.log('الاتصال بـ Railway...');
    await client.connect();
    console.log('✅ تم الاتصال');

    // Get customer
    const customerRes = await client.query(`
      SELECT id, name, balance FROM "Customer" WHERE name LIKE '%حازم%'
    `);

    if (customerRes.rows.length === 0) {
      console.log('❌ العميل غير موجود');
      return;
    }

    const customer = customerRes.rows[0];
    console.log(`\n📋 العميل: ${customer.name}`);
    console.log(`💰 الرصيد الحالي: ${customer.balance}`);

    // Get invoices
    const invoicesRes = await client.query(`
      SELECT id, "invoiceNumber", "totalAmount", status
      FROM "OfficeInvoice"
      WHERE "customerId" = $1
      ORDER BY "createdAt" DESC
    `, [customer.id]);

    console.log(`\n📄 عدد الفواتير: ${invoicesRes.rows.length}`);

    let correctBalance = 0;
    const updates = [];

    for (const inv of invoicesRes.rows) {
      // Get payments for this invoice
      const paymentsRes = await client.query(`
        SELECT SUM(amount) as total
        FROM "Payment"
        WHERE "officeInvoiceId" = $1
      `, [inv.id]);

      const paid = parseFloat(paymentsRes.rows[0].total || 0);
      const remaining = inv.totalAmount - paid;

      console.log(`\nفاتورة ${inv.invoiceNumber}:`);
      console.log(`  المبلغ: ${inv.totalAmount}`);
      console.log(`  المدفوع: ${paid}`);
      console.log(`  المتبقي: ${remaining}`);
      console.log(`  الحالة: ${inv.status}`);

      // Update status if paid but marked pending
      if (remaining <= 0 && inv.status === 'pending') {
        await client.query(`
          UPDATE "OfficeInvoice"
          SET status = 'paid'
          WHERE id = $1
        `, [inv.id]);
        console.log(`  ✅ تم تحديث الحالة إلى "مدفوع"`);
      }

      correctBalance += remaining;
    }

    console.log(`\n💰 الرصيد الصحيح: ${correctBalance}`);

    // Update customer balance
    await client.query(`
      UPDATE "Customer"
      SET balance = $1
      WHERE id = $2
    `, [correctBalance, customer.id]);

    console.log('✅ تم تحديث رصيد العميل بنجاح!');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await client.end();
  }
}

fix();
