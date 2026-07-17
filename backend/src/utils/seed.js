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
        name: 'فرع المعادي',
        code: 'MAD',
        address: 'شارع 9، المعادي، القاهرة',
        phone: '0223456789',
        city: 'القاهرة'
      }
    });

    const branch2 = await prisma.branch.create({
      data: {
        name: 'فرع مدينة نصر',
        code: 'NSR',
        address: 'مدينة نصر، القاهرة',
        phone: '0224567890',
        city: 'القاهرة'
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
        fullName: 'مدير فرع المعادي',
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
        fullName: 'كاشير 1 - المعادي',
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
        fullName: 'كاشير 1 - مدينة نصر',
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
        taxRate: 14
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
        taxRate: 14
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
        taxRate: 14
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
        taxRate: 14
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
        taxRate: 14
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
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('-----------------------------------');
    console.log('Admin:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\nManager (فرع المعادي):');
    console.log('  Username: manager1');
    console.log('  Password: manager123');
    console.log('\nCashier (فرع المعادي):');
    console.log('  Username: cashier1');
    console.log('  Password: cashier123');
    console.log('\nCashier (فرع مدينة نصر):');
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
