const prisma = require('../config/database');
const dayjs = require('dayjs');
const { logActivity, ActivityActions } = require('../utils/activityLogger');

/**
 * Get all sales with optional filters
 */
exports.getAllSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, branchId, status, customerOnly, branchesOnly } = req.query;

    const where = {};
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (status) {
      where.status = status;
    }
    
    // فلتر للمبيعات للعملاء فقط (فواتير الجملة)
    if (customerOnly === 'true') {
      where.customerId = { not: null };
    }
    
    // فلتر لمبيعات الفروع فقط (استبعاد مبيعات المخزن الرئيسي للعملاء)
    if (branchesOnly === 'true') {
      where.customerId = null;
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
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                costPrice: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      ...(req.query.all === 'true' ? {} : {
        skip: (page - 1) * parseInt(limit),
        take: parseInt(limit)
      })
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
 * Create new sale with serial tracking and vault management
 */
exports.createSale = async (req, res, next) => {
  try {
    const {
      branchId,
      shiftId,
      items,
      paymentMethod,
      amountPaid,
      cardConfirmed = false,
      cardDestination, // 'BRANCH' or 'MAIN' - لتحديد وجهة الفيزا
      customerName,
      customerPhone,
      discountAmount = 0,
      notes
    } = req.body;

    const cashierId = req.user.id;

    // Verify shift is open
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { branch: true }
    });

    if (!shift || shift.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        message: 'Shift is not open'
      });
    }

    // Validate card payment confirmation
    if (paymentMethod === 'CARD') {
      if (!cardConfirmed) {
        return res.status(400).json({
          success: false,
          message: 'Card payment must be confirmed'
        });
      }
      
      if (!cardDestination || !['BRANCH', 'MAIN'].includes(cardDestination)) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد وجهة الفيزا: الفرع أو المخزن الرئيسي'
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    const saleItems = [];

    for (const item of items) {
      // If serial provided, validate it
      if (item.serialNumber) {
        const serial = await prisma.productSerial.findUnique({
          where: { serialNumber: item.serialNumber }
        });

        if (!serial) {
          return res.status(400).json({
            success: false,
            message: `السيريال ${item.serialNumber} غير موجود`
          });
        }

        if (serial.status === 'IN_TRANSIT') {
          return res.status(400).json({
            success: false,
            message: `السيريال ${item.serialNumber} قيد النقل - لا يمكن بيعه`
          });
        }

        if (serial.status === 'SOLD') {
          return res.status(400).json({
            success: false,
            message: `السيريال ${item.serialNumber} تم بيعه من قبل`
          });
        }

        if (serial.status !== 'AVAILABLE') {
          return res.status(400).json({
            success: false,
            message: `السيريال ${item.serialNumber} غير متاح للبيع (${serial.status})`
          });
        }

        if (serial.productId !== item.productId) {
          return res.status(400).json({
            success: false,
            message: `Serial ${item.serialNumber} does not match product`
          });
        }
      }

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

      // السعر من المنتج مباشرة - بدون أي ضرائب أو خصومات
      const unitPrice = parseFloat(item.unitPrice || product.sellingPrice);
      const itemTotal = unitPrice * item.quantity;

      subtotal += itemTotal;

      saleItems.push({
        productId: item.productId,
        serialNumber: item.serialNumber || null,
        quantity: item.quantity,
        unitPrice,
        discount: 0, // لا توجد خصومات
        taxRate: 0,  // لا توجد ضرائب
        total: itemTotal,
        size: item.size || null,
        color: item.color || null
      });
    }

    const total = subtotal; // السعر النهائي = المجموع فقط، بدون ضرائب أو خصومات
    const paid = parseFloat(amountPaid);
    const cardAmount = paymentMethod === 'CARD' ? total : 0;
    const changeAmount = paymentMethod === 'CASH' ? paid - total : 0;

    if (paymentMethod === 'CASH' && changeAmount < 0) {
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
          taxAmount: 0,        // لا توجد ضرائب
          discountAmount: 0,   // لا توجد خصومات
          total,
          paymentMethod,
          amountPaid: paid,
          changeAmount,
          cardConfirmed: paymentMethod === 'CARD' ? cardConfirmed : false,
          cardAmount,
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

      // Update inventory and serials
      for (const item of items) {
        // Update inventory
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

        // Mark serial as sold if provided
        if (item.serialNumber) {
          await tx.productSerial.update({
            where: { serialNumber: item.serialNumber },
            data: {
              status: 'SOLD',
              soldAt: new Date(),
              soldInSaleId: newSale.id
            }
          });
        }
      }

      // Handle card payment - transfer to selected vault
      if (paymentMethod === 'CARD') {
        if (cardDestination === 'MAIN') {
          // تحويل للمخزن الرئيسي
          const mainBranch = await tx.branch.findFirst({
            where: { code: 'MAIN' }
          });

          if (mainBranch) {
            await tx.branch.update({
              where: { id: mainBranch.id },
              data: {
                vaultBalance: {
                  increment: cardAmount
                }
              }
            });

            await tx.vaultTransaction.create({
              data: {
                branchId: mainBranch.id,
                type: 'CARD_PAYMENT',
                amount: cardAmount,
                saleId: newSale.id,
                invoiceNumber: newSale.invoiceNumber,
                description: `دفع فيزا من فرع ${shift.branch.name} → المخزن الرئيسي`,
                notes: `فاتورة ${invoiceNumber}`,
                createdBy: cashierId,
                balanceBefore: mainBranch.vaultBalance,
                balanceAfter: mainBranch.vaultBalance + cardAmount
              }
            });
          }
        } else {
          // تحويل لخزنة الفرع (cardVaultBalance)
          const currentBranch = await tx.branch.findUnique({
            where: { id: branchId }
          });

          await tx.branch.update({
            where: { id: branchId },
            data: {
              cardVaultBalance: {
                increment: cardAmount
              }
            }
          });

          await tx.vaultTransaction.create({
            data: {
              branchId: branchId,
              type: 'CARD_PAYMENT',
              amount: cardAmount,
              saleId: newSale.id,
              invoiceNumber: newSale.invoiceNumber,
              description: `دفع فيزا - ${shift.branch.name}`,
              notes: `فاتورة ${invoiceNumber} - فيزا الفرع`,
              createdBy: cashierId,
              balanceBefore: currentBranch.cardVaultBalance || 0,
              balanceAfter: (currentBranch.cardVaultBalance || 0) + cardAmount
            }
          });
        }
      }

      return newSale;
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`branch-${branchId}`).emit('new-sale', {
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
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


// Return/Refund Sale
exports.returnSale = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const { items, returnReason, notes } = req.body;
    const cashierId = req.user.id;
    const branchId = req.user.branchId;
    
    // البحث عن الفاتورة الأصلية
    const originalSale = await prisma.sale.findUnique({
      where: { invoiceNumber },
      include: {
        items: {
          include: {
            product: true
          }
        },
        shift: true
      }
    });
    
    if (!originalSale) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    if (originalSale.status === 'REFUNDED') {
      return res.status(400).json({
        success: false,
        error: 'This invoice has already been refunded'
      });
    }
    
    // التحقق من أن الكاشير في نفس الفرع
    if (originalSale.branchId !== branchId && req.user.role === 'CASHIER') {
      return res.status(403).json({
        success: false,
        error: 'You can only process returns for your branch'
      });
    }
    
    // التحقق من أن الشيفت مفتوح
    const openShift = await prisma.shift.findFirst({
      where: {
        userId: cashierId,
        branchId,
        status: 'OPEN'
      }
    });
    
    if (!openShift) {
      return res.status(400).json({
        success: false,
        error: 'No open shift found. Please open a shift first'
      });
    }
    
    // حساب قيمة الإرجاع
    let refundAmount = 0;
    const returnItems = [];
    
    for (const returnItem of items) {
      const originalItem = originalSale.items.find(item => item.productId === returnItem.productId);
      
      if (!originalItem) {
        return res.status(400).json({
          success: false,
          error: `Product ${returnItem.productId} not found in original invoice`
        });
      }
      
      if (returnItem.quantity > originalItem.quantity) {
        return res.status(400).json({
          success: false,
          error: `Return quantity exceeds original quantity for product ${originalItem.product.name}`
        });
      }
      
      // حساب قيمة الإرجاع (السعر × الكمية فقط)
      const itemRefundAmount = originalItem.unitPrice * returnItem.quantity;
      refundAmount += itemRefundAmount;
      
      returnItems.push({
        productId: returnItem.productId,
        quantity: -returnItem.quantity, // سالب للإرجاع
        unitPrice: originalItem.unitPrice,
        discount: 0,
        taxRate: 0,
        total: -itemRefundAmount
      });
    }
    
    // Generate return invoice number
    const date = new Date();
    const returnInvoiceNumber = `RET-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    
    // Update original sale with refund info (NO separate invoice)
    await prisma.sale.update({
      where: { id: originalSale.id },
      data: {
        refundAmount: refundAmount,
        returnReason: returnReason || notes || 'غير محدد'
      }
    });
    
    // Mark returned items in original sale
    for (const returnItem of items) {
      const originalItem = originalSale.items.find(i => i.productId === returnItem.productId);
      if (originalItem) {
        await prisma.saleItem.update({
          where: { id: originalItem.id },
          data: {
            isReturned: true,
            status: 'RETURNED'
          }
        });
      }
    }
    
    // إرجاع المنتجات للمخزون - change serial status to RETURNED (not AVAILABLE yet)
    // Manager will decide later: return to main or back to stock
    for (const returnItem of items) {
      // Mark serials as RETURNED
      const originalItem = originalSale.items.find(i => i.productId === returnItem.productId);
      if (originalItem?.serialNumber) {
        await prisma.productSerial.update({
          where: { serialNumber: originalItem.serialNumber },
          data: {
            status: 'RETURNED'
          }
        });
      }
    }
    
    // تحديث الشيفت
    await prisma.shift.update({
      where: { id: openShift.id },
      data: {
        totalSales: openShift.totalSales - refundAmount,
        totalTransactions: openShift.totalTransactions + 1
      }
    });
    
    // إرسال تحديث Real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`branch-${branchId}`).emit('new-return', {
        invoiceNumber: originalSale.invoiceNumber,
        amount: refundAmount,
        branchName: originalSale.branch?.name
      });
    }
    
    // Log activity
    await logActivity({
      userId: cashierId,
      action: ActivityActions.SALE_RETURN,
      entity: 'sale',
      entityId: originalSale.id,
      description: `Return processed for invoice ${invoiceNumber} - Amount: ${refundAmount} - Reason: ${returnReason}`,
      metadata: {
        invoiceNumber,
        amount: refundAmount,
        itemsCount: items.length,
        reason: returnReason
      },
      branchId
    });
    
    // Get updated sale
    const updatedSale = await prisma.sale.findUnique({
      where: { id: originalSale.id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        branch: true,
        cashier: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });
    
    res.status(200).json({
      success: true,
      data: updatedSale,
      message: 'Return processed successfully - Awaiting manager decision'
    });
  } catch (error) {
    console.error('Error processing return:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process return'
    });
  }
};

// Search sale by invoice number (للإرجاع)
exports.searchSaleByInvoice = async (req, res) => {
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
        branch: true,
        cashier: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Error searching sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search sale'
    });
  }
};
