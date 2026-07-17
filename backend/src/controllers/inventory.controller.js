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

    res.json({
      success: true,
      data: inventory,
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
