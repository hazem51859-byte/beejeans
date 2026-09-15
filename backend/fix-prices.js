const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// الأسعار الصحيحة: سعر البيع أولاً، ثم التكلفة
const correctPrices = [
  { code: "1001", sellingPrice: 315, costPrice: 276 },
  { code: "1002", sellingPrice: 315, costPrice: 276 },
  { code: "1003", sellingPrice: 315, costPrice: 276 },
  { code: "1004", sellingPrice: 320, costPrice: 276 },
  { code: "1005", sellingPrice: 345, costPrice: 290 },
  { code: "1006", sellingPrice: 335, costPrice: 230 },
  { code: "1007", sellingPrice: 305, costPrice: 191 },
  { code: "1009", sellingPrice: 350, costPrice: 295 },
  { code: "1010", sellingPrice: 315, costPrice: 275 },
  { code: "1011", sellingPrice: 315, costPrice: 275 },
  { code: "1012", sellingPrice: 350, costPrice: 301 },
  { code: "1013", sellingPrice: 320, costPrice: 248 },
  { code: "1014", sellingPrice: 335, costPrice: 274 },
  { code: "1015", sellingPrice: 320, costPrice: 238 },
  { code: "1016", sellingPrice: 320, costPrice: 238 },
  { code: "1017", sellingPrice: 320, costPrice: 247 },
  { code: "1018", sellingPrice: 335, costPrice: 300 },
  { code: "1021", sellingPrice: 335, costPrice: 275 },
  { code: "1023", sellingPrice: 330, costPrice: 277 },
  { code: "1024", sellingPrice: 330, costPrice: 262 },
  { code: "1028", sellingPrice: 325, costPrice: 259 },
  { code: "1031", sellingPrice: 285, costPrice: 223 },
  { code: "1032", sellingPrice: 335, costPrice: 210 },
  { code: "1036", sellingPrice: 290, costPrice: 181 },
  { code: "1037", sellingPrice: 325, costPrice: 257 },
  { code: "1038", sellingPrice: 350, costPrice: 303 },
  { code: "1039", sellingPrice: 335, costPrice: 282 },
  { code: "1040", sellingPrice: 280, costPrice: 230 },
  { code: "1041", sellingPrice: 280, costPrice: 230 },
  { code: "1042", sellingPrice: 300, costPrice: 206 },
  { code: "1043", sellingPrice: 295, costPrice: 230 },
  { code: "1051", sellingPrice: 300, costPrice: 235 },
  { code: "1052", sellingPrice: 300, costPrice: 239 },
  { code: "1053", sellingPrice: 370, costPrice: 320 },
  { code: "1055", sellingPrice: 220, costPrice: 220 },
  { code: "1061", sellingPrice: 550, costPrice: 458 },
  { code: "1062", sellingPrice: 650, costPrice: 518 },
  { code: "1100", sellingPrice: 265, costPrice: 200 },
  { code: "1101", sellingPrice: 265, costPrice: 206 },
  { code: "1102", sellingPrice: 425, costPrice: 413 },
  { code: "1103", sellingPrice: 450, costPrice: 388 },
  { code: "1104", sellingPrice: 400, costPrice: 356 },
  { code: "1105", sellingPrice: 275, costPrice: 60 },
  { code: "1107", sellingPrice: 350, costPrice: 192 },
  { code: "1108", sellingPrice: 450, costPrice: 342 },
  { code: "1109", sellingPrice: 450, costPrice: 400 },
  { code: "1111", sellingPrice: 340, costPrice: 276 },
  { code: "1112", sellingPrice: 420, costPrice: 356 },
  { code: "1117", sellingPrice: 225, costPrice: 140 },
  { code: "1119", sellingPrice: 460, costPrice: 384 },
  { code: "1120", sellingPrice: 200, costPrice: 125 },
  { code: "1121", sellingPrice: 250, costPrice: 175 },
  { code: "1123", sellingPrice: 400, costPrice: 250 },
  { code: "1132", sellingPrice: 225, costPrice: 147 },
  { code: "1133", sellingPrice: 275, costPrice: 227 },
  { code: "1134", sellingPrice: 260, costPrice: 189 },
  { code: "1135", sellingPrice: 260, costPrice: 209 },
  { code: "1136", sellingPrice: 350, costPrice: 289 },
  { code: "1137", sellingPrice: 225, costPrice: 131 },
  { code: "1138", sellingPrice: 225, costPrice: 151 },
  { code: "1139", sellingPrice: 275, costPrice: 231 },
  { code: "1140", sellingPrice: 260, costPrice: 193 },
  { code: "1141", sellingPrice: 260, costPrice: 213 },
  { code: "1142", sellingPrice: 350, costPrice: 293 }
];

async function fixPrices() {
  try {
    console.log('\n🔄 Fixing product prices...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const item of correctPrices) {
      try {
        const product = await prisma.product.findUnique({
          where: { sku: item.code }
        });

        if (!product) {
          console.log(`⚠️  Product ${item.code} not found!`);
          continue;
        }

        await prisma.product.update({
          where: { sku: item.code },
          data: {
            sellingPrice: item.sellingPrice,
            costPrice: item.costPrice
          }
        });

        console.log(`✅ ${item.code}: Cost ${item.costPrice} → Price ${item.sellingPrice} (Profit: ${item.sellingPrice - item.costPrice})`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error fixing ${item.code}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Price Fix Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount} products`);
    console.log(`❌ Errors: ${errorCount} products`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPrices();
