const prisma = require('../config/database');

/**
 * Get all wholesale employees with stats
 */
exports.getAll = async (req, res, next) => {
  try {
    const employees = await prisma.wholesaleEmployee.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { officeInvoices: true }
        }
      }
    });

    // Get aggregated stats for each employee
    const employeesWithStats = await Promise.all(
      employees.map(async (emp) => {
        const stats = await prisma.officeInvoice.aggregate({
          where: { sellerId: emp.id, status: { not: 'CANCELLED' } },
          _sum: { total: true, profit: true, paidAmount: true },
          _count: true
        });

        return {
          ...emp,
          totalInvoices: stats._count || 0,
          totalSales: stats._sum.total || 0,
          totalProfit: stats._sum.profit || 0,
          totalCollected: stats._sum.paidAmount || 0
        };
      })
    );

    res.json({ success: true, data: employeesWithStats });
  } catch (error) {
    next(error);
  }
};

/**
 * Create wholesale employee
 */
exports.create = async (req, res, next) => {
  try {
    const { name, phone, email, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'اسم الموظف مطلوب' });
    }

    const employee = await prisma.wholesaleEmployee.create({
      data: { name, phone, email, notes }
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

/**
 * Update wholesale employee
 */
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, notes, isActive } = req.body;

    const employee = await prisma.wholesaleEmployee.update({
      where: { id },
      data: { name, phone, email, notes, isActive }
    });

    res.json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete (soft) wholesale employee
 */
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.wholesaleEmployee.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'تم إيقاف نشاط الموظف' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get performance report for all wholesale employees
 * Supports date filtering
 */
exports.getPerformanceReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const invoiceWhere = {
      status: { not: 'CANCELLED' },
      sellerId: { not: null },
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    };

    // Get all active employees
    const employees = await prisma.wholesaleEmployee.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    // Get stats per employee
    const report = await Promise.all(
      employees.map(async (emp) => {
        const stats = await prisma.officeInvoice.aggregate({
          where: { ...invoiceWhere, sellerId: emp.id },
          _sum: { total: true, profit: true, paidAmount: true, totalCost: true },
          _count: true
        });

        // Get total items sold
        const itemsResult = await prisma.officeInvoiceItem.aggregate({
          where: {
            invoice: { ...invoiceWhere, sellerId: emp.id }
          },
          _sum: { quantity: true }
        });

        return {
          id: emp.id,
          name: emp.name,
          phone: emp.phone,
          totalInvoices: stats._count || 0,
          totalSales: stats._sum.total || 0,
          totalProfit: stats._sum.profit || 0,
          totalCost: stats._sum.totalCost || 0,
          totalCollected: stats._sum.paidAmount || 0,
          totalItemsSold: itemsResult._sum.quantity || 0
        };
      })
    );

    // Calculate grand totals
    const grandTotalSales = report.reduce((sum, r) => sum + r.totalSales, 0);
    const grandTotalProfit = report.reduce((sum, r) => sum + r.totalProfit, 0);
    const grandTotalInvoices = report.reduce((sum, r) => sum + r.totalInvoices, 0);
    const grandTotalItems = report.reduce((sum, r) => sum + r.totalItemsSold, 0);

    // Add contribution percentage
    const reportWithContribution = report
      .map(r => ({
        ...r,
        contributionPercent: grandTotalSales > 0 ? ((r.totalSales / grandTotalSales) * 100) : 0
      }))
      .sort((a, b) => b.totalSales - a.totalSales); // Sort by top seller

    res.json({
      success: true,
      data: {
        employees: reportWithContribution,
        totals: {
          totalSales: grandTotalSales,
          totalProfit: grandTotalProfit,
          totalInvoices: grandTotalInvoices,
          totalItemsSold: grandTotalItems,
          avgInvoiceValue: grandTotalInvoices > 0 ? grandTotalSales / grandTotalInvoices : 0,
          bestSeller: reportWithContribution[0]?.name || 'N/A'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
