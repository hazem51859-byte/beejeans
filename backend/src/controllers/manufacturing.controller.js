const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =====================
// Fabric Stock (for Production Dashboard)
// =====================

// Get fabric stock summary
exports.getFabricStock = async (req, res) => {
  try {
    const fabricStock = await prisma.fabricStock.findMany({
      include: {
        fabricType: true
      }
    });

    res.json({
      success: true,
      data: fabricStock
    });
  } catch (error) {
    console.error('Error fetching fabric stock:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب مخزون القماش'
    });
  }
};

// =====================
// Manufacturing Orders
// =====================

// Get all manufacturing orders
exports.getAllManufacturingOrders = async (req, res) => {
  try {
    const { supplierId, fabricTypeId, status, startDate, endDate } = req.query;

    const where = {};
    if (supplierId) where.supplierId = supplierId;
    if (fabricTypeId) where.fabricTypeId = fabricTypeId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.sentDate = {};
      if (startDate) where.sentDate.gte = new Date(startDate);
      if (endDate) where.sentDate.lte = new Date(endDate);
    }

    const orders = await prisma.manufacturingOrder.findMany({
      where,
      include: {
        supplier: true,
        fabricType: true,
        washingOrders: true
      },
      orderBy: { sentDate: 'desc' }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching manufacturing orders:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب أوامر التصنيع'
    });
  }
};

// Get manufacturing order by ID
exports.getManufacturingOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        fabricType: true,
        washingOrders: {
          include: {
            supplier: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'أمر التصنيع غير موجود'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching manufacturing order:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب أمر التصنيع'
    });
  }
};

// Create manufacturing order (send fabric to manufacturer)
exports.createManufacturingOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      supplierId,
      fabricTypeId,
      metersUsed,
      sentDate,
      notes
    } = req.body;

    // Check fabric stock availability
    const fabricStock = await prisma.fabricStock.findUnique({
      where: { fabricTypeId },
      include: { fabricType: true }
    });

    if (!fabricStock) {
      return res.status(404).json({
        success: false,
        message: 'نوع القماش غير موجود'
      });
    }

    const metersFloat = parseFloat(metersUsed);

    if (fabricStock.availableMeters < metersFloat) {
      return res.status(400).json({
        success: false,
        message: `القماش المتاح غير كافي. المتوفر: ${fabricStock.availableMeters} متر`
      });
    }

    // Create order and update stock
    const order = await prisma.$transaction(async (tx) => {
      // Create manufacturing order
      const newOrder = await tx.manufacturingOrder.create({
        data: {
          orderNumber,
          supplierId,
          fabricTypeId,
          metersUsed: metersFloat,
          fabricCostPerMeter: fabricStock.fabricType.pricePerMeter,
          status: 'SENT',
          sentDate: sentDate ? new Date(sentDate) : new Date(),
          sentBy: req.user.id,
          notes
        },
        include: {
          supplier: true,
          fabricType: true
        }
      });

      // Update fabric stock (remove from available, add to used)
      await tx.fabricStock.update({
        where: { fabricTypeId },
        data: {
          availableMeters: { decrement: metersFloat },
          totalUsed: { increment: metersFloat }
        }
      });

      return newOrder;
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء أمر التصنيع وإرسال القماش بنجاح',
      data: order
    });
  } catch (error) {
    console.error('Error creating manufacturing order:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء أمر التصنيع'
    });
  }
};

// Complete manufacturing order (receive manufactured pieces)
exports.completeManufacturingOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      piecesReceived,
      manufacturingCostPerPiece,
      paidAmount,
      receivedDate,
      notes
    } = req.body;

    const piecesInt = parseInt(piecesReceived);
    const costPerPiece = parseFloat(manufacturingCostPerPiece);
    const totalCost = piecesInt * costPerPiece;
    const paidAmountFloat = parseFloat(paidAmount || 0);
    const remainingAmount = totalCost - paidAmountFloat;
    const paymentStatus = remainingAmount <= 0 ? 'PAID' : (paidAmountFloat > 0 ? 'PARTIAL' : 'PENDING');

    // Update order and supplier balance, and update product
    const result = await prisma.$transaction(async (tx) => {
      // Get the manufacturing order
      const order = await tx.manufacturingOrder.findUnique({
        where: { id },
        include: { fabricType: true, product: true }
      });

      if (!order) {
        throw new Error('أمر التصنيع غير موجود');
      }

      // Update manufacturing order
      const updatedOrder = await tx.manufacturingOrder.update({
        where: { id },
        data: {
          piecesReceived: piecesInt,
          manufacturingCostPerPiece: costPerPiece,
          totalManufacturingCost: totalCost,
          paidAmount: paidAmountFloat,
          remainingAmount,
          paymentStatus,
          status: 'COMPLETED',
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          receivedBy: req.user.id,
          notes
        },
        include: {
          supplier: true,
          fabricType: true,
          product: true
        }
      });

      // Update supplier balance
      await tx.supplier.update({
        where: { id: updatedOrder.supplierId },
        data: {
          totalPurchases: { increment: totalCost },
          totalPaid: { increment: paidAmountFloat },
          balance: { increment: remainingAmount }
        }
      });

      // Update product if exists
      if (order.productId && order.product) {
        const fabricCostTotal = order.metersUsed * order.fabricCostPerMeter;
        const fabricCostPerPiece = fabricCostTotal / piecesInt;
        
        await tx.product.update({
          where: { id: order.productId },
          data: {
            fabricCost: fabricCostPerPiece,
            manufacturingCost: costPerPiece,
            costPrice: fabricCostPerPiece + costPerPiece, // سيتم إضافة تكلفة الغسيل لاحقاً
            totalPiecesProduced: { increment: piecesInt },
            status: 'ACTIVE' // تفعيل المنتج بعد التصنيع
          }
        });
      }

      return updatedOrder;
    });

    res.json({
      success: true,
      message: 'تم استلام القطع المصنعة وتحديث التكاليف بنجاح',
      data: result
    });
  } catch (error) {
    console.error('Error completing manufacturing order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'فشل في استلام القطع المصنعة'
    });
  }
};

// =====================
// Washing Orders
// =====================

// Get all washing orders
exports.getAllWashingOrders = async (req, res) => {
  try {
    const { supplierId, manufacturingOrderId, status, startDate, endDate } = req.query;

    const where = {};
    if (supplierId) where.supplierId = supplierId;
    if (manufacturingOrderId) where.manufacturingOrderId = manufacturingOrderId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.sentDate = {};
      if (startDate) where.sentDate.gte = new Date(startDate);
      if (endDate) where.sentDate.lte = new Date(endDate);
    }

    const orders = await prisma.washingOrder.findMany({
      where,
      include: {
        supplier: true,
        manufacturingOrder: {
          include: {
            fabricType: true
          }
        }
      },
      orderBy: { sentDate: 'desc' }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching washing orders:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب أوامر الغسيل'
    });
  }
};

// Create washing order
exports.createWashingOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      supplierId,
      manufacturingOrderId,
      piecesSent,
      sentDate,
      notes
    } = req.body;

    const order = await prisma.washingOrder.create({
      data: {
        orderNumber,
        supplierId,
        manufacturingOrderId,
        piecesSent: parseInt(piecesSent),
        status: 'SENT',
        sentDate: sentDate ? new Date(sentDate) : new Date(),
        sentBy: req.user.id,
        notes
      },
      include: {
        supplier: true,
        manufacturingOrder: {
          include: {
            fabricType: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إرسال القطع للغسيل بنجاح',
      data: order
    });
  } catch (error) {
    console.error('Error creating washing order:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء أمر الغسيل'
    });
  }
};

// Complete washing order and update product with final costs
exports.completeWashingOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      piecesReceived,
      washingCostPerPiece,
      paidAmount,
      receivedDate,
      productData, // {id, sellingPrice, color}
      notes
    } = req.body;

    const piecesInt = parseInt(piecesReceived);
    const costPerPiece = parseFloat(washingCostPerPiece);
    const totalCost = piecesInt * costPerPiece;
    const paidAmountFloat = parseFloat(paidAmount || 0);
    const remainingAmount = totalCost - paidAmountFloat;
    const paymentStatus = remainingAmount <= 0 ? 'PAID' : (paidAmountFloat > 0 ? 'PARTIAL' : 'PENDING');

    if (!productData?.id) {
      return res.status(400).json({
        success: false,
        message: 'يجب اختيار منتج من الأصناف'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get washing order with manufacturing order
      const washingOrder = await tx.washingOrder.findUnique({
        where: { id },
        include: {
          manufacturingOrder: {
            include: {
              product: true
            }
          }
        }
      });

      if (!washingOrder || !washingOrder.manufacturingOrder) {
        throw new Error('أمر الغسيل غير موجود');
      }

      const mfgOrder = washingOrder.manufacturingOrder;

      // Calculate costs
      const fabricCostTotal = mfgOrder.metersUsed * mfgOrder.fabricCostPerMeter;
      const mfgCostTotal = mfgOrder.totalManufacturingCost || 0;
      const washCostTotal = totalCost;
      
      // Final cost price including all stages
      const totalCostAllStages = fabricCostTotal + mfgCostTotal + washCostTotal;
      const finalCostPrice = totalCostAllStages / piecesInt;
      const fabricCostPerPiece = fabricCostTotal / piecesInt;

      // Update product with final costs
      const product = await tx.product.update({
        where: { id: productData.id },
        data: {
          fabricCost: fabricCostPerPiece,
          fabricMetersUsed: { increment: mfgOrder.metersUsed }, // إضافة الأمتار المستخدمة
          manufacturingCost: mfgOrder.manufacturingCostPerPiece || 0,
          washingCost: costPerPiece,
          costPrice: finalCostPrice,
          totalPiecesProduced: { increment: piecesInt },
          sellingPrice: productData.sellingPrice ? parseFloat(productData.sellingPrice) : undefined,
          color: productData.color || undefined,
          status: 'ACTIVE' // Product is ready for sale
        }
      });

      // Update washing order
      const updatedOrder = await tx.washingOrder.update({
        where: { id },
        data: {
          piecesReceived: piecesInt,
          washingCostPerPiece: costPerPiece,
          totalWashingCost: totalCost,
          paidAmount: paidAmountFloat,
          remainingAmount,
          paymentStatus,
          status: 'COMPLETED',
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          receivedBy: req.user.id,
          productId: product.id,
          notes
        },
        include: {
          supplier: true,
          manufacturingOrder: {
            include: {
              fabricType: true,
              product: true
            }
          }
        }
      });

      // Update supplier balance
      await tx.supplier.update({
        where: { id: updatedOrder.supplierId },
        data: {
          totalPurchases: { increment: totalCost },
          totalPaid: { increment: paidAmountFloat },
          balance: { increment: remainingAmount }
        }
      });

      // Find Main Warehouse branch
      const mainBranch = await tx.branch.findFirst({
        where: { code: 'MAIN' }
      });

      if (!mainBranch) {
        throw new Error('المخزن الرئيسي غير موجود');
      }

      // Create serials for the received pieces - all with same SKU as barcode
      const serialsToCreate = [];
      for (let i = 0; i < piecesInt; i++) {
        serialsToCreate.push({
          serialNumber: product.sku, // نفس الـ SKU لكل القطع
          productId: product.id,
          branchId: mainBranch.id,
          status: 'AVAILABLE',
          costPrice: finalCostPrice,
          sellingPrice: productData.sellingPrice ? parseFloat(productData.sellingPrice) : product.sellingPrice
        });
      }

      await tx.productSerial.createMany({
        data: serialsToCreate
      });

      // Update or create inventory record for main branch
      const existingInventory = await tx.inventory.findFirst({
        where: {
          productId: product.id,
          branchId: mainBranch.id
        }
      });

      if (existingInventory) {
        await tx.inventory.update({
          where: { id: existingInventory.id },
          data: {
            quantity: { increment: piecesInt }
          }
        });
      } else {
        await tx.inventory.create({
          data: {
            productId: product.id,
            branchId: mainBranch.id,
            quantity: piecesInt
          }
        });
      }

      return { order: updatedOrder, product };
    });

    res.json({
      success: true,
      message: 'تم استلام القطع وتحديث المنتج النهائي بنجاح',
      data: result
    });
  } catch (error) {
    console.error('Error completing washing order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'فشل في استلام القطع من الغسيل'
    });
  }
};

module.exports = exports;
