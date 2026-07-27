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
        
        const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
        const totalPaidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);
        const totalOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalPaidOnOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        
        const balance = totalSales + totalOfficeInvoices - totalPaidOnSales - totalPaidOnOfficeInvoices - totalPayments;
        
        return {
          ...customer,
          totalSales: totalSales + totalOfficeInvoices,
          totalPaid: totalPaidOnSales + totalPaidOnOfficeInvoices + totalPayments,
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
    
    const payments = await prisma.customerPayment.findMany({
      where: { customerId: id },
      orderBy: { paymentDate: 'desc' }
    });
    
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const totalPaidOnSales = sales.reduce((sum, s) => sum + s.amountPaid, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // إضافة فواتير المكتب للحسابات
    const totalOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaidOnOfficeInvoices = officeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    
    const balance = totalSales + totalOfficeInvoices - totalPaidOnSales - totalPaidOnOfficeInvoices - totalPayments;
    
    res.json({
      success: true,
      data: {
        ...customer,
        totalSales: totalSales + totalOfficeInvoices,
        totalPaid: totalPaidOnSales + totalPaidOnOfficeInvoices + totalPayments,
        balance: parseFloat(balance.toFixed(2)),
        sales,
        officeInvoices, // إضافة فواتير المكتب
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
          amountPaid: parseFloat(paidAmount),
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
    const { amount, paymentMethod = 'CASH', referenceNumber, notes, invoiceAllocations, officeInvoicesAllocations } = req.body;
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
    
    // إذا كان في توزيع على الفواتير، نستخدمه
    if ((invoiceAllocations && invoiceAllocations.length > 0) || (officeInvoicesAllocations && officeInvoicesAllocations.length > 0)) {
      await prisma.$transaction(async (tx) => {
        // تسجيل الدفعة الرئيسية
        const payment = await tx.customerPayment.create({
          data: {
            customerId,
            amount: parseFloat(amount),
            paymentMethod,
            referenceNumber: referenceNumber || null,
            notes: notes || null,
            createdBy
          }
        });
        
        // توزيع المبلغ على فواتير التقسيط
        if (invoiceAllocations && invoiceAllocations.length > 0) {
          for (const allocation of invoiceAllocations) {
            const sale = await tx.sale.findUnique({
              where: { id: allocation.saleId }
            });
            
            if (!sale) continue;
            
            // تحديث المبلغ المدفوع في الفاتورة
            await tx.sale.update({
              where: { id: allocation.saleId },
              data: {
                amountPaid: sale.amountPaid + parseFloat(allocation.amount)
              }
            });
          }
        }
        
        // توزيع المبلغ على فواتير المكتب
        if (officeInvoicesAllocations && officeInvoicesAllocations.length > 0) {
          for (const allocation of officeInvoicesAllocations) {
            const officeInvoice = await tx.officeInvoice.findUnique({
              where: { id: allocation.officeInvoiceId }
            });
            
            if (!officeInvoice) continue;
            
            // تحديث المبلغ المدفوع في فاتورة المكتب
            await tx.officeInvoice.update({
              where: { id: allocation.officeInvoiceId },
              data: {
                paidAmount: officeInvoice.paidAmount + parseFloat(allocation.amount),
                remainingAmount: officeInvoice.remainingAmount - parseFloat(allocation.amount)
              }
            });
          }
        }
      });
    } else {
      // الطريقة القديمة: دفعة عامة بدون توزيع
      await prisma.customerPayment.create({
        data: {
          customerId,
          amount: parseFloat(amount),
          paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          createdBy
        }
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الدفعة بنجاح'
    });
  } catch (error) {
    console.error('Error recording customer payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record customer payment'
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
