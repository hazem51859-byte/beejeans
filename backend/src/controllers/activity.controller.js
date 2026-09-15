const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all activity logs
exports.getAllLogs = async (req, res) => {
  try {
    const { userId, branchId, action, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    const where = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (action) {
      where.action = action;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
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
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.activityLog.count({ where })
    ]);
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs'
    });
  }
};

// Get user activity summary
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    const where = {
      userId
    };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        },
        branch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // تحليل النشاط
    const actionCounts = {};
    logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });
    
    // أوقات الدخول والخروج
    const sessions = logs
      .filter(log => log.action === 'LOGIN' || log.action === 'LOGOUT')
      .map(log => ({
        action: log.action,
        timestamp: log.createdAt,
        ipAddress: log.ipAddress
      }));
    
    res.json({
      success: true,
      data: {
        user: logs[0]?.user,
        totalActivities: logs.length,
        actionCounts,
        sessions,
        recentActivities: logs.slice(0, 20)
      }
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity'
    });
  }
};

// Get currently active users
exports.getActiveUsers = async (req, res) => {
  try {
    const { branchId } = req.query;
    
    // البحث عن آخر نشاط لكل مستخدم
    const recentLogins = await prisma.activityLog.findMany({
      where: {
        action: 'LOGIN',
        ...(branchId && { branchId }),
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // آخر 24 ساعة
        }
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
        branch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // التحقق من عدم تسجيل الخروج
    const activeUsers = [];
    
    for (const login of recentLogins) {
      // البحث عن logout بعد هذا الـ login
      const logout = await prisma.activityLog.findFirst({
        where: {
          userId: login.userId,
          action: 'LOGOUT',
          createdAt: {
            gt: login.createdAt
          }
        }
      });
      
      // إذا لم يوجد logout، المستخدم لا يزال نشطاً
      if (!logout) {
        // التحقق من أنه غير موجود بالفعل
        if (!activeUsers.find(u => u.userId === login.userId)) {
          activeUsers.push({
            userId: login.userId,
            user: login.user,
            branch: login.branch,
            loginTime: login.createdAt,
            ipAddress: login.ipAddress
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        activeUsers,
        count: activeUsers.length
      }
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active users'
    });
  }
};

// Get branch activity summary
exports.getBranchActivity = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { startDate, endDate } = req.query;
    
    const where = {
      branchId
    };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // تحليل حسب المستخدم
    const byUser = {};
    logs.forEach(log => {
      const userId = log.userId;
      if (!byUser[userId]) {
        byUser[userId] = {
          user: log.user,
          count: 0,
          actions: {}
        };
      }
      byUser[userId].count++;
      byUser[userId].actions[log.action] = (byUser[userId].actions[log.action] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: {
        totalActivities: logs.length,
        byUser: Object.values(byUser),
        recentActivities: logs.slice(0, 50)
      }
    });
  } catch (error) {
    console.error('Error fetching branch activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branch activity'
    });
  }
};
