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
    
    // حساب الكميات المنتظرة (في التوريدات المعلقة أو في الطريق)
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
    
    // تجميع الكميات المنتظرة حسب المنتج
    const pendingByProduct = {};
    pendingTransfers.forEach(item => {
      if (!pendingByProduct[item.productId]) {
        pendingByProduct[item.productId] = {
          quantity: 0,
          transfers: []
        };
      }
      pendingByProduct[item.productId].quantity += item.quantityRequested;
      pendingByProduct[item.productId].transfers.push({
        transferNumber: item.transfer.transferNumber,
        toBranch: item.transfer.toBranch?.name,
        quantity: item.quantityRequested
      });
    });
    
    // إخفاء سعر الشراء عن الكاشير وإضافة الكميات المنتظرة
    const userRole = req.user?.role;
    const sanitizedInventory = inventory.map(inv => {
      const pendingData = pendingByProduct[inv.productId] || { quantity: 0, transfers: [] };
      const availableQuantity = inv.quantity - pendingData.quantity;
      
      let productData = inv.product;
      if (userRole === 'CASHIER' && inv.product) {
        const { costPrice, ...productWithoutCost } = inv.product;
        productData = productWithoutCost;
      }
      
      return {
        ...inv,
        product: productData,
        pendingQuantity: pendingData.quantity,
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
