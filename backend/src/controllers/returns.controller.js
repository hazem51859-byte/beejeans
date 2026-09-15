const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// إنشاء مرتجع جديد (الكاشير)
exports.createReturn = async (req, res) => {
  try {
    const { saleId, items, refundMethod, returnReason, notes, customerName, customerPhone } = req.body;
    const { branchId, id: userId } = req.user;

    // التحقق من الفاتورة
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    }

    // حساب الإجماليات
    let totalSaleAmount = 0;
    let totalCostAmount = 0;

    const returnItems = await Promise.all(items.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      const saleItem = sale.items.find(si => si.productId === item.productId);
      const unitSalePrice = saleItem ? saleItem.unitPrice : product.sellingPrice;
      const unitCostPrice = product.costPrice || 0;

      totalSaleAmount += unitSalePrice * item.quantity;
      totalCostAmount += unitCostPrice * item.quantity;

      return {
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        unitSalePrice,
        unitCostPrice,
        totalSalePrice: unitSalePrice * item.quantity,
        totalCostPrice: unitCostPrice * item.quantity,
        returnReason: item.returnReason || returnReason,
        condition: item.condition || 'GOOD',
        conditionNotes: item.conditionNotes
      };
    }));

    // إنشاء رقم المرتجع
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const returnNumber = `RET-${dateStr}-${randomNum}`;

    // إنشاء المرتجع
    const returnRecord = await prisma.return.create({
      data: {
        returnNumber,
        saleId,
        branchId,
        customerName: customerName || sale.customerName,
        customerPhone: customerPhone || sale.customerPhone,
        totalSaleAmount,
        totalCostAmount,
        refundMethod,
        returnReason,
        notes,
        createdById: userId,
        items: {
          create: returnItems
        }
      },
      include: {
        items: {
          include: { product: true }
        },
        sale: true,
        branch: true,
        createdBy: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });

    // خصم من المبيعات (تحديث الفاتورة)
    await prisma.sale.update({
      where: { id: saleId },
      data: {
        refundAmount: { increment: totalSaleAmount }
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل المرتجع بنجاح',
      data: returnRecord
    });

  } catch (error) {
    console.error('Error creating return:', error);
    res.status(500).json({ message: 'خطأ في تسجيل المرتجع', error: error.message });
  }
};

// الحصول على جميع المرتجعات
exports.getAllReturns = async (req, res) => {
  try {
    const { branchId, status, startDate, endDate } = req.query;
    const { role, branchId: userBranchId } = req.user;

    const where = {};

    // الفلترة حسب الفرع
    if (role !== 'ADMIN') {
      where.branchId = userBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    // الفلترة حسب الحالة
    if (status) {
      where.status = status;
    }

    // الفلترة حسب التاريخ
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const returns = await prisma.return.findMany({
      where,
      include: {
        items: {
          include: { product: true }
        },
        sale: true,
        branch: true,
        createdBy: {
          select: { id: true, fullName: true, username: true }
        },
        reviewedByManager: {
          select: { id: true, fullName: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: returns
    });

  } catch (error) {
    console.error('Error fetching returns:', error);
    res.status(500).json({ message: 'خطأ في جلب المرتجعات', error: error.message });
  }
};

// الحصول على مرتجع واحد
exports.getReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true }
        },
        sale: {
          include: { items: true }
        },
        branch: true,
        createdBy: {
          select: { id: true, fullName: true, username: true }
        },
        reviewedByManager: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });

    if (!returnRecord) {
      return res.status(404).json({ message: 'المرتجع غير موجود' });
    }

    res.json({
      success: true,
      data: returnRecord
    });

  } catch (error) {
    console.error('Error fetching return:', error);
    res.status(500).json({ message: 'خطأ في جلب المرتجع', error: error.message });
  }
};

// قرار المانجر (إرسال للمخزن المحلي أو الرئيسي)
exports.managerReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes } = req.body; // decision: SEND_TO_LOCAL or SEND_TO_MAIN
    const { id: userId, role } = req.user;

    if (role !== 'MANAGER' && role !== 'ADMIN') {
      return res.status(403).json({ message: 'غير مصرح لك بهذا الإجراء' });
    }

    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, branch: true }
    });

    if (!returnRecord) {
      return res.status(404).json({ message: 'المرتجع غير موجود' });
    }

    if (returnRecord.status !== 'PENDING_MANAGER') {
      return res.status(400).json({ message: 'تم مراجعة المرتجع مسبقاً' });
    }

    // تحديث حالة المرتجع
    const newStatus = decision === 'SEND_TO_LOCAL' ? 'SENT_TO_LOCAL' : 'SENT_TO_MAIN';
    
    const updated = await prisma.return.update({
      where: { id },
      data: {
        managerDecision: decision,
        managerNotes: notes,
        reviewedByManagerId: userId,
        managerReviewAt: new Date(),
        status: newStatus
      },
      include: {
        items: { include: { product: true } },
        branch: true,
        createdBy: { select: { id: true, fullName: true } },
        reviewedByManager: { select: { id: true, fullName: true } }
      }
    });

    // إرجاع للمخزون
    if (decision === 'SEND_TO_LOCAL') {
      // إرجاع للمخزن المحلي
      for (const item of returnRecord.items) {
        await prisma.inventory.upsert({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: returnRecord.branchId
            }
          },
          update: {
            quantity: { increment: item.quantity }
          },
          create: {
            productId: item.productId,
            branchId: returnRecord.branchId,
            quantity: item.quantity,
            minQuantity: 10
          }
        });
      }

      await prisma.return.update({
        where: { id },
        data: {
          returnedToInventory: true,
          returnedToInventoryAt: new Date(),
          status: 'COMPLETED'
        }
      });
    } else if (decision === 'SEND_TO_MAIN') {
      // إرجاع للمخزن الرئيسي
      const mainBranch = await prisma.branch.findFirst({
        where: { code: 'MAIN' }
      });

      if (mainBranch) {
        for (const item of returnRecord.items) {
          await prisma.inventory.upsert({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: mainBranch.id
              }
            },
            update: {
              quantity: { increment: item.quantity }
            },
            create: {
              productId: item.productId,
              branchId: mainBranch.id,
              quantity: item.quantity,
              minQuantity: 10
            }
          });
        }

        await prisma.return.update({
          where: { id },
          data: {
            returnedToInventory: true,
            returnedToInventoryAt: new Date(),
            status: 'COMPLETED'
          }
        });
      }
    }

    res.json({
      success: true,
      message: 'تم مراجعة المرتجع بنجاح',
      data: updated
    });

  } catch (error) {
    console.error('Error reviewing return:', error);
    res.status(500).json({ message: 'خطأ في مراجعة المرتجع', error: error.message });
  }
};

// إحصائيات المرتجعات
exports.getReturnsStats = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const { role, branchId: userBranchId } = req.user;

    const where = {};

    if (role !== 'ADMIN') {
      where.branchId = userBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const returns = await prisma.return.findMany({
      where,
      include: { items: true }
    });

    const stats = {
      totalReturns: returns.length,
      totalSaleAmount: returns.reduce((sum, r) => sum + r.totalSaleAmount, 0),
      totalCostAmount: returns.reduce((sum, r) => sum + r.totalCostAmount, 0),
      totalItems: returns.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.quantity, 0), 0),
      byStatus: {},
      byReason: {},
      byBranch: {}
    };

    returns.forEach(r => {
      stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
      stats.byReason[r.returnReason] = (stats.byReason[r.returnReason] || 0) + 1;
      stats.byBranch[r.branchId] = (stats.byBranch[r.branchId] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching returns stats:', error);
    res.status(500).json({ message: 'خطأ في جلب إحصائيات المرتجعات', error: error.message });
  }
};

module.exports = exports;
