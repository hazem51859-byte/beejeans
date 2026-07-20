const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all returns with full details
exports.getAllReturns = async (req, res) => {
  try {
    const { branchId, startDate, endDate, cashierId } = req.query;
    
    const where = {
      isReturn: true
    };
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (cashierId) {
      where.cashierId = cashierId;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const returns = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        },
        branch: true,
        cashier: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        shift: {
          select: {
            id: true,
            shiftNumber: true,
            openedAt: true,
            closedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // جلب الفاتورة الأصلية لكل إرجاع
    const returnsWithOriginal = await Promise.all(
      returns.map(async (returnSale) => {
        const originalSale = returnSale.originalSaleId
          ? await prisma.sale.findUnique({
              where: { id: returnSale.originalSaleId },
              include: {
                cashier: {
                  select: {
                    id: true,
                    fullName: true,
                    username: true
                  }
                }
              }
            })
          : null;
        
        return {
          ...returnSale,
          originalSale: originalSale
            ? {
                id: originalSale.id,
                invoiceNumber: originalSale.invoiceNumber,
                total: originalSale.total,
                createdAt: originalSale.createdAt,
                soldBy: originalSale.cashier
              }
            : null
        };
      })
    );
    
    // حساب الإحصائيات
    const totalReturned = returnsWithOriginal.reduce(
      (sum, ret) => sum + Math.abs(ret.total),
      0
    );
    
    const itemsReturned = returnsWithOriginal.reduce(
      (sum, ret) => sum + ret.items.reduce((s, item) => s + Math.abs(item.quantity), 0),
      0
    );
    
    res.json({
      success: true,
      data: {
        returns: returnsWithOriginal,
        summary: {
          totalReturns: returnsWithOriginal.length,
          totalAmount: totalReturned,
          totalItems: itemsReturned
        }
      }
    });
  } catch (error) {
    console.error('Error fetching returns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch returns'
    });
  }
};

// Get return details by ID
exports.getReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const returnSale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        branch: true,
        cashier: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        shift: {
          select: {
            id: true,
            shiftNumber: true,
            openedAt: true,
            closedAt: true
          }
        }
      }
    });
    
    if (!returnSale || !returnSale.isReturn) {
      return res.status(404).json({
        success: false,
        error: 'Return not found'
      });
    }
    
    // جلب الفاتورة الأصلية
    const originalSale = returnSale.originalSaleId
      ? await prisma.sale.findUnique({
          where: { id: returnSale.originalSaleId },
          include: {
            items: {
              include: {
                product: true
              }
            },
            cashier: {
              select: {
                id: true,
                fullName: true,
                username: true
              }
            }
          }
        })
      : null;
    
    res.json({
      success: true,
      data: {
        ...returnSale,
        originalSale
      }
    });
  } catch (error) {
    console.error('Error fetching return:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch return'
    });
  }
};

// Get returns summary/statistics
exports.getReturnsSummary = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    
    const where = {
      isReturn: true
    };
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const returns = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        },
        branch: true
      }
    });
    
    // تحليل حسب السبب
    const byReason = {};
    returns.forEach(ret => {
      const reason = ret.returnReason || 'غير محدد';
      if (!byReason[reason]) {
        byReason[reason] = {
          reason,
          count: 0,
          total: 0
        };
      }
      byReason[reason].count++;
      byReason[reason].total += Math.abs(ret.total);
    });
    
    // أكثر المنتجات المرتجعة
    const productReturns = {};
    returns.forEach(ret => {
      ret.items.forEach(item => {
        const productId = item.productId;
        if (!productReturns[productId]) {
          productReturns[productId] = {
            product: item.product,
            quantity: 0,
            amount: 0
          };
        }
        productReturns[productId].quantity += Math.abs(item.quantity);
        productReturns[productId].amount += Math.abs(item.total);
      });
    });
    
    const topReturnedProducts = Object.values(productReturns)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
    
    // حسب الفرع
    const byBranch = {};
    returns.forEach(ret => {
      const branchName = ret.branch?.name || 'Unknown';
      if (!byBranch[branchName]) {
        byBranch[branchName] = {
          branch: branchName,
          count: 0,
          total: 0
        };
      }
      byBranch[branchName].count++;
      byBranch[branchName].total += Math.abs(ret.total);
    });
    
    res.json({
      success: true,
      data: {
        totalReturns: returns.length,
        totalAmount: returns.reduce((sum, ret) => sum + Math.abs(ret.total), 0),
        byReason: Object.values(byReason),
        byBranch: Object.values(byBranch),
        topReturnedProducts
      }
    });
  } catch (error) {
    console.error('Error fetching returns summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch returns summary'
    });
  }
};
