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
            washingOrders: true,
            miscellaneousExpenses: true
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
      message: '┘ü╪┤┘ä ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä┘à┘ê╪▒╪»┘è┘å'
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
          take: 10,
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
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
        },
        miscellaneousExpenses: {
          orderBy: { expenseDate: 'desc' },
          take: 10
        }
      }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: '╪º┘ä┘à┘ê╪▒╪» ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»'
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
      message: '┘ü╪┤┘ä ┘ü┘è ╪¼┘ä╪¿ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘à┘ê╪▒╪»'
    });
  }
};

// Create supplier
exports.createSupplier = async (req, res) => {
  try {
    const { name, type, phone, email, address, notes } = req.body;

    // Validate type
    if (!['FABRIC', 'MANUFACTURING', 'WASHING', 'READY', 'MISCELLANEOUS'].includes(type)) {
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
      message: '╪¬┘à ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä┘à┘ê╪▒╪» ╪¿┘å╪¼╪º╪¡',
      data: supplier
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      message: '┘ü╪┤┘ä ┘ü┘è ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä┘à┘ê╪▒╪»'
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
      message: '╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä┘à┘ê╪▒╪» ╪¿┘å╪¼╪º╪¡',
      data: supplier
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({
      success: false,
      message: '┘ü╪┤┘ä ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪º┘ä┘à┘ê╪▒╪»'
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
        message: '┘ä╪º ┘è┘à┘â┘å ╪¡╪░┘ü ╪º┘ä┘à┘ê╪▒╪» ┘ä┘ê╪¼┘ê╪» ┘à╪╣╪º┘à┘ä╪º╪¬ ┘à╪▒╪¬╪¿╪╖╪⌐ ╪¿┘ç'
      });
    }

    await prisma.supplier.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: '╪¬┘à ╪¡╪░┘ü ╪º┘ä┘à┘ê╪▒╪» ╪¿┘å╪¼╪º╪¡'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({
      success: false,
      message: '┘ü╪┤┘ä ┘ü┘è ╪¡╪░┘ü ╪º┘ä┘à┘ê╪▒╪»'
    });
  }
};

// Delete completed fabric purchase (fully paid, remaining = 0)
exports.deleteCompletedFabricPurchase = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const purchase = await prisma.fabricPurchase.findUnique({
      where: { id: purchaseId }
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: '┘ü╪º╪¬┘ê╪▒╪⌐ ╪º┘ä┘é┘à╪º╪┤ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });
    }

    const remaining = purchase.totalCost - purchase.paidAmount;
    if (remaining > 0.01) {
      return res.status(400).json({
        success: false,
        message: '┘ä╪º ┘è┘à┘â┘å ╪¡╪░┘ü ┘ü╪º╪¬┘ê╪▒╪⌐ ┘ä┘à ┘è╪¬┘à ╪│╪»╪º╪» ┘â╪º┘à┘ä ┘é┘è┘à╪¬┘ç╪º'
      });
    }

    await prisma.fabricPurchase.delete({ where: { id: purchaseId } });

    res.json({ success: true, message: '╪¬┘à ╪¡╪░┘ü ┘ü╪º╪¬┘ê╪▒╪⌐ ╪º┘ä┘é┘à╪º╪┤ ╪¿┘å╪¼╪º╪¡' });
  } catch (error) {
    console.error('Error deleting fabric purchase:', error);
    res.status(500).json({ success: false, message: '┘ü╪┤┘ä ┘ü┘è ╪¡╪░┘ü ┘ü╪º╪¬┘ê╪▒╪⌐ ╪º┘ä┘é┘à╪º╪┤' });
  }
};

// Delete completed manufacturing order (fully paid, remaining = 0)
exports.deleteCompletedManufacturingOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.manufacturingOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '╪ú┘à╪▒ ╪º┘ä╪¬╪╡┘å┘è╪╣ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });
    }

    const totalCost = order.totalManufacturingCost || 0;
    const remaining = totalCost - order.paidAmount;
    if (remaining > 0.01) {
      return res.status(400).json({
        success: false,
        message: '┘ä╪º ┘è┘à┘â┘å ╪¡╪░┘ü ╪ú┘à╪▒ ╪¬╪╡┘å┘è╪╣ ┘ä┘à ┘è╪¬┘à ╪│╪»╪º╪» ┘â╪º┘à┘ä ┘é┘è┘à╪¬┘ç'
      });
    }

    await prisma.manufacturingOrder.delete({ where: { id: orderId } });

    res.json({ success: true, message: '╪¬┘à ╪¡╪░┘ü ╪ú┘à╪▒ ╪º┘ä╪¬╪╡┘å┘è╪╣ ╪¿┘å╪¼╪º╪¡' });
  } catch (error) {
    console.error('Error deleting manufacturing order:', error);
    res.status(500).json({ success: false, message: '┘ü╪┤┘ä ┘ü┘è ╪¡╪░┘ü ╪ú┘à╪▒ ╪º┘ä╪¬╪╡┘å┘è╪╣' });
  }
};

// Delete completed washing order (fully paid, remaining = 0)
exports.deleteCompletedWashingOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.washingOrder.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '╪ú┘à╪▒ ╪º┘ä╪║╪│┘è┘ä ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });
    }

    const totalCost = order.totalWashingCost || 0;
    const remaining = totalCost - order.paidAmount;
    if (remaining > 0.01) {
      return res.status(400).json({
        success: false,
        message: '┘ä╪º ┘è┘à┘â┘å ╪¡╪░┘ü ╪ú┘à╪▒ ╪║╪│┘è┘ä ┘ä┘à ┘è╪¬┘à ╪│╪»╪º╪» ┘â╪º┘à┘ä ┘é┘è┘à╪¬┘ç'
      });
    }

    await prisma.washingOrder.delete({ where: { id: orderId } });

    res.json({ success: true, message: '╪¬┘à ╪¡╪░┘ü ╪ú┘à╪▒ ╪º┘ä╪║╪│┘è┘ä ╪¿┘å╪¼╪º╪¡' });
  } catch (error) {
    console.error('Error deleting washing order:', error);
    res.status(500).json({ success: false, message: '┘ü╪┤┘ä ┘ü┘è ╪¡╪░┘ü ╪ú┘à╪▒ ╪º┘ä╪║╪│┘è┘ä' });
  }
};

// Make payment to supplier
exports.makePayment = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { amount, paymentMethod, vaultType, referenceNumber, notes, invoiceAllocations } = req.body;

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

      // ╪Ñ╪░╪º ┘â╪º┘å ┘ü┘è ╪¬┘ê╪▓┘è╪╣ ╪╣┘ä┘ë ╪º┘ä┘ü┘ê╪º╪¬┘è╪▒╪î ┘å╪¡╪»╪½ ┘â┘ä ┘ü╪º╪¬┘ê╪▒╪⌐
      if (invoiceAllocations && invoiceAllocations.length > 0) {
        for (const allocation of invoiceAllocations) {
          const allocAmount = parseFloat(allocation.amount);
          
          // ╪¬╪¡╪»┘è╪½ ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐ ╪¡╪│╪¿ ╪º┘ä┘å┘ê╪╣
          if (allocation.type === 'FABRIC') {
            const purchase = await tx.fabricPurchase.findUnique({
              where: { id: allocation.id }
            });
            if (purchase) {
              const newPaidAmount = purchase.paidAmount + allocAmount;
              const newRemainingAmount = Math.max(0, purchase.totalCost - newPaidAmount);
              const paymentStatus = newRemainingAmount <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'PENDING';
              await tx.fabricPurchase.update({
                where: { id: allocation.id },
                data: {
                  paidAmount: newPaidAmount,
                  remainingAmount: newRemainingAmount,
                  paymentStatus
                }
              });
            }
          } else if (allocation.type === 'MANUFACTURING') {
            const order = await tx.manufacturingOrder.findUnique({
              where: { id: allocation.id }
            });
            if (order) {
              const totalCost = order.totalManufacturingCost || 0;
              const newPaidAmount = order.paidAmount + allocAmount;
              const newRemainingAmount = Math.max(0, totalCost - newPaidAmount);
              const paymentStatus = newRemainingAmount <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'PENDING';
              await tx.manufacturingOrder.update({
                where: { id: allocation.id },
                data: {
                  paidAmount: newPaidAmount,
                  remainingAmount: newRemainingAmount,
                  paymentStatus
                }
              });
            }
          } else if (allocation.type === 'WASHING') {
            const order = await tx.washingOrder.findUnique({
              where: { id: allocation.id }
            });
            if (order) {
              const totalCost = order.totalWashingCost || 0;
              const newPaidAmount = (order.paidAmount || 0) + allocAmount;
              const newRemainingAmount = Math.max(0, totalCost - newPaidAmount);
              const paymentStatus = newRemainingAmount <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'PENDING';
              await tx.washingOrder.update({
                where: { id: allocation.id },
                data: {
                  paidAmount: newPaidAmount,
                  remainingAmount: newRemainingAmount,
                  paymentStatus
                }
              });
            } else if (allocation.type === 'PURCHASE' || allocation.type === 'READY') {
              const purchase = await tx.purchase.findUnique({
                where: { id: allocation.id }
              });
              if (purchase) {
                const totalAmount = purchase.totalAmount || 0;
                const newPaidAmount = (purchase.paidAmount || 0) + allocAmount;
                const newRemainingAmount = Math.max(0, totalAmount - newPaidAmount);
                const status = newRemainingAmount <= 0 ? 'COMPLETED' : 'PENDING';
                await tx.purchase.update({
                  where: { id: allocation.id },
                  data: {
                    paidAmount: newPaidAmount,
                    remainingAmount: newRemainingAmount,
                    status
                  }
                });
              }
            } else if (allocation.type === 'MISCELLANEOUS') {
              const expense = await tx.miscellaneousExpense.findUnique({
                where: { id: allocation.id }
              });
              if (expense) {
                const totalAmount = expense.totalAmount || 0;
                const newPaidAmount = (expense.paidAmount || 0) + allocAmount;
                const newRemainingAmount = Math.max(0, totalAmount - newPaidAmount);
                const paymentStatus = newRemainingAmount <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'PENDING';
                await tx.miscellaneousExpense.update({
                  where: { id: allocation.id },
                  data: {
                    paidAmount: newPaidAmount,
                    remainingAmount: newRemainingAmount,
                    paymentStatus
                  }
                });
              }
            }
          }
        }
      }

      // Update supplier balance
      const supplier = await tx.supplier.update({
        where: { id: supplierId },
        data: {
          totalPaid: { increment: amountFloat },
          balance: { decrement: amountFloat }
        }
      });

      // Deduct from Branch Vault based on vaultType/paymentMethod
      const selectedVaultType = vaultType || paymentMethod || 'CASH';
      let balanceField = 'vaultBalance';
      if (selectedVaultType === 'CARD') balanceField = 'cardVaultBalance';
      if (selectedVaultType === 'WALLET') balanceField = 'walletBalance';

      const branch = await tx.branch.findFirst({
        where: req.user?.branchId ? { id: req.user.branchId } : { code: 'MAIN' }
      });

      if (branch) {
        const balanceBefore = branch[balanceField] || 0;
        const balanceAfter = balanceBefore - amountFloat;

        await tx.branch.update({
          where: { id: branch.id },
          data: {
            [balanceField]: balanceAfter
          }
        });

        await tx.vaultTransaction.create({
          data: {
            branchId: branch.id,
            type: 'CASH_WITHDRAWAL',
            amount: amountFloat,
            description: `سداد مستحقات مورد: ${supplier.name} (${selectedVaultType})`,
            notes: notes || 'سداد مستحقات مورد',
            createdBy: req.user?.id || 'SYSTEM',
            balanceBefore,
            balanceAfter
          }
        });
      }

      return payment;
    });

    res.status(201).json({
      success: true,
      message: '╪¬┘à ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»┘ü╪╣╪⌐ ╪¿┘å╪¼╪º╪¡',
      data: result
    });
  } catch (error) {
    console.error('Error making payment:', error);
    res.status(500).json({
      success: false,
      message: '┘ü╪┤┘ä ┘ü┘è ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»┘ü╪╣╪⌐'
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
      message: '┘ü╪┤┘ä ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä╪»┘ü╪╣╪º╪¬'
    });
  }
};

module.exports = exports;

// Create miscellaneous expense
exports.createMiscellaneousExpense = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { description, totalAmount, paidAmount, notes, expenseDate } = req.body;

    if (!description || !totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال الوصف والمبلغ الإجمالي'
      });
    }

    // Verify supplier exists and is MISCELLANEOUS type
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'المورد غير موجود'
      });
    }

    if (supplier.type !== 'MISCELLANEOUS') {
      return res.status(400).json({
        success: false,
        message: 'هذا المورد ليس من نوع المصروفات المتنوعة'
      });
    }

    const paidAmountFloat = parseFloat(paidAmount || 0);
    const totalAmountFloat = parseFloat(totalAmount);
    const remainingAmount = totalAmountFloat - paidAmountFloat;
    const paymentStatus = remainingAmount <= 0 ? 'PAID' : paidAmountFloat > 0 ? 'PARTIAL' : 'PENDING';

    // Generate expense number
    const expenseNumber = `MISC-${Date.now().toString().slice(-8)}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create expense
      const expense = await tx.miscellaneousExpense.create({
        data: {
          expenseNumber,
          supplierId,
          description,
          totalAmount: totalAmountFloat,
          paidAmount: paidAmountFloat,
          remainingAmount,
          paymentStatus,
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          notes,
          createdBy: req.user.id
        }
      });

      // Update supplier totals
      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          totalPurchases: { increment: totalAmountFloat },
          totalPaid: { increment: paidAmountFloat },
          balance: { increment: remainingAmount }
        }
      });

      // If payment made, deduct from vault
      if (paidAmountFloat > 0) {
        const branch = await tx.branch.findFirst({
          where: req.user?.branchId ? { id: req.user.branchId } : { code: 'MAIN' }
        });

        if (branch) {
          const balanceBefore = branch.vaultBalance || 0;
          const balanceAfter = balanceBefore - paidAmountFloat;

          await tx.branch.update({
            where: { id: branch.id },
            data: {
              vaultBalance: balanceAfter
            }
          });

          await tx.vaultTransaction.create({
            data: {
              branchId: branch.id,
              type: 'CASH_WITHDRAWAL',
              amount: paidAmountFloat,
              description: `مصروف متنوع: ${description} - مورد: ${supplier.name}`,
              notes: notes || 'دفعة مصروف متنوع',
              createdBy: req.user.id,
              balanceBefore,
              balanceAfter
            }
          });
        }
      }

      return expense;
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل المصروف بنجاح',
      data: result
    });
  } catch (error) {
    console.error('Error creating miscellaneous expense:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'فشل في تسجيل المصروف'
    });
  }
};

// Delete completed miscellaneous expense
exports.deleteCompletedMiscellaneousExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const expense = await prisma.miscellaneousExpense.findUnique({
      where: { id: expenseId }
    });

    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'المصروف غير موجود' 
      });
    }

    const remaining = expense.totalAmount - expense.paidAmount;
    if (remaining > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف مصروف لم يتم سداد كامل قيمته'
      });
    }

    await prisma.miscellaneousExpense.delete({ 
      where: { id: expenseId } 
    });

    res.json({ 
      success: true, 
      message: 'تم حذف المصروف بنجاح' 
    });
  } catch (error) {
    console.error('Error deleting miscellaneous expense:', error);
    res.status(500).json({ 
      success: false, 
      message: 'فشل في حذف المصروف' 
    });
  }
};
