const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const { logActivity, ActivityActions } = require('../utils/activityLogger');

// Get dashboard overview
exports.getDashboardOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }
    
    // إحصائيات عامة
    const [
      totalBranches,
      totalUsers,
      totalProducts,
      activeBranches,
      activeUsers,
      openShifts,
      todaySales,
      todayReturns,
      officeInvoices
    ] = await Promise.all([
      prisma.branch.count(),
      prisma.user.count(),
      prisma.product.count(),
      prisma.branch.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.shift.count({ where: { status: 'OPEN' } }),
      prisma.sale.aggregate({
        where: {
          ...dateFilter,
          isReturn: false
        },
        _sum: { total: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: {
          ...dateFilter,
          isReturn: true
        },
        _sum: { total: true },
        _count: true
      }),
      prisma.officeInvoice.aggregate({
        where: {
          ...dateFilter,
          status: { not: 'CANCELLED' }
        },
        _sum: {
          total: true,
          paidAmount: true,
          profit: true
        },
        _count: true
      })
    ]);
    
    // المبيعات حسب الفرع
    const salesByBranch = await prisma.sale.groupBy({
      by: ['branchId'],
      where: {
        ...dateFilter,
        isReturn: false
      },
      _sum: {
        total: true
      },
      _count: true
    });
    
    const branchesData = await Promise.all(
      salesByBranch.map(async (item) => {
        const branch = await prisma.branch.findUnique({
          where: { id: item.branchId }
        });
        return {
          branch: branch?.name || 'Unknown',
          sales: item._sum.total || 0,
          transactions: item._count
        };
      })
    );
    
    // أكثر المنتجات مبيعاً
    const topProducts = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: dateFilter.createdAt ? {
          createdAt: dateFilter.createdAt,
          isReturn: false
        } : {
          isReturn: false
        }
      },
      _sum: {
        quantity: true,
        total: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 10
    });
    
    const topProductsData = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });
        return {
          product: product?.name || 'Unknown',
          quantity: item._sum.quantity || 0,
          revenue: item._sum.total || 0
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        overview: {
          totalBranches,
          activeBranches,
          totalUsers,
          activeUsers,
          totalProducts,
          openShifts
        },
        sales: {
          total: todaySales._sum.total || 0,
          count: todaySales._count || 0
        },
        returns: {
          total: Math.abs(todayReturns._sum.total || 0),
          count: todayReturns._count || 0
        },
        officeInvoices: {
          total: officeInvoices._sum.total || 0,
          collected: officeInvoices._sum.paidAmount || 0,
          profit: officeInvoices._sum.profit || 0,
          count: officeInvoices._count || 0
        },
        salesByBranch: branchesData,
        topProducts: topProductsData
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard overview'
    });
  }
};

// Get all branches with detailed info
exports.getAllBranchesDetailed = async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
            isActive: true
          }
        },
        _count: {
          select: {
            sales: true,
            inventory: true,
            shifts: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // إحصائيات لكل فرع
    const branchesWithStats = await Promise.all(
      branches.map(async (branch) => {
        const [todaySales, openShifts] = await Promise.all([
          prisma.sale.aggregate({
            where: {
              branchId: branch.id,
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              },
              isReturn: false
            },
            _sum: { total: true },
            _count: true
          }),
          prisma.shift.count({
            where: {
              branchId: branch.id,
              status: 'OPEN'
            }
          })
        ]);
        
        return {
          ...branch,
          stats: {
            todaySales: todaySales._sum.total || 0,
            todayTransactions: todaySales._count || 0,
            openShifts
          }
        };
      })
    );
    
    res.json({
      success: true,
      data: branchesWithStats
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branches'
    });
  }
};

// Create user for a branch
exports.createBranchUser = async (req, res) => {
  try {
    const { branchId, username, email, password, fullName, phone, role } = req.body;
    
    // التحقق من أن الفرع موجود
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // إنشاء المستخدم
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        fullName,
        phone,
        role,
        branchId
      },
      include: {
        branch: true
      }
    });
    
    // Log activity
    await logActivity({
      userId: req.user.id,
      action: ActivityActions.USER_CREATE,
      entity: 'user',
      entityId: user.id,
      description: `User created: ${user.fullName} (${role}) for branch ${branch.name}`,
      branchId
    });
    
    // إزالة كلمة المرور من الاستجابة
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
};

// Get open shifts across all branches
exports.getOpenShifts = async (req, res) => {
  try {
    const openShifts = await prisma.shift.findMany({
      where: {
        status: 'OPEN'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        },
        branch: {
          select: {
            id: true,
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
      orderBy: {
        openedAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      data: openShifts
    });
  } catch (error) {
    console.error('Error fetching open shifts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch open shifts'
    });
  }
};

// Get system statistics
exports.getSystemStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const [
      totalSales,
      totalReturns,
      totalProducts,
      lowStockProducts,
      totalUsers,
      recentActivity
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          createdAt: { gte: startDate },
          isReturn: false
        },
        _sum: { total: true },
        _count: true
      }),
      prisma.sale.aggregate({
        where: {
          createdAt: { gte: startDate },
          isReturn: true
        },
        _sum: { total: true },
        _count: true
      }),
      prisma.product.count(),
      prisma.inventory.count({
        where: {
          quantity: {
            lte: prisma.inventory.fields.minQuantity
          }
        }
      }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.activityLog.count({
        where: {
          createdAt: { gte: startDate }
        }
      })
    ]);
    
    res.json({
      success: true,
      data: {
        period: `Last ${days} days`,
        sales: {
          total: totalSales._sum.total || 0,
          count: totalSales._count || 0,
          average: totalSales._count ? (totalSales._sum.total / totalSales._count) : 0
        },
        returns: {
          total: Math.abs(totalReturns._sum.total || 0),
          count: totalReturns._count || 0,
          percentage: totalSales._count ? ((totalReturns._count / totalSales._count) * 100).toFixed(2) : 0
        },
        inventory: {
          totalProducts,
          lowStock: lowStockProducts
        },
        users: {
          active: totalUsers
        },
        activity: {
          total: recentActivity
        }
      }
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system stats'
    });
  }
};
