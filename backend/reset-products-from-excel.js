const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// البيانات الكاملة من ملف الإكسل
const excelProducts = [
  { code: '1001', name: 'وايد ليج جينز ساده بيسو', quantity: 586, sellingPrice: 315, costPrice: 276 },
  { code: '1002', name: 'وايد ليج جينز يوزد بيسو', quantity: 301, sellingPrice: 315, costPrice: 276 },
  { code: '1003', name: 'وايد ليج جينز اوسكار ويوزد بيسو', quantity: 122, sellingPrice: 315, costPrice: 276 },
  { code: '1004', name: 'وايد ليج جينز مقطع بيسو', quantity: 22, sellingPrice: 320, costPrice: 276 },
  { code: '1005', name: 'وايد ليج قصه فالصدر', quantity: 72, sellingPrice: 335, costPrice: 290 },
  { code: '1006', name: 'وايد ليج جيب لطش تطريز جينز بيسو', quantity: 120, sellingPrice: 335, costPrice: 230 },
  { code: '1007', name: 'وايد ليج شرايح جينز بيسو', quantity: 46, sellingPrice: 305, costPrice: 210 },
  { code: '1009', name: 'وايد ليج جينز خاص 6 مقاسات بيسو', quantity: 534, sellingPrice: 350, costPrice: 300 },
  { code: '1010', name: 'وايد ليج الوان بيسو', quantity: 728, sellingPrice: 315, costPrice: 275 },
  { code: '1011', name: 'وايد ليج جينز محجر بيسو', quantity: 376, sellingPrice: 315, costPrice: 275 },
  { code: '1012', name: 'وايد ليج الوان خاص بيسو', quantity: 152, sellingPrice: 350, costPrice: 301 },
  { code: '1013', name: 'شارلستون جبردين بيسو', quantity: 150, sellingPrice: 320, costPrice: 248 },
  { code: '1014', name: 'شارلستون جبردين خاص بيسو', quantity: 270, sellingPrice: 335, costPrice: 274 },
  { code: '1015', name: 'شارلستون 5 بوكت جينز بيسو', quantity: 58, sellingPrice: 320, costPrice: 250 },
  { code: '1016', name: 'شارلستون 5 بوكت اوسكار ويوزد بيسو', quantity: 145, sellingPrice: 320, costPrice: 250 },
  { code: '1017', name: 'شارلستون 5 بوكت الوان بيسو', quantity: 192, sellingPrice: 320, costPrice: 250 },
  { code: '1018', name: 'شارلستون 5 بوكت خاص جينز بيسو', quantity: 546, sellingPrice: 335, costPrice: 300 },
  { code: '1021', name: 'بوي فريند خاص جينز بيسو', quantity: 175, sellingPrice: 335, costPrice: 275 },
  { code: '1022', name: 'بوي فريند خاص الوان بيسو', quantity: 36, sellingPrice: 335, costPrice: 275 },
  { code: '1023', name: 'سلوشي جينز بيسو', quantity: 127, sellingPrice: 330, costPrice: 277 },
  { code: '1024', name: 'سلوشي الوان بيسو', quantity: 277, sellingPrice: 330, costPrice: 277 },
  { code: '1025', name: 'هاي ويست جبردين بيسو', quantity: 263, sellingPrice: 235, costPrice: 193 },
  { code: '1028', name: 'خاص كمر جينز بيسو', quantity: 218, sellingPrice: 325, costPrice: 265 },
  { code: '1031', name: 'جاكت قصير جينز مشرشب بيسو', quantity: 71, sellingPrice: 285, costPrice: 223 },
  { code: '1032', name: 'جاكت جينز كت بيسو', quantity: 48, sellingPrice: 335, costPrice: 210 },
  { code: '1036', name: 'هاي ويست 5 بوكت الوان مقطع بيسو', quantity: 36, sellingPrice: 290, costPrice: 185 },
  { code: '1037', name: 'خاص كمر جبردين الوان بيسو', quantity: 54, sellingPrice: 325, costPrice: 260 },
  { code: '1038', name: 'وايد ليج دبل ليج جينز بيسو', quantity: 113, sellingPrice: 350, costPrice: 303 },
  { code: '1039', name: 'وايد ليج مقلوب جينز بيسو', quantity: 54, sellingPrice: 335, costPrice: 285 },
  { code: '1040', name: 'وايد ليج اطفالي جينز يوزد', quantity: 36, sellingPrice: 280, costPrice: 230 },
  { code: '1041', name: 'وايد ليج اطفالي جينز جيب لطش', quantity: 55, sellingPrice: 280, costPrice: 230 },
  { code: '1042', name: 'وايد ليج محير 26:36', quantity: 51, sellingPrice: 300, costPrice: 253 },
  { code: '1043', name: 'وايد ليج اطفالي مقلوب 8:18', quantity: 294, sellingPrice: 295, costPrice: 230 },
  { code: '1051', name: 'جيبه صك', quantity: 56, sellingPrice: 300, costPrice: 235 },
  { code: '1052', name: 'جيبه زراير', quantity: 60, sellingPrice: 300, costPrice: 239 },
  { code: '1053', name: 'جيبه كلوش', quantity: 2, sellingPrice: 370, costPrice: 320 },
  { code: '1054', name: 'بنطلون كلاسيك جيلان', quantity: 110, sellingPrice: 265, costPrice: 200 },
  { code: '1055', name: 'اسكيني عرض المحلات', quantity: 120, sellingPrice: 220, costPrice: 220 },
  { code: '1056', name: 'وايد ليج اطفالي', quantity: 2, sellingPrice: 270, costPrice: 207 },
  { code: '1061', name: 'سوت جينز', quantity: 15, sellingPrice: 550, costPrice: 458 },
  { code: '1062', name: 'سوت جبردين', quantity: 19, sellingPrice: 650, costPrice: 518 },
  { code: '1100', name: 'بنطلون ميلتون ساده', quantity: 23, sellingPrice: 265, costPrice: 200 },
  { code: '1101', name: 'بنطلون ميلتون مطبوع', quantity: 16, sellingPrice: 265, costPrice: 206 },
  { code: '1102', name: 'بنطلون وايد ليج انترلوك ساده', quantity: 10, sellingPrice: 425, costPrice: 413 },
  { code: '1103', name: 'بنطلون وايد ليج انترلوك مطبوع', quantity: 18, sellingPrice: 450, costPrice: 388 },
  { code: '1104', name: 'بنطلون وايد ليج ميلتون فوطه', quantity: 4, sellingPrice: 400, costPrice: 356 },
  { code: '1105', name: 'سويتشرت', quantity: 11, sellingPrice: 275, costPrice: 60 },
  { code: '1107', name: 'كاش مايوه', quantity: 18, sellingPrice: 350, costPrice: 192 },
  { code: '1108', name: 'سوت 2 قطعه ناعم', quantity: 18, sellingPrice: 450, costPrice: 342 },
  { code: '1109', name: 'جيبه جينز', quantity: 27, sellingPrice: 450, costPrice: 400 },
  { code: '1111', name: 'شميز طويل', quantity: 23, sellingPrice: 340, costPrice: 276 },
  { code: '1112', name: 'كارديجان', quantity: 9, sellingPrice: 420, costPrice: 356 },
  { code: '1117', name: 'شميز طويل فريسكا', quantity: 14, sellingPrice: 225, costPrice: 140 },
  { code: '1119', name: 'كارديجان ركامه', quantity: 48, sellingPrice: 460, costPrice: 384 },
  { code: '1120', name: 'شميز فريسكا قصير', quantity: 28, sellingPrice: 200, costPrice: 125 },
  { code: '1121', name: 'شميز جلاكسي قصير', quantity: 24, sellingPrice: 250, costPrice: 175 },
  { code: '1122', name: 'كارديجان', quantity: 42, sellingPrice: 350, costPrice: 195 },
  { code: '1123', name: 'كارديجان جلاكسي', quantity: 40, sellingPrice: 400, costPrice: 250 },
  { code: '1125', name: 'شميزات', quantity: 88, sellingPrice: 300, costPrice: 155 },
  { code: '1126', name: 'وايد ليج جيب لاطش جبردين', quantity: 62, sellingPrice: 350, costPrice: 300 },
  { code: '1130', name: 'شميز مقلم مقلوب', quantity: 5, sellingPrice: 300, costPrice: 155 },
  { code: '1132', name: 'شميز ستان طويل', quantity: 5, sellingPrice: 225, costPrice: 147 },
  { code: '1133', name: 'كارديجان ستان', quantity: 39, sellingPrice: 275, costPrice: 227 },
  { code: '1135', name: 'شميز ستان مشجر طويل', quantity: 3, sellingPrice: 260, costPrice: 209 },
  { code: '1136', name: 'كارديجان ستان مشجر', quantity: 6, sellingPrice: 350, costPrice: 289 },
  { code: '1137', name: 'شميز مشجر قصير', quantity: 4, sellingPrice: 225, costPrice: 131 },
  { code: '1138', name: 'شميز مشجر طويل', quantity: 13, sellingPrice: 225, costPrice: 151 },
  { code: '1139', name: 'كارديجان مشجر', quantity: 8, sellingPrice: 275, costPrice: 231 },
  { code: '1140', name: 'شميز باندا قصير', quantity: 1, sellingPrice: 260, costPrice: 193 },
  { code: '1141', name: 'شميز باندا طويل', quantity: 6, sellingPrice: 260, costPrice: 213 },
  { code: '1142', name: 'كارديجان باندا', quantity: 48, sellingPrice: 350, costPrice: 293 }
];

async function resetProducts() {
  console.log('🔄 Starting complete product reset...');
  
  try {
    // Step 1: Get main branch ID
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });
    
    if (!mainBranch) {
      console.error('❌ Main branch not found!');
      return;
    }
    
    console.log(`✅ Found main branch: ${mainBranch.name} (${mainBranch.id})`);
    
    // Step 2: Get default category
    let category = await prisma.category.findFirst();
    
    if (!category) {
      // Create default category if none exists
      category = await prisma.category.create({
        data: {
          name: 'ملابس',
          description: 'الفئة الافتراضية'
        }
      });
      console.log(`✅ Created default category: ${category.name}`);
    } else {
      console.log(`✅ Using category: ${category.name}`);
    }
    
    // Step 3: Delete ALL existing products and related data
    console.log('\n🗑️  Deleting all existing products...');
    
    // Delete in correct order (foreign key constraints)
    await prisma.$executeRaw`DELETE FROM inventory`;
    console.log('   ✅ Deleted all inventory records');
    
    await prisma.$executeRaw`DELETE FROM products`;
    console.log('   ✅ Deleted all products');
    
    // Step 4: Create all products from Excel
    console.log('\n📦 Creating products from Excel...');
    
    let created = 0;
    
    for (const item of excelProducts) {
      try {
        // Create product
        const product = await prisma.product.create({
          data: {
            name: item.name,
            sku: item.code, // نفس الباركود
            barcode: item.code,
            categoryId: category.id,
            sellingPrice: item.sellingPrice,
            costPrice: item.costPrice,
            status: 'ACTIVE'
          }
        });
        
        // Create inventory for main branch
        await prisma.inventory.create({
          data: {
            productId: product.id,
            branchId: mainBranch.id,
            quantity: item.quantity,
            minQuantity: 10
          }
        });
        
        console.log(`✅ ${item.code} - ${item.name} (كمية: ${item.quantity})`);
        created++;
        
      } catch (error) {
        console.error(`❌ Failed to create ${item.code}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Reset complete!`);
    console.log(`   Created: ${created}/${excelProducts.length} products`);
    console.log(`   Total inventory: ${created} records`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetProducts();
