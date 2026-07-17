const prisma = require('../config/database');
const dayjs = require('dayjs');

/**
 * Generate invoice number
 */
const generateInvoiceNumber = async (branchId) => {
  const today = dayjs().format('YYYYMMDD');
  const branchCode = branchId.substring(0, 4).toUpperCase();
  
  const lastSale = await prisma.sale.findFirst({
    where: {
      branchId,
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let sequence = 1;
  if (lastSale) {
    const lastSequence = parseInt(lastSale.invoiceNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `INV-${today}-${branchCode}-${sequence.toString().padStart(5, '0')}`;
};

/**
 * Create new sale
 */
exports.createSale = async (req, res, next) => {
  try {
    const {
      branchId,
      shiftId,
      items,
      paymentMethod,
      amountPaid,
      customerName,
      customerPhone,
      discountAmount = 0,
      notes
    } = req.body;

    const cashierId = req.user.id;

    // Verify shift is open
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId }
    });

    if (!shift || shift.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Shift is not open'
      });
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    const saleItems = [];

    for (const item of items) {
      // Get product details
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`
        });
      }

      // Check inventory
      const inventory = await prisma.inventory.findFirst({
        where: {
          productId: item.productId,
          branchId
        }
      });

      if (!inventory || inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for ${product.name}`
        });
      }

      const unitPrice = parseFloat(item.unitPrice || product.sellingPrice);
      const discount = parseFloat(item.discount || 0);
      const itemTax = (unitPrice * item.quantity - discount) * (parseFloat(product.taxRate) / 100);
      const itemTotal = unitPrice * item.quantity - discount + itemTax;

      subtotal += unitPrice * item.quantity;
      taxAmount += itemTax;

      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        discount,
        taxRate: product.taxRate,
        total: itemTotal
      });
    }

    const total = subtotal + taxAmount - parseFloat(discountAmount);
    const changeAmount = parseFloat(amountPaid) - total;

    if (changeAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient payment amount'
      });
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(branchId);

    // Create sale with items in transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create sale
      const newSale = await tx.sale.create({
        data: {
          invoiceNumber,
          branchId,
          shiftId,
          cashierId,
          customerName,
          customerPhone,
          subtotal,
          taxAmount,
          discountAmount: parseFloat(discountAmount),
          total,
          paymentMethod,
          amountPaid: parseFloat(amountPaid),
          changeAmount,
          status: 'COMPLETED',
          notes,
          items: {
            create: saleItems
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          cashier: {
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

      // Update inventory
      for (const item of items) {
        await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            branchId
          },
          data: {
            quantity: {
              decrement: item.quantity
            }
          }
        });
      }

      return newSale;
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`branch-${branchId}`).emit('new-sale', {
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      total: sale.total,
      timestamp: sale.createdAt
    });

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sale by ID
 */
exports.getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        cashier: {
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
            code: true,
            address: true,
            phone: true
          }
        },
        shift: {
          select: {
            id: true,
            shiftNumber: true
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sale by invoice number
 */
exports.getSaleByInvoice = async (req, res, next) => {
  try {
    const { invoiceNumber } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { invoiceNumber },
      include: {
        items: {
          include: {
            product: true
          }
        },
        cashier: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        branch: true
      }
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales by branch
 */
exports.getSalesByBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 20, startDate, endDate, status } = req.query;

    const where = { branchId };
    
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        cashier: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        items: {
          select: {
            quantity: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.sale.count({ where });

    // Calculate summary
    const summary = await prisma.sale.aggregate({
      where,
      _sum: {
        total: true,
        taxAmount: true,
        discountAmount: true
      },
      _count: true
    });

    res.json({
      success: true,
      data: sales,
      summary: {
        totalSales: summary._sum.total || 0,
        totalTax: summary._sum.taxAmount || 0,
        totalDiscount: summary._sum.discountAmount || 0,
        transactionCount: summary._count
      },
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

/**
 * Get sales by shift
 */
exports.getSalesByShift = async (req, res, next) => {
  try {
    const { shiftId } = req.params;

    const sales = await prisma.sale.findMany({
      where: { shiftId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate summary
    const summary = await prisma.sale.aggregate({
      where: { shiftId },
      _sum: {
        total: true,
        taxAmount: true,
        discountAmount: true
      },
      _count: true
    });

    res.json({
      success: true,
      data: sales,
      summary: {
        totalSales: summary._sum.total || 0,
        totalTax: summary._sum.taxAmount || 0,
        totalDiscount: summary._sum.discountAmount || 0,
        transactionCount: summary._count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refund sale
 */
exports.refundSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status === 'REFUNDED') {
      return res.status(400).json({
        success: false,
        message: 'Sale already refunded'
      });
    }

    // Refund sale and restore inventory
    const refundedSale = await prisma.$transaction(async (tx) => {
      // Update sale status
      const updated = await tx.sale.update({
        where: { id },
        data: {
          status: 'REFUNDED',
          notes: reason ? `Refund reason: ${reason}` : 'Refunded'
        }
      });

      // Restore inventory
      for (const item of sale.items) {
        await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            branchId: sale.branchId
          },
          data: {
            quantity: {
              increment: item.quantity
            }
          }
        });
      }

      return updated;
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`branch-${sale.branchId}`).emit('sale-refunded', {
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber
    });

    res.json({
      success: true,
      message: 'Sale refunded successfully',
      data: refundedSale
    });
  } catch (error) {
    next(error);
  }
};
