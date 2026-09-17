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
        fabrics: {
          include: {
            fabricType: true
          }
        },
        product: true,
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
        fabrics: {
          include: {
            fabricType: true
          }
        },
        product: true,
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
      fabrics,
      productId,
      metersUsed,
      sentDate,
      notes
    } = req.body;
    
    // Normalize fabrics array
    let fabricItems = [];
    if (Array.isArray(fabrics) && fabrics.length > 0) {
      fabricItems = fabrics
        .map(f => ({
          fabricTypeId: f.fabricTypeId,
          metersUsed: parseFloat(f.metersUsed) || 0
        }))
        .filter(f => f.fabricTypeId && f.metersUsed > 0);
    } else if (fabricTypeId && metersUsed) {
      fabricItems = [{
        fabricTypeId,
        metersUsed: parseFloat(metersUsed) || 0
      }];
    }

    if (fabricItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب اختيار نوع قماش واحد على الأقل وتحديد عدد الأمتار'
      });
    }

    // Check fabric stock availability & calculate costs for each fabric item
    let totalFabricCost = 0;
    let totalMetersUsed = 0;
    const fabricStockUpdates = [];
    const orderFabricsData = [];

    for (const item of fabricItems) {
      const fabricStock = await prisma.fabricStock.findUnique({
        where: { fabricTypeId: item.fabricTypeId },
        include: { fabricType: true }
      });

      if (!fabricStock) {
        return res.status(404).json({
          success: false,
          message: 'نوع القماش غير موجود'
        });
      }

      if (fabricStock.availableMeters < item.metersUsed) {
        return res.status(400).json({
          success: false,
          message: `القماش (${fabricStock.fabricType.name}) غير كافي. المتوفر: ${fabricStock.availableMeters} متر، المطلوب: ${item.metersUsed} متر`
        });
      }

      const costPerMeter = fabricStock.fabricType.pricePerMeter;
      const itemTotalCost = item.metersUsed * costPerMeter;
      
      totalFabricCost += itemTotalCost;
      totalMetersUsed += item.metersUsed;

      fabricStockUpdates.push({
        fabricTypeId: item.fabricTypeId,
        metersUsed: item.metersUsed
      });

      orderFabricsData.push({
        fabricTypeId: item.fabricTypeId,
        metersUsed: item.metersUsed,
        fabricCostPerMeter: costPerMeter,
        totalFabricCost: itemTotalCost
      });
    }

    // Create order and update stock in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create manufacturing order
      const newOrder = await tx.manufacturingOrder.create({
        data: {
          orderNumber,
          supplierId,
          fabricTypeId: fabricItems[0]?.fabricTypeId || null,
          productId: productId || undefined,
          metersUsed: totalMetersUsed,
          fabricCostPerMeter: orderFabricsData[0]?.fabricCostPerMeter || null,
          totalFabricCost: totalFabricCost,
          status: 'SENT',
          sentDate: sentDate ? new Date(sentDate) : new Date(),
          sentBy: req.user.id,
          notes,
          fabrics: {
            create: orderFabricsData
          }
        },
        include: {
          supplier: true,
          fabricType: true,
          fabrics: {
            include: {
              fabricType: true
            }
          },
          product: true
        }
      });

      // Update fabric stock for each fabric item
      for (const update of fabricStockUpdates) {
        await tx.fabricStock.update({
          where: { fabricTypeId: update.fabricTypeId },
          data: {
            availableMeters: { decrement: update.metersUsed },
            totalUsed: { increment: update.metersUsed }
          }
        });
      }

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
        include: { 
          fabricType: true, 
          fabrics: {
            include: {
              fabricType: true
            }
          },
          product: true 
        }
      });

      if (!order) {
        throw new Error('أمر التصنيع غير موجود');
      }

      // Calculate total fabric cost
      let fabricCostTotal = order.totalFabricCost;
      if (fabricCostTotal == null || fabricCostTotal === 0) {
        if (order.fabrics && order.fabrics.length > 0) {
          fabricCostTotal = order.fabrics.reduce((sum, f) => sum + (f.totalFabricCost || (f.metersUsed * f.fabricCostPerMeter)), 0);
        } else if (order.metersUsed && order.fabricCostPerMeter) {
          fabricCostTotal = order.metersUsed * order.fabricCostPerMeter;
        } else {
          fabricCostTotal = 0;
        }
      }

      const grandTotalCost = totalCost + fabricCostTotal;

      // Update manufacturing order
      const updatedOrder = await tx.manufacturingOrder.update({
        where: { id },
        data: {
          piecesReceived: piecesInt,
          manufacturingCostPerPiece: costPerPiece,
          totalManufacturingCost: totalCost,
          totalFabricCost: fabricCostTotal,
          grandTotalCost: grandTotalCost,
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
          fabrics: {
            include: {
              fabricType: true
            }
          },
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
        const fabricCostPerPiece = fabricCostTotal / piecesInt;
        
        await tx.product.update({
          where: { id: order.productId },
          data: {
            fabricCost: fabricCostPerPiece,
            manufacturingCost: costPerPiece,
            costPrice: fabricCostPerPiece + costPerPiece, // سيتم إضافة تكلفة الغسيل لاحقاً
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
            fabricType: true,
            fabrics: {
              include: {
                fabricType: true
              }
            }
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
            fabricType: true,
            fabrics: {
              include: {
                fabricType: true
              }
            }
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
              product: true,
              fabricType: true,
              fabrics: {
                include: {
                  fabricType: true
                }
              }
            }
          }
        }
      });

      if (!washingOrder || !washingOrder.manufacturingOrder) {
        throw new Error('أمر الغسيل غير موجود');
      }

      const mfgOrder = washingOrder.manufacturingOrder;

      // Calculate total fabric cost and total meters used
      let fabricCostTotal = mfgOrder.totalFabricCost;
      if (fabricCostTotal == null || fabricCostTotal === 0) {
        if (mfgOrder.fabrics && mfgOrder.fabrics.length > 0) {
          fabricCostTotal = mfgOrder.fabrics.reduce((sum, f) => sum + (f.totalFabricCost || (f.metersUsed * f.fabricCostPerMeter)), 0);
        } else if (mfgOrder.metersUsed && mfgOrder.fabricCostPerMeter) {
          fabricCostTotal = mfgOrder.metersUsed * mfgOrder.fabricCostPerMeter;
        } else {
          fabricCostTotal = 0;
        }
      }

      let totalMetersUsed = 0;
      if (mfgOrder.fabrics && mfgOrder.fabrics.length > 0) {
        totalMetersUsed = mfgOrder.fabrics.reduce((sum, f) => sum + (f.metersUsed || 0), 0);
      } else {
        totalMetersUsed = mfgOrder.metersUsed || 0;
      }

      const mfgCostTotal = mfgOrder.totalManufacturingCost || (mfgOrder.piecesReceived ? mfgOrder.piecesReceived * (mfgOrder.manufacturingCostPerPiece || 0) : 0);
      const washCostTotal = totalCost;
      
      // Final cost price including all stages
      const totalCostAllStages = fabricCostTotal + mfgCostTotal + washCostTotal;
      const finalCostPrice = totalCostAllStages / piecesInt;
      const fabricCostPerPiece = fabricCostTotal / piecesInt;
      const mfgCostPerPiece = mfgOrder.manufacturingCostPerPiece || (mfgOrder.piecesReceived ? mfgCostTotal / mfgOrder.piecesReceived : (mfgCostTotal / piecesInt));

      // Update product with final costs
      const product = await tx.product.update({
        where: { id: productData.id },
        data: {
          fabricCost: fabricCostPerPiece,
          fabricMetersUsed: { increment: totalMetersUsed }, // إضافة الأمتار المستخدمة
          manufacturingCost: mfgCostPerPiece,
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
              fabrics: {
                include: {
                  fabricType: true
                }
              },
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
          serialNumber: product.sku, // نفس الـ SKU لكل القطع عشان الكاشير يقدر يبيع بالباركود
          productId: product.id,
          branchId: mainBranch.id,
          status: 'AVAILABLE',
          registeredBy: req.user.id
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
