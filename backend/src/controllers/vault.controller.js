const prisma = require('../config/database');
const { logActivity, ActivityActions } = require('../utils/activityLogger');

/**
 * Get vault balance for branch
 */
exports.getBranchVault = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        code: true,
        vaultBalance: true
      }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Get recent transactions
    const transactions = await prisma.vaultTransaction.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Calculate summary
    const summary = await prisma.vaultTransaction.groupBy({
      by: ['type'],
      where: { branchId },
      _sum: { amount: true }
    });

    res.json({
      success: true,
      data: {
        branch,
        transactions,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all vaults (for admin only)
 */
exports.getAllVaults = async (req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        vaultBalance: true,
        cardVaultBalance: true,
        walletBalance: true,
        _count: {
          select: {
            vaultTransactions: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Filter out MAIN branch for calculations
    const nonMainBranches = branches.filter(b => b.code !== 'MAIN');

    // Get card payments (main vault)
    const cardPayments = await prisma.vaultTransaction.findMany({
      where: {
        type: 'CARD_PAYMENT'
      },
      include: {
        branch: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Calculate card payments total
    const cardPaymentsTotal = await prisma.vaultTransaction.aggregate({
      where: { type: 'CARD_PAYMENT' },
      _sum: { amount: true }
    });

    // Get total across NON-MAIN branches only
    const totalVaultBalance = nonMainBranches.reduce((sum, b) => sum + b.vaultBalance, 0);
    const totalCardVaultBalance = nonMainBranches.reduce((sum, b) => sum + (b.cardVaultBalance || 0), 0);
    const totalWalletBalance = nonMainBranches.reduce((sum, b) => sum + (b.walletBalance || 0), 0);

    res.json({
      success: true,
      data: {
        branches,
        cardPayments,
        summary: {
          totalVaultBalance,
          totalCardVaultBalance,
          totalWalletBalance,
          totalCardPayments: cardPaymentsTotal._sum.amount || 0,
          branchCount: nonMainBranches.length // Exclude MAIN branch
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transfer from drawer to vault
 */
exports.transferDrawerToVault = async (req, res, next) => {
  try {
    const { shiftId, amount, notes } = req.body;
    const userId = req.user.id;

    // Get shift details
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        branch: true
      }
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    if (shift.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Shift is not open'
      });
    }

    // Check user permission (manager or admin only)
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can transfer to vault'
      });
    }

    const transferAmount = parseFloat(amount);
    const branch = shift.branch;

    // Create transaction and update vault
    const result = await prisma.$transaction(async (tx) => {
      // Update branch vault
      const updatedBranch = await tx.branch.update({
        where: { id: branch.id },
        data: {
          vaultBalance: branch.vaultBalance + transferAmount
        }
      });

      // Create vault transaction
      const transaction = await tx.vaultTransaction.create({
        data: {
          branchId: branch.id,
          type: 'DRAWER_TRANSFER',
          amount: transferAmount,
          shiftId,
          description: `تحويل من الدرج إلى الخزينة`,
          notes,
          createdBy: userId,
          balanceBefore: branch.vaultBalance,
          balanceAfter: updatedBranch.vaultBalance
        }
      });

      return { transaction, updatedBranch };
    });

    await logActivity({
      userId,
      action: 'VAULT_TRANSFER',
      entity: 'vault_transaction',
      entityId: result.transaction.id,
      description: `تحويل ${transferAmount} جنيه من الدرج إلى الخزينة`,
      metadata: { amount: transferAmount, shiftId },
      branchId: branch.id
    });

    res.status(201).json({
      success: true,
      message: 'Transfer completed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set opening balance for drawer (Manager prepares cash for cashier)
 * المانجر يحط الرصيد الافتتاحي في الدرج من الخزنة قبل ما الكاشير يفتح الشيفت
 */
exports.setDrawerOpening = async (req, res, next) => {
  try {
    const { amount, notes, cashierName } = req.body;
    const userId = req.user.id;
    const branchId = req.user.branchId;

    // Check user permission (manager or admin only)
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'فقط المديرون يمكنهم تجهيز الدرج'
      });
    }

    const openingAmount = parseFloat(amount);

    // Get branch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Check vault balance
    if (branch.vaultBalance < openingAmount) {
      return res.status(400).json({
        success: false,
        message: `رصيد الخزينة (${branch.vaultBalance} ج.م) غير كافي`
      });
    }

    // Create transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update vault
      const updatedBranch = await tx.branch.update({
        where: { id: branchId },
        data: {
          vaultBalance: branch.vaultBalance - openingAmount
        }
      });

      // Create vault transaction
      const transaction = await tx.vaultTransaction.create({
        data: {
          branchId,
          type: 'CASH_WITHDRAWAL',
          amount: openingAmount,
          description: `تجهيز درج${cashierName ? ` لـ ${cashierName}` : ''} - رصيد افتتاحي`,
          notes,
          createdBy: userId,
          balanceBefore: branch.vaultBalance,
          balanceAfter: updatedBranch.vaultBalance
        }
      });

      return { transaction, updatedBranch };
    });

    res.json({
      success: true,
      message: `تم تجهيز الدرج برصيد ${openingAmount} ج.م`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vault transactions
 */
exports.getVaultTransactions = async (req, res, next) => {
  try {
    const { branchId, type, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where = {};
    if (branchId) where.branchId = branchId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const transactions = await prisma.vaultTransaction.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.vaultTransaction.count({ where });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;

/**
 * Convert between vault types (CASH, CARD, WALLET)
 * تحويل بين أنواع الخزائن
 * Branch Manager: Can convert CARD/WALLET to CASH locally, or WALLET to Main
 * Main Warehouse: Can convert between any types
 */
exports.convertVaultType = async (req, res, next) => {
  try {
    const { fromType, toType, amount, branchId, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userBranchId = req.user.branchId;

    // Validation
    const validTypes = ['CASH', 'CARD', 'WALLET'];
    if (!validTypes.includes(fromType) || !validTypes.includes(toType)) {
      return res.status(400).json({
        success: false,
        message: 'نوع الخزنة غير صحيح. الأنواع المتاحة: CASH, CARD, WALLET'
      });
    }

    if (fromType === toType) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن التحويل لنفس النوع'
      });
    }

    const convertAmount = parseFloat(amount);
    if (convertAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }

    // Determine target branch
    const targetBranchId = branchId || userBranchId;
    
    // Get branch
    const branch = await prisma.branch.findUnique({
      where: { id: targetBranchId }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود'
      });
    }

    const isMainBranch = branch.code === 'MAIN';

    // Permission check
    if (userRole === 'MANAGER') {
      // Manager can only:
      // 1. Convert in their own branch
      // 2. Convert CARD/WALLET to CASH locally
      // 3. Cannot do CASH to CARD/WALLET
      if (targetBranchId !== userBranchId) {
        return res.status(403).json({
          success: false,
          message: 'يمكنك فقط التحويل في فرعك'
        });
      }

      if (fromType === 'CASH') {
        return res.status(403).json({
          success: false,
          message: 'لا يمكن للمانجر تحويل النقدي إلى فيزا أو محفظة'
        });
      }
    } else if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'فقط المانجر أو الأدمن يمكنهم تحويل الخزائن'
      });
    }

    // Get vault field names
    const vaultFields = {
      'CASH': 'vaultBalance',
      'CARD': 'cardVaultBalance',
      'WALLET': 'walletBalance'
    };

    const fromField = vaultFields[fromType];
    const toField = vaultFields[toType];

    // Check source balance
    if (branch[fromField] < convertAmount) {
      return res.status(400).json({
        success: false,
        message: `رصيد ${fromType === 'CASH' ? 'النقدي' : fromType === 'CARD' ? 'الفيزا' : 'المحفظة'} غير كافي. المتاح: ${branch[fromField]}`
      });
    }

    // Perform conversion
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from source
      const updatedBranch = await tx.branch.update({
        where: { id: targetBranchId },
        data: {
          [fromField]: branch[fromField] - convertAmount,
          [toField]: branch[toField] + convertAmount
        }
      });

      // Create vault transactions
      const fromTransaction = await tx.vaultTransaction.create({
        data: {
          branchId: targetBranchId,
          type: `${fromType}_WITHDRAWAL`,
          amount: convertAmount,
          description: `تحويل من ${fromType} إلى ${toType}`,
          notes: notes || `تحويل داخلي بين الخزائن`,
          createdBy: userId,
          balanceBefore: branch[fromField],
          balanceAfter: branch[fromField] - convertAmount
        }
      });

      const toTransaction = await tx.vaultTransaction.create({
        data: {
          branchId: targetBranchId,
          type: `${toType}_DEPOSIT`,
          amount: convertAmount,
          description: `استلام من ${fromType}`,
          notes: notes || `تحويل داخلي بين الخزائن`,
          createdBy: userId,
          balanceBefore: branch[toField],
          balanceAfter: branch[toField] + convertAmount
        }
      });

      return { updatedBranch, fromTransaction, toTransaction };
    });

    res.json({
      success: true,
      message: `تم تحويل ${convertAmount} جنيه من ${fromType} إلى ${toType} بنجاح`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Zero out a vault (Admin only)
 * تصفير خزنة (كأن المبلغ تم سحبه)
 */
exports.zeroVault = async (req, res, next) => {
  try {
    const { branchId, vaultType, reason } = req.body;
    const userId = req.user.id;

    // Only admin can zero vaults
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'فقط الأدمن يمكنه تصفير الخزائن'
      });
    }

    const validTypes = ['CASH', 'CARD', 'WALLET', 'ALL'];
    if (!validTypes.includes(vaultType)) {
      return res.status(400).json({
        success: false,
        message: 'نوع الخزنة غير صحيح. الأنواع: CASH, CARD, WALLET, ALL'
      });
    }

    // Get branch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود'
      });
    }

    // Prepare updates and transactions
    const updates = {};
    const transactions = [];

    const vaultFields = {
      'CASH': { field: 'vaultBalance', type: 'CASH_WITHDRAWAL', label: 'النقدي' },
      'CARD': { field: 'cardVaultBalance', type: 'CARD_WITHDRAWAL', label: 'الفيزا' },
      'WALLET': { field: 'walletBalance', type: 'WALLET_WITHDRAWAL', label: 'المحفظة' }
    };

    // Determine which vaults to zero
    const vaultsToZero = vaultType === 'ALL' ? ['CASH', 'CARD', 'WALLET'] : [vaultType];

    // Build update data and transaction records
    for (const type of vaultsToZero) {
      const vaultInfo = vaultFields[type];
      const currentBalance = branch[vaultInfo.field];

      if (currentBalance > 0) {
        updates[vaultInfo.field] = 0;
        transactions.push({
          type: type,
          amount: currentBalance,
          vaultInfo: vaultInfo,
          balanceBefore: currentBalance
        });
      }
    }

    if (transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'الخزائن المحددة فارغة بالفعل'
      });
    }

    // Execute zeroing
    const result = await prisma.$transaction(async (tx) => {
      // Update branch vaults
      const updatedBranch = await tx.branch.update({
        where: { id: branchId },
        data: updates
      });

      // Create vault transactions
      const createdTransactions = [];
      for (const trans of transactions) {
        const vaultTrans = await tx.vaultTransaction.create({
          data: {
            branchId,
            type: trans.vaultInfo.type,
            amount: trans.amount,
            description: `تصفير خزنة ${trans.vaultInfo.label}`,
            notes: reason || 'تم سحب الرصيد بالكامل',
            createdBy: userId,
            balanceBefore: trans.balanceBefore,
            balanceAfter: 0
          }
        });
        createdTransactions.push(vaultTrans);
      }

      return { updatedBranch, transactions: createdTransactions };
    });

    const totalZeroed = transactions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      message: `تم تصفير ${vaultType === 'ALL' ? 'كل الخزائن' : vaultFields[vaultType].label} - إجمالي: ${totalZeroed} جنيه`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Transfer drawer balance to vault (Manager closes drawer after shift ends)
 * المانجر يسحب جزء من الدرج للخزنة والباقي يبقى للكاشير القادم
 */
exports.transferDrawerToVault = async (req, res, next) => {
  try {
    const { shiftId, amountToVault, notes } = req.body;
    const userId = req.user.id;

    // Check user permission (manager or admin only)
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can transfer drawer to vault'
      });
    }

    const amount = parseFloat(amountToVault);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر'
      });
    }

    // Get shift with branch
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { 
        branch: true,
        user: { select: { fullName: true } }
      }
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    if (shift.status !== 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'الشيفت يجب أن يكون مقفولاً أولاً'
      });
    }

    const totalInDrawer = shift.actualCash || 0;

    if (amount > totalInDrawer) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن سحب ${amount} ج.م - المبلغ في الدرج ${totalInDrawer} ج.م فقط`
      });
    }

    const remainingInDrawer = totalInDrawer - amount;

    // Transfer drawer to vault
    const result = await prisma.$transaction(async (tx) => {
      // Update shift actualCash to reflect remaining amount in drawer
      const updatedShift = await tx.shift.update({
        where: { id: shiftId },
        data: {
          actualCash: remainingInDrawer
        }
      });

      // Update branch vault
      const updatedBranch = await tx.branch.update({
        where: { id: shift.branchId },
        data: {
          vaultBalance: shift.branch.vaultBalance + amount
        }
      });

      // Create vault transaction
      const transaction = await tx.vaultTransaction.create({
        data: {
          branchId: shift.branchId,
          type: 'DRAWER_TRANSFER',
          amount,
          shiftId,
          description: `سحب من الدرج - ${shift.user.fullName} - شيفت ${shift.shiftNumber}\nالمسحوب: ${amount} ج.م | الباقي في الدرج: ${remainingInDrawer} ج.م`,
          notes,
          createdBy: userId,
          balanceBefore: shift.branch.vaultBalance,
          balanceAfter: updatedBranch.vaultBalance
        }
      });

      // Log activity
      await logActivity(tx, {
        userId,
        branchId: shift.branchId,
        action: ActivityActions.DRAWER_CLEARED,
        entity: 'shift',
        entityId: shiftId,
        description: `سحب ${amount} ج.م من الدرج للخزنة - الباقي ${remainingInDrawer} ج.م`,
        metadata: { 
          shiftNumber: shift.shiftNumber, 
          amountToVault: amount,
          remainingInDrawer 
        }
      });

      return { transaction, updatedBranch, updatedShift, remainingInDrawer };
    });

    res.json({
      success: true,
      message: `تم سحب ${amount} ج.م للخزينة - الباقي في الدرج ${remainingInDrawer} ج.م للكاشير القادم`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send money transfer from branch to main warehouse (or between branches)
 * المانجر يحول أموال من خزنة الفرع للمخزن الرئيسي
 */
exports.sendMoneyTransfer = async (req, res, next) => {
  try {
    const { toBranchId, amount, reason, notes } = req.body;
    const userId = req.user.id;
    const fromBranchId = req.user.branchId;

    // Check user permission
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can send money transfers'
      });
    }

    if (!fromBranchId) {
      return res.status(400).json({
        success: false,
        message: 'User must be assigned to a branch'
      });
    }

    const transferAmount = parseFloat(amount);

    // Get source branch
    const fromBranch = await prisma.branch.findUnique({
      where: { id: fromBranchId }
    });

    if (!fromBranch) {
      return res.status(404).json({
        success: false,
        message: 'Source branch not found'
      });
    }

    // Check vault balance
    if (fromBranch.vaultBalance < transferAmount) {
      return res.status(400).json({
        success: false,
        message: 'رصيد الخزينة غير كافي'
      });
    }

    // Get destination branch
    const toBranch = await prisma.branch.findUnique({
      where: { id: toBranchId }
    });

    if (!toBranch) {
      return res.status(404).json({
        success: false,
        message: 'Destination branch not found'
      });
    }

    // Create money transfer (pending until confirmed)
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from source vault
      const updatedFromBranch = await tx.branch.update({
        where: { id: fromBranchId },
        data: {
          vaultBalance: fromBranch.vaultBalance - transferAmount
        }
      });

      // Create money transfer record
      const moneyTransfer = await tx.moneyTransfer.create({
        data: {
          fromBranchId,
          toBranchId,
          amount: transferAmount,
          status: 'PENDING',
          sentBy: userId,
          sentAt: new Date(),
          reason,
          notes
        },
        include: {
          fromBranch: { select: { name: true } },
          toBranch: { select: { name: true } }
        }
      });

      // Create vault transaction (outgoing)
      const vaultTransaction = await tx.vaultTransaction.create({
        data: {
          branchId: fromBranchId,
          type: 'MONEY_TRANSFER_OUT',
          amount: transferAmount,
          moneyTransferId: moneyTransfer.id,
          description: `تحويل أموال إلى ${toBranch.name}`,
          notes: reason,
          createdBy: userId,
          balanceBefore: fromBranch.vaultBalance,
          balanceAfter: updatedFromBranch.vaultBalance
        }
      });

      // Log activity
      await logActivity(tx, {
        userId,
        branchId: fromBranchId,
        action: ActivityActions.MONEY_SENT,
        entity: 'moneyTransfer',
        entityId: moneyTransfer.id,
        description: `تحويل ${transferAmount} جنيه إلى ${toBranch.name}`,
        metadata: { amount: transferAmount, toBranchId, reason }
      });

      return { moneyTransfer, vaultTransaction };
    });

    res.json({
      success: true,
      message: 'تم إرسال التحويل بنجاح - في انتظار التأكيد',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm money transfer (Admin/Manager at destination confirms receipt)
 * الأدمن أو مانجر الفرع المستقبل يأكد استلام الأموال
 */
exports.confirmMoneyTransfer = async (req, res, next) => {
  try {
    const { transferId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    // Get transfer
    const transfer = await prisma.moneyTransfer.findUnique({
      where: { id: transferId },
      include: {
        fromBranch: { select: { name: true } },
        toBranch: true
      }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Transfer already processed'
      });
    }

    // Check permission: must be admin or manager of destination branch
    if (req.user.role !== 'ADMIN' && req.user.branchId !== transfer.toBranchId) {
      return res.status(403).json({
        success: false,
        message: 'You can only confirm transfers to your branch'
      });
    }

    // Confirm transfer
    const result = await prisma.$transaction(async (tx) => {
      // Add to destination vault
      const updatedToBranch = await tx.branch.update({
        where: { id: transfer.toBranchId },
        data: {
          vaultBalance: transfer.toBranch.vaultBalance + transfer.amount
        }
      });

      // Update transfer status
      const updatedTransfer = await tx.moneyTransfer.update({
        where: { id: transferId },
        data: {
          status: 'CONFIRMED',
          confirmedBy: userId,
          confirmedAt: new Date(),
          notes: notes ? `${transfer.notes || ''}\n${notes}` : transfer.notes
        },
        include: {
          fromBranch: { select: { name: true } },
          toBranch: { select: { name: true } }
        }
      });

      // Create vault transaction (incoming)
      const vaultTransaction = await tx.vaultTransaction.create({
        data: {
          branchId: transfer.toBranchId,
          type: 'MONEY_TRANSFER_IN',
          amount: transfer.amount,
          moneyTransferId: transferId,
          description: `استلام أموال من ${transfer.fromBranch.name}`,
          notes: notes || transfer.reason,
          createdBy: userId,
          balanceBefore: transfer.toBranch.vaultBalance,
          balanceAfter: updatedToBranch.vaultBalance
        }
      });

      // Log activity
      await logActivity(tx, {
        userId,
        branchId: transfer.toBranchId,
        action: ActivityActions.MONEY_RECEIVED,
        entity: 'moneyTransfer',
        entityId: transferId,
        description: `استلام ${transfer.amount} جنيه من ${transfer.fromBranch.name}`,
        metadata: { amount: transfer.amount, fromBranchId: transfer.fromBranchId }
      });

      return { updatedTransfer, vaultTransaction };
    });

    res.json({
      success: true,
      message: 'تم تأكيد استلام الأموال بنجاح',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending money transfers
 * عرض التحويلات المالية في انتظار التأكيد
 */
exports.getPendingTransfers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userBranchId = req.user.branchId;
    const isAdmin = req.user.role === 'ADMIN';

    const where = {
      status: 'PENDING'
    };

    // If not admin, show only transfers to user's branch
    if (!isAdmin) {
      where.toBranchId = userBranchId;
    }

    const transfers = await prisma.moneyTransfer.findMany({
      where,
      include: {
        fromBranch: { select: { name: true, code: true } },
        toBranch: { select: { name: true, code: true } }
      },
      orderBy: { sentAt: 'desc' }
    });

    res.json({
      success: true,
      data: transfers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all drawers status (Admin only)
 * الأدمن يشوف كل الدروج النشطة في كل الفروع
 */
exports.getAllDrawers = async (req, res, next) => {
  try {
    // Only admin can see all drawers
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view all drawers'
      });
    }

    // Get all open shifts
    const openShifts = await prisma.shift.findMany({
      where: { status: 'OPEN' },
      include: {
        user: {
          select: {
            fullName: true,
            username: true
          }
        },
        branch: {
          select: {
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            sales: true
          }
        }
      },
      orderBy: { openedAt: 'desc' }
    });

    // Calculate current drawer balance for each shift
    const drawersWithBalance = await Promise.all(
      openShifts.map(async (shift) => {
        // Get total cash sales for this shift
        const cashSales = await prisma.sale.aggregate({
          where: {
            shiftId: shift.id,
            paymentMethod: 'CASH',
            status: 'COMPLETED'
          },
          _sum: {
            total: true
          }
        });

        const currentBalance = shift.openingBalance + (cashSales._sum.total || 0);

        return {
          ...shift,
          currentDrawerBalance: currentBalance,
          totalCashSales: cashSales._sum.total || 0
        };
      })
    );

    res.json({
      success: true,
      data: drawersWithBalance
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel money transfer (only sender can cancel if still pending)
 * إلغاء تحويل مالي (المرسل فقط قبل التأكيد)
 */
exports.cancelMoneyTransfer = async (req, res, next) => {
  try {
    const { transferId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    // Get transfer
    const transfer = await prisma.moneyTransfer.findUnique({
      where: { id: transferId },
      include: {
        fromBranch: true,
        toBranch: { select: { name: true } }
      }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending transfers'
      });
    }

    // Only sender or admin can cancel
    if (transfer.sentBy !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own transfers'
      });
    }

    // Cancel and refund to source vault
    const result = await prisma.$transaction(async (tx) => {
      // Refund to source vault
      const updatedFromBranch = await tx.branch.update({
        where: { id: transfer.fromBranchId },
        data: {
          vaultBalance: transfer.fromBranch.vaultBalance + transfer.amount
        }
      });

      // Update transfer status
      const updatedTransfer = await tx.moneyTransfer.update({
        where: { id: transferId },
        data: {
          status: 'CANCELLED',
          notes: `${transfer.notes || ''}\nإلغاء: ${reason || 'تم الإلغاء'}`
        }
      });

      // Create refund vault transaction
      const vaultTransaction = await tx.vaultTransaction.create({
        data: {
          branchId: transfer.fromBranchId,
          type: 'MONEY_TRANSFER_IN',
          amount: transfer.amount,
          moneyTransferId: transferId,
          description: `إلغاء تحويل إلى ${transfer.toBranch.name} - استرداد`,
          notes: reason,
          createdBy: userId,
          balanceBefore: transfer.fromBranch.vaultBalance,
          balanceAfter: updatedFromBranch.vaultBalance
        }
      });

      // Log activity
      await logActivity(tx, {
        userId,
        branchId: transfer.fromBranchId,
        action: ActivityActions.MONEY_CANCELLED,
        entity: 'moneyTransfer',
        entityId: transferId,
        description: `إلغاء تحويل ${transfer.amount} جنيه - استرداد للخزينة`,
        metadata: { amount: transfer.amount, reason }
      });

      return { updatedTransfer, vaultTransaction };
    });

    res.json({
      success: true,
      message: 'تم إلغاء التحويل واسترداد المبلغ للخزينة',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
