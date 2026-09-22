const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
    });
    
    // Calculate dynamic totals for each customer
    const customersWithCalculatedBalances = await Promise.all(
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
        
        const netSales = sales.reduce((sum, s) => sum + (s.total - (s.refundAmount || 0)), 0);
        const salesDebt = sales.reduce((sum, s) => sum + Math.max(0, s.total - (s.refundAmount || 0) - s.amountPaid), 0);
        const paidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);

        const netOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + (inv.total - (inv.refundAmount || 0)), 0);
        const officeDebt = officeInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
        const paidOnOffice = officeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

        // الرصيد الصحيح: مديونية التقسيط + مديونية فواتير المكتب - رصيد المحفظة (إن وجد)
        const walletBalance = customer.walletBalance || 0;
        const balance = salesDebt + officeDebt - walletBalance;
        
        return {
          ...customer,
          totalSales: parseFloat((netSales + netOfficeInvoices).toFixed(2)),
          totalPaid: parseFloat((paidOnSales + paidOnOffice).toFixed(2)),
          walletBalance: parseFloat(walletBalance.toFixed(2)),
          balance: parseFloat(balance.toFixed(2))
        };
      })
    );
    
    res.json({
      success: true,
      data: customersWithCalculatedBalances
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customers'
    });
  }
};

// Get customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await prisma.customer.findUnique({
      where: { id }
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    const sales = await prisma.sale.findMany({
      where: { customerId: id },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // جلب فواتير المكتب للعميل
    const officeInvoices = await prisma.officeInvoice.findMany({
      where: { 
        customerId: id,
        status: { not: 'CANCELLED' }
      },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // جلب مرتجعات المكتب الخاصة بالعميل
    const officeReturns = await prisma.officeReturn.findMany({
      where: {
        OR: [
          { customerId: id },
          { invoice: { customerId: id } }
        ]
      },
      include: {
        items: {
          include: { product: true }
        },
        invoice: {
          select: { id: true, invoiceNumber: true, total: true, paidAmount: true, remainingAmount: true, refundAmount: true }
        },
        vault: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const payments = await prisma.customerPayment.findMany({
      where: { customerId: id },
      orderBy: { paymentDate: 'desc' }
    });
    
    const netSales = sales.reduce((sum, s) => sum + (s.total - (s.refundAmount || 0)), 0);
    const salesDebt = sales.reduce((sum, s) => sum + Math.max(0, s.total - (s.refundAmount || 0) - s.amountPaid), 0);
    const paidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);

    const netOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + (inv.total - (inv.refundAmount || 0)), 0);
    const officeDebt = officeInvoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
    const paidOnOffice = officeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    const walletBalance = customer.walletBalance || 0;
    const balance = salesDebt + officeDebt - walletBalance;
    
    res.json({
      success: true,
      data: {
        ...customer,
        totalSales: parseFloat((netSales + netOfficeInvoices).toFixed(2)),
        totalPaid: parseFloat((paidOnSales + paidOnOffice).toFixed(2)),
        walletBalance: parseFloat(walletBalance.toFixed(2)),
        balance: parseFloat(balance.toFixed(2)),
        sales,
        officeInvoices,
        officeReturns, // إضافة مرتجعات المكتب
        payments
      }
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer details'
    });
  }
};

// Create customer
exports.createCustomer = async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Customer name is required'
      });
    }
    
    const customer = await prisma.customer.create({
      data: {
        name,
        phone: phone || null,
        address: address || null,
        notes: notes || null
      }
    });
    
    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      error: error.code === 'P2002' ? 'رقم الهاتف مسجل لعميل آخر بالفعل' : 'Failed to create customer'
    });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, notes } = req.body;
    
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        phone: phone || null,
        address: address || null,
        notes: notes || null
      }
    });
    
    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      error: error.code === 'P2002' ? 'رقم الهاتف مسجل لعميل آخر بالفعل' : 'Failed to update customer'
    });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.customer.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete customer'
    });
  }
};

// Delete completed sale (fully paid, remaining = 0)
exports.deleteCompletedSale = async (req, res) => {
  try {
    const { saleId } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id: saleId }
    });

    if (!sale) {
      return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    }

    const remaining = sale.total - sale.amountPaid;
    if (remaining > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن حذف فاتورة لم يتم سداد كامل قيمتها'
      });
    }

    // حذف الفاتورة وعناصرها (cascade)
    await prisma.sale.delete({ where: { id: saleId } });

    res.json({ success: true, message: 'تم حذف الفاتورة بنجاح' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ success: false, error: 'فشل في حذف الفاتورة' });
  }
};

// Delete completed office invoice (fully paid, remaining = 0)
exports.deleteCompletedOfficeInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.officeInvoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    }

    const remaining = invoice.total - invoice.paidAmount;
    if (remaining > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن حذف فاتورة لم يتم سداد كامل قيمتها'
      });
    }

    await prisma.officeInvoice.delete({ where: { id: invoiceId } });

    res.json({ success: true, message: 'تم حذف فاتورة المكتب بنجاح' });
  } catch (error) {
    console.error('Error deleting office invoice:', error);
    res.status(500).json({ success: false, error: 'فشل في حذف الفاتورة' });
  }
};

// Create direct Sale to Customer from MAIN warehouse
exports.createCustomerSale = async (req, res) => {
  try {
    const { id: customerId } = req.params;
    const { items, paidAmount = 0, paymentMethod = 'CASH', notes } = req.body;
    const cashierId = req.user.id;
    
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    // Find MAIN branch ID
    const mainBranch = await prisma.branch.findUnique({
      where: { code: 'MAIN' }
    });
    if (!mainBranch) {
      return res.status(500).json({
        success: false,
        error: 'Main warehouse branch (MAIN) not found. Please start server first.'
      });
    }
    
    // Generate Invoice Number
    const invoiceNumber = `INV-CUST-${Date.now()}`;
    
    // Process items and check/create product records
    const processedItems = [];
    let subtotal = 0;
    
    for (const item of items) {
      const unitPrice = parseFloat(item.unitPrice);
      const quantity = parseInt(item.quantity);
      
      let product;
      
      // If productId is provided, use it directly (from inventory dropdown)
      if (item.productId) {
        product = await prisma.product.findUnique({
          where: { id: item.productId }
        });
        if (!product) {
          return res.status(400).json({
            success: false,
            error: `المنتج غير موجود: ${item.productId}`
          });
        }
      } else {
        // Fallback: lookup by name
        const productName = item.productName || item.description || 'منتج وارد';
        const size = item.size || null;
        const color = item.color || null;
        
        product = await prisma.product.findFirst({
          where: {
            name: { equals: productName },
            size: { equals: size },
            color: { equals: color }
          }
        });
        
        if (!product) {
          let category = await prisma.category.findFirst();
          if (!category) {
            category = await prisma.category.create({
              data: { name: 'عام', description: 'تصنيف عام' }
            });
          }
          
          // Get category default prices
          const costPrice = category.defaultCostPrice || 0;
          const sellingPrice = category.defaultSellingPrice || unitPrice;
          
          const sku = `${category.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
          const barcode = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
          
          product = await prisma.product.create({
            data: {
              sku,
              barcode,
              name: productName,
              categoryId: category.id,
              costPrice,
              sellingPrice,
              size,
              color,
              status: 'ACTIVE'
            }
          });
        }
      }
      
      
      const itemTotal = quantity * unitPrice;
      subtotal += itemTotal;
      
      processedItems.push({
        productId: product.id,
        quantity,
        unitPrice,
        total: itemTotal
      });
    }
    
    const total = subtotal; // Assuming no tax/discount on direct sales for now
    
    // التحقق من رصيد المحفظة للعميل
    let walletDeduction = 0;
    let walletBalanceBefore = customer.walletBalance || 0;
    
    if (walletBalanceBefore > 0) {
      // خصم من المحفظة (كل المبلغ أو جزء منه حسب الرصيد)
      walletDeduction = Math.min(walletBalanceBefore, total);
      console.log(`💰 سيتم خصم ${walletDeduction} جنيه من محفظة العميل (رصيد المحفظة: ${walletBalanceBefore})`);
    }
    
    const totalPaid = parseFloat(paidAmount) + walletDeduction;
    
    // Execute atomic transaction for sale creation and inventory deduction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          branchId: mainBranch.id,
          cashierId,
          customerId,
          customerName: customer.name,
          customerPhone: customer.phone,
          subtotal,
          taxAmount: 0,
          discountAmount: 0,
          total,
          paymentMethod,
          amountPaid: totalPaid,
          changeAmount: 0,
          status: 'COMPLETED',
          notes,
          items: {
            create: processedItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total
            }))
          }
        },
        include: {
          items: true
        }
      });
      
      // 2. Deduct quantity from inventory in MAIN warehouse
      for (const item of processedItems) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: mainBranch.id
            }
          }
        });
        
        if (inventory) {
          // Allow going negative if needed, but standard logic decrements
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantity: inventory.quantity - item.quantity
            }
          });
        } else {
          // If no inventory record existed, create one with negative quantity (meaning sold on credit before stock intake)
          await tx.inventory.create({
            data: {
              productId: item.productId,
              branchId: mainBranch.id,
              quantity: -item.quantity
            }
          });
        }
      }
      
      // 3. خصم من محفظة العميل وتسجيل الدفعة
      if (walletDeduction > 0) {
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
            createdBy: cashierId
          }
        });

        console.log(`✅ تم خصم ${walletDeduction} جنيه من محفظة العميل وتسجيلها كدفعة`);
      }
      
      return sale;
    });
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating customer sale:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record customer sale'
    });
  }
};

// Record debt payment from Customer
exports.recordCustomerPayment = async (req, res) => {
  try {
    const { id: customerId } = req.params;
    const { amount, paymentMethod = 'CASH', referenceNumber, notes, invoiceAllocations, officeInvoicesAllocations, vaultId } = req.body;
    const createdBy = req.user.id;
    
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    const paymentAmount = parseFloat(amount) || 0;
    
    await prisma.$transaction(async (tx) => {
      // 1. تسجيل الدفعة الرئيسية
      const payment = await tx.customerPayment.create({
        data: {
          customerId,
          amount: paymentAmount,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          createdBy
        }
      });
      
      // إجمالي الرصيد المتاح للسداد = رصيد المحفظة السابق + المبلغ المدفوع حالياً
      let availableFunds = (customer.walletBalance || 0) + paymentAmount;
      
      // 2. توزيع المبلغ على فواتير التقسيط
      if (invoiceAllocations && invoiceAllocations.length > 0) {
        for (const allocation of invoiceAllocations) {
          const sale = await tx.sale.findUnique({
            where: { id: allocation.saleId }
          });
          
          if (!sale) continue;
          
          const allocAmount = parseFloat(allocation.amount) || 0;
          if (allocAmount > 0 && availableFunds > 0) {
            const payForThis = Math.min(availableFunds, allocAmount);
            availableFunds -= payForThis;
            
            const newAmountPaid = sale.amountPaid + payForThis;
            
            // تحديث المبلغ المدفوع في الفاتورة
            await tx.sale.update({
              where: { id: allocation.saleId },
              data: {
                amountPaid: newAmountPaid
              }
            });
          }
        }
      }
      
      // 3. توزيع المبلغ على فواتير المكتب
      if (officeInvoicesAllocations && officeInvoicesAllocations.length > 0) {
        for (const allocation of officeInvoicesAllocations) {
          const officeInvoice = await tx.officeInvoice.findUnique({
            where: { id: allocation.officeInvoiceId }
          });
          
          if (!officeInvoice) continue;
          
          const allocAmount = parseFloat(allocation.amount) || 0;
          if (allocAmount > 0 && availableFunds > 0) {
            const payForThis = Math.min(availableFunds, allocAmount);
            availableFunds -= payForThis;
            
            const newPaidAmount = officeInvoice.paidAmount + payForThis;
            const effectiveTotal = Math.max(0, officeInvoice.total - (officeInvoice.refundAmount || 0));
            const newRemainingAmount = Math.max(0, effectiveTotal - newPaidAmount);
            const newStatus = newRemainingAmount <= 0.01 ? 'COMPLETED' : officeInvoice.status;
            
            // تحديث المبلغ المدفوع والحالة في فاتورة المكتب
            await tx.officeInvoice.update({
              where: { id: allocation.officeInvoiceId },
              data: {
                paidAmount: newPaidAmount,
                remainingAmount: newRemainingAmount,
                status: newStatus
              }
            });
          }
        }
      }
      
      // 4. تحديث رصيد المحفظة المتبقي في الداتابيز
      await tx.customer.update({
        where: { id: customerId },
        data: {
          walletBalance: Math.max(0, availableFunds)
        }
      });

      // 5. إضافة المبلغ المحصل إلى الخزينة وتسجيل المعاملة
      if (vaultId && paymentAmount > 0) {
        const vault = await tx.vault.findUnique({
          where: { id: vaultId }
        });

        if (!vault) {
          throw new Error('الخزينة المحددة غير موجودة');
        }

        const balanceBefore = vault.balance;
        const balanceAfter = balanceBefore + paymentAmount;

        // تحديث رصيد الخزينة
        await tx.vault.update({
          where: { id: vaultId },
          data: {
            balance: {
              increment: paymentAmount
            }
          }
        });

        const txType = paymentMethod === 'CARD' 
          ? 'CARD_PAYMENT' 
          : (paymentMethod === 'WALLET' ? 'WALLET_PAYMENT' : 'CASH_DEPOSIT');

        // التحقق من صحة branchId لتفادي خطأ Foreign Key Constraint
        let safeBranchId = null;
        if (req.user?.branchId) {
          const branchExists = await tx.branch.findUnique({ where: { id: req.user.branchId } });
          if (branchExists) {
            safeBranchId = req.user.branchId;
          }
        }
        if (!safeBranchId) {
          const mainBranch = await tx.branch.findFirst({ where: { code: 'MAIN' } });
          safeBranchId = mainBranch?.id || null;
        }

        await tx.vaultTransaction.create({
          data: {
            vaultId: vault.id,
            branchId: safeBranchId,
            type: txType,
            amount: paymentAmount,
            description: `تحصيل دفعة من العميل: ${customer.name} (${vault.name})`,
            notes: notes || referenceNumber || `سداد مديونية عميل`,
            createdBy,
            balanceBefore,
            balanceAfter
          }
        });
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الدفعة بنجاح'
    });
  } catch (error) {
    console.error('Error recording customer payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record customer payment'
    });
  }
};


// Get single customer invoice for printing
exports.getCustomerInvoice = async (req, res) => {
  try {
    const { saleId } = req.params;
    
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        cashier: {
          select: {
            name: true,
            username: true
          }
        },
        branch: {
          select: {
            name: true,
            code: true
          }
        }
      }
    });
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Error fetching customer invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice'
    });
  }
};
