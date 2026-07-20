const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logActivity, ActivityActions } = require('../utils/activityLogger');

// Get all transfers with filters
exports.getAllTransfers = async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, fromBranchId, toBranchId, status } = req.query;

    const where = {};
    
    if (fromBranchId) {
      where.fromBranchId = fromBranchId;
    }
    
    if (toBranchId) {
      where.toBranchId = toBranchId;
    }
    
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        fromBranch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        toBranch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        sentByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        items: {
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.transfer.count({ where });

    res.json({
      success: true,
      data: transfers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting transfers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transfers'
    });
  }
};

// Create transfer (Admin sends detailed order)
exports.createTransfer = async (req, res) => {
  try {
    const { fromBranchId, toBranchId, items, notes } = req.body;
    const sentBy = req.user.id;
    
    // Generate unique transfer number
    const date = new Date();
    const transferNumber = `TRF-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    
    // التحقق من الأصناف
    const categories = await prisma.category.findMany({
      where: {
        id: {
          in: items.map(item => item.categoryId)
        }
      },
      select: {
        id: true,
        name: true,
        attributesTemplate: true
      }
    });
    
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
            categoryId: item.categoryId,
            attributes: JSON.stringify(item.attributes), // {المقاس: "L", اللون: "أبيض"}
            quantityRequested: item.quantity,
            status: 'PENDING'
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
        items: true
      }
    });
    
    // إرسال إشعار عبر Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`branch-${toBranchId}`).emit('new-transfer', {
        transferId: transfer.id,
        transferNumber: transfer.transferNumber,
        fromBranch: transfer.fromBranch?.name || 'المخزن الرئيسي',
        itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
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

// ship transfer directly (Admin/Main Warehouse without scanning)
exports.shipDirect = async (req, res, next) => {
  try {
    const { transferId } = req.params;
    const userId = req.user.id;

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        items: {
          include: { category: true }
        },
        fromBranch: true,
        toBranch: true
      }
    });

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found' });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'التوريد يجب أن يكون في حالة معلق أولاً' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update transfer status
      await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'IN_TRANSIT',
          sentAt: new Date()
        }
      });

      // 2. Map branch ID of MAIN if null
      let sourceBranchId = transfer.fromBranchId;
      if (!sourceBranchId) {
        const mainBranch = await tx.branch.findUnique({ where: { code: 'MAIN' } });
        if (mainBranch) {
          sourceBranchId = mainBranch.id;
        }
      }

      // 3. For each requested item, get serials by order and mark as IN_TRANSIT
      for (const item of transfer.items) {
        const itemColor = JSON.parse(item.attributes)['اللون'];
        
        // Find product under this category and color
        const product = await tx.product.findFirst({
          where: {
            categoryId: item.categoryId,
            color: itemColor
          }
        });

        if (product && sourceBranchId) {
          // Get AVAILABLE serials by order for this product
          const availableSerials = await tx.productSerial.findMany({
            where: {
              productId: product.id,
              branchId: sourceBranchId,
              status: 'AVAILABLE'
            },
            orderBy: {
              serialNumber: 'asc'
            },
            take: item.quantityRequested
          });

          const serialsToSend = availableSerials.slice(0, item.quantityRequested);
          const serialNumbers = serialsToSend.map(s => s.serialNumber);

          // Update serials to IN_TRANSIT and link to transfer
          for (const serial of serialsToSend) {
            await tx.productSerial.update({
              where: { id: serial.id },
              data: {
                status: 'IN_TRANSIT',
                transferId: transferId
              }
            });
          }

          // Deduct from inventory
          const inventory = await tx.inventory.findUnique({
            where: {
              productId_branchId: {
                productId: product.id,
                branchId: sourceBranchId
              }
            }
          });

          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                quantity: {
                  decrement: Math.min(inventory.quantity, serialsToSend.length)
                }
              }
            });
          }

          // Update transfer item
          await tx.transferItem.update({
            where: { id: item.id },
            data: {
              quantitySent: serialsToSend.length,
              sentBarcodes: JSON.stringify(serialNumbers),
              status: serialsToSend.length >= item.quantityRequested ? 'SENT' : 'PARTIAL_SENT'
            }
          });
        } else {
          // No serials available - mark as sent with 0
          await tx.transferItem.update({
            where: { id: item.id },
            data: {
              quantitySent: 0,
              status: 'PARTIAL_SENT'
            }
          });
        }
      }
    });

    // Send Socket.io notification
    const io = req.app.get('io');
    if (io) {
      io.to(`branch-${transfer.toBranchId}`).emit('transfer-in-transit', {
        transferId,
        transferNumber: transfer.transferNumber,
        fromBranch: transfer.fromBranch?.name || 'المخزن الرئيسي',
        itemsCount: transfer.items.reduce((sum, item) => sum + item.quantityRequested, 0)
      });
    }

    // Log Activity
    await logActivity({
      userId,
      action: ActivityActions.TRANSFER_SEND,
      entity: 'transfer',
      entityId: transferId,
      description: `Transfer ${transfer.transferNumber} directly shipped to ${transfer.toBranch?.name}`
    });

    res.json({ success: true, message: 'تم شحن التوريد بنجاح بالترتيب وجاري نقله للفرع' });
  } catch (error) {
    next(error);
  }
};

// Get pending transfers for sender branch (waiting to be sent)
exports.getPendingTransfersForSending = async (req, res) => {
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
        fromBranchId: branchId,
        status: {
          in: ['PENDING']
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
          where: {
            status: {
              in: ['PENDING', 'PARTIAL_SENT']
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // جلب معلومات الأصناف
    const transfersWithCategories = await Promise.all(
      transfers.map(async (transfer) => {
        const itemsWithDetails = await Promise.all(
          transfer.items.map(async (item) => {
            const category = await prisma.category.findUnique({
              where: { id: item.categoryId }
            });
            
            const attributes = JSON.parse(item.attributes);
            const sent = item.quantitySent || 0;
            const remaining = item.quantityRequested - sent;
            
            return {
              ...item,
              category: category,
              attributes,
              remaining,
              status: remaining === 0 ? 'SENT' : sent > 0 ? 'PARTIAL_SENT' : 'PENDING'
            };
          })
        );
        
        // فقط العناصر اللي لسه ناقصة
        const pendingItems = itemsWithDetails.filter(item => item.remaining > 0);
        
        return {
          ...transfer,
          items: pendingItems,
          totalRemaining: pendingItems.reduce((sum, item) => sum + item.remaining, 0)
        };
      })
    );
    
    // فقط التوريدات اللي لسه فيها حاجات محتاجة إرسال
    const activeTransfers = transfersWithCategories.filter(t => t.totalRemaining > 0);
    
    res.json({
      success: true,
      data: activeTransfers,
      count: activeTransfers.length
    });
  } catch (error) {
    console.error('Error fetching pending transfers for sending:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending transfers'
    });
  }
};

// Get pending transfers with remaining items (for receiver)
exports.getPendingTransfersWithDetails = async (req, res) => {
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
          where: {
            status: {
              in: ['PENDING', 'PARTIAL']
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // جلب معلومات الأصناف
    const transfersWithCategories = await Promise.all(
      transfers.map(async (transfer) => {
        const itemsWithDetails = await Promise.all(
          transfer.items.map(async (item) => {
            const category = await prisma.category.findUnique({
              where: { id: item.categoryId }
            });
            
            const attributes = JSON.parse(item.attributes);
            const received = item.quantityReceived || 0;
            const remaining = item.quantityRequested - received;
            
            return {
              ...item,
              category: category,
              attributes,
              remaining,
              status: remaining === 0 ? 'RECEIVED' : received > 0 ? 'PARTIAL' : 'PENDING'
            };
          })
        );
        
        // فقط العناصر اللي لسه ناقصة
        const pendingItems = itemsWithDetails.filter(item => item.remaining > 0);
        
        return {
          ...transfer,
          items: pendingItems,
          totalRemaining: pendingItems.reduce((sum, item) => sum + item.remaining, 0)
        };
      })
    );
    
    // فقط التوريدات اللي لسه فيها حاجات ناقصة
    const activeTransfers = transfersWithCategories.filter(t => t.totalRemaining > 0);
    
    res.json({
      success: true,
      data: activeTransfers,
      count: activeTransfers.length
    });
  } catch (error) {
    console.error('Error fetching pending transfers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending transfers'
    });
  }
};

// Scan barcode and prepare for sending (Sender Branch - Step 1)
exports.scanBarcodeForSending = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { barcode } = req.body;
    const userId = req.user.id;
    const userBranchId = req.user.branchId;
    
    // التحقق من التوريد
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        items: true,
        fromBranch: true,
        toBranch: true
      }
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }
    
    // التحقق من أن المستخدم في الفرع المرسل
    if (transfer.fromBranchId !== userBranchId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to send items from this branch'
      });
    }
    
    // البحث عن المنتج بالباركود في مخزن الفرع المرسل
    const product = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        inventory: {
          where: { branchId: userBranchId }
        }
      }
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }
    
    // التحقق من وجود المنتج في المخزن
    const inventory = product.inventory[0];
    if (!inventory || inventory.quantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'المنتج غير متوفر في المخزن'
      });
    }
    
    // التحقق من أن المنتج مطلوب في هذا التوريد
    const attributes = {
      'اللون': product.color
    };
    
    const requestedItem = transfer.items.find(item => {
      const itemAttrs = JSON.parse(item.attributes);
      return item.categoryId === product.categoryId && 
             JSON.stringify(itemAttrs) === JSON.stringify(attributes) &&
             item.status !== 'SENT';
    });
    
    if (!requestedItem) {
      return res.status(400).json({
        success: false,
        error: 'هذا المنتج غير مطلوب في التوريد أو تم إرساله بالكامل'
      });
    }
    
    // التحقق من عدم تكرار الباركود
    const sentBarcodes = requestedItem.sentBarcodes ? JSON.parse(requestedItem.sentBarcodes) : [];
    if (sentBarcodes.includes(barcode)) {
      return res.status(400).json({
        success: false,
        error: 'هذا الباركود تم تسجيله مسبقاً'
      });
    }
    
    // إضافة الباركود للقائمة المرسلة
    sentBarcodes.push(barcode);
    const quantitySent = sentBarcodes.length;
    
    // تحديث العنصر في التوريد
    const newStatus = quantitySent >= requestedItem.quantityRequested ? 'SENT' : 'PARTIAL_SENT';
    
    const updatedItem = await prisma.transferItem.update({
      where: { id: requestedItem.id },
      data: {
        quantitySent: quantitySent,
        sentBarcodes: JSON.stringify(sentBarcodes),
        status: newStatus
      }
    });
    
    // خصم من المخزون
    await prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: inventory.quantity - 1
      }
    });
    
    // التحقق من إرسال جميع العناصر
    const allItems = await prisma.transferItem.findMany({
      where: { transferId }
    });
    
    const allSent = allItems.every(item => item.status === 'SENT');
    
    if (allSent) {
      await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: 'IN_TRANSIT',
          sentAt: new Date()
        }
      });
      
      // إرسال إشعار للفرع المستقبل
      const io = req.app.get('io');
      if (io) {
        io.to(`branch-${transfer.toBranchId}`).emit('transfer-in-transit', {
          transferId,
          transferNumber: transfer.transferNumber,
          fromBranch: transfer.fromBranch?.name,
          itemsCount: allItems.reduce((sum, item) => sum + item.quantityRequested, 0)
        });
      }
      
      // Log activity
      await logActivity({
        userId,
        action: 'TRANSFER_SENT',
        entity: 'transfer',
        entityId: transferId,
        description: `Transfer ${transfer.transferNumber} sent to ${transfer.toBranch?.name}`,
        branchId: userBranchId
      });
    }
    
    const remaining = requestedItem.quantityRequested - quantitySent;
    
    res.json({
      success: true,
      data: {
        product: {
          name: product.name,
          barcode: product.barcode,
          size: product.size,
          color: product.color
        },
        transferItem: updatedItem,
        remaining,
        completed: remaining === 0,
        allTransferSent: allSent
      },
      message: remaining === 0 
        ? 'تم تسجيل إرسال هذا الصنف بالكامل ✅' 
        : `تم التسجيل. الباقي: ${remaining} قطعة`
    });
  } catch (error) {
    console.error('Error scanning barcode for sending:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan barcode'
    });
  }
};

// Scan barcode and add to transfer (Receiver Branch - Step 2)
exports.scanBarcodeForReceiving = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { barcode, categoryId, color, itemNotes, hasDiscrepancy, discrepancyNote } = req.body;
    const userId = req.user.id;
    const userBranchId = req.user.branchId;
    
    if (!categoryId || !color) {
      return res.status(400).json({
        success: false,
        error: 'يجب اختيار الصنف واللون لتسجيل الاستلام'
      });
    }

    // 1. Fetch Transfer details
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
    
    if (transfer.toBranchId !== userBranchId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to receive items for this branch'
      });
    }
    
    if (transfer.status !== 'IN_TRANSIT') {
      return res.status(400).json({
        success: false,
        error: 'التوريد يجب أن يكون في حالة "قيد النقل" أولاً'
      });
    }
    
    // 2. Find matching TransferItem in the transfer order
    const matchedItem = transfer.items.find(item => {
      const itemColor = JSON.parse(item.attributes)['اللون'];
      return item.categoryId === categoryId && itemColor === color;
    });

    if (!matchedItem) {
      return res.status(400).json({
        success: false,
        error: 'الصنف واللون المحددان غير مطلوبين في هذا التوريد'
      });
    }

    // التحقق من الكمية المشحونة فعلياً (quantitySent) مش المطلوبة
    const actualSentQuantity = matchedItem.quantitySent || 0;
    const currentReceived = matchedItem.quantityReceived || 0;
    
    if (matchedItem.status === 'RECEIVED' || currentReceived >= actualSentQuantity) {
      return res.status(400).json({
        success: false,
        error: `عذراً، تم استلام جميع القطع المشحونة لهذا الصنف بالفعل (المشحون: ${actualSentQuantity})`
      });
    }

    // 3. Find or create/update the Product row with this barcode
    let matchedProduct = await prisma.product.findUnique({
      where: { barcode },
      include: { category: true }
    });

    if (matchedProduct) {
      // If product exists, ensure it matches the category and color
      if (matchedProduct.categoryId !== categoryId || matchedProduct.color !== color) {
        return res.status(400).json({
          success: false,
          error: `الباركود مخصص لمنتج آخر بالفعل: ${matchedProduct.name} (${matchedProduct.color || ''})`
        });
      }
    } else {
      // If product doesn't exist under this barcode, find one with matching category and color
      let existingProduct = await prisma.product.findFirst({
        where: {
          categoryId: categoryId,
          color: color
        }
      });

      if (existingProduct) {
        // Assign the scanned barcode to this product!
        matchedProduct = await prisma.product.update({
          where: { id: existingProduct.id },
          data: { barcode },
          include: { category: true }
        });
      } else {
        // Create new product
        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        const sku = `${category.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
        matchedProduct = await prisma.product.create({
          data: {
            sku,
            barcode,
            name: category.name,
            categoryId: category.id,
            costPrice: category.defaultCostPrice || 0,
            sellingPrice: category.defaultSellingPrice,
            color: color,
            status: 'ACTIVE'
          },
          include: { category: true }
        });
      }
    }

    // 4. Prevent duplicate scans of the same barcode in this receipt session
    const receivedBarcodes = matchedItem.barcodes ? JSON.parse(matchedItem.barcodes) : [];
    if (receivedBarcodes.includes(barcode)) {
      return res.status(400).json({
        success: false,
        error: 'هذا الباركود تم تسجيل استلامه مسبقاً في هذا التوريد'
      });
    }

    receivedBarcodes.push(barcode);
    const quantityReceived = receivedBarcodes.length;
    
    // 5. Update transfer item status and count (مقارنة بالكمية المشحونة فعلياً)
    // actualSentQuantity تم تعريفه فوق في الـ validation
    const newStatus = quantityReceived >= actualSentQuantity ? 'RECEIVED' : 'PARTIAL';
    
    const updatedItem = await prisma.transferItem.update({
      where: { id: matchedItem.id },
      data: {
        quantityReceived: quantityReceived,
        barcodes: JSON.stringify(receivedBarcodes),
        status: newStatus,
        hasItemDiscrepancy: hasDiscrepancy || false,
        itemDiscrepancyNote: discrepancyNote || null,
        notes: itemNotes || matchedItem.notes
      }
    });
    
    // إضافة للمخزون في الفرع المستقبل
    const inventory = await prisma.inventory.findUnique({
      where: {
        productId_branchId: {
          productId: matchedProduct.id,
          branchId: userBranchId
        }
      }
    });
    
    if (inventory) {
      await prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: inventory.quantity + 1,
          lastRestockDate: new Date()
        }
      });
    } else {
      await prisma.inventory.create({
        data: {
          productId: matchedProduct.id,
          branchId: userBranchId,
          quantity: 1,
          minQuantity: 5,
          lastRestockDate: new Date()
        }
      });
    }
    
    // التحقق من اكتمال الاستلام
    const allItems = await prisma.transferItem.findMany({
      where: { transferId }
    });
    
    const allReceived = allItems.every(item => item.status === 'RECEIVED');
    
    if (allReceived) {
      await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: 'DELIVERED',
          receivedBy: userId,
          receivedAt: new Date()
        }
      });
      
      // إرسال إشعار للأدمن والفرع المرسل
      const io = req.app.get('io');
      if (io) {
        io.emit('transfer-completed', {
          transferId,
          transferNumber: transfer.transferNumber,
          fromBranch: transfer.fromBranch?.name,
          toBranch: transfer.toBranch?.name
        });
        
        if (transfer.fromBranchId) {
          io.to(`branch-${transfer.fromBranchId}`).emit('transfer-delivered', {
            transferId,
            transferNumber: transfer.transferNumber,
            toBranch: transfer.toBranch?.name
          });
        }
      }
      
      // Log activity
      await logActivity({
        userId,
        action: ActivityActions.TRANSFER_RECEIVE,
        entity: 'transfer',
        entityId: transferId,
        description: `Transfer ${transfer.transferNumber} completed at ${transfer.toBranch?.name}`,
        branchId: userBranchId
      });
    }
    
    const remaining = actualSentQuantity - quantityReceived;
    
    // رسالة توضيحية إذا تم استلام كل المشحون لكن لسه في باقي من الطلب الأصلي
    let successMessage = '';
    if (remaining === 0) {
      if (actualSentQuantity < matchedItem.quantityRequested) {
        const stillNeeded = matchedItem.quantityRequested - actualSentQuantity;
        successMessage = `تم استلام كل المشحون ✅ (${quantityReceived}/${matchedItem.quantityRequested} من الطلب الأصلي) - متبقي ${stillNeeded} قطعة لم يتم شحنها بعد`;
      } else {
        successMessage = `تم استلام هذا الصنف بالكامل ✅ (${quantityReceived} من ${actualSentQuantity} المشحونة)`;
      }
    } else {
      successMessage = `تم الاستلام. الباقي من المشحون: ${remaining} قطعة`;
    }
    
    res.json({
      success: true,
      data: {
        product: {
          name: matchedProduct.name,
          barcode: matchedProduct.barcode,
          size: matchedProduct.size,
          color: matchedProduct.color
        },
        transferItem: updatedItem,
        remaining,
        completed: remaining === 0,
        allTransferCompleted: allReceived
      },
      message: successMessage
    });
  } catch (error) {
    console.error('Error scanning barcode for receiving:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan barcode'
    });
  }
};

// Get available attributes for transfer item (للاختيار)
exports.getAvailableAttributesForTransfer = async (req, res) => {
  try {
    const { transferId } = req.params;
    
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
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
    
    // جلب الأصناف المتبقية
    const availableItems = await Promise.all(
      transfer.items
        .filter(item => item.status !== 'RECEIVED')
        .map(async (item) => {
          const category = await prisma.category.findUnique({
            where: { id: item.categoryId }
          });
          
          const attributes = JSON.parse(item.attributes);
          const received = item.quantityReceived || 0;
          const remaining = item.quantityRequested - received;
          
          return {
            itemId: item.id,
            category: {
              id: category.id,
              name: category.name
            },
            attributes,
            requested: item.quantityRequested,
            received,
            remaining
          };
        })
    );
    
    res.json({
      success: true,
      data: availableItems.filter(item => item.remaining > 0)
    });
  } catch (error) {
    console.error('Error fetching available attributes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available attributes'
    });
  }
};

// Complete transfer receiving with final notes and discrepancies
exports.completeTransferReceiving = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { receiverNotes, hasDiscrepancy, discrepancyType, discrepancyNotes } = req.body;
    const userId = req.user.id;
    const userBranchId = req.user.branchId;
    
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        items: true,
        toBranch: true,
        fromBranch: true
      }
    });
    
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found'
      });
    }
    
    if (transfer.toBranchId !== userBranchId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to complete this transfer'
      });
    }
    
    if (transfer.status !== 'IN_TRANSIT') {
      return res.status(400).json({
        success: false,
        error: 'Transfer must be in transit to complete receiving'
      });
    }
    
    // تحديث التوريد بالملاحظات والفروقات
    const updatedTransfer = await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: 'DELIVERED',
        receivedBy: userId,
        receivedAt: new Date(),
        receiverNotes,
        hasDiscrepancy: hasDiscrepancy || false,
        discrepancyType: hasDiscrepancy ? discrepancyType : null,
        discrepancyNotes: hasDiscrepancy ? discrepancyNotes : null
      },
      include: {
        items: {
          include: {
            category: true
          }
        },
        toBranch: true,
        fromBranch: true,
        receivedByUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });
    
    // إرسال إشعار للأدمن والفرع المرسل
    const io = req.app.get('io');
    if (io) {
      const notificationData = {
        transferId,
        transferNumber: transfer.transferNumber,
        fromBranch: transfer.fromBranch?.name,
        toBranch: transfer.toBranch?.name,
        hasDiscrepancy: hasDiscrepancy || false,
        discrepancyType,
        discrepancyNotes
      };
      
      io.emit('transfer-completed', notificationData);
      
      if (transfer.fromBranchId) {
        io.to(`branch-${transfer.fromBranchId}`).emit('transfer-delivered', notificationData);
      }
      
      // إشعار خاص للأدمن إذا كان هناك فروقات
      if (hasDiscrepancy) {
        io.emit('transfer-discrepancy-alert', {
          ...notificationData,
          message: `⚠️ تم اكتشاف فروقات في التوريد ${transfer.transferNumber}`
        });
      }
    }
    
    // Log activity
    await logActivity({
      userId,
      action: hasDiscrepancy ? ActivityActions.TRANSFER_RECEIVE_WITH_DISCREPANCY : ActivityActions.TRANSFER_RECEIVE,
      entity: 'transfer',
      entityId: transferId,
      description: hasDiscrepancy 
        ? `Transfer ${transfer.transferNumber} completed with ${discrepancyType} discrepancy at ${transfer.toBranch?.name}` 
        : `Transfer ${transfer.transferNumber} completed successfully at ${transfer.toBranch?.name}`,
      branchId: userBranchId
    });
    
    res.json({
      success: true,
      data: updatedTransfer,
      message: hasDiscrepancy 
        ? '✅ تم إنهاء الاستلام وتسجيل الفروقات. سيتم إشعار الأدمن.' 
        : '✅ تم إنهاء الاستلام بنجاح!'
    });
  } catch (error) {
    console.error('Error completing transfer receiving:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete transfer receiving'
    });
  }
};

// Confirm receiving transfer (تأكيد الاستلام المبسط - مع إمكانية المسح للنقص)
exports.confirmReceiving = async (req, res) => {
  try {
    const { transferId } = req.params;
    const { 
      confirmedQuantity, 
      scannedSerials = [], // السيريالات اللي اتمسحت (لو في نقص)
      extraSerials = [], // سيريالات زيادة (لو استلم أكتر)
      hasDiscrepancy, 
      discrepancyNotes 
    } = req.body;
    const userId = req.user.id;
    const userBranchId = req.user.branchId;
    
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        items: true,
        toBranch: true,
        fromBranch: true
      }
    });
    
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Transfer not found' });
    }
    
    if (transfer.toBranchId !== userBranchId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to receive this transfer'
      });
    }
    
    if (transfer.status !== 'IN_TRANSIT') {
      return res.status(400).json({
        success: false,
        error: 'Transfer must be in transit to confirm receiving'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get all serials that are IN_TRANSIT for this transfer
      const transferSerials = await tx.productSerial.findMany({
        where: {
          transferId: transferId,
          status: 'IN_TRANSIT'
        },
        include: {
          product: true
        },
        orderBy: {
          serialNumber: 'asc'
        }
      });

      const expectedQuantity = transferSerials.length;
      let receivedSerials = [];
      let missingSerials = [];
      let extraSerialsData = [];

      // حالة 1: العدد مظبوط - استلام كل السيريالات
      if (confirmedQuantity === expectedQuantity && scannedSerials.length === 0) {
        receivedSerials = transferSerials;
      }
      // حالة 2: في نقص - استلام السيريالات اللي اتمسحت بس
      else if (confirmedQuantity < expectedQuantity && scannedSerials.length > 0) {
        receivedSerials = transferSerials.filter(s => 
          scannedSerials.includes(s.serialNumber)
        );
        missingSerials = transferSerials.filter(s => 
          !scannedSerials.includes(s.serialNumber)
        );
      }
      // حالة 3: في زيادة - استلام كل السيريالات + الزيادة
      else if (confirmedQuantity > expectedQuantity && extraSerials.length > 0) {
        receivedSerials = transferSerials;
        // تسجيل السيريالات الزيادة
        for (const extraSerial of extraSerials) {
          // البحث عن المنتج من أول سيريال في التوريد
          const product = transferSerials[0]?.product;
          if (product) {
            const newSerial = await tx.productSerial.create({
              data: {
                serialNumber: extraSerial,
                productId: product.id,
                branchId: userBranchId,
                registeredBy: userId,
                status: 'AVAILABLE'
              }
            });
            extraSerialsData.push(newSerial);
          }
        }
      }

      // تأكيد استلام السيريالات المستلمة
      for (const serial of receivedSerials) {
        await tx.productSerial.update({
          where: { id: serial.id },
          data: {
            status: 'AVAILABLE',
            branchId: userBranchId,
            transferId: null
          }
        });

        // إضافة للمخزون
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: serial.productId,
              branchId: userBranchId
            }
          }
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantity: { increment: 1 },
              lastRestockDate: new Date()
            }
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: serial.productId,
              branchId: userBranchId,
              quantity: 1,
              minQuantity: 5,
              lastRestockDate: new Date()
            }
          });
        }
      }

      // إضافة السيريالات الزيادة للمخزون
      for (const extraSerial of extraSerialsData) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: extraSerial.productId,
              branchId: userBranchId
            }
          }
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { increment: 1 } }
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: extraSerial.productId,
              branchId: userBranchId,
              quantity: 1,
              minQuantity: 5,
              lastRestockDate: new Date()
            }
          });
        }
      }

      // إرجاع السيريالات الناقصة للمخزن الرئيسي
      for (const missingSerial of missingSerials) {
        await tx.productSerial.update({
          where: { id: missingSerial.id },
          data: {
            status: 'AVAILABLE',
            branchId: transfer.fromBranchId,
            transferId: null
          }
        });

        // إرجاع للمخزون الأساسي
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: missingSerial.productId,
              branchId: transfer.fromBranchId
            }
          }
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { increment: 1 } }
          });
        }
      }

      // تحديث حالة التوريد
      const finalStatus = missingSerials.length > 0 ? 'DELIVERED_WITH_DISCREPANCY' : 
                         extraSerialsData.length > 0 ? 'DELIVERED_WITH_EXTRA' : 
                         'DELIVERED';
      
      const discrepancyReport = {
        expected: expectedQuantity,
        received: receivedSerials.length + extraSerialsData.length,
        missing: missingSerials.map(s => s.serialNumber),
        extra: extraSerialsData.map(s => s.serialNumber)
      };

      await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: finalStatus,
          receivedBy: userId,
          receivedAt: new Date(),
          hasDiscrepancy: hasDiscrepancy || missingSerials.length > 0 || extraSerialsData.length > 0,
          discrepancyNotes: discrepancyNotes || JSON.stringify(discrepancyReport)
        }
      });

      // تحديث حالة الـ items
      for (const item of transfer.items) {
        await tx.transferItem.update({
          where: { id: item.id },
          data: {
            quantityReceived: receivedSerials.length,
            status: 'RECEIVED'
          }
        });
      }

      return {
        received: receivedSerials.length + extraSerialsData.length,
        missing: missingSerials.length,
        extra: extraSerialsData.length,
        discrepancyReport
      };
    });

    // Send notification
    const io = req.app.get('io');
    if (io) {
      io.emit('transfer-completed', {
        transferId,
        transferNumber: transfer.transferNumber,
        fromBranch: transfer.fromBranch?.name,
        toBranch: transfer.toBranch?.name
      });
    }

    // Log activity
    await logActivity({
      userId,
      action: ActivityActions.TRANSFER_RECEIVE,
      entity: 'transfer',
      entityId: transferId,
      description: `Transfer ${transfer.transferNumber} confirmed at ${transfer.toBranch?.name}`,
      branchId: userBranchId
    });

    res.json({
      success: true,
      message: '✅ تم تأكيد الاستلام بنجاح!',
      data: result
    });
  } catch (error) {
    console.error('Error confirming receiving:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm receiving'
    });
  }
};

module.exports = exports;
