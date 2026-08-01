const prisma = require('../config/database');

/**
 * Get all office customers with statistics
 */
exports.getAll = async (req, res, next) => {
  try {
    const { type, search } = req.query;

    const where = {
      isActive: true,
      ...(type && { type }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } }
        ]
      })
    };

    const customers = await prisma.officeCustomer.findMany({
      where,
      orderBy: [
        { totalSales: 'desc' },
        { name: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search office customer by phone
 * Used in CreateOfficeInvoice for autocomplete
 */
exports.searchByPhone = async (req, res, next) => {
  try {
    const { phone, type } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const customer = await prisma.officeCustomer.findFirst({
      where: {
        phone: phone.trim(),
        isActive: true,
        ...(type && { type })
      }
    });

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update office customer
 * Called automatically when creating office invoice
 */
exports.createOrUpdate = async (req, res, next) => {
  try {
    const { name, phone, type, shipmentCompany, address, notes } = req.body;

    if (!name || !phone || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and type are required'
      });
    }

    // Check if customer exists
    const existing = await prisma.officeCustomer.findFirst({
      where: { phone: phone.trim() }
    });

    let customer;

    if (existing) {
      // Update existing customer
      customer = await prisma.officeCustomer.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          type,
          ...(shipmentCompany && { shipmentCompany }),
          ...(address && { address }),
          ...(notes && { notes }),
          updatedAt: new Date()
        }
      });
    } else {
      // Create new customer
      customer = await prisma.officeCustomer.create({
        data: {
          id: require('uuid').v4(),
          name: name.trim(),
          phone: phone.trim(),
          type,
          shipmentCompany,
          address,
          notes
        }
      });
    }

    res.json({
      success: true,
      data: customer,
      message: existing ? 'Customer updated' : 'Customer created'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update customer statistics after invoice creation
 * Called internally from officeInvoice controller
 */
exports.updateStatistics = async (phone, invoiceData) => {
  try {
    const customer = await prisma.officeCustomer.findFirst({
      where: { phone: phone.trim() }
    });

    if (customer) {
      await prisma.officeCustomer.update({
        where: { id: customer.id },
        data: {
          totalInvoices: { increment: 1 },
          totalSales: { increment: invoiceData.total },
          totalPaid: { increment: invoiceData.paidAmount },
          lastInvoiceDate: new Date(),
          updatedAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error updating office customer statistics:', error);
  }
};

/**
 * Get customer details with invoices
 */
exports.getDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prisma.officeCustomer.findUnique({
      where: { id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get recent invoices
    const invoices = await prisma.officeInvoice.findMany({
      where: {
        customerPhone: customer.phone
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                code: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({
      success: true,
      data: {
        customer,
        invoices
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top customers by sales
 */
exports.getTopCustomers = async (req, res, next) => {
  try {
    const { type, limit = 10 } = req.query;

    const where = {
      isActive: true,
      ...(type && { type })
    };

    const customers = await prisma.officeCustomer.findMany({
      where,
      orderBy: { totalSales: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    next(error);
  }
};
