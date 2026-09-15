const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            sellingPrice: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category'
    });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, parentId, defaultCostPrice, defaultSellingPrice, attributes, serialStartNumber } = req.body;

    const category = await prisma.category.create({
      data: {
        name,
        description,
        parentId,
        defaultCostPrice: defaultCostPrice !== undefined && defaultCostPrice !== null ? parseFloat(defaultCostPrice) : null,
        defaultSellingPrice: defaultSellingPrice !== undefined && defaultSellingPrice !== null ? parseFloat(defaultSellingPrice) : null,
        attributes,
        serialStartNumber: serialStartNumber ? parseInt(serialStartNumber) : null,
        lastSerialUsed: serialStartNumber ? parseInt(serialStartNumber) - 1 : null // نبدأ من قبل الرقم الأول
      },
      include: {
        parent: true
      }
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parentId, defaultCostPrice, defaultSellingPrice, attributes, serialStartNumber } = req.body;

    // Get current category to check if serialStartNumber is being set for first time
    const currentCategory = await prisma.category.findUnique({
      where: { id }
    });

    const updateData = {
      name,
      description,
      parentId,
      defaultCostPrice: defaultCostPrice !== undefined && defaultCostPrice !== null ? parseFloat(defaultCostPrice) : null,
      defaultSellingPrice: defaultSellingPrice !== undefined && defaultSellingPrice !== null ? parseFloat(defaultSellingPrice) : null,
      attributes
    };

    // Only update serialStartNumber if it's being set for the first time
    if (serialStartNumber && !currentCategory.serialStartNumber) {
      updateData.serialStartNumber = parseInt(serialStartNumber);
      updateData.lastSerialUsed = parseInt(serialStartNumber) - 1;
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true
      }
    });

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    if (category._count.products > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with existing products'
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
};
