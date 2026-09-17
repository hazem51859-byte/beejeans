const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =====================
// Get Partners Accounting Summary (الصفحة الرئيسية)
// =====================
exports.getPartnersAccountingSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // تحديد الفترة الزمنية
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // 1. جلب جميع الشركاء
    const partners = await prisma.partner.findMany({
      include: {
        transactions: true
      }
    });

    // 2. حساب رأس المال الإجمالي
    const totalCapital = partners.reduce((sum, partner) => {
      return sum + (partner.capitalPaid || 0);
    }, 0);

    // 3. حساب إجمالي المصروفات
    const expenses = await prisma.expense.findMany({
      where: dateFilter.gte || dateFilter.lte ? {
        expenseDate: dateFilter
      } : {}
    });

    const expensesByCategory = {};
    let totalExpenses = 0;

    expenses.forEach(expense => {
      const category = expense.category || 'OTHER';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.amount;
      totalExpenses += expense.amount;
    });

    // 4. حساب إجمالي المشتريات (البضاعة)
    const purchases = await prisma.purchase.findMany({
      where: dateFilter.gte || dateFilter.lte ? {
        purchaseDate: dateFilter
      } : {}
    });

    const totalPurchases = purchases.reduce((sum, purchase) => {
      return sum + purchase.totalAmount;
    }, 0);

    // 5. حساب إجمالي المبيعات (من الفروع)
    const sales = await prisma.sale.findMany({
      where: {
        status: 'COMPLETED',
        ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {})
      }
    });

    const totalBranchSales = sales.reduce((sum, sale) => {
      return sum + sale.total;
    }, 0);

    // 5.1 حساب إجمالي فواتير المكتب
    const officeInvoices = await prisma.officeInvoice.findMany({
      where: {
        status: 'COMPLETED',
        ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {})
      }
    });

    const totalOfficeRevenue = officeInvoices.reduce((sum, inv) => {
      return sum + (inv.total || 0);
    }, 0);

    const totalOfficeProfit = officeInvoices.reduce((sum, inv) => {
      return sum + (inv.profit || 0);
    }, 0);

    const totalOfficeCost = officeInvoices.reduce((sum, inv) => {
      return sum + (inv.totalCost || 0);
    }, 0);

    // 6. حساب تكلفة البضاعة المباعة من الفروع (COGS)
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          status: 'COMPLETED',
          ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {})
        }
      },
      include: {
        product: true
      }
    });

    const totalBranchCOGS = saleItems.reduce((sum, item) => {
      const costPrice = parseFloat(item.unitCostPrice > 0 ? item.unitCostPrice : (item.product?.costPrice || 0));
      return sum + (costPrice * (item.quantity || 0));
    }, 0);

    // 7. حساب الأرباح/الخسائر (من الفروع + المكتب)
    const totalSales = totalBranchSales + totalOfficeRevenue; // إجمالي المبيعات
    const totalCOGS = totalBranchCOGS + totalOfficeCost; // إجمالي التكلفة
    const grossProfit = totalSales - totalCOGS; // مجمل الربح
    const netProfit = grossProfit - totalExpenses; // صافي الربح
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(2) : 0;

    // 8. حساب حصة كل شريك
    let grandTotalWithdrawn = 0;
    const partnersShares = partners.map(partner => {
      const shareAmount = (netProfit * partner.sharePercentage) / 100;
      const totalWithdrawn = partner.transactions
        .filter(t => {
          if (t.type !== 'WITHDRAWAL' && t.type !== 'PROFIT_DISTRIBUTION') return false;
          if (dateFilter.gte && new Date(t.transactionDate) < dateFilter.gte) return false;
          if (dateFilter.lte && new Date(t.transactionDate) > dateFilter.lte) return false;
          return true;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      grandTotalWithdrawn += totalWithdrawn;
      const remainingShare = shareAmount - totalWithdrawn;

      return {
        id: partner.id,
        name: partner.name,
        capitalPaid: partner.capitalPaid,
        sharePercentage: partner.sharePercentage,
        shareAmount: parseFloat(shareAmount.toFixed(2)),
        totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2)),
        remainingShare: parseFloat(remainingShare.toFixed(2))
      };
    });

    // 9. الملخص النهائي
    const summary = {
      // رأس المال
      totalCapital: parseFloat(totalCapital.toFixed(2)),
      
      // المصروفات
      expenses: {
        byCategory: Object.keys(expensesByCategory).map(category => ({
          category,
          amount: parseFloat(expensesByCategory[category].toFixed(2))
        })),
        total: parseFloat(totalExpenses.toFixed(2))
      },
      
      // المشتريات
      purchases: {
        total: parseFloat(totalPurchases.toFixed(2))
      },
      
      // المبيعات
      sales: {
        total: parseFloat(totalSales.toFixed(2)),
        cost: parseFloat(totalCOGS.toFixed(2))
      },
      
      // الأرباح/الخسائر
      profit: {
        gross: parseFloat(grossProfit.toFixed(2)),
        net: parseFloat(netProfit.toFixed(2)),
        margin: parseFloat(profitMargin),
        totalWithdrawn: parseFloat(grandTotalWithdrawn.toFixed(2)),
        remainingInVault: parseFloat((netProfit - grandTotalWithdrawn).toFixed(2))
      },
      
      // توزيع الأرباح على الشركاء
      partnersShares,
      
      // إحصائيات إضافية
      stats: {
        totalRevenue: parseFloat(totalSales.toFixed(2)),
        totalCosts: parseFloat((totalCOGS + totalExpenses + totalPurchases).toFixed(2)),
        breakEvenPoint: parseFloat(((totalExpenses + totalPurchases) / (1 - (totalCOGS / totalSales || 0))).toFixed(2))
      }
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching partners accounting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partners accounting'
    });
  }
};

// =====================
// Get All Partners
// =====================
exports.getAllPartners = async (req, res) => {
  try {
    const partners = await prisma.partner.findMany({
      include: {
        transactions: true
      },
      orderBy: {
        sharePercentage: 'desc'
      }
    });

    res.json({
      success: true,
      data: partners
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partners'
    });
  }
};

// =====================
// Get Partner By ID
// =====================
exports.getPartnerById = async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await prisma.partner.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: {
            transactionDate: 'desc'
          }
        }
      }
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    console.error('Error fetching partner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partner'
    });
  }
};

// =====================
// Create Partner
// =====================
exports.createPartner = async (req, res) => {
  try {
    const { name, email, phone, capitalPaid, sharePercentage, notes } = req.body;

    const partner = await prisma.partner.create({
      data: {
        name,
        email,
        phone,
        capitalPaid,
        sharePercentage,
        notes
      }
    });

    // إضافة معاملة رأس المال الأولية
    if (capitalPaid > 0) {
      await prisma.partnerTransaction.create({
        data: {
          partnerId: partner.id,
          type: 'CAPITAL',
          amount: capitalPaid,
          description: 'رأس المال الأولي'
        }
      });
    }

    res.status(201).json({
      success: true,
      data: partner
    });
  } catch (error) {
    console.error('Error creating partner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create partner'
    });
  }
};

// =====================
// Update Partner
// =====================
exports.updatePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, capitalPaid, sharePercentage, isActive, notes } = req.body;

    const partner = await prisma.partner.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        capitalPaid,
        sharePercentage,
        isActive,
        notes
      }
    });

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update partner'
    });
  }
};

// =====================
// Delete Partner
// =====================
exports.deletePartner = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.partner.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Partner deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting partner:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete partner'
    });
  }
};

// =====================
// Partner Transactions
// =====================

// Add Partner Transaction (سحب أو إضافة رأس مال)
exports.addPartnerTransaction = async (req, res) => {
  try {
    const { partnerId, type, amount, description } = req.body;

    const transaction = await prisma.partnerTransaction.create({
      data: {
        partnerId,
        type,
        amount,
        description
      }
    });

    // تحديث رأس المال إذا كان النوع CAPITAL
    if (type === 'CAPITAL') {
      const partner = await prisma.partner.findUnique({
        where: { id: partnerId }
      });

      await prisma.partner.update({
        where: { id: partnerId },
        data: {
          capitalPaid: partner.capitalPaid + amount
        }
      });
    }

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error adding partner transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add partner transaction'
    });
  }
};

// =====================
// Adjust Partner Capital (زيادة أو تقليل رأس المال)
// =====================
exports.adjustCapital = async (req, res) => {
  try {
    const { partnerId, amount, type, notes } = req.body;
    // type: 'INCREASE' or 'DECREASE'
    // amount: المبلغ المراد زيادته أو تقليله

    const amountFloat = parseFloat(amount);
    if (!amountFloat || amountFloat <= 0) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال مبلغ صحيح'
      });
    }

    if (type !== 'INCREASE' && type !== 'DECREASE') {
      return res.status(400).json({
        success: false,
        error: 'نوع العملية يجب أن يكون INCREASE أو DECREASE'
      });
    }

    // جلب الشريك
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId }
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'الشريك غير موجود'
      });
    }

    // حساب رأس المال الجديد للشريك
    let newCapital = partner.capitalPaid;
    let transactionType = '';
    let transactionDescription = '';

    if (type === 'INCREASE') {
      newCapital += amountFloat;
      transactionType = 'CAPITAL';
      transactionDescription = `زيادة رأس المال بمبلغ ${amountFloat.toFixed(2)} ج.م`;
    } else {
      // DECREASE
      if (partner.capitalPaid < amountFloat) {
        return res.status(400).json({
          success: false,
          error: 'لا يمكن سحب مبلغ أكبر من رأس المال الحالي'
        });
      }
      newCapital -= amountFloat;
      transactionType = 'WITHDRAWAL';
      transactionDescription = `تقليل رأس المال بمبلغ ${amountFloat.toFixed(2)} ج.م (سحب)`;
    }

    // جلب جميع الشركاء لإعادة حساب النسب
    const allPartners = await prisma.partner.findMany({
      where: { isActive: true }
    });

    // حساب إجمالي رأس المال الجديد
    let newTotalCapital = 0;
    allPartners.forEach(p => {
      if (p.id === partnerId) {
        newTotalCapital += newCapital;
      } else {
        newTotalCapital += p.capitalPaid;
      }
    });

    if (newTotalCapital <= 0) {
      return res.status(400).json({
        success: false,
        error: 'إجمالي رأس المال لا يمكن أن يكون صفر أو سالب'
      });
    }

    // إعادة حساب نسب الشراكة لجميع الشركاء
    const updates = [];
    
    await prisma.$transaction(async (tx) => {
      // تحديث رأس المال للشريك المحدد
      await tx.partner.update({
        where: { id: partnerId },
        data: { capitalPaid: newCapital }
      });

      // إضافة معاملة رأس المال
      await tx.partnerTransaction.create({
        data: {
          partnerId,
          type: transactionType,
          amount: amountFloat,
          description: transactionDescription,
          notes: notes || null
        }
      });

      // تحديث نسب الشراكة لجميع الشركاء
      for (const p of allPartners) {
        let partnerNewCapital = p.capitalPaid;
        if (p.id === partnerId) {
          partnerNewCapital = newCapital;
        }

        const newSharePercentage = (partnerNewCapital / newTotalCapital) * 100;

        await tx.partner.update({
          where: { id: p.id },
          data: { sharePercentage: parseFloat(newSharePercentage.toFixed(4)) }
        });

        updates.push({
          partnerId: p.id,
          partnerName: p.name,
          oldCapital: p.capitalPaid,
          newCapital: partnerNewCapital,
          oldSharePercentage: p.sharePercentage,
          newSharePercentage: parseFloat(newSharePercentage.toFixed(4))
        });
      }
    });

    res.json({
      success: true,
      message: type === 'INCREASE' 
        ? 'تم زيادة رأس المال وإعادة حساب النسب بنجاح' 
        : 'تم تقليل رأس المال وإعادة حساب النسب بنجاح',
      data: {
        newTotalCapital: parseFloat(newTotalCapital.toFixed(2)),
        updates
      }
    });

  } catch (error) {
    console.error('Error adjusting capital:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تعديل رأس المال'
    });
  }
};

// =====================
// Withdraw Profit From Main Vault (سحب الأرباح من الخزنة الرئيسية)
// =====================
exports.withdrawProfitFromVault = async (req, res) => {
  try {
    const { vaultId, totalAmount, notes, allocations } = req.body;
    
    const amountFloat = parseFloat(totalAmount);
    if (!amountFloat || amountFloat <= 0) {
      return res.status(400).json({ success: false, message: 'مبلغ السحب غير صحيح' });
    }

    if (!vaultId) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد الخزينة' });
    }

    // Get vault
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId }
    });

    if (!vault) {
      return res.status(404).json({ success: false, message: 'الخزينة غير موجودة' });
    }

    const currentBalance = vault.balance || 0;
    if (currentBalance < amountFloat) {
      return res.status(400).json({
        success: false,
        message: `رصيد ${vault.name} غير كافي. الرصيد المتاح: ${currentBalance.toFixed(2)} ج.م`
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Decrement vault balance
      const balanceBefore = currentBalance;
      const balanceAfter = balanceBefore - amountFloat;

      await tx.vault.update({
        where: { id: vaultId },
        data: {
          balance: balanceAfter
        }
      });

      // 2. Create VaultTransaction
      const vaultTransaction = await tx.vaultTransaction.create({
        data: {
          vaultId,
          type: 'CASH_WITHDRAWAL',
          amount: amountFloat,
          description: `سحب أرباح للشركاء من ${vault.name} (${notes || 'توزيع أرباح'})`,
          notes: notes || 'سحب أرباح للشركاء',
          createdBy: req.user?.id || 'SYSTEM',
          balanceBefore,
          balanceAfter
        }
      });

      // 3. Create PartnerTransaction for each partner in allocations
      const createdPartnerTransactions = [];
      if (allocations && allocations.length > 0) {
        for (const alloc of allocations) {
          const pAmount = parseFloat(alloc.amount || 0);
          if (pAmount > 0) {
            const pTx = await tx.partnerTransaction.create({
              data: {
                partnerId: alloc.partnerId,
                type: 'PROFIT_DISTRIBUTION',
                amount: pAmount,
                vaultType: vault.type, // CASH, VISA, WALLET
                description: `سحب أرباح من ${vault.name} (${notes || 'توزيع أرباح'})`,
                notes: notes || 'سحب أرباح من الخزينة'
              }
            });
            createdPartnerTransactions.push(pTx);
          }
        }
      }

      return { vaultTransaction, createdPartnerTransactions, balanceAfter };
    });

    res.json({
      success: true,
      message: 'تم سحب الأرباح خصماً من الخزنة وتحديث حصص الشركاء بنجاح',
      data: result
    });
  } catch (error) {
    console.error('Error withdrawing profit from vault:', error);
    res.status(500).json({ success: false, message: 'فشل في سحب الأرباح من الخزنة' });
  }
};

// Get Partner Transactions
exports.getPartnerTransactions = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const transactions = await prisma.partnerTransaction.findMany({
      where: { partnerId },
      orderBy: {
        transactionDate: 'desc'
      }
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching partner transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partner transactions'
    });
  }
};
