const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const products = [
  { code: "1001", name: "وايد ليج جينز ساده بيسو", quantity: 317, cost: 276, price: 315 },
  { code: "1002", name: "وايد ليج جينز يوزد بيسو", quantity: 552, cost: 276, price: 315 },
  { code: "1003", name: "وايد ليج جينز اوسكار ويوزد بيسو", quantity: 174, cost: 276, price: 315 },
  { code: "1004", name: "وايد ليج جينز مقطع بيسو", quantity: 69, cost: 276, price: 320 },
  { code: "1005", name: "وايد ليج قصه فالصدر", quantity: 111, cost: 290, price: 345 },
  { code: "1006", name: "وايد ليج جيب لطش تطريز جينز بيسو", quantity: 126, cost: 230, price: 335 },
  { code: "1007", name: "وايد ليج شرايح جينز بيسو", quantity: 9, cost: 191, price: 305 },
  { code: "1009", name: "وايد ليج جينز خاص 6 مقاسات بيسو", quantity: 678, cost: 295, price: 350 },
  { code: "1010", name: "وايد ليج الوان بيسو", quantity: 1112, cost: 275, price: 315 },
  { code: "1011", name: "وايد ليج جينز محجر بيسو", quantity: 292, cost: 275, price: 315 },
  { code: "1012", name: "وايد ليج الوان خاص بيسو", quantity: 234, cost: 301, price: 350 },
  { code: "1013", name: "شارلستون جبردين بيسو", quantity: 276, cost: 248, price: 320 },
  { code: "1014", name: "شارلستون جبردين خاص بيسو", quantity: 300, cost: 274, price: 335 },
  { code: "1015", name: "شارلستون 5 بوكت جينز بيسو", quantity: 148, cost: 238, price: 320 },
  { code: "1016", name: "شارلستون 5 بوكت اوسكار ويوزد بيسو", quantity: 207, cost: 238, price: 320 },
  { code: "1017", name: "شارلستون 5 بوكت الوان بيسو", quantity: 252, cost: 247, price: 320 },
  { code: "1018", name: "شارلستون 5 بوكت خاص جينز بيسو", quantity: 570, cost: 300, price: 335 },
  { code: "1021", name: "بوي فريند خاص جينز بيسو", quantity: 156, cost: 275, price: 335 },
  { code: "1023", name: "سلوشي جينز بيسو", quantity: 127, cost: 277, price: 330 },
  { code: "1024", name: "سلوشي الوان بيسو", quantity: 263, cost: 262, price: 330 },
  { code: "1028", name: "خاص كمر جينز بيسو", quantity: 254, cost: 259, price: 325 },
  { code: "1031", name: "جاكت قصير جينز مشرشب بيسو", quantity: 107, cost: 223, price: 285 },
  { code: "1032", name: "جاكت جينز كت بيسو", quantity: 51, cost: 210, price: 335 },
  { code: "1036", name: "هاي ويست 5 بوكت الوان مقطع بيسو", quantity: 36, cost: 181, price: 290 },
  { code: "1037", name: "خاص كمر جبردين الوان بيسو", quantity: 108, cost: 257, price: 325 },
  { code: "1038", name: "وايد ليج دبل ليج جينز بيسو", quantity: 29, cost: 303, price: 350 },
  { code: "1039", name: "وايد ليج مقلوب جينز بيسو", quantity: 41, cost: 282, price: 335 },
  { code: "1040", name: "وايد ليج اطفالي جينز يوزد", quantity: 41, cost: 230, price: 280 },
  { code: "1041", name: "وايد ليج اطفالي جينز جيب لطش", quantity: 55, cost: 230, price: 280 },
  { code: "1042", name: "وايد ليج محير 26:36", quantity: 3, cost: 206, price: 300 },
  { code: "1043", name: "وايد ليج اطفالي مقلوب 8:18", quantity: 348, cost: 230, price: 295 },
  { code: "1051", name: "جيبه صك", quantity: 56, cost: 235, price: 300 },
  { code: "1052", name: "جيبه زراير", quantity: 60, cost: 239, price: 300 },
  { code: "1053", name: "جيبه كلوش", quantity: 2, cost: 320, price: 370 },
  { code: "1055", name: "اسكيني عرض المحلات", quantity: 192, cost: 220, price: 220 },
  { code: "1061", name: "سوت جينز", quantity: 15, cost: 458, price: 550 },
  { code: "1062", name: "سوت جبردين", quantity: 68, cost: 518, price: 650 },
  { code: "1100", name: "بنطلون ميلتون ساده", quantity: 48, cost: 200, price: 265 },
  { code: "1101", name: "بنطلون ميلتون مطبوع", quantity: 62, cost: 206, price: 265 },
  { code: "1102", name: "بنطلون وايد ليج انترلوك ساده", quantity: 10, cost: 413, price: 425 },
  { code: "1103", name: "بنطلون وايد ليج انترلوك مطبوع", quantity: 18, cost: 388, price: 450 },
  { code: "1104", name: "بنطلون وايد ليج ميلتون فوطه", quantity: 8, cost: 356, price: 400 },
  { code: "1105", name: "سويتشرت", quantity: 17, cost: 60, price: 275 },
  { code: "1107", name: "كاش مايوه", quantity: 18, cost: 192, price: 350 },
  { code: "1108", name: "سوت 2 قطعه ناعم", quantity: 18, cost: 342, price: 450 },
  { code: "1109", name: "جيبه جينز", quantity: 19, cost: 400, price: 450 },
  { code: "1111", name: "شميز طويل", quantity: 23, cost: 276, price: 340 },
  { code: "1112", name: "كارديجان", quantity: 9, cost: 356, price: 420 },
  { code: "1117", name: "شميز طويل فريسكا", quantity: 42, cost: 140, price: 225 },
  { code: "1119", name: "كارديجان ركامه", quantity: 48, cost: 384, price: 460 },
  { code: "1120", name: "شميز فريسكا قصير", quantity: 49, cost: 125, price: 200 },
  { code: "1121", name: "شميز جلاكسي قصير", quantity: 32, cost: 175, price: 250 },
  { code: "1123", name: "كارديجان جلاكسي", quantity: 40, cost: 250, price: 400 },
  { code: "1132", name: "شميز ستان طويل", quantity: 64, cost: 147, price: 225 },
  { code: "1133", name: "كارديجان ستان", quantity: 66, cost: 227, price: 275 },
  { code: "1134", name: "شميز ستان مشجر قصير", quantity: 25, cost: 189, price: 260 },
  { code: "1135", name: "شميز ستان مشجر طويل", quantity: 24, cost: 209, price: 260 },
  { code: "1136", name: "كارديجان ستان مشجر", quantity: 24, cost: 289, price: 350 },
  { code: "1137", name: "شميز مشجر قصير", quantity: 37, cost: 131, price: 225 },
  { code: "1138", name: "شميز مشجر طويل", quantity: 37, cost: 151, price: 225 },
  { code: "1139", name: "كارديجان مشجر", quantity: 35, cost: 231, price: 275 },
  { code: "1140", name: "شميز باندا قصير", quantity: 72, cost: 193, price: 260 },
  { code: "1141", name: "شميز باندا طويل", quantity: 71, cost: 213, price: 260 },
  { code: "1142", name: "كارديجان باندا", quantity: 70, cost: 293, price: 350 }
];

async function importProducts() {
  try {
    console.log('\n🔄 Starting products import...\n');
    console.log(`📦 Total products to import: ${products.length}\n`);

    // Get main warehouse (المخزن الرئيسي)
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainBranch) {
      console.error('❌ Main warehouse not found!');
      return;
    }

    console.log(`✅ Found main warehouse: ${mainBranch.name} (${mainBranch.id})\n`);

    // Get or create default category
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
      console.log(`✅ Created category: ${category.name}\n`);
    } else {
      console.log(`✅ Using existing category: ${category.name}\n`);
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Check if product already exists by SKU
        const existingProduct = await prisma.product.findUnique({
          where: { sku: product.code }
        });

        if (existingProduct) {
          console.log(`⚠️  Skipped: ${product.code} - ${product.name} (already exists)`);
          skipCount++;
          continue;
        }

        // Create product
        const newProduct = await prisma.product.create({
          data: {
            name: product.name,
            sku: product.code,
            barcode: product.code,
            category: {
              connect: { id: category.id }
            },
            costPrice: product.cost,
            sellingPrice: product.price,
            reorderLevel: 5,
            status: 'ACTIVE',
            // Leave production costs as null
            fabricCost: null,
            manufacturingCost: null,
            washingCost: null
          }
        });

        // Add inventory to main warehouse
        await prisma.inventory.create({
          data: {
            productId: newProduct.id,
            branchId: mainBranch.id,
            quantity: product.quantity
          }
        });

        console.log(`✅ Added: ${product.code} - ${product.name} (${product.quantity} units)`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error adding ${product.code}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${successCount} products`);
    console.log(`⚠️  Skipped (already exist): ${skipCount} products`);
    console.log(`❌ Errors: ${errorCount} products`);
    console.log(`📦 Total processed: ${products.length} products`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importProducts();
