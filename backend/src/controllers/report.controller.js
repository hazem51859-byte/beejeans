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
                    sellingPrice: true,
                    retailPrice: true,
                    name: true
                  }
                }
              }
            }
          }
        });

        // قيمة التوريدات بسعر البيع (الجملة) - وهو السعر الذي يتحاسب به الفرع مع المخزن الرئيسي
        const totalTransferred = transfersReceived.reduce((sum, transfer) => {
          const transferValue = transfer.items.reduce((itemSum, item) => {
            // استخدم sellingPrice المخزن في TransferItem أولاً، وإلا من المنتج
            const price = parseFloat(item.sellingPrice > 0 ? item.sellingPrice : (item.product?.sellingPrice || 0));
            const quantity = parseInt(item.quantityReceived || item.quantityRequested || 0);
            return itemSum + (price * quantity);
          }, 0);
          return sum + transferValue;
        }, 0);

        // أيضاً احسب قيمة التوريدات بسعر التكلفة (للمعلومات الداخلية)
        const totalTransferredAtCost = transfersReceived.reduce((sum, transfer) => {
          const transferValue = transfer.items.reduce((itemSum, item) => {
            const price = parseFloat(item.costPrice > 0 ? item.costPrice : (item.product?.costPrice || 0));
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
            createdAt: { gte: start, lte: end }
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    costPrice: true,
                    retailPrice: true
                  }
                }
              }
            }
          }
        });

        const salesCount = sales.length;
        const revenue = sales.reduce((sum, sale) => sum + (sale.amountPaid || 0), 0);
        const totalSalesValue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);

        // تكلفة المبيعات = سعر التكلفة (للحساب الداخلي)
        const costOfSales = sales.reduce((sum, sale) => {
          return sum + (sale.items?.reduce((itemSum, item) => {
            const costPrice = parseFloat(item.unitCostPrice > 0 ? item.unitCostPrice : (item.product?.costPrice || 0));
            return itemSum + (costPrice * parseInt(item.quantity || 0));
          }, 0) || 0);
        }, 0);

        // ربح الفرع = سعر القطاعي - سعر التكلفة
        const retailRevenue = sales.reduce((sum, sale) => {
          return sum + (sale.items?.reduce((itemSum, item) => {
            const retailPrice = parseFloat(
              item.unitRetailPrice > 0 ? item.unitRetailPrice
              : (item.product?.retailPrice > 0 ? item.product.retailPrice : (item.unitPrice || 0))
            );
            return itemSum + (retailPrice * parseInt(item.quantity || 0));
          }, 0) || 0);
        }, 0);

        const profit = retailRevenue - costOfSales;

        return {
          branch: { id: branch.id, name: branch.name, code: branch.code },
          totalTransferred,         // قيمة البضاعة المحولة بسعر البيع (الجملة)
          totalTransferredAtCost,   // قيمة البضاعة المحولة بسعر التكلفة (للمعلومات)
          salesCount,
          revenue,                  // الإيرادات المحصلة فعلاً
          totalSalesValue,          // إجمالي المبيعات
          retailRevenue,            // الإيرادات بسعر القطاعي
          costOfSales,              // تكلفة البضاعة المباعة
          profit,                   // الربح الحقيقي (قطاعي - تكلفة)
          vaultBalance: branch.vaultBalance + (branch.cardVaultBalance || 0)
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

    // Get all office returns in the period
    const officeReturns = await prisma.officeReturn.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        status: 'COMPLETED'
      },
      include: {
        items: true,
        invoice: true
      }
    });

    // فصل الفواتير الافتتاحية عن الفواتير الفعلية
    const openingInvoices = invoices.filter(inv => inv.notes?.includes('رصيد افتتاحي'));
    const actualInvoices = invoices.filter(inv => !inv.notes?.includes('رصيد افتتاحي'));

    // إجماليات المرتجعات
    const totalReturnsCount = officeReturns.length;
    const totalReturnsAmount = officeReturns.reduce((sum, ret) => sum + (ret.totalAmount || 0), 0);
    const returnsDeductedFromPaid = officeReturns.reduce((sum, ret) => sum + (ret.deductedFromPaid || 0), 0);
    const returnsDeductedFromDebt = officeReturns.reduce((sum, ret) => sum + (ret.deductedFromDebt || 0), 0);
    const totalReturnsCost = officeReturns.reduce((sum, ret) => sum + (ret.totalCost || 0), 0);

    // إجماليات عامة (كل الفواتير)
    const totalInvoices = invoices.length;
    const grossSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalSales = Math.max(0, grossSales - totalReturnsAmount); // صافي المبيعات بعد المرتجعات
    
    // التكلفة والربح فقط من الفواتير الفعلية (بدون الافتتاحية)
    const grossCost = actualInvoices.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);
    const totalCost = Math.max(0, grossCost - totalReturnsCost);
    const totalProfit = actualInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalRemaining = invoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);

    // تحليل حسب النوع
    const regularInvoices = actualInvoices.filter(inv => inv.type === 'REGULAR');
    const shipmentInvoices = actualInvoices.filter(inv => inv.type === 'SHIPMENT');
    const clientInvoices = actualInvoices.filter(inv => inv.type === 'CLIENT');

    const getReturnsForType = (type) => officeReturns.filter(ret => ret.invoice?.type === type);

    const byType = {
      regular: {
        count: regularInvoices.length,
        sales: Math.max(0, regularInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) - getReturnsForType('REGULAR').reduce((s, r) => s + r.totalAmount, 0)),
        profit: regularInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0),
        collected: regularInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
        returns: getReturnsForType('REGULAR').reduce((s, r) => s + r.totalAmount, 0)
      },
      shipment: {
        count: shipmentInvoices.length,
        sales: Math.max(0, shipmentInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) - getReturnsForType('SHIPMENT').reduce((s, r) => s + r.totalAmount, 0)),
        profit: shipmentInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0),
        collected: shipmentInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
        returns: getReturnsForType('SHIPMENT').reduce((s, r) => s + r.totalAmount, 0),
        delivered: shipmentInvoices.filter(inv => inv.shipment?.status === 'DELIVERED').length,
        pending: shipmentInvoices.filter(inv => inv.shipment?.status === 'PENDING').length
      },
      client: {
        count: clientInvoices.length,
        sales: Math.max(0, clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) - getReturnsForType('CLIENT').reduce((s, r) => s + r.totalAmount, 0)),
        profit: clientInvoices.reduce((sum, inv) => sum + (inv.profit || 0), 0),
        collected: clientInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
        returns: getReturnsForType('CLIENT').reduce((s, r) => s + r.totalAmount, 0)
      }
    };

    res.json({
      success: true,
      data: {
        totalInvoices,
        grossSales,
        totalSales, // صافي المبيعات
        totalReturns: totalReturnsAmount,
        totalReturnsCount,
        returnsDeductedFromPaid,
        returnsDeductedFromDebt,
        totalCost, // من الفواتير الفعلية فقط
        totalProfit, // من الفواتير الفعلية فقط
        totalCollected,
        totalRemaining,
        openingBalances: {
          count: openingInvoices.length,
          total: openingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
        },
        byType,
        // حساب صافي الديون (بعد خصم المحفظة)
        netDebt: {
          grossDebt: totalRemaining, // إجمالي الديون
          customerCredit: 0, // سنحسبها من العملاء
          netAmount: totalRemaining // الصافي
        }
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
                costPrice: true,
                retailPrice: true
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
        totalSales: 0,   // إيرادات الفرع (بسعر القطاعي)
        totalCost: 0,    // تكلفة البضاعة المباعة
        totalQuantity: 0,
        totalProfit: 0,  // الربح = سعر القطاعي - التكلفة
        salesCount: 0,
        products: {}
      };
    });

    sales.forEach(sale => {
      const bid = sale.branchId;
      if (!branchSales[bid]) return;

      branchSales[bid].totalSales += sale.total;
      branchSales[bid].salesCount += 1;
      
      sale.items.forEach(item => {
        const costPrice    = parseFloat(item.unitCostPrice > 0 ? item.unitCostPrice : (item.product?.costPrice || 0));
        // ربح الفرع = سعر القطاعي - التكلفة
        // unitRetailPrice هو snapshot وقت البيع، fallback لـ product.retailPrice ثم unitPrice
        const retailPrice  = parseFloat(
          item.unitRetailPrice > 0 ? item.unitRetailPrice
          : (item.product?.retailPrice > 0 ? item.product.retailPrice : (item.unitPrice || 0))
        );
        const quantity     = parseInt(item.quantity || 0);
        
        const itemCost     = costPrice   * quantity;
        const itemRevenue  = retailPrice * quantity;  // الإيراد بسعر القطاعي
        const itemProfit   = itemRevenue - itemCost;  // الربح الحقيقي للفرع
        
        branchSales[bid].totalCost    += itemCost;
        branchSales[bid].totalProfit  += itemProfit;
        branchSales[bid].totalQuantity += quantity;

        // Track product sales
        const productId = item.productId;
        if (!branchSales[bid].products[productId]) {
          branchSales[bid].products[productId] = {
            product: item.product,
            quantity: 0,
            totalSales: 0,
            totalCost: 0,
            profit: 0
          };
        }

        branchSales[bid].products[productId].quantity   += quantity;
        branchSales[bid].products[productId].totalSales += itemRevenue;
        branchSales[bid].products[productId].totalCost  += itemCost;
        branchSales[bid].products[productId].profit     += itemProfit;

        // Track overall product sales
        if (!productSales[productId]) {
          productSales[productId] = {
            product: item.product,
            totalQuantity: 0,
            totalSales: 0,
            branchesCount: new Set()
          };
        }
        productSales[productId].totalQuantity += quantity;
        productSales[productId].totalSales    += itemRevenue;
        productSales[productId].branchesCount.add(bid);
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

/**
 * Get Customers and Suppliers Summary with Wallet Balance
 * تقرير ملخص العملاء والموردين مع رصيد المحفظة
 */
exports.getAccountsReport = async (req, res, next) => {
  try {
    // جلب كل العملاء مع حساب الأرصدة
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    const customersWithBalances = await Promise.all(
      customers.map(async (customer) => {
        const sales = await prisma.sale.findMany({
          where: { customerId: customer.id, status: 'COMPLETED' }
        });
        
        const officeInvoices = await prisma.officeInvoice.findMany({
          where: { 
            customerId: customer.id,
            status: { not: 'CANCELLED' }
          }
        });
        
        const payments = await prisma.customerPayment.findMany({
          where: { customerId: customer.id }
        });
        
        const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
        const totalPaidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);
        const totalOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        
        const walletBalance = customer.walletBalance || 0;
        const invoiceBalance = totalSales + totalOfficeInvoices - totalPaidOnSales - totalPayments;
        // walletBalance سالب = علينا ليه، موجب = هو دفع زيادة (نفس الفكرة)
        // invoiceBalance موجب = لينا عنده
        // balance = (فواتير لينا عنده) + (رصيد المحفظة: سالب = علينا، موجب = هو دفع زيادة)
        const netBalance = invoiceBalance + walletBalance;
        
        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          totalSales: parseFloat((totalSales + totalOfficeInvoices).toFixed(2)),
          totalPaid: parseFloat((totalPaidOnSales + totalPayments).toFixed(2)),
          walletBalance: parseFloat(walletBalance.toFixed(2)),
          invoiceBalance: parseFloat(invoiceBalance.toFixed(2)),
          balance: parseFloat(netBalance.toFixed(2))
        };
      })
    );

    // جلب كل الموردين مع حساب الأرصدة
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    const suppliersWithBalances = suppliers.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      type: supplier.type,
      totalPurchases: parseFloat(supplier.totalPurchases.toFixed(2)),
      totalPaid: parseFloat(supplier.totalPaid.toFixed(2)),
      walletBalance: parseFloat((supplier.walletBalance || 0).toFixed(2)),
      balance: parseFloat(supplier.balance.toFixed(2))
    }));

    // حساب الإجماليات
    const totalCustomersBalance = customersWithBalances.reduce((sum, c) => sum + c.balance, 0);
    const totalCustomersWallet = customersWithBalances.reduce((sum, c) => sum + c.walletBalance, 0);
    const totalSuppliersBalance = suppliersWithBalances.reduce((sum, s) => sum + s.balance, 0);
    const totalSuppliersWallet = suppliersWithBalances.reduce((sum, s) => sum + s.walletBalance, 0);
    
    // حساب إجمالي الديون (لينا عندهم) والالتزامات (علينا لهم)
    let totalCustomersDebt = 0;
    let totalCustomersCredit = 0;

    customersWithBalances.forEach(c => {
      if (c.invoiceBalance > 0) {
        totalCustomersDebt += c.invoiceBalance;
      } else if (c.invoiceBalance < 0) {
        totalCustomersCredit += Math.abs(c.invoiceBalance);
      }
      if (c.walletBalance > 0) {
        totalCustomersCredit += c.walletBalance;
      }
    });

    res.json({
      success: true,
      data: {
        customers: {
          list: customersWithBalances,
          totalBalance: parseFloat(totalCustomersBalance.toFixed(2)),
          totalWallet: parseFloat(totalCustomersWallet.toFixed(2)),
          totalDebt: parseFloat(totalCustomersDebt.toFixed(2)), // إجمالي الديون (لينا عند العملاء)
          totalCredit: parseFloat(totalCustomersCredit.toFixed(2)), // إجمالي الفلوس علينا للعملاء
          count: customersWithBalances.length
        },
        suppliers: {
          list: suppliersWithBalances,
          totalBalance: parseFloat(totalSuppliersBalance.toFixed(2)),
          totalWallet: parseFloat(totalSuppliersWallet.toFixed(2)),
          count: suppliersWithBalances.length
        },
        summary: {
          // الديون اللي لينا عند العملاء
          customerDebt: parseFloat(totalCustomersDebt.toFixed(2)),
          // الفلوس اللي علينا للعملاء (دفعوها زيادة / محفظة)
          customerCredit: parseFloat(totalCustomersCredit.toFixed(2)),
          // الديون اللي علينا للموردين
          supplierDebt: parseFloat(totalSuppliersBalance.toFixed(2)),
          // صافي المركز المالي (ديون لينا - ديون علينا - التزامات للعملاء)
          netPosition: parseFloat((totalCustomersDebt - totalSuppliersBalance - totalCustomersCredit).toFixed(2))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
