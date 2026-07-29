const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// إنشاء فاتورة مكتب جديدة
exports.createOfficeInvoice = async (req, res) => {
  try {
    const {
      type, // REGULAR, SHIPMENT, CLIENT
      customerId,
      customerName,
      customerPhone,
      shipmentCompany,
      shipmentBill,
      items, // [{ productId, quantity, size, unitSalePrice }]
      discountAmount = 0,
      paymentMethod,
      paidAmount,
      notes
    } = req.body;

    const createdBy = req.user.id;

    // حساب المجاميع
    let subtotal = 0;
    let totalCost = 0;
    const invoiceItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        return res.status(404).json({ 
          success: false,
          error: `Product not found: ${item.productId}` 
        });
      }

      const itemTotalCost = product.costPrice * item.quantity;
      const itemTotalSale = item.unitSalePrice * item.quantity;

      subtotal += itemTotalSale;
      totalCost += itemTotalCost;

      invoiceItems.push({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        unitCostPrice: product.costPrice,
        unitSalePrice: item.unitSalePrice,
        totalCost: itemTotalCost,
        totalSale: itemTotalSale
      });
    }

    const total = subtotal - discountAmount;
    const profit = total - totalCost;
    
    // فواتير الشحن: الفلوس متتحسبش مدفوعة إلا بعد تأكيد الاستلام
    const actualPaidAmount = type === 'SHIPMENT' ? 0 : paidAmount;
    const remainingAmount = total - actualPaidAmount;

    // إنشاء رقم الفاتورة
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.officeInvoice.count();
    const invoiceNumber = `OF-${dateStr}-${String(count + 1).padStart(5, '0')}`;

    // إنشاء الفاتورة
    const invoice = await prisma.officeInvoice.create({
      data: {
        invoiceNumber,
        type,
        customerId,
        customerName,
        customerPhone,
        shipmentCompany,
        shipmentBill,
        subtotal,
        discountAmount,
        total,
        totalCost,
        profit,
        paymentMethod,
        paidAmount: actualPaidAmount, // صفر للشحن
        remainingAmount,
        status: type === 'SHIPMENT' ? 'PENDING' : (remainingAmount > 0 ? 'PENDING' : 'COMPLETED'),
        notes,
        createdBy,
        items: {
          create: invoiceItems
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true
      }
    });

    // تحديث رصيد العميل إذا كان موجود
    if (customerId && remainingAmount > 0) {
      try {
        const customerExists = await prisma.customer.findUnique({
          where: { id: customerId }
        });
        
        if (customerExists) {
          await prisma.customer.update({
            where: { id: customerId },
            data: {
              balance: {
                increment: remainingAmount
              }
            }
          });
        }
      } catch (error) {
        console.error('Error updating customer balance:', error);
        // Don't fail the whole invoice creation if balance update fails
      }
    }

    // إذا كان شحن، أنشئ Shipment
    if (type === 'SHIPMENT') {
      await prisma.shipment.create({
        data: {
          shipmentNumber: `SH-${dateStr}-${String(count + 1).padStart(5, '0')}`,
          invoiceId: invoice.id,
          shipmentCompany,
          shipmentBill,
          customerName,
          customerPhone,
          status: 'PENDING',
          updatedBy: createdBy
        }
      });
    }

    // خصم من المخزن الرئيسي
    const mainWarehouse = await prisma.branch.findFirst({
      where: { 
        OR: [
          { code: 'MAIN' },
          { id: '1' }
        ]
      }
    });

    console.log('🏢 Main Warehouse:', mainWarehouse);

    if (!mainWarehouse) {
      return res.status(400).json({ 
        success: false,
        error: 'المخزن الرئيسي غير موجود' 
      });
    }

    if (!mainWarehouse.id) {
      console.error('❌ Main warehouse found but ID is undefined!', mainWarehouse);
      return res.status(400).json({ 
        success: false,
        error: 'خطأ في معرف المخزن الرئيسي' 
      });
    }

    // خصم الكمية من المخزن
    for (const item of invoiceItems) {
      const inventory = await prisma.inventory.findUnique({
        where: {
          branchId_productId: {
            branchId: mainWarehouse.id,
            productId: item.productId
          }
        }
      });

      if (inventory) {
        if (inventory.quantity < item.quantity) {
          return res.status(400).json({ 
            success: false,
            error: `الكمية المتاحة في المخزن غير كافية للمنتج ${item.productId}` 
          });
        }

        await prisma.inventory.update({
          where: {
            branchId_productId: {
              branchId: mainWarehouse.id,
              productId: item.productId
            }
          },
          data: {
            quantity: inventory.quantity - item.quantity
          }
        });
      } else {
        return res.status(400).json({ 
          success: false,
          error: `المنتج ${item.productId} غير موجود في المخزن الرئيسي` 
        });
      }
    }

    // إضافة للخزينة فقط إذا لم يكن شحن (الشحن يتم إضافته عند تأكيد الاستلام)
    if (type !== 'SHIPMENT' && (paymentMethod === 'CASH' || paymentMethod === 'CARD') && actualPaidAmount > 0) {
      const vaultField = paymentMethod === 'CASH' ? 'vaultBalance' : 'cardVaultBalance';
      
      // جلب الرصيد الحالي
      const currentWarehouse = await prisma.branch.findUnique({
        where: { id: mainWarehouse.id }
      });
      
      const balanceBefore = currentWarehouse[vaultField] || 0;
      const balanceAfter = balanceBefore + actualPaidAmount;
      
      await prisma.branch.update({
        where: { id: mainWarehouse.id },
        data: {
          [vaultField]: {
            increment: actualPaidAmount
          }
        }
      });

      await prisma.vaultTransaction.create({
        data: {
          branchId: mainWarehouse.id,
          type: paymentMethod === 'CASH' ? 'CASH_DEPOSIT' : 'CARD_PAYMENT',
          amount: actualPaidAmount,
          description: `فاتورة مكتب ${invoiceNumber}`,
          notes: `دفعة من ${customerName}`,
          createdBy,
          balanceBefore,
          balanceAfter
        }
      });
    }

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error creating office invoice:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to create office invoice' 
    });
  }
};

// جلب كل فواتير المكتب
exports.getAllOfficeInvoices = async (req, res) => {
  try {
    const { type, status, startDate, endDate } = req.query;

    const where = {};
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const invoices = await prisma.officeInvoice.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        shipment: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching office invoices:', error);
    res.status(500).json({ error: 'Failed to fetch office invoices' });
  }
};

// جلب فاتورة واحدة
exports.getOfficeInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.officeInvoice.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        shipment: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching office invoice:', error);
    res.status(500).json({ error: 'Failed to fetch office invoice' });
  }
};

// تحديث حالة الدفع
exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAmount, paymentMethod } = req.body;
    const userId = req.user.id;

    const invoice = await prisma.officeInvoice.findUnique({
      where: { id }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const newTotalPaid = invoice.paidAmount + paidAmount;
    const newRemaining = invoice.total - newTotalPaid;

    const updated = await prisma.officeInvoice.update({
      where: { id },
      data: {
        paidAmount: newTotalPaid,
        remainingAmount: newRemaining,
        status: newRemaining <= 0 ? 'COMPLETED' : invoice.status
      }
    });

    // تحديث رصيد العميل
    if (invoice.customerId) {
      await prisma.customer.update({
        where: { id: invoice.customerId },
        data: {
          balance: {
            decrement: paidAmount
          }
        }
      });
    }

    // إضافة للخزينة
    const mainWarehouse = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (mainWarehouse && (paymentMethod === 'CASH' || paymentMethod === 'CARD')) {
      const vaultField = paymentMethod === 'CASH' ? 'vaultBalance' : 'cardVaultBalance';
      
      await prisma.branch.update({
        where: { id: mainWarehouse.id },
        data: {
          [vaultField]: {
            increment: paidAmount
          }
        }
      });

      await prisma.vaultTransaction.create({
        data: {
          branchId: mainWarehouse.id,
          type: paymentMethod === 'CASH' ? 'CASH_DEPOSIT' : 'CARD_PAYMENT',
          amount: paidAmount,
          description: `دفعة على فاتورة ${invoice.invoiceNumber}`,
          createdBy: userId,
          balanceBefore: mainWarehouse[vaultField],
          balanceAfter: mainWarehouse[vaultField] + paidAmount
        }
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
};

// Dashboard للفواتير
exports.getOfficeInvoiceDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // إجمالي المبيعات والأرباح
    const invoices = await prisma.officeInvoice.findMany({
      where: {
        ...where,
        status: { not: 'CANCELLED' }
      }
    });

    const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalProfit = invoices.reduce((sum, inv) => sum + inv.profit, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalRemaining = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);

    // تحليل حسب النوع
    const regularCount = invoices.filter(inv => inv.type === 'REGULAR').length;
    const shipmentCount = invoices.filter(inv => inv.type === 'SHIPMENT').length;
    const clientCount = invoices.filter(inv => inv.type === 'CLIENT').length;

    // الشحنات
    const shipments = await prisma.shipment.findMany({
      where: {
        createdAt: where.createdAt
      }
    });

    const shippedCount = shipments.filter(s => s.status === 'SHIPPED' || s.status === 'IN_TRANSIT').length;
    const deliveredCount = shipments.filter(s => s.status === 'DELIVERED').length;
    const pendingShipmentCount = shipments.filter(s => s.status === 'PENDING').length;

    res.json({
      totalSales,
      totalProfit,
      totalCollected,
      totalRemaining,
      invoiceCount: invoices.length,
      byType: {
        regular: regularCount,
        shipment: shipmentCount,
        client: clientCount
      },
      shipments: {
        total: shipments.length,
        pending: pendingShipmentCount,
        shipped: shippedCount,
        delivered: deliveredCount
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};
