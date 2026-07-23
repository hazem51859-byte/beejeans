const prisma = require('../config/database');
const dayjs = require('dayjs');

exports.getDailyReport = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { date = new Date() } = req.query;

    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();

    // Build where clause - if branchId is null or 'null', get all branches
    const where = {
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: 'COMPLETED'
    };
    
    // Only filter by branch if branchId is provided and not 'null' string
    if (branchId && branchId !== 'null') {
      where.branchId = branchId;
    }

    // حساب المبيعات - نستخدم amountPaid مش total عشان فواتير العملاء
    const sales = await prisma.sale.aggregate({
      where,
      _sum: { 
        amountPaid: true,  // المبلغ المدفوع فعلياً
        total: true,       // الإجمالي الكلي
        taxAmount: true, 
        discountAmount: true 
      },
      _count: true
    });

    // Payment breakdown بس للمبالغ المدفوعة
    const paymentBreakdown = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { amountPaid: true },  // المدفوع فقط
      _count: true
    });

    res.json({
      success: true,
      data: {
        date,
        totalSales: sales._sum.amountPaid || 0,  // المدفوع فعلياً
        totalRevenue: sales._sum.total || 0,     // الإجمالي للمعلومات
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

    // Build where clause for sale
    const saleWhere = {};
    // If branchId is 'all', don't filter by branch (admin sees all branches)
    if (branchId && branchId !== 'all') {
      saleWhere.branchId = branchId;
    }
    if (startDate || endDate) {
      saleWhere.createdAt = {};
      if (startDate) saleWhere.createdAt.gte = new Date(startDate);
      if (endDate) saleWhere.createdAt.lte = new Date(endDate);
    }
    saleWhere.status = 'COMPLETED';

    // Get all sale items with filters
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: saleWhere
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            color: true,
            sellingPrice: true
          }
        }
      }
    });

    // Group by product and calculate totals
    const productMap = {};
    saleItems.forEach(item => {
      if (!item.product) return;
      
      const productId = item.productId;
      if (!productMap[productId]) {
        productMap[productId] = {
          ...item.product,
          totalQuantity: 0,
          totalRevenue: 0,
          salesCount: 0
        };
      }
      
      productMap[productId].totalQuantity += item.quantity;
      productMap[productId].totalRevenue += item.total;
      productMap[productId].salesCount += 1;
    });

    // Convert to array and sort
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, parseInt(limit));

    res.json({ success: true, data: topProducts });
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


/**
 * Get branch transfers report (for monthly report)
 */
exports.getBranchTransfersReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : dayjs().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : dayjs().endOf('month').toDate();

    // Get all active branches except main warehouse
    const branches = await prisma.branch.findMany({
      where: {
        isActive: true,
        code: { not: 'MAIN' }
      },
      select: {
        id: true,
        name: true,
        code: true,
        vaultBalance: true,
        cardVaultBalance: true
      }
    });

    const branchReports = await Promise.all(
      branches.map(async (branch) => {
        // Get transfers TO this branch (any time, not just in period)
        const transfersReceived = await prisma.transfer.findMany({
          where: {
            toBranchId: branch.id,
            status: { in: ['DELIVERED', 'RECEIVED', 'COMPLETED'] }
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    costPrice: true,
                    name: true
                  }
                }
              }
            }
          }
        });

        // Calculate total transferred value (cost price)
        const totalTransferred = transfersReceived.reduce((sum, transfer) => {
          const transferValue = transfer.items.reduce((itemSum, item) => {
            // استخدم costPrice من المنتج
            const price = parseFloat(item.product?.costPrice || 0);
            // استخدم الكمية المستلمة أو المطلوبة
            const quantity = parseInt(item.quantityReceived || item.quantityRequested || 0);
            return itemSum + (price * quantity);
          }, 0);
          return sum + transferValue;
        }, 0);

        // Get sales from this branch in the period
        const sales = await prisma.sale.findMany({
          where: {
            branchId: branch.id,
            status: 'COMPLETED',
            createdAt: {
              gte: start,
              lte: end
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        });

        // Calculate revenue and profit
        const salesCount = sales.length;
        
        // Revenue = المبلغ المدفوع فقط (مش الإجمالي)
        const revenue = sales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
        const totalSalesValue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        
        // Calculate cost and profit
        const costOfSales = sales.reduce((sum, sale) => {
          return sum + (sale.items?.reduce((itemSum, item) => {
            const costPrice = parseFloat(item.product?.costPrice || 0);
            const quantity = parseInt(item.quantity || 0);
            return itemSum + (costPrice * quantity);
          }, 0) || 0);
        }, 0);
        
        const profit = revenue - costOfSales;

        return {
          branch: {
            id: branch.id,
            name: branch.name,
            code: branch.code
          },
          totalTransferred, // قيمة البضاعة المحولة
          salesCount,       // عدد الفواتير
          revenue,          // الإيرادات (المبلغ المدفوع فقط)
          totalSalesValue,  // إجمالي المبيعات (للمعلومات)
          costOfSales,      // تكلفة المبيعات
          profit,           // المكسب
          vaultBalance: branch.vaultBalance + (branch.cardVaultBalance || 0) // رصيد الخزنة الحالي
        };
      })
    );

    res.json({
      success: true,
      data: branchReports
    });
  } catch (error) {
    next(error);
  }
};
