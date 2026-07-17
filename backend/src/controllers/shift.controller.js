const prisma = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Open new shift
 */
exports.openShift = async (req, res, next) => {
  try {
    const { branchId, openingBalance } = req.body;
    const userId = req.user.id;

    // Check if user already has an open shift
    const existingShift = await prisma.shift.findFirst({
      where: {
        userId,
        status: 'OPEN'
      }
    });

    if (existingShift) {
      return res.status(400).json({
        success: false,
        message: 'You already have an open shift'
      });
    }

    // Generate shift number
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const shiftCount = await prisma.shift.count({
      where: {
        branchId,
        openedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });
    const shiftNumber = `${today}-${branchId.substring(0, 4)}-${(shiftCount + 1).toString().padStart(3, '0')}`;

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        shiftNumber,
        userId,
        branchId,
        openingBalance: parseFloat(openingBalance),
        status: 'OPEN'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`branch-${branchId}`).emit('shift-opened', shift);

    res.status(201).json({
      success: true,
      message: 'Shift opened successfully',
      data: shift
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Close shift
 */
exports.closeShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { actualCash, notes } = req.body;
    const userId = req.user.id;

    // Get shift
    const shift = await prisma.shift.findUnique({
      where: { id }
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Check if shift belongs to user or user is manager/admin
    if (shift.userId !== userId && !['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only close your own shift'
      });
    }

    if (shift.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'Shift is already closed'
      });
    }

    // Get total sales for this shift
    const salesData = await prisma.sale.aggregate({
      where: {
        shiftId: id,
        status: 'COMPLETED'
      },
      _sum: {
        total: true
      },
      _count: true
    });

    const totalSales = salesData._sum.total || 0;
    const totalTransactions = salesData._count || 0;

    // Calculate expected cash
    const cashSales = await prisma.sale.aggregate({
      where: {
        shiftId: id,
        status: 'COMPLETED',
        paymentMethod: 'CASH'
      },
      _sum: {
        amountPaid: true
      }
    });

    const expectedCash = parseFloat(shift.openingBalance) + parseFloat(cashSales._sum.amountPaid || 0);
    const cashDifference = parseFloat(actualCash) - expectedCash;

    // Close shift
    const closedShift = await prisma.shift.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        actualCash: parseFloat(actualCash),
        expectedCash,
        cashDifference,
        totalSales,
        totalTransactions,
        closingBalance: parseFloat(actualCash),
        notes
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`branch-${shift.branchId}`).emit('shift-closed', closedShift);

    res.json({
      success: true,
      message: 'Shift closed successfully',
      data: closedShift
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current open shift for user
 */
exports.getCurrentShift = async (req, res, next) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: {
        userId: req.user.id,
        status: 'OPEN'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'No open shift found'
      });
    }

    res.json({
      success: true,
      data: shift
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get shift by ID
 */
exports.getShiftById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        sales: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            paymentMethod: true,
            createdAt: true
          }
        }
      }
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    res.json({
      success: true,
      data: shift
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get shifts by branch
 */
exports.getShiftsByBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const where = { branchId };
    if (status) {
      where.status = status;
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      },
      orderBy: {
        openedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.shift.count({ where });

    res.json({
      success: true,
      data: shifts,
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
