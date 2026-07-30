// ======================================================
// ملف transfer.controller.js بعد تشغيل المigration
// استخدم هذا الملف بدلاً من transfer.controller.js
// ======================================================

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

// Create transfer (Admin/Manager only) - ✨ UPDATED WITH INVENTORY DEDUCTION
exports.createTransfer = async (req, res) => {
  try {
    const { fromBranchId, toBranchId, items, notes } = req.body;
    const sentBy = req.user.id;
    
    // Validate required fields
    if (!toBranchId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: toBranchId and items are required'
      });
    }
    
    // Get main branch if fromBranchId is empty
    let sourceBranchId = fromBranchId;
    if (!sourceBranchId || sourceBranchId === '') {
      const mainBranch = await prisma.branch.findFirst({
        where: { code: 'MAIN' }
      });
      sourceBranchId = mainBranch?.id || null;
    }
    
    // التحقق من المخزون المتاح قبل الإرسال
    if (sourceBranchId) {
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
            where: { id: item.productId },
            select: { name: true, sku: true }
          });
          
          return res.status(400).json({
            success: false,
            error: `الكمية المتاحة من ${product?.name || 'المنتج'} (${product?.sku || ''}) غير كافية. المتاح: ${inventory?.quantity || 0}، المطلوب: ${item.quantity}`
          });
        }
      }
    }
    
    // Generate unique transfer number
    const date = new Date();
    const transferNumber = `TRF-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
    
    // حساب الأسعار الإجمالية
    let totalCost = 0;
    let totalSellingPrice = 0;
    
    // Get product details with prices
    const itemsWithPrices = await Promise.all(items.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      
      const costPrice = product?.costPrice || 0;
      const sellingPrice = product?.sellingPrice || 0;
      
      totalCost += costPrice * item.quantity;
      totalSellingPrice += sellingPrice * item.quantity;
      
      return {
        ...item,
        costPrice,
        sellingPrice
      };
    }));
    
    // Create transfer with prices
    const transfer = await prisma.transfer.create({
      data: {
        transferNumber,
        fromBranchId: sourceBranchId,
        toBranchId,
        sentBy,
        notes,
        status: 'PENDING',
        sentAt: new Date(),
        totalCost,
        totalSellingPrice,
        items: {
          create: itemsWithPrices.map(item => ({
            productId: item.productId,
            quantityRequested: item.quantity,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
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
    
    // ✅ خصم الكمية من المخزن المصدر فوراً
    if (sourceBranchId) {
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
    }
    
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
      data: transfer,
      message: 'تم إنشاء التوريد وخصم الكمية من المخزن المصدر بنجاح'
    });
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transfer',
      details: error.message
    });
  }
};

// Confirm receipt (Cashier confirms receiving the transfer)
exports.confirmReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, receiverNotes, hasDiscrepancy, discrepancyNotes } = req.body;
    const receivedBy = req.user.id;
    
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
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
    
    if (transfer.status === 'DELIVERED') {
      return res.status(400).json({
        success: false,
        error: 'Transfer already delivered'
      });
    }
    
    // حساب الفروقات وإجمالي الأسعار
    let totalCost = 0;
    let totalSellingPrice = 0;
    let hasAnyDiscrepancy = false;
    let discrepancyType = null;
    
    const itemsWithDiscrepancy = [];
    
    for (const receivedItem of items) {
      const transferItem = transfer.items.find(ti => ti.id === receivedItem.id);
      if (!transferItem) continue;
      
      const quantityRequested = transferItem.quantityRequested;
      const quantityReceived = receivedItem.quantityReceived || quantityRequested;
      
      // تحديد نوع الفرق
      if (quantityReceived !== quantityRequested) {
        hasAnyDiscrepancy = true;
        if (quantityReceived < quantityRequested) {
          discrepancyType = 'SHORTAGE'; // نقص
        } else {
          discrepancyType = 'EXCESS'; // زيادة
        }
        
        itemsWithDiscrepancy.push({
          productName: transferItem.product.name,
          requested: quantityRequested,
          received: quantityReceived,
          difference: quantityReceived - quantityRequested
        });
      }
      
      // حساب الإجماليات بناءً على الكمية المستلمة فعلياً
      const costPrice = transferItem.product.costPrice || 0;
      const sellingPrice = transferItem.product.sellingPrice || 0;
      
      totalCost += costPrice * quantityReceived;
      totalSellingPrice += sellingPrice * quantityReceived;
    }
    
    // تحديث حالة التوريد مع الفروقات
    const updatedTransfer = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        receivedBy,
        receivedAt: new Date(),
        receiverNotes: receiverNotes || null,
        hasDiscrepancy: hasAnyDiscrepancy,
        discrepancyType: discrepancyType,
        discrepancyNotes: hasAnyDiscrepancy ? (discrepancyNotes || JSON.stringify(itemsWithDiscrepancy)) : null,
        totalCost: totalCost,
        totalSellingPrice: totalSellingPrice
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
    for (const receivedItem of items) {
      const transferItem = transfer.items.find(ti => ti.id === receivedItem.id);
      if (!transferItem) continue;
      
      const quantityRequested = transferItem.quantityRequested;
      const quantityReceived = receivedItem.quantityReceived || quantityRequested;
      const difference = quantityReceived - quantityRequested;
      
      // Get product prices
      const costPrice = transferItem.product.costPrice || 0;
      const sellingPrice = transferItem.product.sellingPrice || 0;
      
      // تحديث TransferItem بالكمية المستلمة والأسعار
      await prisma.transferItem.update({
        where: { id: receivedItem.id },
        data: {
          quantityReceived: quantityReceived,
          status: 'DELIVERED',
          costPrice: costPrice,
          sellingPrice: sellingPrice,
          notes: receivedItem.notes || (difference !== 0 ? `فرق: ${difference > 0 ? '+' : ''}${difference}` : null)
        }
      });
      
      // ✅ تحديث المخزون في الفرع المستقبل (إضافة الكمية المستلمة فعلياً)
      await prisma.inventory.upsert({
        where: {
          productId_branchId: {
            productId: receivedItem.productId,
            branchId: transfer.toBranchId
          }
        },
        update: {
          quantity: {
            increment: quantityReceived
          },
          lastRestockDate: new Date()
        },
        create: {
          productId: receivedItem.productId,
          branchId: transfer.toBranchId,
          quantity: quantityReceived,
          lastRestockDate: new Date()
        }
      });
      
      // ✅ تحديث المخزون في الفرع المُرسِل
      if (transfer.fromBranchId) {
        const fromInventory = await prisma.inventory.findUnique({
          where: {
            productId_branchId: {
              productId: receivedItem.productId,
              branchId: transfer.fromBranchId
            }
          }
        });
        
        // خصم الكمية المطلوبة أولاً (لو كانت تم خصمها مسبقاً عند الإرسال)
        // أو خصم الكمية المستلمة فعلياً
        const actualQuantityToDeduct = quantityRequested; // نفترض إن الكمية اتخصمت عند الإرسال
        
        if (fromInventory) {
          // لو في فرق، نعدل المخزون
          if (difference !== 0) {
            // لو نقص (استلم أقل): نرجع الفرق للمخزن المصدر
            // لو زيادة (استلم أكثر): نشيل الزيادة من المخزن المصدر
            await prisma.inventory.update({
              where: { id: fromInventory.id },
              data: {
                quantity: {
                  // لو نقص → نزود المخزن المصدر
                  // لو زيادة → ننقص من المخزن المصدر
                  increment: -difference // (requested - received) بالسالب = (received - requested)
                }
              }
            });
          } else {
            // لو مفيش فرق، نتأكد إن الكمية اتخصمت
            if (fromInventory.quantity >= quantityRequested) {
              // الكمية موجودة، مفيش تعديل مطلوب (افتراض إنها اتخصمت مسبقاً)
            }
          }
        }
      }
    }
    
    // إرسال إشعار للأدمن لو في فروقات
    if (hasAnyDiscrepancy) {
      const io = req.app.get('io');
      if (io) {
        io.emit('transfer-discrepancy', {
          transferId: transfer.id,
          transferNumber: transfer.transferNumber,
          fromBranch: transfer.fromBranch?.name || 'المخزن الرئيسي',
          toBranch: transfer.toBranch?.name,
          discrepancyType: discrepancyType === 'SHORTAGE' ? 'نقص' : 'زيادة',
          items: itemsWithDiscrepancy,
          message: `تم اكتشاف ${discrepancyType === 'SHORTAGE' ? 'نقص' : 'زيادة'} في التوريد ${transfer.transferNumber}`
        });
      }
    }
    
    res.json({
      success: true,
      data: updatedTransfer,
      message: hasAnyDiscrepancy 
        ? `تم تأكيد الاستلام مع وجود ${discrepancyType === 'SHORTAGE' ? 'نقص' : 'زيادة'} في الكمية. تم تحديث المخزون والأرقام بناءً على الكمية المستلمة فعلياً.`
        : 'تم تأكيد الاستلام وتحديث المخزون بنجاح',
      hasDiscrepancy: hasAnyDiscrepancy,
      discrepancyType: discrepancyType,
      discrepancyDetails: hasAnyDiscrepancy ? itemsWithDiscrepancy : null
    });
  } catch (error) {
    console.error('Error confirming receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm receipt',
      details: error.message
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
