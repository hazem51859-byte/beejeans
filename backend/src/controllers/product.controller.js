const prisma = require('../config/database');

exports.createProduct = async (req, res, next) => {
  try {
    // Remove categoryId if it's empty or null
    const data = { ...req.body };
    if (!data.categoryId) {
      delete data.categoryId;
    }
    
    const product = await prisma.product.create({
      data,
      include: { category: true }
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, categoryId, status } = req.query;
    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { name: 'asc' }
    });

    const total = await prisma.product.count({ where });
    
    // إخفاء سعر الشراء وسعر الجملة عن الكاشير (فقط الأدمن والمانجر يشوفوهم)
    const userRole = req.user?.role;
    const sanitizedProducts = products.map(product => {
      if (userRole === 'CASHIER') {
        const { costPrice, sellingPrice, ...productWithoutCost } = product;
        return productWithoutCost;
      }
      return product;
    });

    res.json({
      success: true,
      data: sanitizedProducts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

exports.searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } }
        ],
        status: 'ACTIVE'
      },
      include: { category: true },
      take: 20
    });
    
    // إخفاء سعر الشراء وسعر الجملة عن الكاشير
    const userRole = req.user?.role;
    const sanitizedProducts = products.map(product => {
      if (userRole === 'CASHIER') {
        const { costPrice, sellingPrice, ...productWithoutCost } = product;
        return productWithoutCost;
      }
      return product;
    });

    res.json({ success: true, data: sanitizedProducts });
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, inventory: true }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    // إخفاء سعر الشراء وسعر الجملة عن الكاشير
    const userRole = req.user?.role;
    if (userRole === 'CASHIER') {
      const { costPrice, sellingPrice, ...productWithoutCost } = product;
      return res.json({ success: true, data: productWithoutCost });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    // Remove categoryId if it's empty or null
    const data = { ...req.body };
    if (!data.categoryId) {
      delete data.categoryId;
    }
    
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { category: true }
    });
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};
