const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all purchases
exports.getAllPurchases = async (req, res) => {
  try {
    const { branchId, supplierName, startDate, endDate } = req.query;
    
    const where = {};
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (supplierName) {
      where.supplierName = {
        contains: supplierName
      };
    }
    
    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) where.purchaseDate.gte = new Date(startDate);
      if (endDate) where.purchaseDate.lte = new Date(endDate);
    }
    
    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                costPrice: true
              }
            }
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    });
    
    // حساب الإجماليات
    const total = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
    const totalPaid = purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0);
    const totalRemaining = purchases.reduce((sum, purchase) => sum + purchase.remainingAmount, 0);
    
    res.json({
      success: true,
      data: {
        purchases,
        summary: {
          total,
          paid: totalPaid,
          remaining: totalRemaining,
          count: purchases.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch purchases'
    });
  }
};

// Get purchase by ID
exports.getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        branch: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Purchase not found'
      });
    }
    
    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase'
    });
  }
};

// Create purchase
exports.createPurchase = async (req, res) => {
  try {
    const { 
      invoiceNumber, 
      supplierId, 
      branchId, 
      items, 
      paidAmount,
      purchaseDate,
      notes
    } = req.body;
    
    if (!supplierId) {
      return res.status(400).json({
        success: false,
        error: 'supplierId is required'
      });
    }

    // Verification of Supplier
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found'
      });
    }

    // Default targetBranchId to the MAIN branch if not provided
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const mainBranch = await prisma.branch.findUnique({ where: { code: 'MAIN' } });
      if (mainBranch) {
        targetBranchId = mainBranch.id;
      } else {
        const firstBranch = await prisma.branch.findFirst();
        targetBranchId = firstBranch ? firstBranch.id : null;
      }
    }

    if (!targetBranchId) {
      return res.status(400).json({
        success: false,
        error: 'No target branch found for stocking'
      });
    }

    // Calculate total amount and total quantity
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    const remainingAmount = totalAmount - (paidAmount || 0);
    
    // Process items to check/create products
    const processedItems = [];
    
    for (const item of items) {
      const productName = item.productName || item.description || 'منتج وارد';
      const size = item.size || null;
      const color = item.color || null;
      
      // Look for existing product with same name, size, and color
      let product = await prisma.product.findFirst({
        where: {
          name: { equals: productName },
          size: { equals: size },
          color: { equals: color }
        }
      });
      
      if (!product) {
        // Look for a category with name = productName or use any fallback
        let category = await prisma.category.findFirst({
          where: { name: productName }
        });
        
        if (!category) {
          category = await prisma.category.findFirst();
          if (!category) {
            category = await prisma.category.create({
              data: {
                name: 'عام',
                description: 'تصنيف عام للمنتجات المضافة تلقائياً'
              }
            });
          }
        }
        
        // Create new product - استخدام الأسعار من الصنف فقط
        const sku = `${category.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
        const barcode = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // ⚠️ CRITICAL: الأسعار من الصنف فقط - بدون أي حسابات
        const costPrice = category.defaultCostPrice || item.unitPrice;
        const sellingPrice = category.defaultSellingPrice || 0;
        
        // 🔒 VALIDATION: التأكد أن السعر البيع موجود ومش صفر
        if (!sellingPrice || sellingPrice === 0) {
          throw new Error(`❌ الصنف "${category.name}" ليس له سعر بيع محدد. يجب تحديد سعر البيع في صفحة الأصناف أولاً`);
        }
        
        // 🔒 VALIDATION: السعر يجب أن يكون من الصنف فقط (بدون حسابات)
        console.log(`✅ استخدام أسعار الصنف "${category.name}": تكلفة=${costPrice}, بيع=${sellingPrice}`);
        
        // 🚫 BLOCKED: أي محاولة لحساب السعر تلقائياً
        // المسموح فقط: استخدام category.defaultCostPrice و category.defaultSellingPrice
        // ❌ ممنوع: sellingPrice = costPrice * أي رقم
        
        product = await prisma.product.create({
          data: {
            sku,
            barcode,
            name: productName,
            categoryId: category.id,
            costPrice,
            sellingPrice,
            size,
            color,
            status: 'ACTIVE'
          }
        });
      } else {
        // Update costPrice if changed
        await prisma.product.update({
          where: { id: product.id },
          data: { costPrice: item.unitPrice }
        });
      }
      
      processedItems.push({
        productId: product.id,
        categoryId: product.categoryId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice
      });
    }

    // Get categories and calculate serials
    let startSerial = null;
    let endSerial = null;
    const serialsByCategory = {};

    // جمع الكميات حسب الصنف
    for (const item of processedItems) {
      if (!serialsByCategory[item.categoryId]) {
        serialsByCategory[item.categoryId] = 0;
      }
      serialsByCategory[item.categoryId] += item.quantity;
    }

    // الحصول على السيريالات لكل صنف
    const categorySerials = {};
    for (const [categoryId, quantity] of Object.entries(serialsByCategory)) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (category && category.serialStartNumber) {
        const lastUsed = category.lastSerialUsed || (category.serialStartNumber - 1);
        const nextSerial = lastUsed + 1;
        const endSerialForCategory = lastUsed + quantity;

        categorySerials[categoryId] = {
          start: nextSerial,
          end: endSerialForCategory,
          current: nextSerial
        };

        if (!startSerial) {
          startSerial = nextSerial.toString();
        }
        endSerial = endSerialForCategory.toString();
      }
    }

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase
      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber,
          supplierId,
          supplierPhone: supplier.phone,
          branchId: targetBranchId,
          totalAmount,
          paidAmount: paidAmount || 0,
          remainingAmount,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          notes,
          startSerial,
          endSerial,
          items: {
            create: processedItems.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total
            }))
          }
        },
        include: {
          branch: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // 2. Create Product Serials from category sequences
      let totalSerialsCreated = 0;
      
      for (const item of processedItems) {
        const categorySerial = categorySerials[item.categoryId];
        
        if (categorySerial) {
          for (let i = 0; i < item.quantity; i++) {
            const serialNum = categorySerial.current;
            
            await tx.productSerial.create({
              data: {
                serialNumber: serialNum.toString(),
                productId: item.productId,
                branchId: targetBranchId,
                registeredBy: req.user.id,
                status: 'AVAILABLE',
                purchaseId: purchase.id
              }
            });
            
            categorySerial.current++;
            totalSerialsCreated++;
          }

          // Update lastSerialUsed for this category
          await tx.category.update({
            where: { id: item.categoryId },
            data: {
              lastSerialUsed: categorySerial.end
            }
          });
        }
      }

      // 3. Update Supplier Financials
      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          totalPurchases: { increment: totalAmount },
          totalPaid: { increment: paidAmount || 0 },
          balance: { increment: remainingAmount }
        }
      });

      // 4. Update Inventory
      for (const item of processedItems) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: targetBranchId
            }
          }
        });
        
        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantity: { increment: item.quantity },
              lastRestockDate: new Date()
            }
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              branchId: targetBranchId,
              quantity: item.quantity,
              lastRestockDate: new Date()
            }
          });
        }
      }

      return { purchase, totalSerialsCreated };
    });

    res.status(201).json({
      success: true,
      data: result.purchase,
      serialsCreated: result.totalSerialsCreated,
      serialRange: startSerial ? `${startSerial} - ${endSerial}` : null
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create purchase'
    });
  }
};

// Update purchase payment
exports.updatePurchasePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAmount } = req.body;
    
    const purchase = await prisma.purchase.findUnique({
      where: { id }
    });
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Purchase not found'
      });
    }
    
    const newPaidAmount = purchase.paidAmount + paidAmount;
    const remainingAmount = purchase.totalAmount - newPaidAmount;
    
    const result = await prisma.$transaction(async (tx) => {
      // Update purchase
      const updatedPurchase = await tx.purchase.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount
        },
        include: {
          branch: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      // Update supplier
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: {
          totalPaid: { increment: paidAmount },
          balance: { decrement: paidAmount }
        }
      });

      return updatedPurchase;
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating purchase payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update purchase payment'
    });
  }
};

// Delete purchase
exports.deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    
    // حذف الشراء (سيحذف التفاصيل تلقائياً بسبب Cascade)
    await prisma.purchase.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Purchase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete purchase'
    });
  }
};

// Get purchases summary
exports.getPurchasesSummary = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    
    const where = {};
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) where.purchaseDate.gte = new Date(startDate);
      if (endDate) where.purchaseDate.lte = new Date(endDate);
    }
    
    const purchases = await prisma.purchase.findMany({
      where
    });
    
    // تجميع حسب المورد
    const bySupplier = {};
    let totalAmount = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    
    purchases.forEach(purchase => {
      const supplier = purchase.supplierName || 'Unknown';
      
      if (!bySupplier[supplier]) {
        bySupplier[supplier] = {
          supplier,
          total: 0,
          paid: 0,
          remaining: 0,
          count: 0
        };
      }
      
      bySupplier[supplier].total += purchase.totalAmount;
      bySupplier[supplier].paid += purchase.paidAmount;
      bySupplier[supplier].remaining += purchase.remainingAmount;
      bySupplier[supplier].count += 1;
      
      totalAmount += purchase.totalAmount;
      totalPaid += purchase.paidAmount;
      totalRemaining += purchase.remainingAmount;
    });
    
    res.json({
      success: true,
      data: {
        bySupplier: Object.values(bySupplier),
        summary: {
          total: totalAmount,
          paid: totalPaid,
          remaining: totalRemaining,
          count: purchases.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching purchases summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch purchases summary'
    });
  }
};
