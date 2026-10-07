const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =========================================
// إنشاء مرتجع مخزن جديد من عميل
// =========================================
exports.createStoreReturn = async (req, res) => {
  try {
    const { customerId, items, notes } = req.body;
    const { id: createdById } = req.user;

    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد العميل والأصناف' });
    }

    // جلب بيانات العميل
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    // جلب المنتجات وحساب الإجماليات
    let totalAmount = 0;
    let totalCost = 0;
    let totalProfit = 0;

    const returnItems = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0 || !item.unitSalePrice || item.unitSalePrice <= 0) {
        return res.status(400).json({ success: false, message: 'يرجى التأكد من بيانات الأصناف' });
      }

      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(404).json({ success: false, message: `المنتج غير موجود: ${item.productId}` });
      }

      const unitCostPrice = parseFloat(product.costPrice || 0);
      const unitSalePrice = parseFloat(item.unitSalePrice);
      const qty = parseInt(item.quantity);

      const totalSalePrice = unitSalePrice * qty;
      const totalCostPrice = unitCostPrice * qty;
      const itemProfit = totalSalePrice - totalCostPrice;

      totalAmount += totalSalePrice;
      totalCost += totalCostPrice;
      totalProfit += itemProfit;

      returnItems.push({
        productId: item.productId,
        quantity: qty,
        size: item.size || null,
        unitSalePrice,
        unitCostPrice,
        totalSalePrice,
        totalCostPrice,
        returnReason: item.returnReason || null
      });
    }

    // رقم المرتجع
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.customerStoreReturn.count();
    const returnNumber = `CSR-${dateStr}-${String(count + 1).padStart(5, '0')}`;

    // بناء المرتجع في transaction واحدة
    const result = await prisma.$transaction(async (tx) => {
      // 1. إنشاء سجل المرتجع
      const storeReturn = await tx.customerStoreReturn.create({
        data: {
          returnNumber,
          customerId,
          customerName: customer.name,
          customerPhone: customer.phone || null,
          totalAmount,
          totalCost,
          totalProfit,
          notes: notes || null,
          status: 'COMPLETED',
          createdById,
          items: {
            create: returnItems
          }
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          createdBy: { select: { id: true, fullName: true } }
        }
      });

      // 2. إرجاع المنتجات للمخزن الرئيسي
      const mainBranch = await tx.branch.findFirst({ where: { code: 'MAIN' } });
      const branchId = mainBranch?.id;

      if (branchId) {
        for (const item of returnItems) {
          await tx.inventory.upsert({
            where: { productId_branchId: { productId: item.productId, branchId } },
            update: { quantity: { increment: item.quantity } },
            create: {
              productId: item.productId,
              branchId,
              quantity: item.quantity,
              minQuantity: 10
            }
          });
        }
      }

      // 3. خصم قيمة المرتجع من ديون العميل أو محفظته
      // نفتش على فواتير المكتب المفتوحة للعميل ونخصم منها
      const openInvoices = await tx.officeInvoice.findMany({
        where: {
          customerId,
          remainingAmount: { gt: 0 },
          status: { not: 'CANCELLED' }
        },
        orderBy: { createdAt: 'asc' }
      });

      let remainingToDeduct = totalAmount;

      for (const invoice of openInvoices) {
        if (remainingToDeduct <= 0) break;

        const deduct = Math.min(remainingToDeduct, invoice.remainingAmount);
        await tx.officeInvoice.update({
          where: { id: invoice.id },
          data: {
            remainingAmount: { decrement: deduct },
            refundAmount: { increment: deduct }
          }
        });
        remainingToDeduct -= deduct;
      }

      // الباقي يضاف لمحفظة العميل (رصيد له)
      if (remainingToDeduct > 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: { walletBalance: { increment: remainingToDeduct } }
        });
      }

      return storeReturn;
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل المرتجع بنجاح وإرجاع البضاعة للمخزن',
      data: result
    });

  } catch (error) {
    console.error('Error creating store return:', error);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل المرتجع', error: error.message });
  }
};

// =========================================
// جلب كل المرتجعات
// =========================================
exports.getAllStoreReturns = async (req, res) => {
  try {
    const { customerId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where = {};
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [returns, total] = await Promise.all([
      prisma.customerStoreReturn.findMany({
        where,
        include: {
          items: { include: { product: { select: { id: true, name: true, sku: true, barcode: true } } } },
          customer: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, fullName: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.customerStoreReturn.count({ where })
    ]);

    res.json({ success: true, data: returns, total, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Error fetching store returns:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المرتجعات', error: error.message });
  }
};

// =========================================
// جلب مرتجع واحد بالتفاصيل
// =========================================
exports.getStoreReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    const storeReturn = await prisma.customerStoreReturn.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        createdBy: { select: { id: true, fullName: true } }
      }
    });

    if (!storeReturn) {
      return res.status(404).json({ success: false, message: 'المرتجع غير موجود' });
    }

    res.json({ success: true, data: storeReturn });

  } catch (error) {
    console.error('Error fetching store return:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المرتجع', error: error.message });
  }
};

// =========================================
// إحصائيات المرتجعات
// =========================================
exports.getStoreReturnsStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const returns = await prisma.customerStoreReturn.findMany({
      where,
      include: { items: true }
    });

    const totalReturns = returns.length;
    const totalAmount = returns.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalCost = returns.reduce((sum, r) => sum + r.totalCost, 0);
    const totalProfit = returns.reduce((sum, r) => sum + r.totalProfit, 0);
    const totalItems = returns.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.quantity, 0), 0);

    res.json({
      success: true,
      data: { totalReturns, totalAmount, totalCost, totalProfit, totalItems }
    });

  } catch (error) {
    console.error('Error fetching store returns stats:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات', error: error.message });
  }
};

module.exports = exports;
