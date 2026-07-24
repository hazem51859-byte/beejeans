const prisma = require('../config/database');

exports.getInventoryByBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 50 } = req.query;

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
      // الخصم فقط للـ PENDING لأن الـ IN_TRANSIT تم خصمه بالفعل من inv.quantity في قاعدة البيانات عند الشحن
      const availableQuantity = inv.quantity - pendingData.unshippedQuantity;
      const totalPending = pendingData.unshippedQuantity + pendingData.inTransitQuantity;
      
      let productData = inv.product;
      if (userRole === 'CASHIER' && inv.product) {
        const { costPrice, ...productWithoutCost } = inv.product;
        productData = productWithoutCost;
      }
      
      return {
        ...inv,
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
      where: { productId },
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
