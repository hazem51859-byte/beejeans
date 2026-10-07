const prisma = require('../config/database');

exports.getInventoryByBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 200 } = req.query;

    const inventory = await prisma.inventory.findMany({
      where: { branchId },
      include: {
        product: {
          include: { category: true }
        }
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { product: { name: 'asc' } }
    });

    const total = await prisma.inventory.count({ where: { branchId } });
    
    // حساب الكميات المنتظرة للطلب التي لم تشحن بعد (PENDING) والتي تم شحنها وفي الطريق (IN_TRANSIT)
    const pendingTransfers = await prisma.transferItem.findMany({
      where: {
        transfer: {
          fromBranchId: branchId,
          status: {
            in: ['PENDING', 'IN_TRANSIT']
          }
        }
      },
      include: {
        product: true,
        transfer: {
          include: {
            toBranch: true
          }
        }
      }
    });
    
    // تجميع الكميات المحجوزة
    const pendingByProduct = {};
    pendingTransfers.forEach(item => {
      if (!pendingByProduct[item.productId]) {
        pendingByProduct[item.productId] = {
          unshippedQuantity: 0, // PENDING فقط (لم تخصم بعد من المخزن)
          inTransitQuantity: 0, // IN_TRANSIT (خصمت بالفعل من المخزن)
          transfers: []
        };
      }

      if (item.transfer.status === 'PENDING') {
        pendingByProduct[item.productId].unshippedQuantity += item.quantityRequested;
      } else if (item.transfer.status === 'IN_TRANSIT') {
        pendingByProduct[item.productId].inTransitQuantity += item.quantityRequested;
      }

      pendingByProduct[item.productId].transfers.push({
        transferNumber: item.transfer.transferNumber,
        toBranch: item.transfer.toBranch?.name,
        quantity: item.quantityRequested,
        status: item.transfer.status
      });
    });
    
    // إخفاء سعر الشراء عن الكاشير وإضافة الكميات المنتظرة
    const userRole = req.user?.role;
    const sanitizedInventory = inventory.map(inv => {
      const pendingData = pendingByProduct[inv.productId] || { unshippedQuantity: 0, inTransitQuantity: 0, transfers: [] };
      const availableQuantity = inv.quantity;
      const totalPending = pendingData.unshippedQuantity + pendingData.inTransitQuantity;
      
      let productData = inv.product;
      if (userRole === 'CASHIER' && inv.product) {
        const { costPrice, ...productWithoutCost } = inv.product;
        productData = productWithoutCost;
      }
      
      return {
        ...inv,
        quantity: inv.quantity + totalPending, // الكمية الكلية تشمل المنتظرة لحين الاستلام الفعلي
        product: productData,
        pendingQuantity: totalPending,
        availableQuantity: Math.max(0, availableQuantity),
        pendingTransfers: pendingData.transfers
      };
    });

    res.json({
      success: true,
      data: sanitizedInventory,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

exports.getInventoryByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const inventory = await prisma.inventory.findMany({
      where: { 
        productId
      },
      include: {
        branch: { select: { id: true, name: true, code: true } }
      }
    });

    res.json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
};

exports.getLowStockItems = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    const lowStock = await prisma.inventory.findMany({
      where: {
        branchId,
        quantity: {
          lte: prisma.inventory.fields.minQuantity
        }
      },
      include: {
        product: { select: { id: true, name: true, sku: true } }
      },
      orderBy: { quantity: 'asc' }
    });

    res.json({ success: true, data: lowStock });
  } catch (error) {
    next(error);
  }
};

exports.adjustInventory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adjustment, reason } = req.body;

    const inventory = await prisma.inventory.update({
      where: { id },
      data: {
        quantity: {
          increment: parseInt(adjustment)
        }
      },
      include: {
        product: true,
        branch: true
      }
    });

    res.json({
      success: true,
      message: 'Inventory adjusted successfully',
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

// حساب قيمة المخزون في فرع معين بناءً على آخر سعر توريد
exports.getBranchInventoryValue = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    // جلب كل المخزون في الفرع
    const inventory = await prisma.inventory.findMany({
      where: { 
        branchId,
        quantity: { gt: 0 } // فقط المنتجات الموجودة
      },
      include: {
        product: true
      }
    });

    let totalValue = 0;
    const itemsWithValues = [];

    // لكل منتج، نجيب آخر سعر توريد ليه
    for (const inv of inventory) {
      // جلب آخر توريد للمنتج في هذا الفرع
      const lastTransfer = await prisma.transferItem.findFirst({
        where: {
          productId: inv.productId,
          transfer: {
            toBranchId: branchId,
            status: 'DELIVERED'
          }
        },
        include: {
          transfer: true
        },
        orderBy: {
          transfer: {
            receivedAt: 'desc'
          }
        }
      });

      // سعر التوريد = آخر transferPrice أو sellingPrice كـ fallback
      const transferPrice = lastTransfer?.transferPrice || inv.product.sellingPrice || 0;
      const itemValue = inv.quantity * transferPrice;
      
      totalValue += itemValue;
      
      itemsWithValues.push({
        productId: inv.productId,
        productName: inv.product.name,
        barcode: inv.product.barcode,
        quantity: inv.quantity,
        transferPrice: transferPrice,
        totalValue: itemValue
      });
    }

    res.json({
      success: true,
      data: {
        branchId,
        totalItems: inventory.length,
        totalQuantity: inventory.reduce((sum, inv) => sum + inv.quantity, 0),
        totalValue: totalValue,
        items: itemsWithValues
      }
    });
  } catch (error) {
    console.error('Error calculating branch inventory value:', error);
    next(error);
  }
};

// حساب قيمة المخزون لكل الفروع
exports.getAllBranchesInventoryValue = async (req, res, next) => {
  try {
    // جلب كل الفروع
    const branches = await prisma.branch.findMany({
      where: { isActive: true }
    });

    const branchesValues = [];

    for (const branch of branches) {
      // جلب المخزون في كل فرع
      const inventory = await prisma.inventory.findMany({
        where: { 
          branchId: branch.id,
          quantity: { gt: 0 }
        },
        include: {
          product: true
        }
      });

      let branchTotalValue = 0;

      for (const inv of inventory) {
        // جلب آخر توريد للمنتج في هذا الفرع
        const lastTransfer = await prisma.transferItem.findFirst({
          where: {
            productId: inv.productId,
            transfer: {
              toBranchId: branch.id,
              status: 'DELIVERED'
            }
          },
          include: {
            transfer: true
          },
          orderBy: {
            transfer: {
              receivedAt: 'desc'
            }
          }
        });

        const transferPrice = lastTransfer?.transferPrice || inv.product.sellingPrice || 0;
        branchTotalValue += inv.quantity * transferPrice;
      }

      branchesValues.push({
        branchId: branch.id,
        branchName: branch.name,
        branchCode: branch.code,
        totalItems: inventory.length,
        totalQuantity: inventory.reduce((sum, inv) => sum + inv.quantity, 0),
        totalValue: branchTotalValue
      });
    }

    const grandTotal = branchesValues.reduce((sum, b) => sum + b.totalValue, 0);

    res.json({
      success: true,
      data: {
        branches: branchesValues,
        grandTotal: grandTotal
      }
    });
  } catch (error) {
    console.error('Error calculating all branches inventory value:', error);
    next(error);
  }
};
