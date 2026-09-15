const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all serials with filters (للأدمن)
exports.getAllSerials = async (req, res) => {
  try {
    const { page = 1, limit = 100, status, branchId, productId, search } = req.query;
    
    const where = {};
    
    // Non-admin users can only see their own branch serials
    if (req.user.role !== 'ADMIN') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      // Admin can filter by any branch
      where.branchId = branchId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (productId) {
      where.productId = productId;
    }
    
    if (search) {
      where.OR = [
        { serialNumber: { contains: search } },
        { product: { name: { contains: search } } }
      ];
    }
    
    const serials = await prisma.productSerial.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            color: true,
            size: true,
            costPrice: true,
            sellingPrice: true
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
        serialNumber: 'asc'
      },
      skip: (page - 1) * parseInt(limit),
      take: parseInt(limit)
    });
    
    const total = await prisma.productSerial.count({ where });
    
    res.json({
      success: true,
      data: serials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching serials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch serials'
    });
  }
};

// Export serials to Excel format (JSON)
exports.exportSerials = async (req, res) => {
  try {
    const { branchId, status, productId } = req.query;
    
    const where = {};
    
    if (branchId) {
      where.branchId = branchId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (productId) {
      where.productId = productId;
    }
    
    const serials = await prisma.productSerial.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            color: true,
            size: true,
            sellingPrice: true,
            costPrice: true
          }
        }
      },
      orderBy: {
        serialNumber: 'asc'
      }
    });
    
    // Format for Excel
    const excelData = serials.map(serial => ({
      'Serial Number': serial.serialNumber,
      'Product Name': serial.product.name,
      'Color': serial.product.color || '-',
      'Size': serial.product.size || '-',
      'Cost Price': serial.product.costPrice,
      'Selling Price': serial.product.sellingPrice,
      'Status': serial.status
    }));
    
    res.json({
      success: true,
      data: excelData,
      count: excelData.length
    });
  } catch (error) {
    console.error('Error exporting serials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export serials'
    });
  }
};

// Get serials for current user branch (للكاشيرات)
exports.getMySerials = async (req, res) => {
  try {
    const branchId = req.user.branchId;
    
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'User has no assigned branch'
      });
    }
    
    const { page = 1, limit = 50, status = 'AVAILABLE', search } = req.query;
    
    const where = {
      branchId,
      status
    };
    
    if (search) {
      where.OR = [
        { serialNumber: { contains: search } },
        { product: { name: { contains: search } } }
      ];
    }
    
    const serials = await prisma.productSerial.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            color: true,
            size: true,
            sellingPrice: true
          }
        }
      },
      orderBy: {
        serialNumber: 'asc'
      },
      skip: (page - 1) * parseInt(limit),
      take: parseInt(limit)
    });
    
    const total = await prisma.productSerial.count({ where });
    
    res.json({
      success: true,
      data: serials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching my serials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch serials'
    });
  }
};

// Register serial manually (كاشير يسجل سيريال يدوي)
exports.registerSerial = async (req, res) => {
  try {
    const { serialNumber, productId } = req.body;
    const branchId = req.user.branchId;
    const userId = req.user.id;
    
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'User has no assigned branch'
      });
    }
    
    // التحقق من عدم تكرار السيريال في أي مكان في النظام
    const existingSerial = await prisma.productSerial.findUnique({
      where: { serialNumber }
    });
    
    if (existingSerial) {
      return res.status(400).json({
        success: false,
        error: `السيريال ${serialNumber} موجود بالفعل في النظام ولا يمكن تكراره`
      });
    }
    
    const serial = await prisma.productSerial.create({
      data: {
        serialNumber,
        productId,
        branchId,
        registeredBy: userId,
        status: 'AVAILABLE'
      },
      include: {
        product: true
      }
    });
    
    res.status(201).json({
      success: true,
      data: serial
    });
  } catch (error) {
    console.error('Error registering serial:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register serial'
    });
  }
};

// Search serial by number
exports.searchSerial = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const userBranchId = req.user.branchId;
    const isAdmin = req.user.role === 'ADMIN';
    
    const serial = await prisma.productSerial.findUnique({
      where: { serialNumber },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            color: true,
            size: true,
            sellingPrice: true,
            costPrice: true,
            categoryId: true
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
    
    if (!serial) {
      return res.status(404).json({
        success: false,
        error: 'السيريال غير موجود'
      });
    }
    
    // Check if serial belongs to user's branch (non-admin)
    if (!isAdmin && serial.branchId !== userBranchId) {
      return res.status(403).json({
        success: false,
        error: 'هذا السيريال ليس في فرعك'
      });
    }
    
    // Check if serial is available for sale
    if (serial.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        error: `هذا السيريال ${serial.status === 'SOLD' ? 'مباع بالفعل' : serial.status === 'RETURNED' ? 'مرتجع' : 'غير متاح'}`
      });
    }
    
    // Return product with serial number
    res.json({
      success: true,
      data: {
        ...serial.product,
        serialNumber: serial.serialNumber,
        serialId: serial.id
      }
    });
  } catch (error) {
    console.error('Error searching serial:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search serial'
    });
  }
};

// Check if serial number is available (قبل التسجيل)
exports.checkSerialAvailability = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    
    const existing = await prisma.productSerial.findUnique({
      where: { serialNumber },
      include: {
        branch: { select: { name: true } },
        product: { select: { name: true } }
      }
    });
    
    if (existing) {
      return res.json({
        success: true,
        available: false,
        message: `السيريال موجود بالفعل في ${existing.branch?.name || 'النظام'} - ${existing.product.name}`,
        existingSerial: {
          serialNumber: existing.serialNumber,
          productName: existing.product.name,
          branchName: existing.branch?.name,
          status: existing.status
        }
      });
    }
    
    res.json({
      success: true,
      available: true,
      message: 'السيريال متاح للاستخدام'
    });
  } catch (error) {
    console.error('Error checking serial availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check serial availability'
    });
  }
};

module.exports = exports;
