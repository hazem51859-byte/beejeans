const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// البيانات من الملف الإكسل
const excelData = [
  { code: '1001', name: 'وايد ليج جينز ساده بيسو', sellingPrice: 315, costPrice: 276 },
  { code: '1002', name: 'وايد ليج جينز يوزد بيسو', sellingPrice: 315, costPrice: 276 },
  { code: '1003', name: 'وايد ليج جينز اوسكار ويوزد بيسو', sellingPrice: 315, costPrice: 276 },
  { code: '1004', name: 'وايد ليج جينز مقطع بيسو', sellingPrice: 320, costPrice: 276 },
  { code: '1005', name: 'وايد ليج قصه فالصدر', sellingPrice: 335, costPrice: 290 },
  { code: '1006', name: 'وايد ليج جيب لطش تطريز جينز بيسو', sellingPrice: 335, costPrice: 230 },
  { code: '1007', name: 'وايد ليج شرايح جينز بيسو', sellingPrice: 305, costPrice: 210 },
  { code: '1009', name: 'وايد ليج جينز خاص 6 مقاسات بيسو', sellingPrice: 350, costPrice: 300 },
  { code: '1010', name: 'وايد ليج الوان بيسو', sellingPrice: 315, costPrice: 275 },
  { code: '1011', name: 'وايد ليج جينز محجر بيسو', sellingPrice: 315, costPrice: 275 },
  { code: '1012', name: 'وايد ليج الوان خاص بيسو', sellingPrice: 350, costPrice: 301 },
  { code: '1013', name: 'شارلستون جبردين بيسو', sellingPrice: 320, costPrice: 248 },
  { code: '1014', name: 'شارلستون جبردين خاص بيسو', sellingPrice: 335, costPrice: 274 },
  { code: '1015', name: 'شارلستون 5 بوكت جينز بيسو', sellingPrice: 320, costPrice: 250 },
  { code: '1016', name: 'شارلستون 5 بوكت اوسكار ويوزد بيسو', sellingPrice: 320, costPrice: 250 },
  { code: '1017', name: 'شارلستون 5 بوكت الوان بيسو', sellingPrice: 320, costPrice: 250 },
  { code: '1018', name: 'شارلستون 5 بوكت خاص جينز بيسو', sellingPrice: 335, costPrice: 300 },
  { code: '1021', name: 'بوي فريند خاص جينز بيسو', sellingPrice: 335, costPrice: 275 },
  { code: '1022', name: 'بوي فريند خاص الوان بيسو', sellingPrice: 335, costPrice: 275 },
  { code: '1023', name: 'سلوشي جينز بيسو', sellingPrice: 330, costPrice: 277 },
  { code: '1024', name: 'سلوشي الوان بيسو', sellingPrice: 330, costPrice: 277 },
  { code: '1025', name: 'هاي ويست جبردين بيسو', sellingPrice: 235, costPrice: 193 },
  { code: '1028', name: 'خاص كمر جينز بيسو', sellingPrice: 325, costPrice: 265 },
  { code: '1031', name: 'جاكت قصير جينز مشرشب بيسو', sellingPrice: 285, costPrice: 223 },
  { code: '1032', name: 'جاكت جينز كت بيسو', sellingPrice: 335, costPrice: 210 },
  { code: '1036', name: 'هاي ويست 5 بوكت الوان مقطع بيسو', sellingPrice: 290, costPrice: 185 },
  { code: '1037', name: 'خاص كمر جبردين الوان بيسو', sellingPrice: 325, costPrice: 260 },
  { code: '1038', name: 'وايد ليج دبل ليج جينز بيسو', sellingPrice: 350, costPrice: 303 },
  { code: '1039', name: 'وايد ليج مقلوب جينز بيسو', sellingPrice: 335, costPrice: 285 },
  { code: '1040', name: 'وايد ليج اطفالي جينز يوزد', sellingPrice: 280, costPrice: 230 },
  { code: '1041', name: 'وايد ليج اطفالي جينز جيب لطش', sellingPrice: 280, costPrice: 230 },
  { code: '1042', name: 'وايد ليج محير 26:36', sellingPrice: 300, costPrice: 253 },
  { code: '1043', name: 'وايد ليج اطفالي مقلوب 8:18', sellingPrice: 295, costPrice: 230 },
  { code: '1051', name: 'جيبه صك', sellingPrice: 300, costPrice: 235 },
  { code: '1052', name: 'جيبه زراير', sellingPrice: 300, costPrice: 239 },
  { code: '1053', name: 'جيبه كلوش', sellingPrice: 370, costPrice: 320 },
  { code: '1054', name: 'بنطلون كلاسيك جيلان', sellingPrice: 265, costPrice: 200 },
  { code: '1055', name: 'اسكيني عرض المحلات', sellingPrice: 220, costPrice: 220 },
  { code: '1056', name: 'وايد ليج اطفالي', sellingPrice: 270, costPrice: 207 },
  { code: '1061', name: 'سوت جينز', sellingPrice: 550, costPrice: 458 },
  { code: '1062', name: 'سوت جبردين', sellingPrice: 650, costPrice: 518 },
  { code: '1100', name: 'بنطلون ميلتون ساده', sellingPrice: 265, costPrice: 200 },
  { code: '1101', name: 'بنطلون ميلتون مطبوع', sellingPrice: 265, costPrice: 206 },
  { code: '1102', name: 'بنطلون وايد ليج انترلوك ساده', sellingPrice: 425, costPrice: 413 },
  { code: '1103', name: 'بنطلون وايد ليج انترلوك مطبوع', sellingPrice: 450, costPrice: 388 },
  { code: '1104', name: 'بنطلون وايد ليج ميلتون فوطه', sellingPrice: 400, costPrice: 356 },
  { code: '1105', name: 'سويتشرت', sellingPrice: 275, costPrice: 60 },
  { code: '1107', name: 'كاش مايوه', sellingPrice: 350, costPrice: 192 },
  { code: '1108', name: 'سوت 2 قطعه ناعم', sellingPrice: 450, costPrice: 342 },
  { code: '1109', name: 'جيبه جينز', sellingPrice: 450, costPrice: 400 },
  { code: '1111', name: 'شميز طويل', sellingPrice: 340, costPrice: 276 },
  { code: '1112', name: 'كارديجان', sellingPrice: 420, costPrice: 356 },
  { code: '1117', name: 'شميز طويل فريسكا', sellingPrice: 225, costPrice: 140 },
  { code: '1119', name: 'كارديجان ركامه', sellingPrice: 460, costPrice: 384 },
  { code: '1120', name: 'شميز فريسكا قصير', sellingPrice: 200, costPrice: 125 },
  { code: '1121', name: 'شميز جلاكسي قصير', sellingPrice: 250, costPrice: 175 },
  { code: '1122', name: 'كارديجان', sellingPrice: 350, costPrice: 195 },
  { code: '1123', name: 'كارديجان جلاكسي', sellingPrice: 400, costPrice: 250 },
  { code: '1125', name: 'شميزات', sellingPrice: 300, costPrice: 155 },
  { code: '1126', name: 'وايد ليج جيب لاطش جبردين', sellingPrice: 350, costPrice: 300 },
  { code: '1130', name: 'شميز مقلم مقلوب', sellingPrice: 300, costPrice: 155 },
  { code: '1132', name: 'شميز ستان طويل', sellingPrice: 225, costPrice: 147 },
  { code: '1133', name: 'كارديجان ستان', sellingPrice: 275, costPrice: 227 },
  { code: '1135', name: 'شميز ستان مشجر طويل', sellingPrice: 260, costPrice: 209 },
  { code: '1136', name: 'كارديجان ستان مشجر', sellingPrice: 350, costPrice: 289 },
  { code: '1137', name: 'شميز مشجر قصير', sellingPrice: 225, costPrice: 131 },
  { code: '1138', name: 'شميز مشجر طويل', sellingPrice: 225, costPrice: 151 },
  { code: '1139', name: 'كارديجان مشجر', sellingPrice: 275, costPrice: 231 },
  { code: '1140', name: 'شميز باندا قصير', sellingPrice: 260, costPrice: 193 },
  { code: '1141', name: 'شميز باندا طويل', sellingPrice: 260, costPrice: 213 },
  { code: '1142', name: 'كارديجان باندا', sellingPrice: 350, costPrice: 293 }
];

async function updateProducts() {
  console.log('🔄 Starting product update...');
  
  try {
    // Get all existing products
    const existingProducts = await prisma.product.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`📦 Found ${existingProducts.length} existing products`);
    console.log(`📋 Excel has ${excelData.length} products`);
    
    let updated = 0;
    let matched = 0;
    let skipped = 0;
    
    // Build a map of products that need updating
    const updateMap = new Map();
    
    for (const excelProduct of excelData) {
      // Try to find matching product by name (fuzzy match)
      const dbProduct = existingProducts.find(p => {
        const pName = p.name.trim().toLowerCase();
        const excelName = excelProduct.name.trim().toLowerCase();
        return pName.includes(excelName) || excelName.includes(pName) || pName === excelName;
      });
      
      if (dbProduct) {
        if (updateMap.has(excelProduct.code)) {
          console.log(`⚠️  Duplicate code ${excelProduct.code} - skipping "${dbProduct.name}"`);
          skipped++;
        } else {
          updateMap.set(excelProduct.code, { dbProduct, excelProduct });
          matched++;
        }
      } else {
        console.log(`❌ No match for: "${excelProduct.name}"`);
      }
    }
    
    // Now update products
    for (const [code, { dbProduct, excelProduct }] of updateMap.entries()) {
      try {
        console.log(`✅ Updating: "${dbProduct.name}" → Code: ${code}`);
        
        await prisma.product.update({
          where: { id: dbProduct.id },
          data: {
            sku: code,
            barcode: code,
            sellingPrice: excelProduct.sellingPrice,
            costPrice: excelProduct.costPrice
          }
        });
        updated++;
      } catch (err) {
        console.log(`❌ Failed to update "${dbProduct.name}": ${err.message}`);
      }
    }
    
    console.log(`\n✅ Update complete!`);
    console.log(`   Matched: ${matched}/${excelData.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProducts();
