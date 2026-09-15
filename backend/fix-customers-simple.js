const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const customers = [
  { name: 'اسامه السري دمياط', balance: 210140, phone: '01227551982' },
  { name: 'شنوده الفيوم', balance: 57370, phone: '01007120612' },
  { name: 'مكتب باسورد', balance: 4760, phone: null },
  { name: 'مكتب فندي', balance: 9460, phone: null },
  { name: 'علاء بدر', balance: 30680, phone: null },
  { name: 'بوف', balance: 56495, phone: null },
  { name: 'محمد عمر', balance: 30500, phone: null },
  { name: 'ببلاوي', balance: 6920, phone: null },
  { name: 'سامح زرزور', balance: 22440, phone: null },
  { name: 'ام لي لي المنوفيه', balance: 49490, phone: '01006460338' },
  { name: 'هاني لافلي', balance: -165, phone: null }, // هو ليه عندنا
  { name: 'زينب الباهي', balance: 100590, phone: '01146731255' },
  { name: 'احمد التركي العتبه', balance: 17480, phone: null },
  { name: 'احمد يونس بني سويف', balance: 10000, phone: null },
  { name: 'امجد اسيوط', balance: 2705, phone: null },
  { name: 'احمد حسن فيصل', balance: 2730, phone: null },
  { name: 'روماني', balance: 132895, phone: null },
  { name: 'ناصر حكايه', balance: 340, phone: null },
  { name: 'عماد بولاق', balance: 60930, phone: '01223284687' },
  { name: 'علاء صفط اللبن', balance: 14410, phone: null },
  { name: 'عبير اكتوبر', balance: 19890, phone: null },
  { name: 'ام مصطفي المنصوره', balance: 13280, phone: null },
  { name: 'محمد محل انفنتي تبع بلحه', balance: 43825, phone: null },
  { name: 'محلات Bee', balance: 2644210, phone: null },
  { name: 'أم احمد الغرباوي منوف', balance: 600, phone: null },
  { name: 'ام احمد قنا', balance: -240, phone: null }, // هو ليه عندنا
  { name: 'محمد حمدون الزقازيق', balance: 15090, phone: null },
  { name: 'خالد زوينه طنطا', balance: 75445, phone: '01095838981' },
  { name: 'عبده', balance: 850, phone: null },
  { name: 'احلام المنصوره', balance: 75, phone: '01066225006' },
  { name: 'كرليس بني سويف', balance: 9725, phone: '01203316727' },
  { name: 'محمد الزقازيق', balance: 6780, phone: null },
  { name: 'كرليس بني سويف (مخيطات)', balance: 17060, phone: '01203316727' },
  { name: 'ناصر مرعي جراند مول', balance: -240, phone: null }, // هو ليه عندنا
  { name: 'رغده اكتوبر', balance: 3600, phone: null },
  { name: 'احمد مدحت الفيوم', balance: -515, phone: null }, // هو ليه عندنا
  { name: 'عبير اكتوبر 2', balance: 300, phone: null },
  { name: 'عبير اكتوبر 3', balance: 1710, phone: null },
  { name: 'عبير اكتوبر 4', balance: 1710, phone: null },
  { name: 'مينا صبري ملاوي', balance: -840, phone: null }, // هو ليه عندنا
  { name: 'اسامه عبده بنها الكبري', balance: 1060, phone: null },
  { name: 'ابو شروق المنوفيه', balance: -400, phone: null }, // هو ليه عندنا
  { name: 'جرجس نجع حمادي', balance: 26460, phone: null },
  { name: 'ابو شروق المنوفيه 2', balance: 14450, phone: null },
  { name: 'سامح المحله الكبري', balance: 11340, phone: null },
  { name: 'ام يوسف طنطا', balance: -2860, phone: null } // هو ليه عندنا
];

async function fixCustomersSimple() {
  try {
    console.log('🚀 بدء تصحيح أرصدة العملاء...\n');

    const openingDate = new Date('2026-09-01T00:00:00.000Z');
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.log('❌ لم يتم العثور على مستخدم Admin');
      return;
    }

    // حذف العملاء القدامى
    console.log('🗑️  جاري حذف العملاء القدامى...');
    
    const customersToDelete = await prisma.customer.findMany({
      where: {
        notes: { contains: 'رصيد افتتاحي' }
      }
    });

    console.log(`   وجدنا ${customersToDelete.length} عميل للحذف`);

    for (const customer of customersToDelete) {
      await prisma.officeInvoice.deleteMany({
        where: { customerId: customer.id }
      });
      
      await prisma.customerPayment.deleteMany({
        where: { customerId: customer.id }
      });
      
      await prisma.customer.delete({
        where: { id: customer.id }
      });
    }

    console.log('✅ تم حذف العملاء القدامى\n');

    // إضافة العملاء الجدد
    console.log('➕ جاري إضافة العملاء بالطريقة الصحيحة...\n');

    let addedCount = 0;
    let invoicesWeOwe = 0; // احنا لينا عندهم
    let creditsHeOwes = 0; // هم ليهم عندنا (في المحفظة السالبة)

    for (const customerData of customers) {
      // توليد رقم تليفون فريد
      let phoneToUse;
      if (customerData.phone) {
        const existingPhone = await prisma.customer.findFirst({
          where: { phone: customerData.phone }
        });
        
        if (existingPhone) {
          phoneToUse = `${customerData.phone}-${Math.floor(Math.random() * 10000)}`;
        } else {
          phoneToUse = customerData.phone;
        }
      } else {
        phoneToUse = `NO-PHONE-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      }
      
      console.log(`✅ ${customerData.name}`);
      
      // إذا كان الرقم موجب: احنا لينا عنده (عليه فاتورة)
      if (customerData.balance > 0) {
        // إضافة العميل
        const customer = await prisma.customer.create({
          data: {
            name: customerData.name,
            phone: phoneToUse,
            address: '',
            notes: 'رصيد افتتاحي - 1/9/2026',
            isActive: true,
            walletBalance: 0 // لا يوجد رصيد في المحفظة
          }
        });
        
        // إنشاء فاتورة
        const invoiceNumber = `OPEN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        await prisma.officeInvoice.create({
          data: {
            invoiceNumber,
            type: 'CLIENT',
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone || '',
            subtotal: customerData.balance,
            discountAmount: 0,
            total: customerData.balance,
            totalCost: customerData.balance * 0.6,
            profit: customerData.balance * 0.4,
            paymentMethod: 'DEFERRED',
            paidAmount: 0,
            remainingAmount: customerData.balance,
            status: 'PENDING',
            notes: 'رصيد افتتاحي - احنا لينا عنده - 1/9/2026',
            createdBy: adminUser.id,
            createdAt: openingDate,
            updatedAt: openingDate
          }
        });
        
        console.log(`   💰 احنا لينا عنده: ${customerData.balance.toLocaleString()} ج.م`);
        invoicesWeOwe++;
        addedCount++;
        
      } 
      // إذا كان الرقم سالب: هو ليه عندنا (رصيد سالب في المحفظة)
      else if (customerData.balance < 0) {
        const amountOwed = Math.abs(customerData.balance);
        
        // إضافة العميل مع رصيد سالب في المحفظة
        const customer = await prisma.customer.create({
          data: {
            name: customerData.name,
            phone: phoneToUse,
            address: '',
            notes: 'رصيد افتتاحي - هو ليه عندنا (علينا) - 1/9/2026',
            isActive: true,
            walletBalance: -amountOwed // رصيد سالب = احنا مدينين له
          }
        });
        
        console.log(`   💸 هو ليه عندنا (علينا فلوس): ${amountOwed.toLocaleString()} ج.م`);
        creditsHeOwes++;
        addedCount++;
      }
    }

    console.log('\n✅ اكتمل!');
    console.log(`📊 الإحصائيات:`);
    console.log(`   - عملاء مضافين: ${addedCount}`);
    console.log(`   - فواتير (احنا لينا عندهم): ${invoicesWeOwe}`);
    console.log(`   - عملاء (هم ليهم عندنا - علينا): ${creditsHeOwes}`);
    
    // حساب الإجمالي
    const totalWeOwe = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
    const totalHeOwes = customers.reduce((sum, c) => sum + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);
    const netBalance = totalWeOwe - totalHeOwes;
    
    console.log(`\n💰 الملخص المالي:`);
    console.log(`   - احنا لينا عندهم (ديون لنا): ${totalWeOwe.toLocaleString()} ج.م`);
    console.log(`   - هم ليهم عندنا (علينا فلوس): ${totalHeOwes.toLocaleString()} ج.م`);
    console.log(`   - الصافي: ${netBalance.toLocaleString()} ج.م`);

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCustomersSimple();
