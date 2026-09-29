const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCustomers() {
  try {
    console.log('🔄 Adding customers with opening balances...\n');
    
    const customers = [
      { name: 'اسامه السري دمياط', balance: -210140, phone: '01227551982' },
      { name: 'شنوده الفيوم', balance: -57370, phone: '01007120612' },
      { name: 'مكتب باسورد', balance: -4760, phone: null },
      { name: 'مكتب فندي', balance: -9460, phone: null },
      { name: 'علاء بدر', balance: -30680, phone: null },
      { name: 'بوف', balance: -56495, phone: null },
      { name: 'محمد عمر', balance: -30500, phone: null },
      { name: 'ببلاوي', balance: -6920, phone: null },
      { name: 'سامح زرزور', balance: -22440, phone: null },
      { name: 'ام لي لي المنوفيه', balance: -49490, phone: '01006460338' },
      { name: 'هاني لافلي', balance: 165, phone: null },
      { name: 'زينب الباهي', balance: -100590, phone: '01146731255' },
      { name: 'احمد التركي العتبه', balance: -17480, phone: null },
      { name: 'احمد يونس بني سويف', balance: -10000, phone: null },
      { name: 'امجد اسيوط', balance: -2705, phone: null },
      { name: 'احمد حسن فيصل', balance: -2730, phone: null },
      { name: 'روماني', balance: -132895, phone: null },
      { name: 'ناصر حكايه', balance: -340, phone: null },
      { name: 'عماد بولاق', balance: -60930, phone: '01223284687' },
      { name: 'علاء صفط اللبن', balance: -14410, phone: null },
      { name: 'عبير اكتوبر', balance: -19890, phone: null },
      { name: 'ام مصطفي المنصوره', balance: -13280, phone: null },
      { name: 'محمد محل انفنتي تبع بلحه', balance: -43825, phone: null },
      { name: 'محلات Bee', balance: -2644210, phone: null },
      { name: 'أم احمد الغرباوي منوف', balance: -600, phone: null },
      { name: 'ام احمد قنا', balance: 240, phone: null },
      { name: 'محمد حمدون الزقازيق', balance: -15090, phone: null },
      { name: 'خالد زوينه طنطا', balance: -75445, phone: '01095838981' },
      { name: 'عبده', balance: -850, phone: null },
      { name: 'احلام المنصوره', balance: -75, phone: '01066225006' },
      { name: 'كرليس بني سويف', balance: -9725, phone: '01203316727' },
      { name: 'محمد الزقازيق', balance: -6780, phone: null },
      { name: 'كرليس بني سويف (مخيطات)', balance: -17060, phone: null }, // Removed duplicate phone
      { name: 'ناصر مرعي جراند مول', balance: 240, phone: null },
      { name: 'رغده اكتوبر', balance: -3600, phone: null },
      { name: 'احمد مدحت الفيوم', balance: 515, phone: null },
      { name: 'عبير اكتوبر 2', balance: -300, phone: null },
      { name: 'عبير اكتوبر 3', balance: -1710, phone: null },
      { name: 'عبير اكتوبر 4', balance: -1710, phone: null },
      { name: 'مينا صبري ملاوي', balance: 840, phone: null },
      { name: 'اسامه عبده بنها الكبري', balance: -1060, phone: null },
      { name: 'ابو شروق المنوفيه', balance: 400, phone: null },
      { name: 'جرجس نجع حمادي', balance: -26460, phone: null },
      { name: 'ابو شروق المنوفيه 2', balance: -14450, phone: null },
      { name: 'سامح المحله الكبري', balance: -11340, phone: null },
      { name: 'ام يوسف طنطا', balance: 2860, phone: null }
    ];
    
    // Delete all existing customers first
    console.log('🗑️  Deleting existing customers...');
    await prisma.customer.deleteMany({});
    console.log('✅ Deleted all existing customers\n');
    
    let totalPositive = 0;
    let totalNegative = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const customer of customers) {
      const created = await prisma.customer.create({
        data: {
          name: customer.name,
          phone: customer.phone,
          walletBalance: customer.balance,
          isActive: true
        }
      });
      
      const status = customer.balance < 0 ? '(ليهم فلوس عندنا - نحن مدينون)' : 
                     customer.balance > 0 ? '(لنا فلوس عندهم - هم مدينون)' : 
                     '(متزن)';
      
      console.log(`✅ ${created.name}: ${customer.balance.toFixed(2)} ج.م ${status}`);
      
      if (customer.balance < 0) {
        totalNegative += customer.balance;
        negativeCount++;
      } else if (customer.balance > 0) {
        totalPositive += customer.balance;
        positiveCount++;
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('📊 ملخص أرصدة العملاء:');
    console.log('═'.repeat(70));
    console.log(`💸 عملاء دائنون (ليهم فلوس عندنا - نحن مدينون): ${negativeCount} عميل`);
    console.log(`   إجمالي: ${Math.abs(totalNegative).toFixed(2)} ج.م`);
    console.log('─'.repeat(70));
    console.log(`💰 عملاء مدينون (لنا فلوس عندهم - هم مدينون): ${positiveCount} عميل`);
    console.log(`   إجمالي: ${totalPositive.toFixed(2)} ج.م`);
    console.log('─'.repeat(70));
    console.log(`📈 صافي الأرصدة: ${(totalPositive + totalNegative).toFixed(2)} ج.م`);
    console.log(`   (موجب = لنا، سالب = علينا)`);
    console.log('═'.repeat(70));
    console.log(`\n✅ تم إضافة ${customers.length} عميل بنجاح!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addCustomers();
