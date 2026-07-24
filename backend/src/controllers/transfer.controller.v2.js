const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all transfers with filters
exports.getAllTransfers = async (req, res) => {
  try {
    const { branchId, status } = req.query;
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

// Get pending transfers for sending (للفرع المرسل) 
exports.getPendingTransfersForSending = async (req, res) => {
  try {
    const branchId = req.user.branchId;
    
    const transfers = await prisma.transfer.findMany({
      where: {
        fromBranchId: branchId,
        status: {
          in: ['PENDING', 'IN_TRANSIT']
        }
      },
      include: {
        fromBranch: true,
        toBranch: true,
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
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Failed to get transfers' });
  }
};

// Get pending transfers for receiving (للفرع المستقبل)
exports.getPendingTransfersWithDetails = async (req, res) => {
  try {
    const branchId = req.user.branchId;
    
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
      data: transfers
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Failed to get transfers' });
  }
};

// Get available items in transfer
exports.getAvailableAttributesForTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found' });
    }
    
    res.json({
      success: true,
      data: transfer.items
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Failed to get transfer items' });
  }
};

// Scan barcode for sending (simplified - not used in new system)
exports.scanBarcodeForSending = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Barcode scanning not supported in simplified system'
  });
};

// Scan barcode for receiving (simplified - not used in new system)
exports.scanBarcodeForReceiving = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Barcode scanning not supported in simplified system'
  });
};

// Complete transfer receiving
exports.completeTransferReceiving = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { items, receiverNotes } = req.body;
    const receivedBy = req.user.id;
    
    console.log('Receiving transfer:', {
      transferId,
      itemsCount: items?.length,
      receivedBy,
      items: JSON.stringify(items, null, 2)
    });
    
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { 
        items: true,
        fromBranch: true,
        toBranch: true
      }
    });
    
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found' });
    }
    
    console.log('Found transfer:', {
      id: transfer.id,
      status: transfer.status,
      itemsCount: transfer.items.length
    });
    
    // Calculate discrepancies
    const discrepancies = [];
    
    for (const item of items) {
      const transferItem = transfer.items.find(ti => ti.id === item.id);
      if (!transferItem) {
        console.log('Transfer item not found:', item.id);
        continue;
      }
      
      const quantityReceived = parseInt(item.quantityReceived) || transferItem.quantityRequested;
      const difference = quantityReceived - transferItem.quantityRequested;
      
      console.log('Processing item:', {
        productId: transferItem.productId,
        requested: transferItem.quantityRequested,
        received: quantityReceived,
        difference
      });
      
      if (difference !== 0) {
        const product = await prisma.product.findUnique({
          where: { id: transferItem.productId }
        });
        
        discrepancies.push({
          productId: transferItem.productId,
          productName: product?.name,
          requested: transferItem.quantityRequested,
          received: quantityReceived,
          difference,
          type: difference > 0 ? 'EXCESS' : 'SHORTAGE'
        });
      }
    }
    
    console.log('Discrepancies:', discrepancies);
    
    // Update transfer status
    const updatedTransfer = await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: 'DELIVERED',
        receivedBy,
        receivedAt: new Date(),
        receiverNotes: discrepancies.length > 0 
          ? `${receiverNotes || ''}\n\nفروقات تلقائية: ${discrepancies.map(d => 
              `${d.productName}: ${d.difference > 0 ? '+' : ''}${d.difference}`
            ).join(', ')}`
          : receiverNotes,
        hasDiscrepancy: discrepancies.length > 0
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
    
    console.log('Transfer updated to DELIVERED');
    
    // Update inventory based on actual received quantities
    for (const item of items) {
      const transferItem = transfer.items.find(ti => ti.id === item.id);
      if (!transferItem) continue;
      
      const quantityReceived = parseInt(item.quantityReceived) || transferItem.quantityRequested;
      const difference = quantityReceived - transferItem.quantityRequested;
      
      console.log('Updating inventory for product:', transferItem.productId);
      
      await prisma.transferItem.update({
        where: { id: item.id },
        data: {
          quantityReceived,
          status: 'DELIVERED'
        }
      });
      
      // إضافة الكمية المستلمة فعلياً للفرع المستقبل
      await prisma.inventory.upsert({
        where: {
          productId_branchId: {
            productId: transferItem.productId,
            branchId: transfer.toBranchId
          }
        },
        update: {
          quantity: { increment: quantityReceived },
          lastRestockDate: new Date()
        },
        create: {
          productId: transferItem.productId,
          branchId: transfer.toBranchId,
          quantity: quantityReceived,
          lastRestockDate: new Date()
        }
      });
      
      console.log(`Added ${quantityReceived} to branch ${transfer.toBranchId}`);
      
      // Handle discrepancies - إرجاع الفرق للمخزن الرئيسي إذا كان هناك نقص
      if (difference < 0 && transfer.fromBranchId) {
        // نقص: نرجع الكمية الناقصة للمخزن المصدر
        await prisma.inventory.upsert({
          where: {
            productId_branchId: {
              productId: transferItem.productId,
              branchId: transfer.fromBranchId
            }
          },
          update: {
            quantity: { 
              increment: Math.abs(difference) // نرجع الفرق
            }
          },
          create: {
            productId: transferItem.productId,
            branchId: transfer.fromBranchId,
            quantity: Math.abs(difference)
          }
        });
        
        console.log(`Returned ${Math.abs(difference)} to source branch ${transfer.fromBranchId}`);
      }
      // إذا كانت زيادة، الكمية الزيادة تُضاف للفرع المستقبل بالفعل (تم في الخطوة السابقة)
      // ولا نحتاج خصم إضافي من المخزن المصدر لأنه تم خصم الكمية المطلوبة فقط عند الإنشاء
    }
    
    console.log('Inventory updated successfully');
    
    // Send notification to admin about discrepancies
    const io = req.app.get('io');
    if (io && discrepancies.length > 0) {
      io.emit('transfer-discrepancy', {
        transferId: transfer.id,
        transferNumber: transfer.transferNumber,
        fromBranch: transfer.fromBranch?.name || 'المخزن الرئيسي',
        toBranch: transfer.toBranch?.name,
        discrepancies
      });
      console.log('Discrepancy notification sent');
    }
    
    res.json({
      success: true,
      data: updatedTransfer,
      discrepancies,
      message: discrepancies.length > 0 
        ? `تم الاستلام بنجاح مع ${discrepancies.length} فرق`
        : 'تم الاستلام بنجاح'
    });
  } catch (error) {
    console.error('Error in completeTransferReceiving:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete transfer',
      details: error.message 
    });
  }
};

// Confirm receiving (simplified)
exports.confirmReceiving = async (req, res) => {
  return exports.completeTransferReceiving(req, res);
};

// Create transfer
exports.createTransfer = async (req, res) => {
  try {
    const { fromBranchId, toBranchId, items, notes } = req.body;
    const sentBy = req.user.id;
    
    if (!toBranchId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    let sourceBranchId = fromBranchId;
    if (!sourceBranchId || sourceBranchId === '') {
      const mainBranch = await prisma.branch.findFirst({
        where: { code: 'MAIN' }
      });
      sourceBranchId = mainBranch?.id || null;
    }
    
    // التحقق من توفر الكميات في المخزن المصدر
    for (const item of items) {
      const inventory = await prisma.inventory.findUnique({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: sourceBranchId
          }
        }
      });
      
      if (!inventory || inventory.quantity < item.quantity) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });
        return res.status(400).json({
          success: false,
          error: `الكمية غير متوفرة للمنتج ${product?.name || item.productId}. متوفر: ${inventory?.quantity || 0}, مطلوب: ${item.quantity}`
        });
      }
    }
    
    const date = new Date();
    const transferNumber = `TRF-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    
    const transfer = await prisma.transfer.create({
      data: {
        transferNumber,
        fromBranchId: sourceBranchId,
        toBranchId,
        sentBy,
        notes,
        status: 'PENDING',
        sentAt: new Date(),
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantityRequested: item.quantity,
            status: 'PENDING',
            notes: item.notes || ''
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
    
    // خصم الكمية من المخزن المصدر مباشرة عند إنشاء التوريد
    for (const item of items) {
      await prisma.inventory.update({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: sourceBranchId
          }
        },
        data: {
          quantity: {
            decrement: item.quantity
          }
        }
      });
    }
    
    const io = req.app.get('io');
    if (io) {
      io.to(`branch-${toBranchId}`).emit('new-transfer', {
        transferId: transfer.id,
        transferNumber: transfer.transferNumber,
        fromBranch: transfer.fromBranch?.name || 'المخزن الرئيسي',
        itemsCount: items.length
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

// Ship direct (for admin to mark as shipped)
exports.shipDirect = async (req, res) => {
  try {
    const { transferId } = req.params;
    
    const transfer = await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: 'IN_TRANSIT',
        sentAt: new Date()
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
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Failed to ship transfer' });
  }
};
