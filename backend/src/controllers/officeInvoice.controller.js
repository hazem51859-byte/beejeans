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
      vaultId, // الخزينة المختارة
      paidAmount,
      notes,
      sellerId,
      sellerName: inputSellerName
    } = req.body;

    const createdBy = req.user.id;

    // ======== VALIDATION PHASE ========
    console.log('📝 Creating office invoice with data:', { type, customerName, items: items?.length });

    // Validate items first
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'يجب إضافة أصناف للفاتورة' 
      });
    }

    // خصم من المخزن الرئيسي - Find it first
    let mainWarehouse = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    // If not found by code, try to find first branch (usually the main one)
    if (!mainWarehouse) {
      const branches = await prisma.branch.findMany({
        orderBy: { createdAt: 'asc' },
        take: 1
      });
      mainWarehouse = branches[0];
    }

    console.log('🏢 Main Warehouse:', { id: mainWarehouse?.id, name: mainWarehouse?.name, code: mainWarehouse?.code });

    if (!mainWarehouse || !mainWarehouse.id) {
      return res.status(400).json({ 
        success: false,
        error: 'المخزن الرئيسي غير موجود' 
      });
    }

    // Validate products and calculate totals
    let subtotal = 0;
    let totalCost = 0;
    const invoiceItems = [];

    for (const item of items) {
      console.log('🔍 Checking item:', { productId: item.productId, quantity: item.quantity });

      if (!item.productId) {
        return res.status(400).json({ 
          success: false,
          error: 'يجب تحديد المنتج' 
        });
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        return res.status(404).json({ 
          success: false,
          error: `المنتج غير موجود: ${item.productId}` 
        });
      }

      console.log('✅ Product found:', { id: product.id, name: product.name });
      console.log('🔍 Looking for inventory with:', { branchId: mainWarehouse.id, productId: item.productId });

      // Check inventory availability BEFORE creating invoice
      const inventory = await prisma.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: mainWarehouse.id
          }
        }
      });

      console.log('📦 Inventory result:', inventory ? { quantity: inventory.quantity } : 'NOT FOUND');

      if (!inventory) {
        return res.status(400).json({ 
          success: false,
          error: `المنتج "${product.name}" غير موجود في المخزن الرئيسي` 
        });
      }

      if (inventory.quantity < item.quantity) {
        return res.status(400).json({ 
          success: false,
          error: `الكمية المتاحة في المخزن غير كافية للمنتج "${product.name}". المتاح: ${inventory.quantity}` 
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
    
    // التحقق من رصيد المحفظة للعميل
    let walletDeduction = 0;
    let walletBalanceBefore = 0;
    let customer = null;
    
    if (customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: customerId }
      });
      
      if (customer && customer.walletBalance > 0) {
        walletBalanceBefore = customer.walletBalance;
        // خصم من المحفظة (كل المبلغ أو جزء منه حسب الرصيد)
        walletDeduction = Math.min(customer.walletBalance, total);
        console.log(`💰 سيتم خصم ${walletDeduction} جنيه من محفظة العميل (رصيد المحفظة: ${walletBalanceBefore})`);
      }
    }
    
    // حساب المبلغ المدفوع والمتبقي
    const parsedPaid = parseFloat(paidAmount) || 0;
    const actualPaidAmount = type === 'SHIPMENT' ? 0 : (parsedPaid + walletDeduction);
    const remainingAmount = Math.max(0, total - actualPaidAmount);

    // إنشاء رقم الفاتورة
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.officeInvoice.count();
    const invoiceNumber = `OF-${dateStr}-${String(count + 1).padStart(5, '0')}`;

    // ======== TRANSACTION PHASE ========
    // استخدام Transaction لضمان أن كل العمليات تتم بنجاح أو لا تتم على الإطلاق
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. إنشاء الفاتورة
      const newInvoice = await tx.officeInvoice.create({
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
          paidAmount: actualPaidAmount,
          remainingAmount,
          status: type === 'SHIPMENT' ? 'PENDING' : (remainingAmount <= 0.01 ? 'COMPLETED' : 'PENDING'),
          sellerId: sellerId || null,
          sellerName: inputSellerName || null,
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

      // 2. خصم الكمية من المخزن
      for (const item of invoiceItems) {
        await tx.inventory.update({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: mainWarehouse.id
            }
          },
          data: {
            quantity: {
              decrement: item.quantity
            }
          }
        });
      }

      // 2.5. خصم من محفظة العميل وتسجيل الدفعة
      if (walletDeduction > 0 && customer) {
        // تحديث رصيد المحفظة
        await tx.customer.update({
          where: { id: customerId },
          data: {
            walletBalance: {
              decrement: walletDeduction
            }
          }
        });

        // تسجيل دفعة من المحفظة
        await tx.customerPayment.create({
          data: {
            customerId,
            amount: walletDeduction,
            paymentMethod: 'WALLET',
            referenceNumber: invoiceNumber,
            notes: `خصم تلقائي من المحفظة (رصيد سابق: ${walletBalanceBefore.toFixed(2)} جنيه)`,
            createdBy
          }
        });

        console.log(`✅ تم خصم ${walletDeduction} جنيه من محفظة العميل وتسجيلها كدفعة`);
      }

      // 3. إذا كان شحن، أنشئ Shipment
      if (type === 'SHIPMENT') {
        await tx.shipment.create({
          data: {
            shipmentNumber: `SH-${dateStr}-${String(count + 1).padStart(5, '0')}`,
            invoiceId: newInvoice.id,
            shipmentCompany,
            shipmentBill,
            customerName,
            customerPhone,
            status: 'PENDING',
            updatedBy: createdBy
          }
        });
      }

      // 4. إضافة للخزينة فقط إذا لم يكن شحن وتم دفع مبلغ
      if (type !== 'SHIPMENT' && vaultId && actualPaidAmount > 0) {
        // جلب بيانات الخزينة
        const vault = await tx.vault.findUnique({
          where: { id: vaultId }
        });

        if (!vault) {
          throw new Error('الخزينة المحددة غير موجودة');
        }

        const balanceBefore = vault.balance;
        const balanceAfter = balanceBefore + actualPaidAmount;
        
        // تحديث رصيد الخزينة
        await tx.vault.update({
          where: { id: vaultId },
          data: {
            balance: {
              increment: actualPaidAmount
            }
          }
        });

        const txDescription = paymentMethod === 'CREDIT'
          ? `فاتورة مكتب آجل ${invoiceNumber} - ${customerName} (دفعة مقدمة)`
          : `فاتورة مكتب ${invoiceNumber} - ${customerName}`;

        const txType = paymentMethod === 'CARD' ? 'CARD_PAYMENT' : (paymentMethod === 'WALLET' ? 'WALLET_PAYMENT' : 'CASH_DEPOSIT');

        // تسجيل المعاملة
        await tx.vaultTransaction.create({
          data: {
            vaultId,
            branchId: mainWarehouse.id,
            type: txType,
            amount: actualPaidAmount,
            description: txDescription,
            notes: notes || `دفعة من ${customerName}`,
            createdBy,
            balanceBefore,
            balanceAfter
          }
        });
      }

      return newInvoice;
    });

    // 5. حفظ/تحديث بيانات عميل المكتب (REGULAR & SHIPMENT only)
    if ((type === 'REGULAR' || type === 'SHIPMENT') && customerPhone) {
      const officeCustomerController = require('./officeCustomer.controller');
      await officeCustomerController.updateStatistics(customerPhone, {
        total,
        paidAmount: actualPaidAmount
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

    // إضافة للخزينة
    const mainWarehouse = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });

    if (mainWarehouse && (paymentMethod === 'CASH' || paymentMethod === 'CARD' || paymentMethod === 'WALLET')) {
      const vaultField = paymentMethod === 'CASH' ? 'vaultBalance' : (paymentMethod === 'CARD' ? 'cardVaultBalance' : 'walletBalance');
      
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
          type: paymentMethod === 'CASH' ? 'CASH_DEPOSIT' : (paymentMethod === 'CARD' ? 'CARD_PAYMENT' : 'WALLET_PAYMENT'),
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
