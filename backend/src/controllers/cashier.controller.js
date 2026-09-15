const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all cashiers with their performance stats
exports.getCashiersPerformance = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }
    
    // Get all cashiers
    const where = {
      role: 'CASHIER',
      isActive: true
    };
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    const cashiers = await prisma.user.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    });
    
    // Get performance stats for each cashier
    const cashiersWithStats = await Promise.all(
      cashiers.map(async (cashier) => {
        // Get current open shift
        const openShift = await prisma.shift.findFirst({
          where: {
            userId: cashier.id,
            status: 'OPEN'
          },
          orderBy: {
            openedAt: 'desc'
          }
        });
        
        // Get sales stats
        const salesFilter = {
          cashierId: cashier.id,
          status: 'COMPLETED',
          ...dateFilter
        };
        
        const sales = await prisma.sale.findMany({
          where: salesFilter,
          select: {
            total: true,
            createdAt: true
          }
        });
        
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
        
        // Get shifts count
        const shiftsFilter = {
          userId: cashier.id
        };
        
        if (startDate || endDate) {
          shiftsFilter.openedAt = {};
          if (startDate) shiftsFilter.openedAt.gte = new Date(startDate);
          if (endDate) shiftsFilter.openedAt.lte = new Date(endDate);
        }
        
        const shiftsCount = await prisma.shift.count({
          where: shiftsFilter
        });
        
        // Get total transactions
        const totalTransactions = await prisma.shift.aggregate({
          where: shiftsFilter,
          _sum: {
            totalTransactions: true
          }
        });
        
        return {
          id: cashier.id,
          fullName: cashier.fullName,
          username: cashier.username,
          phone: cashier.phone,
          branch: cashier.branch,
          isCurrentlyWorking: !!openShift,
          currentShift: openShift ? {
            id: openShift.id,
            openedAt: openShift.openedAt,
            openingBalance: openShift.openingBalance
          } : null,
          performance: {
            totalSales,
            totalRevenue,
            averageOrderValue,
            shiftsCount,
            totalTransactions: totalTransactions._sum.totalTransactions || 0,
            averageTransactionsPerShift: shiftsCount > 0 
              ? (totalTransactions._sum.totalTransactions || 0) / shiftsCount 
              : 0
          }
        };
      })
    );
    
    // Sort by total revenue (best performers first)
    cashiersWithStats.sort((a, b) => b.performance.totalRevenue - a.performance.totalRevenue);
    
    res.json({
      success: true,
      data: cashiersWithStats,
      summary: {
        totalCashiers: cashiersWithStats.length,
        currentlyWorking: cashiersWithStats.filter(c => c.isCurrentlyWorking).length,
        totalRevenue: cashiersWithStats.reduce((sum, c) => sum + c.performance.totalRevenue, 0),
        totalSales: cashiersWithStats.reduce((sum, c) => sum + c.performance.totalSales, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching cashiers performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cashiers performance'
    });
  }
};

// Get detailed performance for a specific cashier
exports.getCashierDetails = async (req, res) => {
  try {
    const { cashierId } = req.params;
    const { startDate, endDate } = req.query;
    
    const cashier = await prisma.user.findUnique({
      where: { id: cashierId },
      include: {
        branch: true
      }
    });
    
    if (!cashier) {
      return res.status(404).json({
        success: false,
        error: 'Cashier not found'
      });
    }
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }
    
    // Get all shifts
    const shiftsFilter = {
      userId: cashierId
    };
    
    if (startDate || endDate) {
      shiftsFilter.openedAt = {};
      if (startDate) shiftsFilter.openedAt.gte = new Date(startDate);
      if (endDate) shiftsFilter.openedAt.lte = new Date(endDate);
    }
    
    const shifts = await prisma.shift.findMany({
      where: shiftsFilter,
      include: {
        sales: {
          where: {
            status: 'COMPLETED'
          }
        }
      },
      orderBy: {
        openedAt: 'desc'
      }
    });
    
    // Get sales by day
    const sales = await prisma.sale.findMany({
      where: {
        cashierId,
        status: 'COMPLETED',
        ...dateFilter
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Group sales by day
    const salesByDay = {};
    sales.forEach(sale => {
      const day = new Date(sale.createdAt).toISOString().split('T')[0];
      if (!salesByDay[day]) {
        salesByDay[day] = {
          date: day,
          count: 0,
          revenue: 0
        };
      }
      salesByDay[day].count++;
      salesByDay[day].revenue += sale.total;
    });
    
    res.json({
      success: true,
      data: {
        cashier: {
          id: cashier.id,
          fullName: cashier.fullName,
          username: cashier.username,
          phone: cashier.phone,
          branch: cashier.branch
        },
        shifts,
        salesByDay: Object.values(salesByDay),
        summary: {
          totalShifts: shifts.length,
          totalSales: sales.length,
          totalRevenue: sales.reduce((sum, s) => sum + s.total, 0),
          averageOrderValue: sales.length > 0 
            ? sales.reduce((sum, s) => sum + s.total, 0) / sales.length 
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching cashier details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cashier details'
    });
  }
};

module.exports = exports;
