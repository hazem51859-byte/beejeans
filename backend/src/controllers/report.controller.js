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

    // حساب المبيعات - نستخدم total (قيمة المبيعات الفعلية)
    const sales = await prisma.sale.aggregate({
      where,
      _sum: { 
        total: true,        // قيمة المبيعات الفعلية
        amountPaid: true,   // المبلغ المدفوع فعلياً
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
        totalSales: sales._sum.total || 0,       // قيمة المبيعات الفعلية
        totalPaid: sales._sum.amountPaid || 0,   // المبلغ المدفوع
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


/**
 * Get Office Invoices Report (for monthly report)
 * تقرير فواتير المكتب/المخزن الرئيسي
 */
exports.getOfficeInvoicesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : dayjs().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : dayjs().endOf('month').toDate();

    // Get all office invoices in the period
    const invoices = await prisma.officeInvoice.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        status: { not: 'CANCELLED' }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        shipment: true
      }
    });

    // إجماليات عامة
    const totalInvoices = invoices.length;
    const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalCost = invoices.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);
    const totalProfit = invoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalRemaining = invoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);

    // تحليل حسب النوع
    const regularInvoices = invoices.filter(inv => inv.type === 'REGULAR');
    const shipmentInvoices = invoices.filter(inv => inv.type === 'SHIPMENT');
    const clientInvoices = invoices.filter(inv => inv.type === 'CLIENT');

    const byType = {
      regular: {
        count: regularInvoices.length,
        sales: regularInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        profit: regularInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0),
        collected: regularInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)
      },
      shipment: {
        count: shipmentInvoices.length,
        sales: shipmentInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        profit: shipmentInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0),
        collected: shipmentInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
        delivered: shipmentInvoices.filter(inv => inv.shipment?.status === 'DELIVERED').length,
        pending: shipmentInvoices.filter(inv => inv.shipment?.status === 'PENDING').length
      },
      client: {
        count: clientInvoices.length,
        sales: clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        profit: clientInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0),
        collected: clientInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)
      }
    };

    res.json({
      success: true,
      data: {
        totalInvoices,
        totalSales,
        totalCost,
        totalProfit,
        totalCollected,
        totalRemaining,
        byType
      }
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Get Audits Report (for monthly report)
 * تقرير الجرود والخسائر
 */
exports.getAuditsReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : dayjs().startOf('month').toDate();
    const end = endDate ? new Date(endDate) : dayjs().endOf('month').toDate();

    // Get all settled audits in the period
    const audits = await prisma.inventoryAudit.findMany({
      where: {
        status: 'SETTLED', // فقط الجرود المكتملة والمسواة
        settledAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        items: {
          where: {
            differenceType: { in: ['SHORTAGE', 'SURPLUS'] } // فقط الأصناف فيها فروقات
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true
              }
            }
          }
        }
      },
      orderBy: {
        settledAt: 'desc'
      }
    });

    // حساب الإجماليات
    const totalAudits = audits.length;
    
    // حساب الخسائر بسعر التكلفة (العجز فقط)
    const totalShortageValue = audits.reduce((sum, audit) => {
      const auditShortage = audit.items
        .filter(item => item.differenceType === 'SHORTAGE')
        .reduce((itemSum, item) => {
          // الخسارة = كمية العجز × سعر التكلفة
          return itemSum + (Math.abs(item.differenceQty) * item.unitCostPrice);
        }, 0);
      return sum + auditShortage;
    }, 0);

    // حساب الزيادات بسعر التكلفة
    const totalSurplusValue = audits.reduce((sum, audit) => {
      const auditSurplus = audit.items
        .filter(item => item.differenceType === 'SURPLUS')
        .reduce((itemSum, item) => {
          // الزيادة = كمية الزيادة × سعر التكلفة
          return itemSum + (item.differenceQty * item.unitCostPrice);
        }, 0);
      return sum + auditSurplus;
    }, 0);

    const totalShortageQty = audits.reduce((sum, audit) => sum + (audit.totalShortageQty || 0), 0);
    const totalSurplusQty = audits.reduce((sum, audit) => sum + (audit.totalSurplusQty || 0), 0);

    // تفاصيل كل جرد
    const auditDetails = audits.map(audit => {
      // حساب الخسارة الفعلية لهذا الجرد (بسعر التكلفة)
      const actualLoss = audit.items
        .filter(item => item.differenceType === 'SHORTAGE')
        .reduce((sum, item) => sum + (Math.abs(item.differenceQty) * item.unitCostPrice), 0);

      const actualGain = audit.items
        .filter(item => item.differenceType === 'SURPLUS')
        .reduce((sum, item) => sum + (item.differenceQty * item.unitCostPrice), 0);

      return {
        id: audit.id,
        auditNumber: audit.auditNumber,
        branch: audit.branch,
        settledAt: audit.settledAt,
        totalItems: audit.totalItems,
        itemsWithShortage: audit.itemsWithShortage,
        itemsWithSurplus: audit.itemsWithSurplus,
        totalShortageQty: audit.totalShortageQty,
        totalSurplusQty: audit.totalSurplusQty,
        actualLoss, // الخسارة الفعلية بسعر التكلفة
        actualGain, // الزيادة الفعلية بسعر التكلفة
        netLoss: actualLoss - actualGain, // صافي الخسارة
        items: audit.items.map(item => ({
          product: item.product,
          expectedQty: item.expectedQty,
          actualQty: item.actualQty,
          differenceQty: item.differenceQty,
          differenceType: item.differenceType,
          unitCostPrice: item.unitCostPrice,
          actualDifferenceValue: Math.abs(item.differenceQty) * item.unitCostPrice // الخسارة الفعلية للصنف
        }))
      };
    });

    // صافي الخسارة = الخسائر - الزيادات
    const netLoss = totalShortageValue - totalSurplusValue;

    res.json({
      success: true,
      data: {
        totalAudits,
        totalShortageQty,
        totalSurplusQty,
        totalShortageValue, // إجمالي خسائر العجز بسعر التكلفة
        totalSurplusValue,  // إجمالي الزيادات بسعر التكلفة
        netLoss,            // صافي الخسارة الفعلية
        audits: auditDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Branch Sales Report (excludes Main Warehouse)
 * تقرير مبيعات الفروع فقط بدون المخزن الرئيسي
 */
exports.getBranchSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = end;
      }
    }

    // Get all branches (exclude MAIN warehouse)
    const branches = await prisma.branch.findMany({
      where: {
        isActive: true,
        code: { not: 'MAIN' } // Exclude main warehouse
      },
      select: {
        id: true,
        name: true,
        code: true
      }
    });

    // Build branch filter
    const branchFilter = branchId 
      ? { id: branchId }
      : { 
          isActive: true,
          code: { not: 'MAIN' }
        };

    // Get sales data for branches
    const sales = await prisma.sale.findMany({
      where: {
        ...dateFilter,
        status: 'COMPLETED',
        branch: branchFilter
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                costPrice: true
              }
            }
          }
        }
      }
    });

    // Calculate totals by branch
    const branchSales = {};
    const productSales = {};
    
    branches.forEach(branch => {
      branchSales[branch.id] = {
        branch,
        totalSales: 0,
        totalCost: 0,
        totalQuantity: 0,
        totalProfit: 0,
        salesCount: 0,
        products: {}
      };
    });

    sales.forEach(sale => {
      const branchId = sale.branchId;
      if (!branchSales[branchId]) return;

      branchSales[branchId].totalSales += sale.total;
      branchSales[branchId].salesCount += 1;
      
      sale.items.forEach(item => {
        const costPrice = parseFloat(item.product?.costPrice || 0);
        const sellingPrice = parseFloat(item.unitPrice || 0);
        const quantity = parseInt(item.quantity || 0);
        
        const itemCost = costPrice * quantity;
        const itemRevenue = sellingPrice * quantity;
        const itemProfit = itemRevenue - itemCost;
        
        branchSales[branchId].totalCost += itemCost;
        branchSales[branchId].totalProfit += itemProfit;
        branchSales[branchId].totalQuantity += quantity;

        // Track product sales
        const productId = item.productId;
        if (!branchSales[branchId].products[productId]) {
          branchSales[branchId].products[productId] = {
            product: item.product,
            quantity: 0,
            totalSales: 0,
            totalCost: 0,
            profit: 0
          };
        }

        branchSales[branchId].products[productId].quantity += quantity;
        branchSales[branchId].products[productId].totalSales += itemRevenue;
        branchSales[branchId].products[productId].totalCost += itemCost;
        branchSales[branchId].products[productId].profit += itemProfit;

        // Track overall product sales
        if (!productSales[productId]) {
          productSales[productId] = {
            product: item.product,
            totalQuantity: 0,
            totalSales: 0,
            branchesCount: new Set()
          };
        }
        productSales[productId].totalQuantity += item.quantity;
        productSales[productId].totalSales += item.subtotal;
        productSales[productId].branchesCount.add(branchId);
      });
    });

    // Convert products object to array
    Object.keys(branchSales).forEach(branchId => {
      branchSales[branchId].products = Object.values(branchSales[branchId].products)
        .sort((a, b) => b.totalSales - a.totalSales);
    });

    // Convert to array and sort by sales
    const branchSalesArray = Object.values(branchSales)
      .sort((a, b) => b.totalSales - a.totalSales);

    // Top products across all branches
    const topProducts = Object.values(productSales)
      .map(p => ({
        ...p,
        branchesCount: p.branchesCount.size
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);

    // Calculate totals
    const totals = {
      totalSales: branchSalesArray.reduce((sum, b) => sum + b.totalSales, 0),
      totalProfit: branchSalesArray.reduce((sum, b) => sum + b.totalProfit, 0),
      totalQuantity: branchSalesArray.reduce((sum, b) => sum + b.totalQuantity, 0),
      totalSalesCount: branchSalesArray.reduce((sum, b) => sum + b.salesCount, 0),
      branchesCount: branchSalesArray.length
    };

    // Get today's sales for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: today },
        status: 'COMPLETED',
        branch: {
          isActive: true,
          code: { not: 'MAIN' }
        }
      },
      _sum: {
        total: true
      },
      _count: true
    });

    res.json({
      success: true,
      data: {
        branches: branchSalesArray,
        topProducts,
        totals,
        today: {
          sales: todaySales._sum.total || 0,
          count: todaySales._count || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
