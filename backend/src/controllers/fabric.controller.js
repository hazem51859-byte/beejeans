const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =====================
// Fabric Types Management
// =====================

// Get all fabric types
exports.getAllFabricTypes = async (req, res) => {
  try {
    const fabricTypes = await prisma.fabricType.findMany({
      include: {
        fabricStock: true,
        _count: {
          select: {
            fabricPurchases: true,
            manufacturingOrders: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: fabricTypes
    });
  } catch (error) {
    console.error('Error fetching fabric types:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب أنواع الخامات'
    });
  }
};

// Get fabric type by ID
exports.getFabricTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const fabricType = await prisma.fabricType.findUnique({
      where: { id },
      include: {
        fabricStock: true,
        fabricPurchases: {
          orderBy: { purchaseDate: 'desc' },
          take: 10
        },
        manufacturingOrders: {
          orderBy: { sentDate: 'desc' },
          take: 10
        }
      }
    });

    if (!fabricType) {
      return res.status(404).json({
        success: false,
        message: 'الخامة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: fabricType
    });
  } catch (error) {
    console.error('Error fetching fabric type:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات الخامة'
    });
  }
};

// Create fabric type
exports.createFabricType = async (req, res) => {
  try {
    const { name, pricePerMeter, description } = req.body;

    // Check if name exists
    const existing = await prisma.fabricType.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'اسم الخامة موجود بالفعل'
      });
    }

    // Create fabric type and stock entry
    const fabricType = await prisma.fabricType.create({
      data: {
        name,
        pricePerMeter: parseFloat(pricePerMeter),
        description,
        fabricStock: {
          create: {
            availableMeters: 0,
            reservedMeters: 0,
            totalPurchased: 0,
            totalUsed: 0
          }
        }
      },
      include: {
        fabricStock: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة الخامة بنجاح',
      data: fabricType
    });
  } catch (error) {
    console.error('Error creating fabric type:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إضافة الخامة'
    });
  }
};

// Update fabric type
exports.updateFabricType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pricePerMeter, description, isActive } = req.body;

    const fabricType = await prisma.fabricType.update({
      where: { id },
      data: {
        name,
        pricePerMeter: pricePerMeter ? parseFloat(pricePerMeter) : undefined,
        description,
        isActive
      },
      include: {
        fabricStock: true
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الخامة بنجاح',
      data: fabricType
    });
  } catch (error) {
    console.error('Error updating fabric type:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الخامة'
    });
  }
};

// Delete fabric type
exports.deleteFabricType = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if has purchases or orders
    const fabricType = await prisma.fabricType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            fabricPurchases: true,
            manufacturingOrders: true,
            manufacturingOrderFabrics: true
          }
        }
      }
    });

    if (
      fabricType._count.fabricPurchases > 0 || 
      fabricType._count.manufacturingOrders > 0 || 
      (fabricType._count.manufacturingOrderFabrics && fabricType._count.manufacturingOrderFabrics > 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف الخامة لوجود عمليات مرتبطة بها'
      });
    }

    await prisma.fabricType.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'تم حذف الخامة بنجاح'
    });
  } catch (error) {
    console.error('Error deleting fabric type:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حذف الخامة'
    });
  }
};

// =====================
// Fabric Purchases
// =====================

// Get all fabric purchases
exports.getAllFabricPurchases = async (req, res) => {
  try {
    const { supplierId, fabricTypeId, startDate, endDate, paymentStatus } = req.query;

    const where = {};
    if (supplierId) where.supplierId = supplierId;
    if (fabricTypeId) where.fabricTypeId = fabricTypeId;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) where.purchaseDate.gte = new Date(startDate);
      if (endDate) where.purchaseDate.lte = new Date(endDate);
    }

    const purchases = await prisma.fabricPurchase.findMany({
      where,
      include: {
        supplier: true,
        fabricType: true
      },
      orderBy: { purchaseDate: 'desc' }
    });

    res.json({
      success: true,
      data: purchases
    });
  } catch (error) {
    console.error('Error fetching fabric purchases:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب مشتريات القماش'
    });
  }
};

// Create fabric purchase
exports.createFabricPurchase = async (req, res) => {
  try {
    const {
      invoiceNumber,
      supplierId,
      fabricTypeId,
      meters,
      paidAmount,
      purchaseDate,
      notes
    } = req.body;

    // Get fabric type to get price
    const fabricType = await prisma.fabricType.findUnique({
      where: { id: fabricTypeId }
    });

    if (!fabricType) {
      return res.status(404).json({
        success: false,
        message: 'نوع القماش غير موجود'
      });
    }

    const metersFloat = parseFloat(meters);
    const pricePerMeter = fabricType.pricePerMeter;
    const totalCost = metersFloat * pricePerMeter;
    const paidAmountFloat = parseFloat(paidAmount || 0);
    const remainingAmount = totalCost - paidAmountFloat;
    const paymentStatus = remainingAmount <= 0 ? 'PAID' : (paidAmountFloat > 0 ? 'PARTIAL' : 'PENDING');

    // Create purchase and update stock
    const purchase = await prisma.$transaction(async (tx) => {
      // Create purchase
      const newPurchase = await tx.fabricPurchase.create({
        data: {
          invoiceNumber,
          supplierId,
          fabricTypeId,
          meters: metersFloat,
          pricePerMeter,
          totalCost,
          paidAmount: paidAmountFloat,
          remainingAmount,
          paymentStatus,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          notes,
          createdBy: req.user.id
        },
        include: {
          supplier: true,
          fabricType: true
        }
      });

      // Update or create fabric stock
      const existingStock = await tx.fabricStock.findUnique({
        where: { fabricTypeId }
      });

      if (existingStock) {
        await tx.fabricStock.update({
          where: { fabricTypeId },
          data: {
            availableMeters: { increment: metersFloat },
            totalPurchased: { increment: metersFloat },
            lastUpdated: new Date()
          }
        });
      } else {
        await tx.fabricStock.create({
          data: {
            fabricTypeId,
            availableMeters: metersFloat,
            totalPurchased: metersFloat,
            totalUsed: 0,
            reservedMeters: 0,
            lastUpdated: new Date()
          }
        });
      }

      // Update supplier balance
      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          totalPurchases: { increment: totalCost },
          totalPaid: { increment: paidAmountFloat },
          balance: { increment: remainingAmount }
        }
      });

      return newPurchase;
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة مشتريات القماش بنجاح',
      data: purchase
    });
  } catch (error) {
    console.error('Error creating fabric purchase:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إضافة مشتريات القماش'
    });
  }
};

// =====================
// Fabric Stock/Warehouse
// =====================

// Get fabric warehouse (all stock)
exports.getFabricWarehouse = async (req, res) => {
  try {
    console.log('🔍 Fetching fabric warehouse...');
    
    // First get all fabric types
    const fabricTypes = await prisma.fabricType.findMany({
      where: { isActive: true }
    });
    
    console.log(`📦 Found ${fabricTypes.length} active fabric types`);
    
    // Then get stock for each type
    const stockData = await Promise.all(
      fabricTypes.map(async (type) => {
        const stock = await prisma.fabricStock.findUnique({
          where: { fabricTypeId: type.id }
        });
        
        return {
          id: stock?.id || `temp-${type.id}`,
          fabricTypeId: type.id,
          fabricType: type,
          availableMeters: stock?.availableMeters || 0,
          reservedMeters: stock?.reservedMeters || 0,
          totalPurchased: stock?.totalPurchased || 0,
          totalUsed: stock?.totalUsed || 0,
          lastUpdated: stock?.lastUpdated || new Date(),
          createdAt: stock?.createdAt || new Date()
        };
      })
    );
    
    console.log(`✅ Processed ${stockData.length} stock entries`);

    res.json({
      success: true,
      data: stockData
    });
  } catch (error) {
    console.error('❌ Error fetching fabric warehouse:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'فشل في جلب مخزن القماش',
      error: error.message
    });
  }
};

// Get stock by fabric type
exports.getStockByFabricType = async (req, res) => {
  try {
    const { fabricTypeId } = req.params;

    const stock = await prisma.fabricStock.findUnique({
      where: { fabricTypeId },
      include: {
        fabricType: true
      }
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'المخزون غير موجود'
      });
    }

    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    console.error('Error fetching fabric stock:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب المخزون'
    });
  }
};

module.exports = exports;
