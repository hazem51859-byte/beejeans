const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// إنشاء جرد جديد
exports.createAudit = async (req, res) => {
  try {
    const { branchId, notes } = req.body;
    const userId = req.user.id;

    // جلب كل المنتجات الموجودة في مخزون الفرع
    const inventory = await prisma.inventory.findMany({
      where: { branchId },
      include: {
        product: true
      }
    });

    if (inventory.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'لا يوجد منتجات في مخزون هذا الفرع' 
      });
    }

    // جلب المرتجعات للفرع
    const returns = await prisma.return.findMany({
      where: {
        branchId,
        status: 'PENDING' // المرتجعات المعلقة فقط
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // حساب كميات المرتجعات لكل منتج
    const returnedQtyByProduct = {};
    returns.forEach(ret => {
      ret.items.forEach(item => {
        if (!returnedQtyByProduct[item.productId]) {
          returnedQtyByProduct[item.productId] = 0;
        }
        returnedQtyByProduct[item.productId] += item.quantity;
      });
    });

    // إنشاء رقم الجرد
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const lastAudit = await prisma.inventoryAudit.findFirst({
      where: {
        auditNumber: {
          startsWith: `AUD-${dateStr}`
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let sequence = 1;
    if (lastAudit) {
      const lastSequence = parseInt(lastAudit.auditNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    const auditNumber = `AUD-${dateStr}-${sequence.toString().padStart(5, '0')}`;

    // إنشاء الجرد
    const audit = await prisma.inventoryAudit.create({
      data: {
        auditNumber,
        branchId,
        createdBy: userId,
        totalItems: inventory.length,
        notes,
        items: {
          create: inventory.map(inv => ({
            productId: inv.productId,
            expectedQty: inv.quantity,
            returnedQty: returnedQtyByProduct[inv.productId] || 0,
            unitCostPrice: inv.product.costPrice,  // حفظ سعر التكلفة
            unitSalePrice: inv.product.sellingPrice
          }))
        }
      },
      include: {
        branch: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'تم إنشاء الجرد بنجاح',
      audit
    });

  } catch (error) {
    console.error('Error creating audit:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الجرد',
      error: error.message
    });
  }
};

// جلب كل الجرود
exports.getAllAudits = async (req, res) => {
  try {
    const { branchId, status } = req.query;

    const where = {};
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const audits = await prisma.inventoryAudit.findMany({
      where,
      include: {
        branch: true,
        createdByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        settledByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      audits
    });

  } catch (error) {
    console.error('Error fetching audits:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الجرود',
      error: error.message
    });
  }
};

// جلب جرد واحد بالتفاصيل
exports.getAuditById = async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await prisma.inventoryAudit.findUnique({
      where: { id },
      include: {
        branch: true,
        createdByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        settledByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                sellingPrice: true,
                size: true,
                color: true
              }
            }
          },
          orderBy: {
            product: {
              name: 'asc'
            }
          }
        }
      }
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'الجرد غير موجود'
      });
    }

    res.json({
      success: true,
      audit
    });

  } catch (error) {
    console.error('Error fetching audit:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الجرد',
      error: error.message
    });
  }
};

// تحديث الكمية الفعلية لمنتج في الجرد
exports.updateAuditItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualQty, notes } = req.body;

    // جلب العنصر
    const item = await prisma.inventoryAuditItem.findUnique({
      where: { id },
      include: {
        audit: true,
        product: true
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'العنصر غير موجود'
      });
    }

    if (item.audit.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تعديل جرد مكتمل أو تمت تسويته'
      });
    }

    // حساب الفرق
    const totalExpected = item.expectedQty + item.returnedQty;
    const differenceQty = actualQty - totalExpected;
    let differenceType = 'MATCHED';
    
    if (differenceQty < 0) {
      differenceType = 'SHORTAGE'; // عجز
    } else if (differenceQty > 0) {
      differenceType = 'SURPLUS'; // زيادة
    }

    // حساب قيمة الفرق بسعر التكلفة (الخسارة الفعلية)
    const differenceValue = Math.abs(differenceQty) * item.unitCostPrice;

    // تحديث العنصر
    const updatedItem = await prisma.inventoryAuditItem.update({
      where: { id },
      data: {
        actualQty,
        differenceQty,
        differenceType,
        differenceValue: differenceType === 'MATCHED' ? 0 : differenceValue,
        notes
      },
      include: {
        product: true
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الكمية بنجاح',
      item: updatedItem
    });

  } catch (error) {
    console.error('Error updating audit item:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث العنصر',
      error: error.message
    });
  }
};

// إكمال الجرد وحساب الملخص
exports.completeAudit = async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await prisma.inventoryAudit.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'الجرد غير موجود'
      });
    }

    if (audit.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'الجرد مكتمل بالفعل'
      });
    }

    // التأكد من أن جميع العناصر تم جردها
    const unauditedItems = audit.items.filter(item => item.actualQty === null);
    if (unauditedItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: `يجب جرد جميع العناصر. العناصر المتبقية: ${unauditedItems.length}`
      });
    }

    // حساب الملخص
    let itemsWithShortage = 0;
    let itemsWithSurplus = 0;
    let totalShortageQty = 0;
    let totalSurplusQty = 0;
    let totalShortageValue = 0;
    let totalSurplusValue = 0;

    audit.items.forEach(item => {
      if (item.differenceType === 'SHORTAGE') {
        itemsWithShortage++;
        totalShortageQty += Math.abs(item.differenceQty);
        totalShortageValue += item.differenceValue;
      } else if (item.differenceType === 'SURPLUS') {
        itemsWithSurplus++;
        totalSurplusQty += item.differenceQty;
        totalSurplusValue += item.differenceValue;
      }
    });

    // تحديث الجرد
    const updatedAudit = await prisma.inventoryAudit.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        itemsWithShortage,
        itemsWithSurplus,
        totalShortageQty,
        totalSurplusQty,
        totalShortageValue,
        totalSurplusValue
      },
      include: {
        branch: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'تم إكمال الجرد بنجاح',
      audit: updatedAudit
    });

  } catch (error) {
    console.error('Error completing audit:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إكمال الجرد',
      error: error.message
    });
  }
};

// تسوية الجرد (تعديل الكميات في المخزن)
exports.settleAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const audit = await prisma.inventoryAudit.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: 'الجرد غير موجود'
      });
    }

    if (audit.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'يجب إكمال الجرد أولاً قبل التسوية'
      });
    }

    if (audit.status === 'SETTLED') {
      return res.status(400).json({
        success: false,
        message: 'تم تسوية الجرد بالفعل'
      });
    }

    // تحديث الكميات في المخزن
    for (const item of audit.items) {
      if (item.differenceType !== 'MATCHED') {
        await prisma.inventory.update({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: audit.branchId
            }
          },
          data: {
            quantity: item.actualQty
          }
        });
      }
    }

    // تحديث حالة الجرد
    const settledAudit = await prisma.inventoryAudit.update({
      where: { id },
      data: {
        status: 'SETTLED',
        settledBy: userId,
        settledAt: new Date()
      },
      include: {
        branch: true,
        settledByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'تم تسوية الجرد وتحديث المخزون بنجاح',
      audit: settledAudit
    });

  } catch (error) {
    console.error('Error settling audit:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسوية الجرد',
      error: error.message
    });
  }
};
