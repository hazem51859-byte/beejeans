require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create categories
    console.log('Creating categories...');
    const menCategory = await prisma.category.create({
      data: { name: 'ملابس رجالي', description: 'ملابس للرجال' }
    });

    const womenCategory = await prisma.category.create({
      data: { name: 'ملابس حريمي', description: 'ملابس للسيدات' }
    });

    const kidsCategory = await prisma.category.create({
      data: { name: 'ملابس أطفال', description: 'ملابس للأطفال' }
    });

    // Create branches
    console.log('Creating branches...');
    const branch1 = await prisma.branch.create({
      data: {
        name: 'شبرا 1',
        code: 'SHOBRA1',
        url: 'https://pos.beejeans.com/SHOBRA1',
        address: 'شبرا 1',
        phone: '01000000001',
        city: 'القاهرة'
      }
    });

    const branch2 = await prisma.branch.create({
      data: {
        name: 'شبرا النص',
        code: 'SHOBRA_NOSS',
        url: 'https://pos.beejeans.com/SHOBRA_NOSS',
        address: 'شبرا النص',
        phone: '01000000002',
        city: 'القاهرة'
      }
    });

    const branch3 = await prisma.branch.create({
      data: {
        name: 'شبرا الكبير',
        code: 'SHOBRA_KABIR',
        url: 'https://pos.beejeans.com/SHOBRA_KABIR',
        address: 'شبرا الكبير',
        phone: '01000000003',
        city: 'القاهرة'
      }
    });

    const branch4 = await prisma.branch.create({
      data: {
        name: 'امبابه الكبير',
        code: 'IMBABA_KABIR',
        url: 'https://pos.beejeans.com/IMBABA_KABIR',
        address: 'امبابه الكبير',
        phone: '01000000004',
        city: 'الجيزة'
      }
    });

    const branch5 = await prisma.branch.create({
      data: {
        name: 'امبابه الصغير',
        code: 'IMBABA_SAGHIR',
        url: 'https://pos.beejeans.com/IMBABA_SAGHIR',
        address: 'امبابه الصغير',
        phone: '01000000005',
        city: 'الجيزة'
      }
    });

    // Create admin user
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@pos.com',
        password: hashedPassword,
        fullName: 'مدير النظام',
        phone: '01234567890',
        role: 'ADMIN'
      }
    });

    const manager1 = await prisma.user.create({
      data: {
        username: 'manager1',
        email: 'manager1@pos.com',
        password: await bcrypt.hash('manager123', 10),
        fullName: 'مدير شبرا 1',
        phone: '01234567891',
        role: 'MANAGER',
        branchId: branch1.id
      }
    });

    const cashier1 = await prisma.user.create({
      data: {
        username: 'cashier1',
        email: 'cashier1@pos.com',
        password: await bcrypt.hash('cashier123', 10),
        fullName: 'كاشير 1 - شبرا 1',
        phone: '01234567892',
        role: 'CASHIER',
        branchId: branch1.id
      }
    });

    const cashier2 = await prisma.user.create({
      data: {
        username: 'cashier2',
        email: 'cashier2@pos.com',
        password: await bcrypt.hash('cashier123', 10),
        fullName: 'كاشير 1 - شبرا النص',
        phone: '01234567893',
        role: 'CASHIER',
        branchId: branch2.id
      }
    });

    // Create products
    console.log('Creating products...');
    const products = [
      {
        sku: 'MEN-SHIRT-001',
        barcode: '1234567890001',
        name: 'قميص رجالي كلاسيك',
        categoryId: menCategory.id,
        costPrice: 150,
        sellingPrice: 250,
        size: 'L',
        color: 'أبيض',
        brand: 'Classic',
        taxRate: 0
      },
      {
        sku: 'MEN-PANTS-001',
        barcode: '1234567890002',
        name: 'بنطلون جينز رجالي',
        categoryId: menCategory.id,
        costPrice: 200,
        sellingPrice: 350,
        size: '32',
        color: 'أزرق',
        brand: 'Denim Co',
        taxRate: 0
      },
      {
        sku: 'WOM-DRESS-001',
        barcode: '1234567890003',
        name: 'فستان سواريه',
        categoryId: womenCategory.id,
        costPrice: 300,
        sellingPrice: 500,
        size: 'M',
        color: 'أحمر',
        brand: 'Elegance',
        taxRate: 0
      },
      {
        sku: 'WOM-BLOUSE-001',
        barcode: '1234567890004',
        name: 'بلوزة شيفون',
        categoryId: womenCategory.id,
        costPrice: 120,
        sellingPrice: 200,
        size: 'L',
        color: 'وردي',
        brand: 'Fashion',
        taxRate: 0
      },
      {
        sku: 'KID-TSHIRT-001',
        barcode: '1234567890005',
        name: 'تيشيرت أطفال',
        categoryId: kidsCategory.id,
        costPrice: 50,
        sellingPrice: 100,
        size: '8-10',
        color: 'متعدد الألوان',
        brand: 'Kids Fun',
        taxRate: 0
      }
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = await prisma.product.create({ data: productData });
      createdProducts.push(product);

      // Add inventory for each branch
      await prisma.inventory.create({
        data: {
          productId: product.id,
          branchId: branch1.id,
          quantity: Math.floor(Math.random() * 50) + 20,
          minQuantity: 10
        }
      });

      await prisma.inventory.create({
        data: {
          productId: product.id,
          branchId: branch2.id,
          quantity: Math.floor(Math.random() * 50) + 20,
          minQuantity: 10
        }
      });

      await prisma.inventory.create({
        data: {
          productId: product.id,
          branchId: branch3.id,
          quantity: Math.floor(Math.random() * 50) + 20,
          minQuantity: 10
        }
      });
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('-----------------------------------');
    console.log('Admin:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\nManager (شبرا 1):');
    console.log('  Username: manager1');
    console.log('  Password: manager123');
    console.log('\nCashier (شبرا 1):');
    console.log('  Username: cashier1');
    console.log('  Password: cashier123');
    console.log('\nCashier (شبرا النص):');
    console.log('  Username: cashier2');
    console.log('  Password: cashier123');
    console.log('-----------------------------------\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
