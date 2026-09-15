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
  { name: 'هاني لافلي', balance: -165, phone: null },
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
  { name: 'ام احمد قنا', balance: -240, phone: null },
  { name: 'محمد حمدون الزقازيق', balance: 15090, phone: null },
  { name: 'خالد زوينه طنطا', balance: 75445, phone: '01095838981' },
  { name: 'عبده', balance: 850, phone: null },
  { name: 'احلام المنصوره', balance: 75, phone: '01066225006' },
  { name: 'كرليس بني سويف', balance: 9725, phone: '01203316727' },
  { name: 'محمد الزقازيق', balance: 6780, phone: null },
  { name: 'كرليس بني سويف (مخيطات)', balance: 17060, phone: '01203316727' },
  { name: 'ناصر مرعي جراند مول', balance: -240, phone: null },
  { name: 'رغده اكتوبر', balance: 3600, phone: null },
  { name: 'احمد مدحت الفيوم', balance: -515, phone: null },
  { name: 'عبير اكتوبر 2', balance: 300, phone: null },
  { name: 'عبير اكتوبر 3', balance: 1710, phone: null },
  { name: 'عبير اكتوبر 4', balance: 1710, phone: null },
  { name: 'مينا صبري ملاوي', balance: -840, phone: null },
  { name: 'اسامه عبده بنها الكبري', balance: 1060, phone: null },
  { name: 'ابو شروق المنوفيه', balance: -400, phone: null },
  { name: 'جرجس نجع حمادي', balance: 26460, phone: null },
  { name: 'ابو شروق المنوفيه 2', balance: 14450, phone: null },
  { name: 'سامح المحله الكبري', balance: 11340, phone: null },
  { name: 'ام يوسف طنطا', balance: -2860, phone: null }
];

async function addCustomersWithOpeningBalances() {
  try {
    console.log('🚀 بدء إضافة العملاء والأرصدة الافتتاحية...\n');

    const openingDate = new Date('2026-09-01T00:00:00.000Z');
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.log('❌ لم يتم العثور على مستخدم Admin');
      return;
    }

    let addedCount = 0;
    let skippedCount = 0;
    let invoicesCount = 0;

    for (const customerData of customers) {
      // التحقق من وجود العميل
      const existingCustomer = await prisma.customer.findFirst({
        where: { 
          name: customerData.name,
          isActive: true
        }
      });

      let customer;
      
      if (existingCustomer) {
        console.log(`⚠️  العميل موجود بالفعل: ${customerData.name}`);
        customer = existingCustomer;
        skippedCount++;
      } else {
        // إضافة العميل
        // التحقق من رقم التليفون المكرر
        let phoneToUse = customerData.phone || `NO-PHONE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        const existingPhone = await prisma.customer.findFirst({
          where: { phone: phoneToUse }
        });
        
        if (existingPhone) {
          // إضافة رقم عشوائي للتليفون لتجنب التكرار
          phoneToUse = `${phoneToUse}-${Math.floor(Math.random() * 10000)}`;
        }
        
        customer = await prisma.customer.create({
          data: {
            name: customerData.name,
            phone: phoneToUse,
            address: '',
            notes: 'رصيد افتتاحي - 1/9/2026',
            isActive: true,
            walletBalance: 0
          }
        });
        console.log(`✅ تم إضافة العميل: ${customerData.name}`);
        addedCount++;
      }

      // إضافة فاتورة الرصيد الافتتاحي إذا كان الرصيد موجب (ديون لنا)
      if (customerData.balance > 0) {
        // البحث عن فاتورة مكتب موجودة
        const existingInvoice = await prisma.officeInvoice.findFirst({
          where: {
            customerId: customer.id,
            total: customerData.balance,
            notes: { contains: 'رصيد افتتاحي' }
          }
        });

        if (!existingInvoice) {
          const invoiceNumber = `OPEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          await prisma.officeInvoice.create({
            data: {
              invoiceNumber,
              type: 'CLIENT', // عميل دائم
              customerId: customer.id,
              customerName: customer.name,
              customerPhone: customer.phone || '',
              subtotal: customerData.balance,
              discountAmount: 0,
              total: customerData.balance,
              totalCost: customerData.balance * 0.6, // افتراض هامش ربح 40%
              profit: customerData.balance * 0.4,
              paymentMethod: 'DEFERRED', // آجل
              paidAmount: 0,
              remainingAmount: customerData.balance,
              status: 'PENDING',
              notes: 'رصيد افتتاحي - 1/9/2026',
              createdBy: adminUser.id,
              createdAt: openingDate,
              updatedAt: openingDate
            }
          });
          
          console.log(`   💰 فاتورة افتتاحية: ${customerData.balance.toLocaleString()} ج.م`);
          invoicesCount++;
        } else {
          console.log(`   ⚠️  الفاتورة الافتتاحية موجودة بالفعل`);
        }
      } else if (customerData.balance < 0) {
        // إذا كان الرصيد سالب (العميل دفع زيادة)، نضيفها في المحفظة
        const currentWallet = customer.walletBalance || 0;
        const newWallet = currentWallet + Math.abs(customerData.balance);
        
        await prisma.customer.update({
          where: { id: customer.id },
          data: { walletBalance: newWallet }
        });
        
        // إضافة سجل دفع
        await prisma.customerPayment.create({
          data: {
            customerId: customer.id,
            amount: Math.abs(customerData.balance),
            paymentMethod: 'CASH',
            notes: 'رصيد افتتاحي (دفعة مقدمة) - 1/9/2026',
            createdBy: adminUser.id,
            paymentDate: openingDate
          }
        });
        
        console.log(`   💸 دفعة مقدمة: ${Math.abs(customerData.balance).toLocaleString()} ج.م (محفظة)`);
        invoicesCount++;
      }
    }

    console.log('\n✅ اكتمل!');
    console.log(`📊 الإحصائيات:`);
    console.log(`   - عملاء جدد: ${addedCount}`);
    console.log(`   - عملاء موجودين: ${skippedCount}`);
    console.log(`   - فواتير/دفعات: ${invoicesCount}`);
    
    // حساب الإجمالي
    const totalDebt = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
    const totalCredit = customers.reduce((sum, c) => sum + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);
    const netBalance = totalDebt - totalCredit;
    
    console.log(`\n💰 الملخص المالي:`);
    console.log(`   - ديون لنا: ${totalDebt.toLocaleString()} ج.م`);
    console.log(`   - دفعات مقدمة (علينا): ${totalCredit.toLocaleString()} ج.م`);
    console.log(`   - الصافي: ${netBalance.toLocaleString()} ج.م`);

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

addCustomersWithOpeningBalances();
