const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// البيانات من ملف Excel
const productsData = [
  { barcode: "1001", name: "وايد ليج جينز ساده بيسو", quantity: 586, wholesalePrice: 315, costPrice: 276 },
  { barcode: "1002", name: "وايد ليج جينز يوزد بيسو", quantity: 301, wholesalePrice: 315, costPrice: 276 },
  { barcode: "1003", name: "وايد ليج جينز اوسكار ويوزد بيسو", quantity: 122, wholesalePrice: 315, costPrice: 276 },
  { barcode: "1004", name: "وايد ليج جينز مقطع بيسو", quantity: 22, wholesalePrice: 320, costPrice: 276 },
  { barcode: "1005", name: "وايد ليج قصه فالصدر", quantity: 72, wholesalePrice: 335, costPrice: 290 },
  { barcode: "1006", name: "وايد ليج جيب لطش تطريز جينز بيسو", quantity: 120, wholesalePrice: 335, costPrice: 230 },
  { barcode: "1007", name: "وايد ليج شرايح جينز بيسو", quantity: 46, wholesalePrice: 305, costPrice: 210 },
  { barcode: "1009", name: "وايد ليج جينز خاص 6 مقاسات بيسو", quantity: 534, wholesalePrice: 350, costPrice: 300 },
  { barcode: "1010", name: "وايد ليج الوان بيسو", quantity: 728, wholesalePrice: 315, costPrice: 275 },
  { barcode: "1011", name: "وايد ليج جينز محجر بيسو", quantity: 376, wholesalePrice: 315, costPrice: 275 },
  { barcode: "1012", name: "وايد ليج الوان خاص بيسو", quantity: 152, wholesalePrice: 350, costPrice: 301 },
  { barcode: "1013", name: "شارلستون جبردين بيسو", quantity: 150, wholesalePrice: 320, costPrice: 248 },
  { barcode: "1014", name: "شارلستون جبردين خاص بيسو", quantity: 270, wholesalePrice: 335, costPrice: 274 },
  { barcode: "1015", name: "شارلستون 5 بوكت جينز بيسو", quantity: 58, wholesalePrice: 320, costPrice: 250 },
  { barcode: "1016", name: "شارلستون 5 بوكت اوسكار ويوزد بيسو", quantity: 145, wholesalePrice: 320, costPrice: 250 },
  { barcode: "1017", name: "شارلستون 5 بوكت الوان بيسو", quantity: 192, wholesalePrice: 320, costPrice: 250 },
  { barcode: "1018", name: "شارلستون 5 بوكت خاص جينز بيسو", quantity: 546, wholesalePrice: 335, costPrice: 300 },
  { barcode: "1021", name: "بوي فريند خاص جينز بيسو", quantity: 175, wholesalePrice: 335, costPrice: 275 },
  { barcode: "1022", name: "بوي فريند خاص الوان بيسو", quantity: 36, wholesalePrice: 335, costPrice: 275 },
  { barcode: "1023", name: "سلوشي جينز بيسو", quantity: 127, wholesalePrice: 330, costPrice: 277 },
  { barcode: "1024", name: "سلوشي الوان بيسو", quantity: 277, wholesalePrice: 330, costPrice: 277 },
  { barcode: "1025", name: "هاي ويست جبردين بيسو", quantity: 263, wholesalePrice: 235, costPrice: 193 },
  { barcode: "1028", name: "خاص كمر جينز بيسو", quantity: 218, wholesalePrice: 325, costPrice: 265 },
  { barcode: "1031", name: "جاكت قصير جينز مشرشب بيسو", quantity: 71, wholesalePrice: 285, costPrice: 223 },
  { barcode: "1032", name: "جاكت جينز كت بيسو", quantity: 48, wholesalePrice: 335, costPrice: 210 },
  { barcode: "1036", name: "هاي ويست 5 بوكت الوان مقطع بيسو", quantity: 36, wholesalePrice: 290, costPrice: 185 },
  { barcode: "1037", name: "خاص كمر جبردين الوان بيسو", quantity: 54, wholesalePrice: 325, costPrice: 260 },
  { barcode: "1038", name: "وايد ليج دبل ليج جينز بيسو", quantity: 748, wholesalePrice: 350, costPrice: 303 },
  { barcode: "1039", name: "وايد ليج مقلوب جينز بيسو", quantity: 54, wholesalePrice: 335, costPrice: 285 },
  { barcode: "1040", name: "وايد ليج اطفالي جينز يوزد", quantity: 36, wholesalePrice: 280, costPrice: 230 },
  { barcode: "1041", name: "وايد ليج اطفالي جينز جيب لطش", quantity: 55, wholesalePrice: 280, costPrice: 230 },
  { barcode: "1042", name: "وايد ليج محير 26:36", quantity: 51, wholesalePrice: 300, costPrice: 253 },
  { barcode: "1043", name: "وايد ليج اطفالي مقلوب 8:18", quantity: 294, wholesalePrice: 295, costPrice: 230 },
  { barcode: "1051", name: "جيبه صك", quantity: 56, wholesalePrice: 300, costPrice: 235 },
  { barcode: "1052", name: "جيبه زراير", quantity: 60, wholesalePrice: 300, costPrice: 239 },
  { barcode: "1053", name: "جيبه كلوش", quantity: 2, wholesalePrice: 370, costPrice: 320 },
  { barcode: "1054", name: "بنطلون كلاسيك جيلان", quantity: 110, wholesalePrice: 265, costPrice: 200 },
  { barcode: "1055", name: "اسكيني عرض المحلات", quantity: 120, wholesalePrice: 220, costPrice: 220 },
  { barcode: "1056", name: "وايد ليج اطفالي", quantity: 2, wholesalePrice: 270, costPrice: 207 },
  { barcode: "1061", name: "سوت جينز", quantity: 15, wholesalePrice: 550, costPrice: 458 },
  { barcode: "1062", name: "سوت جبردين", quantity: 19, wholesalePrice: 650, costPrice: 518 },
  { barcode: "1100", name: "بنطلون ميلتون ساده", quantity: 23, wholesalePrice: 265, costPrice: 200 },
  { barcode: "1101", name: "بنطلون ميلتون مطبوع", quantity: 16, wholesalePrice: 265, costPrice: 206 },
  { barcode: "1102", name: "بنطلون وايد ليج انترلوك ساده", quantity: 10, wholesalePrice: 425, costPrice: 413 },
  { barcode: "1103", name: "بنطلون وايد ليج انترلوك مطبوع", quantity: 18, wholesalePrice: 450, costPrice: 388 },
  { barcode: "1104", name: "بنطلون وايد ليج ميلتون فوطه", quantity: 4, wholesalePrice: 400, costPrice: 356 },
  { barcode: "1105", name: "سويتشرت", quantity: 11, wholesalePrice: 275, costPrice: 60 },
  { barcode: "1107", name: "كاش مايوه", quantity: 18, wholesalePrice: 350, costPrice: 192 },
  { barcode: "1108", name: "سوت 2 قطعه ناعم", quantity: 18, wholesalePrice: 450, costPrice: 342 },
  { barcode: "1109", name: "جيبه جينز", quantity: 27, wholesalePrice: 450, costPrice: 400 },
  { barcode: "1111", name: "شميز طويل", quantity: 23, wholesalePrice: 340, costPrice: 276 },
  { barcode: "1112", name: "كارديجان", quantity: 9, wholesalePrice: 420, costPrice: 356 },
  { barcode: "1117", name: "شميز طويل فريسكا", quantity: 14, wholesalePrice: 225, costPrice: 140 },
  { barcode: "1119", name: "كارديجان ركامه", quantity: 48, wholesalePrice: 460, costPrice: 384 },
  { barcode: "1120", name: "شميز فريسكا قصير", quantity: 28, wholesalePrice: 200, costPrice: 125 },
  { barcode: "1121", name: "شميز جلاكسي قصير", quantity: 24, wholesalePrice: 250, costPrice: 175 },
  { barcode: "1122", name: "كارديجان", quantity: 42, wholesalePrice: 350, costPrice: 195 },
  { barcode: "1123", name: "كارديجان جلاكسي", quantity: 40, wholesalePrice: 400, costPrice: 250 },
  { barcode: "1125", name: "شميزات", quantity: 88, wholesalePrice: 300, costPrice: 155 },
  { barcode: "1126", name: "وايد ليج جيب لاطش جبردين", quantity: 62, wholesalePrice: 350, costPrice: 300 },
  { barcode: "1130", name: "شميز مقلم مقلوب", quantity: 5, wholesalePrice: 300, costPrice: 155 },
  { barcode: "1132", name: "شميز ستان طويل", quantity: 5, wholesalePrice: 225, costPrice: 147 },
  { barcode: "1133", name: "كارديجان ستان", quantity: 39, wholesalePrice: 275, costPrice: 227 },
  { barcode: "1135", name: "شميز ستان مشجر طويل", quantity: 3, wholesalePrice: 260, costPrice: 209 },
  { barcode: "1136", name: "كارديجان ستان مشجر", quantity: 6, wholesalePrice: 350, costPrice: 289 },
  { barcode: "1137", name: "شميز مشجر قصير", quantity: 4, wholesalePrice: 225, costPrice: 131 },
  { barcode: "1138", name: "شميز مشجر طويل", quantity: 13, wholesalePrice: 225, costPrice: 151 },
  { barcode: "1139", name: "كارديجان مشجر", quantity: 8, wholesalePrice: 275, costPrice: 231 },
  { barcode: "1140", name: "شميز باندا قصير", quantity: 1, wholesalePrice: 260, costPrice: 193 },
  { barcode: "1141", name: "شميز باندا طويل", quantity: 6, wholesalePrice: 260, costPrice: 213 },
  { barcode: "1142", name: "كارديجان باندا", quantity: 48, wholesalePrice: 350, costPrice: 293 }
];

async function completeSystemReset() {
  try {
    console.log('🔥 بدء عملية تصفير النظام الكامل...\n');

    // 1. حذف جميع البيانات المرتبطة
    console.log('1️⃣ حذف الفواتير والتوريدات...');
    
    await prisma.saleItem.deleteMany({});
    await prisma.sale.deleteMany({});
    console.log('   ✅ تم حذف المبيعات');
    
    // حذف مرتجعات المكتب أولاً
    await prisma.$executeRaw`DELETE FROM "office_returns"`;
    await prisma.officeInvoiceItem.deleteMany({});
    await prisma.officeInvoice.deleteMany({});
    console.log('   ✅ تم حذف فواتير المكتب');
    
    await prisma.transferItem.deleteMany({});
    await prisma.transfer.deleteMany({});
    console.log('   ✅ تم حذف التوريدات');
    
    await prisma.purchaseItem.deleteMany({});
    await prisma.purchase.deleteMany({});
    console.log('   ✅ تم حذف المشتريات');
    
    await prisma.shipment.deleteMany({});
    console.log('   ✅ تم حذف الشحنات');
    
    await prisma.returnItem.deleteMany({});
    await prisma.$executeRaw`DELETE FROM "returns"`;
    console.log('   ✅ تم حذف المرتجعات');
    
    await prisma.expense.deleteMany({});
    console.log('   ✅ تم حذف المصروفات\n');

    // 2. تصفير أرصدة العملاء
    console.log('2️⃣ تصفير أرصدة العملاء...');
    await prisma.customerPayment.deleteMany({});
    // العملاء مفيش عندهم حقول balance - بس هنحذف الدفعات
    console.log('   ✅ تم تصفير أرصدة العملاء\n');

    // 3. تصفير أرصدة الموردين
    console.log('3️⃣ تصفير أرصدة الموردين...');
    await prisma.supplier.updateMany({
      data: {
        balance: 0
      }
    });
    console.log('   ✅ تم تصفير أرصدة الموردين\n');

    // 4. تصفير حسابات الشركاء
    console.log('4️⃣ تصفير حسابات الشركاء...');
    await prisma.partnerTransaction.deleteMany({});
    console.log('   ✅ تم تصفير معاملات الشركاء\n');

    // 5. تصفير الخزائن
    console.log('5️⃣ تصفير الخزائن...');
    await prisma.vaultTransaction.deleteMany({});
    await prisma.vault.updateMany({
      data: { balance: 0 }
    });
    console.log('   ✅ تم تصفير الخزائن\n');

    // 6. تصفير المخزون
    console.log('6️⃣ تصفير المخزون...');
    await prisma.inventory.updateMany({
      data: { quantity: 0 }
    });
    console.log('   ✅ تم تصفير المخزون\n');

    // 7. حذف الجرود
    console.log('7️⃣ حذف الجرود...');
    await prisma.inventoryAuditItem.deleteMany({});
    await prisma.inventoryAudit.deleteMany({});
    console.log('   ✅ تم حذف الجرود\n');

    // 8. حذف أوامر الإنتاج والغسيل
    console.log('8️⃣ حذف أوامر الإنتاج...');
    await prisma.washingOrder.deleteMany({});
    await prisma.manufacturingOrder.deleteMany({});
    console.log('   ✅ تم حذف أوامر الإنتاج\n');

    // 9. التأكد من وجود فرع أو إنشاء واحد
    console.log('9️⃣ التأكد من وجود فرع رئيسي...');
    let mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainBranch) {
      // إنشاء الفرع الرئيسي
      mainBranch = await prisma.branch.create({
        data: {
          name: 'المخزن الرئيسي',
          code: 'MAIN',
          url: 'main-warehouse',
          isActive: true
        }
      });
      console.log('   ✅ تم إنشاء المخزن الرئيسي');
    }

    console.log(`   📍 استخدام الفرع: ${mainBranch.name}\n`);

    // 10. إضافة البضاعة من Excel
    console.log('🔟 إضافة البضاعة من ملف Excel...');

    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const item of productsData) {
      try {
        // البحث عن المنتج بالباركود
        let product = await prisma.product.findUnique({
          where: { barcode: item.barcode }
        });

        if (!product) {
          // إنشاء المنتج إذا لم يكن موجود
          product = await prisma.product.create({
            data: {
              barcode: item.barcode,
              sku: item.barcode, // نستخدم الباركود كـ SKU
              name: item.name,
              sellingPrice: item.wholesalePrice, // سعر البيع
              costPrice: item.costPrice,
              retailPrice: item.wholesalePrice, // سعر القطاعي = سعر الجملة افتراضياً
              status: 'ACTIVE',
              reorderLevel: 5
            }
          });
          addedCount++;
        } else {
          // تحديث الأسعار إذا كان المنتج موجود
          await prisma.product.update({
            where: { id: product.id },
            data: {
              name: item.name,
              sellingPrice: item.wholesalePrice,
              costPrice: item.costPrice,
              retailPrice: item.wholesalePrice
            }
          });
          updatedCount++;
        }

        // إضافة/تحديث المخزون
        const existingInventory = await prisma.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: product.id,
              branchId: mainBranch.id
            }
          }
        });

        if (existingInventory) {
          await prisma.inventory.update({
            where: { id: existingInventory.id },
            data: { quantity: item.quantity }
          });
        } else {
          await prisma.inventory.create({
            data: {
              productId: product.id,
              branchId: mainBranch.id,
              quantity: item.quantity
            }
          });
        }

      } catch (error) {
        console.error(`   ❌ خطأ في المنتج ${item.barcode}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`   ✅ تم إضافة ${addedCount} منتج جديد`);
    console.log(`   ✅ تم تحديث ${updatedCount} منتج موجود`);
    if (errorCount > 0) {
      console.log(`   ⚠️  فشل ${errorCount} منتج`);
    }

    // 11. إحصائيات نهائية
    console.log('\n📊 الإحصائيات النهائية:');
    
    const totalProducts = await prisma.product.count();
    const totalInventory = await prisma.inventory.aggregate({
      _sum: { quantity: true }
    });
    const totalValue = await prisma.$queryRaw`
      SELECT SUM(i.quantity * p."costPrice") as total
      FROM "inventory" i
      JOIN "products" p ON i."productId" = p.id
    `;

    console.log(`   📦 عدد المنتجات: ${totalProducts}`);
    console.log(`   📦 إجمالي الكميات: ${totalInventory._sum.quantity || 0} قطعة`);
    console.log(`   💰 قيمة المخزون: ${(totalValue[0]?.total || 0).toFixed(2)} ج.م`);

    console.log('\n🎉 تم تصفير النظام بالكامل وإضافة البضاعة بنجاح!');

  } catch (error) {
    console.error('\n❌ حدث خطأ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تأكيد من المستخدم
console.log('⚠️  تحذير: سيتم حذف جميع البيانات من النظام!');
console.log('⚠️  هذا الإجراء لا يمكن التراجع عنه!\n');

completeSystemReset();
