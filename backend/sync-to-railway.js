const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Local database
const prismaLocal = new PrismaClient({
  datasourceUrl: "postgresql://postgres:Zoma.54559@localhost:5432/bee_jeans_pos?schema=public"
});

// Railway database
const prismaRailway = new PrismaClient({
  datasourceUrl: "postgresql://postgres:jYrfaMNJbJuExJHgePjMhjkfeDoqYUFd@tokaido.proxy.rlwy.net:29985/railway"
});

async function syncToRailway() {
  try {
    console.log('\n🚀 بدء مزامنة البيانات من Local إلى Railway...\n');

    // 1. حذف كل البيانات من Railway (ما عدا الجداول الأساسية)
    console.log('🗑️  حذف البيانات القديمة من Railway...');
    
    await prismaRailway.activityLog.deleteMany({});
    await prismaRailway.productSerial.deleteMany({});
    await prismaRailway.moneyTransfer.deleteMany({});
    await prismaRailway.partnerTransaction.deleteMany({});
    await prismaRailway.partner.deleteMany({});
    await prismaRailway.vaultTransaction.deleteMany({});
    await prismaRailway.returnItem.deleteMany({});
    await prismaRailway.return.deleteMany({});
    await prismaRailway.expense.deleteMany({});
    await prismaRailway.transferItem.deleteMany({});
    await prismaRailway.transfer.deleteMany({});
    await prismaRailway.washingOrder.deleteMany({});
    await prismaRailway.manufacturingOrder.deleteMany({});
    await prismaRailway.fabricStock.deleteMany({});
    await prismaRailway.fabricPurchase.deleteMany({});
    await prismaRailway.fabricType.deleteMany({});
    await prismaRailway.supplierPayment.deleteMany({});
    await prismaRailway.supplier.deleteMany({});
    await prismaRailway.customerPayment.deleteMany({});
    await prismaRailway.customer.deleteMany({});
    await prismaRailway.saleItem.deleteMany({});
    await prismaRailway.sale.deleteMany({});
    await prismaRailway.shift.deleteMany({});
    await prismaRailway.inventory.deleteMany({});
    await prismaRailway.product.deleteMany({});
    await prismaRailway.category.deleteMany({});
    
    console.log('✅ تم حذف البيانات القديمة\n');

    // 2. نسخ البيانات من Local
    console.log('📦 نسخ البيانات من Local...\n');

    // Categories
    const categories = await prismaLocal.category.findMany();
    for (const cat of categories) {
      await prismaRailway.category.create({ data: cat });
    }
    console.log(`✅ Categories: ${categories.length}`);

    // Products
    const products = await prismaLocal.product.findMany();
    for (const prod of products) {
      await prismaRailway.product.create({ data: prod });
    }
    console.log(`✅ Products: ${products.length}`);

    // Inventory
    const inventory = await prismaLocal.inventory.findMany();
    for (const inv of inventory) {
      await prismaRailway.inventory.create({ data: inv });
    }
    console.log(`✅ Inventory: ${inventory.length}`);

    // Shifts
    const shifts = await prismaLocal.shift.findMany();
    for (const shift of shifts) {
      await prismaRailway.shift.create({ data: shift });
    }
    console.log(`✅ Shifts: ${shifts.length}`);

    // Sales
    const sales = await prismaLocal.sale.findMany();
    for (const sale of sales) {
      await prismaRailway.sale.create({ data: sale });
    }
    console.log(`✅ Sales: ${sales.length}`);

    // Sale Items
    const saleItems = await prismaLocal.saleItem.findMany();
    for (const item of saleItems) {
      await prismaRailway.saleItem.create({ data: item });
    }
    console.log(`✅ Sale Items: ${saleItems.length}`);

    // Customers
    const customers = await prismaLocal.customer.findMany();
    for (const cust of customers) {
      await prismaRailway.customer.create({ data: cust });
    }
    console.log(`✅ Customers: ${customers.length}`);

    // Customer Payments
    const custPayments = await prismaLocal.customerPayment.findMany();
    for (const pay of custPayments) {
      await prismaRailway.customerPayment.create({ data: pay });
    }
    console.log(`✅ Customer Payments: ${custPayments.length}`);

    // Suppliers
    const suppliers = await prismaLocal.supplier.findMany();
    for (const sup of suppliers) {
      await prismaRailway.supplier.create({ data: sup });
    }
    console.log(`✅ Suppliers: ${suppliers.length}`);

    // Supplier Payments
    const supPayments = await prismaLocal.supplierPayment.findMany();
    for (const pay of supPayments) {
      await prismaRailway.supplierPayment.create({ data: pay });
    }
    console.log(`✅ Supplier Payments: ${supPayments.length}`);

    // Fabric Types
    const fabricTypes = await prismaLocal.fabricType.findMany();
    for (const fab of fabricTypes) {
      await prismaRailway.fabricType.create({ data: fab });
    }
    console.log(`✅ Fabric Types: ${fabricTypes.length}`);

    // Fabric Purchases
    const fabricPurchases = await prismaLocal.fabricPurchase.findMany();
    for (const pur of fabricPurchases) {
      await prismaRailway.fabricPurchase.create({ data: pur });
    }
    console.log(`✅ Fabric Purchases: ${fabricPurchases.length}`);

    // Fabric Stock
    const fabricStock = await prismaLocal.fabricStock.findMany();
    for (const stock of fabricStock) {
      await prismaRailway.fabricStock.create({ data: stock });
    }
    console.log(`✅ Fabric Stock: ${fabricStock.length}`);

    // Manufacturing Orders
    const manufOrders = await prismaLocal.manufacturingOrder.findMany();
    for (const order of manufOrders) {
      await prismaRailway.manufacturingOrder.create({ data: order });
    }
    console.log(`✅ Manufacturing Orders: ${manufOrders.length}`);

    // Washing Orders
    const washOrders = await prismaLocal.washingOrder.findMany();
    for (const order of washOrders) {
      await prismaRailway.washingOrder.create({ data: order });
    }
    console.log(`✅ Washing Orders: ${washOrders.length}`);

    // Transfers
    const transfers = await prismaLocal.transfer.findMany();
    for (const trans of transfers) {
      await prismaRailway.transfer.create({ data: trans });
    }
    console.log(`✅ Transfers: ${transfers.length}`);

    // Transfer Items
    const transferItems = await prismaLocal.transferItem.findMany();
    for (const item of transferItems) {
      await prismaRailway.transferItem.create({ data: item });
    }
    console.log(`✅ Transfer Items: ${transferItems.length}`);

    // Product Serials
    const serials = await prismaLocal.productSerial.findMany();
    console.log(`📦 نسخ ${serials.length} Serial Numbers...`);
    for (const serial of serials) {
      await prismaRailway.productSerial.create({ data: serial });
    }
    console.log(`✅ Product Serials: ${serials.length}`);

    console.log('\n✅ تمت المزامنة بنجاح! 🎉\n');

  } catch (error) {
    console.error('❌ خطأ في المزامنة:', error);
  } finally {
    await prismaLocal.$disconnect();
    await prismaRailway.$disconnect();
  }
}

syncToRailway();
