const prisma = require('../config/database');
const dayjs = require('dayjs');

exports.getDailyReport = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { date = new Date() } = req.query;

    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();

    const sales = await prisma.sale.aggregate({
      where: {
        branchId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: 'COMPLETED'
      },
      _sum: { total: true, taxAmount: true, discountAmount: true },
      _count: true
    });

    const paymentBreakdown = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: {
        branchId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: 'COMPLETED'
      },
      _sum: { total: true },
      _count: true
    });

    res.json({
      success: true,
      data: {
        date,
        totalSales: sales._sum.total || 0,
        totalTax: sales._sum.taxAmount || 0,
        totalDiscount: sales._sum.discountAmount || 0,
        transactionCount: sales._count,
        paymentBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getSalesSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    const where = { status: 'COMPLETED' };
    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const summary = await prisma.sale.aggregate({
      where,
      _sum: { total: true, taxAmount: true, discountAmount: true },
      _avg: { total: true },
      _count: true
    });

    const branches = await prisma.sale.groupBy({
      by: ['branchId'],
      where,
      _sum: { total: true },
      _count: true
    });

    res.json({
      success: true,
      data: {
        totalSales: summary._sum.total || 0,
        totalTax: summary._sum.taxAmount || 0,
        totalDiscount: summary._sum.discountAmount || 0,
        averageSale: summary._avg.total || 0,
        transactionCount: summary._count,
        byBranch: branches
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCashierPerformance = async (req, res, next) => {
  try {
    const { cashierId } = req.params;
    const { startDate, endDate } = req.query;

    const where = { cashierId, status: 'COMPLETED' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const performance = await prisma.sale.aggregate({
      where,
      _sum: { total: true, discountAmount: true },
      _avg: { total: true },
      _count: true
    });

    const shifts = await prisma.shift.count({
      where: { userId: cashierId, status: 'CLOSED' }
    });

    res.json({
      success: true,
      data: {
        totalSales: performance._sum.total || 0,
        totalDiscount: performance._sum.discountAmount || 0,
        averageSale: performance._avg.total || 0,
        transactionCount: performance._count,
        shiftsCompleted: shifts
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getTopProducts = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { limit = 10, startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.sale = {
        createdAt: {}
      };
      if (startDate) where.sale.createdAt.gte = new Date(startDate);
      if (endDate) where.sale.createdAt.lte = new Date(endDate);
    }
    if (branchId) {
      where.sale = { ...where.sale, branchId };
    }

    const topProducts = await prisma.saleItem.groupBy({
      by: ['productId'],
      where,
      _sum: { quantity: true, total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: parseInt(limit)
    });

    // Get product details
    const productsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, sku: true, sellingPrice: true }
        });
        return {
          ...product,
          totalQuantity: item._sum.quantity,
          totalRevenue: item._sum.total,
          salesCount: item._count
        };
      })
    );

    res.json({ success: true, data: productsWithDetails });
  } catch (error) {
    next(error);
  }
};

exports.getInventoryStatus = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    const totalItems = await prisma.inventory.count({ where: { branchId } });
    
    const totalValue = await prisma.inventory.findMany({
      where: { branchId },
      include: { product: { select: { costPrice: true } } }
    });

    const value = totalValue.reduce((acc, item) => {
      return acc + (item.quantity * parseFloat(item.product.costPrice));
    }, 0);

    const lowStock = await prisma.inventory.count({
      where: {
        branchId,
        quantity: { lte: prisma.inventory.fields.minQuantity }
      }
    });

    const outOfStock = await prisma.inventory.count({
      where: { branchId, quantity: 0 }
    });

    res.json({
      success: true,
      data: {
        totalItems,
        totalValue: value,
        lowStockItems: lowStock,
        outOfStockItems: outOfStock
      }
    });
  } catch (error) {
    next(error);
  }
};
