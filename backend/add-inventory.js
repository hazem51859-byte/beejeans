const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const productsQuantities = [
  { code: "1001", quantity: 317 },
  { code: "1002", quantity: 552 },
  { code: "1003", quantity: 174 },
  { code: "1004", quantity: 69 },
  { code: "1005", quantity: 111 },
  { code: "1006", quantity: 126 },
  { code: "1007", quantity: 9 },
  { code: "1009", quantity: 678 },
  { code: "1010", quantity: 1112 },
  { code: "1011", quantity: 292 },
  { code: "1012", quantity: 234 },
  { code: "1013", quantity: 276 },
  { code: "1014", quantity: 300 },
  { code: "1015", quantity: 148 },
  { code: "1016", quantity: 207 },
  { code: "1017", quantity: 252 },
  { code: "1018", quantity: 570 },
  { code: "1021", quantity: 156 },
  { code: "1023", quantity: 127 },
  { code: "1024", quantity: 263 },
  { code: "1028", quantity: 254 },
  { code: "1031", quantity: 107 },
  { code: "1032", quantity: 51 },
  { code: "1036", quantity: 36 },
  { code: "1037", quantity: 108 },
  { code: "1038", quantity: 29 },
  { code: "1039", quantity: 41 },
  { code: "1040", quantity: 41 },
  { code: "1041", quantity: 55 },
  { code: "1042", quantity: 3 },
  { code: "1043", quantity: 348 },
  { code: "1051", quantity: 56 },
  { code: "1052", quantity: 60 },
  { code: "1053", quantity: 2 },
  { code: "1055", quantity: 192 },
  { code: "1061", quantity: 15 },
  { code: "1062", quantity: 68 },
  { code: "1100", quantity: 48 },
  { code: "1101", quantity: 62 },
  { code: "1102", quantity: 10 },
  { code: "1103", quantity: 18 },
  { code: "1104", quantity: 8 },
  { code: "1105", quantity: 17 },
  { code: "1107", quantity: 18 },
  { code: "1108", quantity: 18 },
  { code: "1109", quantity: 19 },
  { code: "1111", quantity: 23 },
  { code: "1112", quantity: 9 },
  { code: "1117", quantity: 42 },
  { code: "1119", quantity: 48 },
  { code: "1120", quantity: 49 },
  { code: "1121", quantity: 32 },
  { code: "1123", quantity: 40 },
  { code: "1132", quantity: 64 },
  { code: "1133", quantity: 66 },
  { code: "1134", quantity: 25 },
  { code: "1135", quantity: 24 },
  { code: "1136", quantity: 24 },
  { code: "1137", quantity: 37 },
  { code: "1138", quantity: 37 },
  { code: "1139", quantity: 35 },
  { code: "1140", quantity: 72 },
  { code: "1141", quantity: 71 },
  { code: "1142", quantity: 70 }
];

async function addInventory() {
  try {
    console.log('\n🔄 Adding inventory to main warehouse...\n');

    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainBranch) {
      console.error('❌ Main warehouse not found!');
      return;
    }

    console.log(`✅ Found main warehouse: ${mainBranch.name}\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const item of productsQuantities) {
      try {
        const product = await prisma.product.findUnique({
          where: { sku: item.code }
        });

        if (!product) {
          console.log(`⚠️  Product ${item.code} not found!`);
          skipCount++;
          continue;
        }

        // Check if inventory exists
        const existingInventory = await prisma.inventory.findFirst({
          where: {
            productId: product.id,
            branchId: mainBranch.id
          }
        });

        if (existingInventory) {
          // Update existing
          await prisma.inventory.update({
            where: { id: existingInventory.id },
            data: { quantity: item.quantity }
          });
          console.log(`✅ Updated: ${item.code} - ${product.name} (${item.quantity} units)`);
        } else {
          // Create new
          await prisma.inventory.create({
            data: {
              productId: product.id,
              branchId: mainBranch.id,
              quantity: item.quantity
            }
          });
          console.log(`✅ Added: ${item.code} - ${product.name} (${item.quantity} units)`);
        }

        successCount++;

      } catch (error) {
        console.error(`❌ Error adding inventory for ${item.code}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Inventory Import Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully processed: ${successCount} items`);
    console.log(`⚠️  Skipped: ${skipCount} items`);
    console.log(`❌ Errors: ${errorCount} items`);
    console.log(`📦 Total: ${productsQuantities.length} items`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addInventory();
