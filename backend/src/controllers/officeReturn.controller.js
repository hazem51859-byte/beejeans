const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * إنشاء مرتجع جديد لفاتورة مكتب
 * - التحقق من الأصناف والكميات المتاحة للإرجاع
 * - إرجاع البضاعة إلى رصيد المخزن الرئيسي (MAIN)
 * - التسوية المالية: خصم من الخزينة إن كان مدفوعاً، أو خصم من مديونية الفاتورة/العميل
 * - تحديث الفاتورة وبنودها
 */
exports.createOfficeReturn = async (req, res) => {
  try {
    const {
      invoiceId,
      items, // [{ productId, invoiceItemId, quantity, size, unitSalePrice, returnReason }]
      refundMethod = 'VAULT_CASH', // VAULT_CASH, DEBT_DEDUCTION, WALLET, MIXED
      deductedFromPaid: customDeductedFromPaid,
      deductedFromDebt: customDeductedFromDebt,
      vaultId,
      returnReason,
      notes
    } = req.body;

    const createdById = req.user.id;

    if (!invoiceId) {
      return res.status(400).json({ success: false, error: 'يجب تحديد الفاتورة المراد إرجاعها' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب تحديد أصناف للإرجاع' });
    }

    // 1. جلب الفاتورة مع بنودها وعملائها
    const invoice = await prisma.officeInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          include: { product: true }
        },
        customer: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    }

    // 2. البحث عن المخزن الرئيسي
    let mainWarehouse = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (!mainWarehouse) {
      const branches = await prisma.branch.findMany({
        orderBy: { createdAt: 'asc' },
        take: 1
      });
      mainWarehouse = branches[0];
    }

    if (!mainWarehouse) {
      return res.status(400).json({ success: false, error: 'المخزن الرئيسي غير موجود في النظام' });
    }

    // 3. التحقق من بنود المرتجع والكميات المتاحة
    let totalReturnSale = 0;
    let totalReturnCost = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity);
      if (!qty || qty <= 0) continue;

      // البحث عن بند الفاتورة المطابق
      const invoiceItem = invoice.items.find(
        ii => (item.invoiceItemId && ii.id === item.invoiceItemId) || ii.productId === item.productId
      );

      if (!invoiceItem) {
        return res.status(400).json({
          success: false,
          error: `الصنف المحدد غير موجود ضمن بنود الفاتورة: ${item.productId}`
        });
      }

      const availableQty = invoiceItem.quantity - (invoiceItem.returnedQuantity || 0);
      if (qty > availableQty) {
        return res.status(400).json({
          success: false,
          error: `الكمية المراد إرجاعها (${qty}) تتجاوز المتاح للإرجاع (${availableQty}) للمنتج "${invoiceItem.product.name}"`
        });
      }

      const unitSale = parseFloat(item.unitSalePrice) || invoiceItem.unitSalePrice;
      const unitCost = invoiceItem.unitCostPrice || 0;
      const itemTotalSale = unitSale * qty;
      const itemTotalCost = unitCost * qty;

      totalReturnSale += itemTotalSale;
      totalReturnCost += itemTotalCost;

      validatedItems.push({
        productId: invoiceItem.productId,
        invoiceItemId: invoiceItem.id,
        quantity: qty,
        size: item.size || invoiceItem.size,
        unitSalePrice: unitSale,
        unitCostPrice: unitCost,
        totalSalePrice: itemTotalSale,
        totalCostPrice: itemTotalCost,
        returnReason: item.returnReason || returnReason || null
      });
    }

    if (validatedItems.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب إرجاع قطعة واحدة على الأقل بكمية صحيحة' });
    }

    // 4. احتساب المبالغ المالية (خصم من الدين مقابل استرداد من الخزينة)
    let deductedFromDebt = 0;
    let deductedFromPaid = 0;

    if (customDeductedFromDebt !== undefined && customDeductedFromPaid !== undefined) {
      deductedFromDebt = parseFloat(customDeductedFromDebt) || 0;
      deductedFromPaid = parseFloat(customDeductedFromPaid) || 0;
    } else {
      // احتساب ذكي تلقائي:
      // إذا كان على الفاتورة دين متبقي: نخصم من الدين أولاً
      if (invoice.remainingAmount > 0) {
        deductedFromDebt = Math.min(invoice.remainingAmount, totalReturnSale);
        deductedFromPaid = Math.max(0, totalReturnSale - deductedFromDebt);
      } else {
        deductedFromPaid = totalReturnSale;
        deductedFromDebt = 0;
      }
    }

    // التحقق من الخزينة إذا كان هناك استرداد كاش
    if (deductedFromPaid > 0 && !vaultId) {
      return res.status(400).json({
        success: false,
        error: 'يجب اختيار الخزينة لخصم المبلغ المسترد نقداً للعميل'
      });
    }

    // إنشاء رقم المرتجع
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.officeReturn.count();
    const returnNumber = `RET-OF-${dateStr}-${String(count + 1).padStart(5, '0')}`;

    // 5. تنفيذ المعاملة داخل Transaction لضمان الاتساق
    const result = await prisma.$transaction(async (tx) => {
      // أ. إنشاء سجل المرتجع
      const newReturn = await tx.officeReturn.create({
        data: {
          returnNumber,
          invoiceId,
          customerId: invoice.customerId || null,
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone || null,
          totalAmount: totalReturnSale,
          totalCost: totalReturnCost,
          refundMethod,
          deductedFromPaid,
          deductedFromDebt,
          vaultId: deductedFromPaid > 0 ? vaultId : null,
          returnReason: returnReason || null,
          notes: notes || null,
          status: 'COMPLETED',
          createdById,
          items: {
            create: validatedItems
          }
        },
        include: {
          items: {
            include: { product: true }
          },
          invoice: true,
          vault: true
        }
      });

      // ب. إعادة الكميات المرتجعة فوراً إلى رصيد المخزن الرئيسي
      for (const item of validatedItems) {
        const existingInv = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: mainWarehouse.id
            }
          }
        });

        if (existingInv) {
          await tx.inventory.update({
            where: { id: existingInv.id },
            data: {
              quantity: { increment: item.quantity }
            }
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              branchId: mainWarehouse.id,
              quantity: item.quantity
            }
          });
        }

        // تحديث الكمية المرتجعة في بند الفاتورة
        await tx.officeInvoiceItem.update({
          where: { id: item.invoiceItemId },
          data: {
            returnedQuantity: { increment: item.quantity }
          }
        });
      }

      // ج. خصم المبلغ المسترد من الخزينة وتسجيل حركة VaultTransaction
      if (deductedFromPaid > 0 && vaultId) {
        const vault = await tx.vault.findUnique({
          where: { id: vaultId }
        });

        if (!vault) {
          throw new Error('الخزينة المحددة غير موجودة');
        }

        const balanceBefore = vault.balance;
        const balanceAfter = balanceBefore - deductedFromPaid;

        await tx.vault.update({
          where: { id: vaultId },
          data: {
            balance: { decrement: deductedFromPaid }
          }
        });

        await tx.vaultTransaction.create({
          data: {
            vaultId,
            branchId: mainWarehouse.id,
            type: 'CASH_WITHDRAWAL',
            amount: deductedFromPaid,
            description: `مرتجع فاتورة مكتب ${invoice.invoiceNumber} (${returnNumber}) - ${invoice.customerName}`,
            notes: notes || returnReason || 'استرداد نقدي لمرتجع مبيعات',
            createdBy: createdById,
            balanceBefore,
            balanceAfter
          }
        });
      }

      // د. تحديث الفاتورة الأصلية
      const newPaid = Math.max(0, invoice.paidAmount - deductedFromPaid);
      const remainingDeductionOnThis = Math.min(invoice.remainingAmount, deductedFromDebt);
      const newRemaining = Math.max(0, invoice.remainingAmount - remainingDeductionOnThis);
      const newRefund = (invoice.refundAmount || 0) + totalReturnSale;
      const newProfit = invoice.profit - (totalReturnSale - totalReturnCost);

      // فحص هل تم إرجاع كامل أصناف الفاتورة
      const allItems = await tx.officeInvoiceItem.findMany({
        where: { invoiceId }
      });
      const allReturned = allItems.every(item => item.quantity <= (item.returnedQuantity || 0));

      await tx.officeInvoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          refundAmount: newRefund,
          profit: newProfit,
          status: allReturned ? 'RETURNED' : (newRemaining <= 0.01 ? 'COMPLETED' : invoice.status)
        }
      });

      // إذا كان هناك متبقي من خصم المديونية لم يستوعبه هذا البند (لأن الفاتورة الحالية متبقيها أقل من الخصم):
      let remainingDebtToDeduct = deductedFromDebt - remainingDeductionOnThis;
      if (remainingDebtToDeduct > 0 && invoice.customerId) {
        // نخصم من باقي فواتير العميل المفتوحة (من الأقدم للأحدث)
        const otherUnpaidInvoices = await tx.officeInvoice.findMany({
          where: {
            customerId: invoice.customerId,
            id: { not: invoiceId },
            remainingAmount: { gt: 0 },
            status: { not: 'CANCELLED' }
          },
          orderBy: { createdAt: 'asc' }
        });

        for (const otherInv of otherUnpaidInvoices) {
          if (remainingDebtToDeduct <= 0) break;
          const deductFromThis = Math.min(otherInv.remainingAmount, remainingDebtToDeduct);
          remainingDebtToDeduct -= deductFromThis;
          const otherNewRemaining = Math.max(0, otherInv.remainingAmount - deductFromThis);
          
          await tx.officeInvoice.update({
            where: { id: otherInv.id },
            data: {
              remainingAmount: otherNewRemaining,
              status: otherNewRemaining <= 0.01 ? 'COMPLETED' : otherInv.status
            }
          });
        }

        // إذا تبقى مبلغ بعد سداد جميع فواتير العميل، نضيفه كرصيد في محفظة العميل
        if (remainingDebtToDeduct > 0) {
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: {
              walletBalance: { increment: remainingDebtToDeduct }
            }
          });
        }
      }

      // هـ. إذا كان هناك خصم من مديونية عميل مسجل، نحدث إحصائياته
      if ((invoice.type === 'REGULAR' || invoice.type === 'SHIPMENT') && invoice.customerPhone) {
        try {
          const officeCustomerController = require('./officeCustomer.controller');
          await officeCustomerController.updateStatistics(invoice.customerPhone, {
            total: -totalReturnSale,
            paidAmount: -deductedFromPaid
          });
        } catch (e) {
          console.warn('Could not update office customer stats:', e.message);
        }
      }

      return newReturn;
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل المرتجع وإعادة البضاعة للمخزن الرئيسي بنجاح',
      data: result
    });
  } catch (error) {
    console.error('Error creating office return:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في تسجيل المرتجع'
    });
  }
};

/**
 * جلب جميع مرتجعات فواتير المكتب مع الإحصائيات
 */
exports.getAllOfficeReturns = async (req, res) => {
  try {
    const { startDate, endDate, query } = req.query;

    const where = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (query) {
      where.OR = [
        { returnNumber: { contains: query, mode: 'insensitive' } },
        { customerName: { contains: query, mode: 'insensitive' } },
        { customerPhone: { contains: query } },
        { invoice: { invoiceNumber: { contains: query, mode: 'insensitive' } } }
      ];
    }

    const returns = await prisma.officeReturn.findMany({
      where,
      include: {
        items: {
          include: { product: true }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            type: true,
            total: true,
            paymentMethod: true,
            createdAt: true
          }
        },
        vault: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // حساب ملخص الإحصائيات
    const stats = {
      totalReturnsCount: returns.length,
      totalRefundAmount: returns.reduce((sum, r) => sum + (r.totalAmount || 0), 0),
      totalDeductedFromVault: returns.reduce((sum, r) => sum + (r.deductedFromPaid || 0), 0),
      totalDeductedFromDebt: returns.reduce((sum, r) => sum + (r.deductedFromDebt || 0), 0),
      totalItemsReturned: returns.reduce(
        (sum, r) => sum + r.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0),
        0
      )
    };

    res.json({
      success: true,
      data: returns,
      stats
    });
  } catch (error) {
    console.error('Error fetching office returns:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المرتجعات'
    });
  }
};

/**
 * جلب مرتجع محدد بواسطة الـ ID
 */
exports.getOfficeReturnById = async (req, res) => {
  try {
    const { id } = req.params;

    const returnRecord = await prisma.officeReturn.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true }
        },
        invoice: {
          include: {
            items: {
              include: { product: true }
            }
          }
        },
        vault: true,
        createdBy: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });

    if (!returnRecord) {
      return res.status(404).json({
        success: false,
        error: 'المرتجع غير موجود'
      });
    }

    res.json({
      success: true,
      data: returnRecord
    });
  } catch (error) {
    console.error('Error fetching office return by id:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب بيانات المرتجع'
    });
  }
};

/**
 * البحث عن فاتورة مكتب ومطابقتها لإنشاء مرتجع
 * ترجع الفاتورة مع بنودها والكميات المتبقية المتاحة للإرجاع
 */
exports.searchInvoiceForReturn = async (req, res) => {
  try {
    const { query } = req.params;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال رقم الفاتورة أو اسم/هاتف العميل' });
    }

    const trimmed = query.trim();

    // البحث برقم الفاتورة أولاً بدقة، أو بالهاتف أو الاسم
    const invoices = await prisma.officeInvoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: trimmed, mode: 'insensitive' } },
          { customerPhone: { contains: trimmed } },
          { customerName: { contains: trimmed, mode: 'insensitive' } }
        ]
      },
      include: {
        items: {
          include: { product: true }
        },
        customer: true,
        returns: {
          select: {
            id: true,
            returnNumber: true,
            totalAmount: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // معالجة كل فاتورة وإضافة المتاح للإرجاع لكل صنف
    const processed = invoices.map(invoice => {
      const itemsWithAvailable = invoice.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name,
        productSku: item.product?.sku,
        productBarcode: item.product?.barcode,
        size: item.size,
        soldQuantity: item.quantity,
        returnedQuantity: item.returnedQuantity || 0,
        availableQuantity: Math.max(0, item.quantity - (item.returnedQuantity || 0)),
        unitSalePrice: item.unitSalePrice,
        unitCostPrice: item.unitCostPrice,
        totalSale: item.totalSale
      }));

      const totalSoldPieces = itemsWithAvailable.reduce((s, i) => s + i.soldQuantity, 0);
      const totalReturnedPieces = itemsWithAvailable.reduce((s, i) => s + i.returnedQuantity, 0);
      const totalAvailablePieces = itemsWithAvailable.reduce((s, i) => s + i.availableQuantity, 0);

      return {
        ...invoice,
        items: itemsWithAvailable,
        totalSoldPieces,
        totalReturnedPieces,
        totalAvailablePieces,
        canReturn: totalAvailablePieces > 0
      };
    });

    res.json({
      success: true,
      data: processed
    });
  } catch (error) {
    console.error('Error searching invoice for return:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في البحث عن الفاتورة'
    });
  }
};
