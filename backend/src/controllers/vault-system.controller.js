const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all active vaults
 */
exports.getAllVaults = async (req, res) => {
  try {
    const vaults = await prisma.vault.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: vaults
    });
  } catch (error) {
    console.error('Error fetching vaults:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الخزائن'
    });
  }
};

/**
 * Get vault by ID
 */
exports.getVaultById = async (req, res) => {
  try {
    const { id } = req.params;

    const vault = await prisma.vault.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    if (!vault) {
      return res.status(404).json({
        success: false,
        message: 'الخزينة غير موجودة'
      });
    }

    res.json({
      success: true,
      data: vault
    });
  } catch (error) {
    console.error('Error fetching vault:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب بيانات الخزينة'
    });
  }
};

/**
 * Get vault transactions
 */
exports.getVaultTransactions = async (req, res) => {
  try {
    const { vaultId, type, startDate, endDate, limit = 100 } = req.query;

    const where = {};
    if (vaultId) where.vaultId = vaultId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const transactions = await prisma.vaultTransaction.findMany({
      where,
      include: {
        vault: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching vault transactions:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب معاملات الخزينة'
    });
  }
};

/**
 * Create vault
 */
exports.createVault = async (req, res) => {
  try {
    const { name, type, description } = req.body;

    // Check if name exists
    const existing = await prisma.vault.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'اسم الخزينة موجود بالفعل'
      });
    }

    const vault = await prisma.vault.create({
      data: {
        name,
        type,
        description,
        balance: 0
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الخزينة بنجاح',
      data: vault
    });
  } catch (error) {
    console.error('Error creating vault:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء الخزينة'
    });
  }
};

/**
 * Update vault
 */
exports.updateVault = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, description, isActive } = req.body;

    const vault = await prisma.vault.update({
      where: { id },
      data: {
        name,
        type,
        description,
        isActive
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث الخزينة بنجاح',
      data: vault
    });
  } catch (error) {
    console.error('Error updating vault:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الخزينة'
    });
  }
};

module.exports = exports;
