const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all transfers
exports.getAllTransfers = async (req, res) => {
  try {
    const { branchId, status } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const where = {};
    
    // إذا كان كاشير، يشوف فقط التوريدات الخاصة بفرعه
    if (userRole === 'CASHIER') {
      where.toBranchId = req.user.branchId;
    } else if (branchId) {
      where.OR = [
        { fromBranchId: branchId },
        { toBranchId: branchId }
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        fromBranch: true,
        toBranch: true,
        sentByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        receivedByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      data: transfers
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfers'
    });
  }
};

// Get pending transfers for cashier (للتنبيهات)
exports.getPendingTransfers = async (req, res) => {
  try {
    const branchId = req.user.branchId;
    
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'User has no assigned branch'
      });
    }
    
    const transfers = await prisma.transfer.findMany({
      where: {
        toBranchId: branchId,
        status: {
          in: ['PENDING', 'IN_TRANSIT']
        }
      },
      include: {
        fromBranch: true,
        toBranch: true,
        sentByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({
      success: true,
      data: transfers,
      count: transfers.length
    });
  } catch (error) {
    console.error('Error fetching pending transfers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending transfers'
    });
  }
};

// Get transfer by ID
exports.getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        fromBranch: true,
        toBranch: true,
        sentByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        receivedByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }
    
    res.json({
      success: true,
      data: transfer
    });
  } catch (error) {
    console.error('Error fetching transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfer'
    });
  }
};

// Create transfer (Admin/Manager only)
exports.createTransfer = async (req, res) => {
  try {
    const { fromBranchId, toBranchId, items, notes } = req.body;
    const sentBy = req.user.id;
    
    // Generate unique transfer number
    const date = new Date();
    const transferNumber = `TRF-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    
    const transfer = await prisma.transfer.create({
      data: {
        transferNumber,
        fromBranchId,
        toBranchId,
        sentBy,
        notes,
        status: 'PENDING',
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantityRequested: item.quantity,
            notes: item.notes
          }))
        }
      },
      include: {
        fromBranch: true,
        toBranch: true,
        sentByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    // إرسال إشعار عبر Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`branch-${toBranchId}`).emit('new-transfer', {
        transferId: transfer.id,
        transferNumber: transfer.transferNumber,
        fromBranch: transfer.fromBranch?.name || 'المخزن الرئيسي',
        itemsCount: items.length,
        message: `توريد جديد من ${transfer.fromBranch?.name || 'المخزن الرئيسي'}`
      });
    }
    
    res.status(201).json({
      success: true,
      data: transfer
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transfer'
    });
  }
};

// Confirm receipt (Cashier confirms receiving the transfer)
exports.confirmReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, receiverNotes } = req.body;
    const receivedBy = req.user.id;
    
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        items: true
      }
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }
    
    if (transfer.status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        error: 'Transfer already delivered'
      });
    }
    
    // تحديث حالة التوريد
    const updatedTransfer = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        receivedBy,
        receivedAt: new Date(),
        receiverNotes
      },
      include: {
        fromBranch: true,
        toBranch: true,
        sentByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        receivedByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    // تحديث كميات كل صنف
    for (const item of items) {
      // تحديث TransferItem بالكمية المستلمة
      await prisma.transferItem.update({
        where: { id: item.itemId },
        data: {
          quantityReceived: item.quantityReceived,
          notes: item.notes
        }
      });
      
      // تحديث المخزون في الفرع المستقبل
      const inventory = await prisma.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: transfer.toBranchId
          }
        }
      });
      
      if (inventory) {
        await prisma.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: inventory.quantity + item.quantityReceived,
            lastRestockDate: new Date()
          }
        });
      } else {
        await prisma.inventory.create({
          data: {
            productId: item.productId,
            branchId: transfer.toBranchId,
            quantity: item.quantityReceived,
            lastRestockDate: new Date()
          }
        });
      }
      
      // خصم من المخزون المرسل (إذا كان من فرع)
      if (transfer.fromBranchId) {
        const fromInventory = await prisma.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: transfer.fromBranchId
            }
          }
        });
        
        if (fromInventory) {
          await prisma.inventory.update({
            where: { id: fromInventory.id },
            data: {
              quantity: fromInventory.quantity - item.quantityReceived
            }
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: updatedTransfer,
      message: 'تم تأكيد الاستلام وتحديث المخزون بنجاح'
    });
  } catch (error) {
    console.error('Error confirming receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm receipt'
    });
  }
};

// Cancel transfer
exports.cancelTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const transfer = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason
      },
      include: {
        fromBranch: true,
        toBranch: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    res.json({
      success: true,
      data: transfer
    });
  } catch (error) {
    console.error('Error cancelling transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel transfer'
    });
  }
};
