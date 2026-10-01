const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all expenses
exports.getAllExpenses = async (req, res) => {
  try {
    const { branchId, category, startDate, endDate } = req.query;
    
    const where = {};
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }
    
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        branch: true
      },
      orderBy: {
        expenseDate: 'desc'
      }
    });
    
    // حساب الإجمالي
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    res.json({
      success: true,
      data: {
        expenses,
        total,
        count: expenses.length
      }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expenses'
    });
  }
};

// Get expense by ID
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        branch: true
      }
    });
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }
    
    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense'
    });
  }
};

// Create expense
exports.createExpense = async (req, res) => {
  try {
    const { branchId, category, description, amount, expenseDate, receiptNumber, notes, vaultId } = req.body;
    const createdBy = req.user.id;
    const amountFloat = parseFloat(amount);

    // Validate vaultId
    if (!vaultId) {
      return res.status(400).json({ 
        success: false, 
        message: 'يرجى اختيار الخزنة' 
      });
    }

    // Find the vault
    const vault = await prisma.vault.findUnique({ where: { id: vaultId } });
    if (!vault) {
      return res.status(404).json({ 
        success: false, 
        message: 'الخزنة غير موجودة' 
      });
    }

    // Check sufficient balance
    const currentBalance = vault.balance || 0;
    if (currentBalance < amountFloat) {
      return res.status(400).json({
        success: false,
        message: `رصيد خزنة ${vault.name} غير كافي. الرصيد المتاح: ${currentBalance.toFixed(2)} ج.م`
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the expense
      const expense = await tx.expense.create({
        data: {
          branchId,
          category,
          description,
          amount: amountFloat,
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          receiptNumber,
          notes,
          vaultId,  // Store the vaultId
          createdBy
        },
        include: { 
          branch: true,
          vault: true
        }
      });

      // Deduct from vault
      const balanceBefore = currentBalance;
      const balanceAfter = balanceBefore - amountFloat;

      await tx.vault.update({
        where: { id: vaultId },
        data: { balance: balanceAfter }
      });

      // Record vault transaction
      await tx.vaultTransaction.create({
        data: {
          vaultId,
          branchId,
          type: 'EXPENSE',
          amount: amountFloat,
          description: `مصروف: ${description || category}`,
          notes: notes || `مصروف - ${category}`,
          createdBy,
          balanceBefore,
          balanceAfter
        }
      });

      return expense;
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create expense'
    });
  }
};

// Update expense
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { branchId, category, description, amount, expenseDate, receiptNumber, notes } = req.body;
    
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        branchId,
        category,
        description,
        amount,
        expenseDate: expenseDate ? new Date(expenseDate) : undefined,
        receiptNumber,
        notes
      },
      include: {
        branch: true
      }
    });
    
    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update expense'
    });
  }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.expense.delete({
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete expense'
    });
  }
};

// Get expenses summary by category
exports.getExpensesSummary = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    
    const where = {};
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }
    
    const expenses = await prisma.expense.findMany({
      where
    });
    
    // تجميع حسب الفئة
    const summary = {};
    let total = 0;
    
    expenses.forEach(expense => {
      const category = expense.category || 'OTHER';
      if (!summary[category]) {
        summary[category] = {
          category,
          total: 0,
          count: 0
        };
      }
      summary[category].total += expense.amount;
      summary[category].count += 1;
      total += expense.amount;
    });
    
    res.json({
      success: true,
      data: {
        byCategory: Object.values(summary),
        total,
        totalCount: expenses.length
      }
    });
  } catch (error) {
    console.error('Error fetching expenses summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expenses summary'
    });
  }
};
