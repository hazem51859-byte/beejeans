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

    // 5. حساب إجمالي المبيعات
    const sales = await prisma.sale.findMany({
      where: {
        status: 'COMPLETED',
        ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {})
      }
    });

    const totalSales = sales.reduce((sum, sale) => {
      return sum + sale.total;
    }, 0);

    // 6. حساب تكلفة البضاعة المباعة (COGS)
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

    const totalCOGS = saleItems.reduce((sum, item) => {
      const costPrice = item.product?.costPrice || 0;
      return sum + (costPrice * item.quantity);
    }, 0);

    // 7. حساب الأرباح/الخسائر
    const grossProfit = totalSales - totalCOGS; // مجمل الربح
    const netProfit = grossProfit - totalExpenses; // صافي الربح
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(2) : 0;

    // 8. حساب حصة كل شريك
    const partnersShares = partners.map(partner => {
      const shareAmount = (netProfit * partner.sharePercentage) / 100;
      const totalWithdrawn = partner.transactions
        .filter(t => t.type === 'WITHDRAWAL' || t.type === 'PROFIT_DISTRIBUTION')
        .reduce((sum, t) => sum + t.amount, 0);
      
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
        margin: parseFloat(profitMargin)
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
