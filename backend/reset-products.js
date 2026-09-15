const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const productsData = [
  { code: "1001", name: "وايد ليج جينز ساده بيسو", quantity: 317, costPrice: 276, sellingPrice: 315 },
  { code: "1002", name: "وايد ليج جينز يوزد بيسو", quantity: 552, costPrice: 276, sellingPrice: 315 },
  { code: "1003", name: "وايد ليج جينز اوسكار ويوزد بيسو", quantity: 174, costPrice: 276, sellingPrice: 315 },
  { code: "1004", name: "وايد ليج جينز مقطع بيسو", quantity: 69, costPrice: 276, sellingPrice: 320 },
  { code: "1005", name: "وايد ليج قصه فالصدر", quantity: 111, costPrice: 290, sellingPrice: 345 },
  { code: "1006", name: "وايد ليج جيب لطش تطريز جينز بيسو", quantity: 126, costPrice: 230, sellingPrice: 335 },
  { code: "1007", name: "وايد ليج شرايح جينز بيسو", quantity: 9, costPrice: 191, sellingPrice: 305 },
  { code: "1009", name: "وايد ليج جينز خاص 6 مقاسات بيسو", quantity: 678, costPrice: 295, sellingPrice: 350 },
  { code: "1010", name: "وايد ليج الوان بيسو", quantity: 1112, costPrice: 275, sellingPrice: 315 },
  { code: "1011", name: "وايد ليج جينز محجر بيسو", quantity: 292, costPrice: 275, sellingPrice: 315 },
  { code: "1012", name: "وايد ليج الوان خاص بيسو", quantity: 234, costPrice: 301, sellingPrice: 350 },
  { code: "1013", name: "شارلستون جبردين بيسو", quantity: 276, costPrice: 248, sellingPrice: 320 },
  { code: "1014", name: "شارلستون جبردين خاص بيسو", quantity: 300, costPrice: 274, sellingPrice: 335 },
  { code: "1015", name: "شارلستون 5 بوكت جينز بيسو", quantity: 148, costPrice: 238, sellingPrice: 320 },
  { code: "1016", name: "شارلستون 5 بوكت اوسكار ويوزد بيسو", quantity: 207, costPrice: 238, sellingPrice: 320 },
  { code: "1017", name: "شارلستون 5 بوكت الوان بيسو", quantity: 252, costPrice: 247, sellingPrice: 320 },
  { code: "1018", name: "شارلستون 5 بوكت خاص جينز بيسو", quantity: 570, costPrice: 300, sellingPrice: 335 },
  { code: "1021", name: "بوي فريند خاص جينز بيسو", quantity: 156, costPrice: 275, sellingPrice: 335 },
  { code: "1023", name: "سلوشي جينز بيسو", quantity: 127, costPrice: 277, sellingPrice: 330 },
  { code: "1024", name: "سلوشي الوان بيسو", quantity: 263, costPrice: 262, sellingPrice: 330 },
  { code: "1028", name: "خاص كمر جينز بيسو", quantity: 254, costPrice: 259, sellingPrice: 325 },
  { code: "1031", name: "جاكت قصير جينز مشرشب بيسو", quantity: 107, costPrice: 223, sellingPrice: 285 },
  { code: "1032", name: "جاكت جينز كت بيسو", quantity: 51, costPrice: 210, sellingPrice: 335 },
  { code: "1036", name: "هاي ويست 5 بوكت الوان مقطع بيسو", quantity: 36, costPrice: 181, sellingPrice: 290 },
  { code: "1037", name: "خاص كمر جبردين الوان بيسو", quantity: 108, costPrice: 257, sellingPrice: 325 },
  { code: "1038", name: "وايد ليج دبل ليج جينز بيسو", quantity: 29, costPrice: 303, sellingPrice: 350 },
  { code: "1039", name: "وايد ليج مقلوب جينز بيسو", quantity: 41, costPrice: 282, sellingPrice: 335 },
  { code: "1040", name: "وايد ليج اطفالي جينز يوزد", quantity: 41, costPrice: 230, sellingPrice: 280 },
  { code: "1041", name: "وايد ليج اطفالي جينز جيب لطش", quantity: 55, costPrice: 230, sellingPrice: 280 },
  { code: "1042", name: "وايد ليج محير 26:36", quantity: 3, costPrice: 206, sellingPrice: 300 },
  { code: "1043", name: "وايد ليج اطفالي مقلوب 8:18", quantity: 348, costPrice: 230, sellingPrice: 295 },
  { code: "1051", name: "جيبه صك", quantity: 56, costPrice: 235, sellingPrice: 300 },
  { code: "1052", name: "جيبه زراير", quantity: 60, costPrice: 239, sellingPrice: 300 },
  { code: "1053", name: "جيبه كلوش", quantity: 2, costPrice: 320, sellingPrice: 370 },
  { code: "1055", name: "اسكيني عرض المحلات", quantity: 192, costPrice: 220, sellingPrice: 220 },
  { code: "1061", name: "سوت جينز", quantity: 15, costPrice: 458, sellingPrice: 550 },
  { code: "1062", name: "سوت جبردين", quantity: 68, costPrice: 518, sellingPrice: 650 },
  { code: "1100", name: "بنطلون ميلتون ساده", quantity: 48, costPrice: 200, sellingPrice: 265 },
  { code: "1101", name: "بنطلون ميلتون مطبوع", quantity: 62, costPrice: 206, sellingPrice: 265 },
  { code: "1102", name: "بنطلون وايد ليج انترلوك ساده", quantity: 10, costPrice: 413, sellingPrice: 425 },
  { code: "1103", name: "بنطلون وايد ليج انترلوك مطبوع", quantity: 18, costPrice: 388, sellingPrice: 450 },
  { code: "1104", name: "بنطلون وايد ليج ميلتون فوطه", quantity: 8, costPrice: 356, sellingPrice: 400 },
  { code: "1105", name: "سويتشرت", quantity: 17, costPrice: 60, sellingPrice: 275 },
  { code: "1107", name: "كاش مايوه", quantity: 18, costPrice: 192, sellingPrice: 350 },
  { code: "1108", name: "سوت 2 قطعه ناعم", quantity: 18, costPrice: 342, sellingPrice: 450 },
  { code: "1109", name: "جيبه جينز", quantity: 19, costPrice: 400, sellingPrice: 450 },
  { code: "1111", name: "شميز طويل", quantity: 23, costPrice: 276, sellingPrice: 340 },
  { code: "1112", name: "كارديجان", quantity: 9, costPrice: 356, sellingPrice: 420 },
  { code: "1117", name: "شميز طويل فريسكا", quantity: 42, costPrice: 140, sellingPrice: 225 },
  { code: "1119", name: "كارديجان ركامه", quantity: 48, costPrice: 384, sellingPrice: 460 },
  { code: "1120", name: "شميز فريسكا قصير", quantity: 49, costPrice: 125, sellingPrice: 200 },
  { code: "1121", name: "شميز جلاكسي قصير", quantity: 32, costPrice: 175, sellingPrice: 250 },
  { code: "1123", name: "كارديجان جلاكسي", quantity: 40, costPrice: 250, sellingPrice: 400 },
  { code: "1132", name: "شميز ستان طويل", quantity: 64, costPrice: 147, sellingPrice: 225 },
  { code: "1133", name: "كارديجان ستان", quantity: 66, costPrice: 227, sellingPrice: 275 },
  { code: "1134", name: "شميز ستان مشجر قصير", quantity: 25, costPrice: 189, sellingPrice: 260 },
  { code: "1135", name: "شميز ستان مشجر طويل", quantity: 24, costPrice: 209, sellingPrice: 260 },
  { code: "1136", name: "كارديجان ستان مشجر", quantity: 24, costPrice: 289, sellingPrice: 350 },
  { code: "1137", name: "شميز مشجر قصير", quantity: 37, costPrice: 131, sellingPrice: 225 },
  { code: "1138", name: "شميز مشجر طويل", quantity: 37, costPrice: 151, sellingPrice: 225 },
  { code: "1139", name: "كارديجان مشجر", quantity: 35, costPrice: 231, sellingPrice: 275 },
  { code: "1140", name: "شميز باندا قصير", quantity: 72, costPrice: 193, sellingPrice: 260 },
  { code: "1141", name: "شميز باندا طويل", quantity: 71, costPrice: 213, sellingPrice: 260 },
  { code: "1142", name: "كارديجان باندا", quantity: 70, costPrice: 293, sellingPrice: 350 }
];

async function resetProducts() {
  try {
    console.log('\n🗑️  Deleting all existing data...\n');

    // Delete inventory first
    const invResult = await prisma.inventory.deleteMany({});
    console.log(`✅ Deleted ${invResult.count} inventory records`);

    // Delete all products
    const deleteResult = await prisma.product.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} products\n`);

    console.log('🔄 Creating fresh products...\n');

    // Get main branch
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainBranch) {
      console.error('❌ Main warehouse not found!');
      return;
    }

    // Get or create category
    let category = await prisma.category.findFirst({
      where: { name: 'بناطيل' }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'بناطيل',
          description: 'بناطيل جينز وملابس'
        }
      });
    }

    let successCount = 0;

    for (const product of productsData) {
      try {
        // Create product
        const newProduct = await prisma.product.create({
          data: {
            name: product.name,
            sku: product.code,
            barcode: product.code,
            category: {
              connect: { id: category.id }
            },
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            reorderLevel: 5,
            status: 'ACTIVE',
            fabricCost: null,
            manufacturingCost: null,
            washingCost: null
          }
        });

        // Add inventory
        await prisma.inventory.create({
          data: {
            productId: newProduct.id,
            branchId: mainBranch.id,
            quantity: product.quantity
          }
        });

        console.log(`✅ ${product.code}: ${product.name} - Cost: ${product.costPrice}, Price: ${product.sellingPrice}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error adding ${product.code}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Reset Complete!');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${successCount} products`);
    console.log(`📦 Total: ${productsData.length} products`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetProducts();
