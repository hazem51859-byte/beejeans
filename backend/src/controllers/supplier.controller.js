const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all suppliers
exports.getAllSuppliers = async (req, res) => {
  try {
    const { type } = req.query; // FABRIC, MANUFACTURING, WASHING

    const where = {};
    if (type) where.type = type;

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            purchases: true,
            payments: true,
            fabricPurchases: true,
            manufacturingOrders: true,
            washingOrders: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الموردين'
    });
  }
};

// Get supplier by ID
exports.getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { purchaseDate: 'desc' },
          take: 10
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 10
        },
        fabricPurchases: {
          orderBy: { purchaseDate: 'desc' },
          take: 10,
          include: { fabricType: true }
        },
        manufacturingOrders: {
          orderBy: { sentDate: 'desc' },
          take: 10,
          include: { fabricType: true }
        },
        washingOrders: {
          orderBy: { sentDate: 'desc' },
          take: 10
        }
      }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'المورد غير موجود'
      });
    }

    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات المورد'
    });
  }
};

// Create supplier
exports.createSupplier = async (req, res) => {
  try {
    const { name, type, phone, email, address, notes } = req.body;

    // Validate type
    if (!['FABRIC', 'MANUFACTURING', 'WASHING'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'نوع المورد غير صحيح'
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        type,
        phone,
        email,
        address,
        notes,
        totalPurchases: 0,
        totalPaid: 0,
        balance: 0
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة المورد بنجاح',
      data: supplier
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إضافة المورد'
    });
  }
};

// Update supplier
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, phone, email, address, notes, isActive } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        type,
        phone,
        email,
        address,
        notes,
        isActive
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث المورد بنجاح',
      data: supplier
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث المورد'
    });
  }
};

// Delete supplier
exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if has transactions
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchases: true,
            fabricPurchases: true,
            manufacturingOrders: true,
            washingOrders: true
          }
        }
      }
    });

    const totalTransactions = 
      supplier._count.purchases + 
      supplier._count.fabricPurchases + 
      supplier._count.manufacturingOrders + 
      supplier._count.washingOrders;

    if (totalTransactions > 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف المورد لوجود معاملات مرتبطة به'
      });
    }

    await prisma.supplier.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'تم حذف المورد بنجاح'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حذف المورد'
    });
  }
};

// Make payment to supplier
exports.makePayment = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { amount, paymentMethod, referenceNumber, notes, invoiceAllocations } = req.body;

    const amountFloat = parseFloat(amount);

    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.supplierPayment.create({
        data: {
          supplierId,
          amount: amountFloat,
          paymentMethod: paymentMethod || 'CASH',
          referenceNumber,
          notes,
          createdBy: req.user.id
        }
      });

      // إذا كان في توزيع على الفواتير، نحدث كل فاتورة
      if (invoiceAllocations && invoiceAllocations.length > 0) {
        for (const allocation of invoiceAllocations) {
          const allocAmount = parseFloat(allocation.amount);
          
          // تحديث الفاتورة حسب النوع
          if (allocation.type === 'FABRIC') {
            const purchase = await tx.fabricPurchase.findUnique({
              where: { id: allocation.id }
            });
            if (purchase) {
              await tx.fabricPurchase.update({
                where: { id: allocation.id },
                data: {
                  amountPaid: purchase.amountPaid + allocAmount
                }
              });
            }
          } else if (allocation.type === 'MANUFACTURING') {
            const order = await tx.manufacturingOrder.findUnique({
              where: { id: allocation.id }
            });
            if (order) {
              await tx.manufacturingOrder.update({
                where: { id: allocation.id },
                data: {
                  amountPaid: order.amountPaid + allocAmount
                }
              });
            }
          } else if (allocation.type === 'WASHING') {
            const order = await tx.washingOrder.findUnique({
              where: { id: allocation.id }
            });
            if (order) {
              await tx.washingOrder.update({
                where: { id: allocation.id },
                data: {
                  amountPaid: order.amountPaid + allocAmount
                }
              });
            }
          }
        }
      }

      // Update supplier balance
      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          totalPaid: { increment: amountFloat },
          balance: { decrement: amountFloat }
        }
      });

      return payment;
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل الدفعة بنجاح',
      data: result
    });
  } catch (error) {
    console.error('Error making payment:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تسجيل الدفعة'
    });
  }
};

// Get supplier payments
exports.getSupplierPayments = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { startDate, endDate } = req.query;

    const where = { supplierId };
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const payments = await prisma.supplierPayment.findMany({
      where,
      orderBy: { paymentDate: 'desc' }
    });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الدفعات'
    });
  }
};

module.exports = exports;
