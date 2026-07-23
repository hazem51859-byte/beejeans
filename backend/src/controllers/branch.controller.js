const prisma = require('../config/database');
const { logActivity, ActivityActions } = require('../utils/activityLogger');

exports.createBranch = async (req, res, next) => {
  try {
    const { name, address, city, phone } = req.body;
    
    // Generate unique code from branch name
    const baseCode = name
      .replace(/\s+/g, '-')
      .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
      .toUpperCase()
      .substring(0, 10);
    
    // Generate unique URL
    const baseUrl = name
      .replace(/\s+/g, '-')
      .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
      .toLowerCase();
    
    // Ensure uniqueness
    let code = baseCode;
    let url = baseUrl;
    let counter = 1;
    
    while (await prisma.branch.findFirst({ where: { OR: [{ code }, { url }] } })) {
      code = `${baseCode}-${counter}`;
      url = `${baseUrl}-${counter}`;
      counter++;
    }
    
    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        url,
        address,
        city,
        phone,
        isActive: true
      }
    });
    
    // Log activity
    await logActivity({
      userId: req.user.id,
      action: ActivityActions.BRANCH_CREATE,
      entity: 'branch',
      entityId: branch.id,
      description: `Branch created: ${branch.name}`,
      metadata: { branchCode: branch.code, branchUrl: branch.url }
    });
    
    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
};

exports.getBranches = async (req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        _count: {
          select: { users: true, sales: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: branches });
  } catch (error) {
    next(error);
  }
};

exports.getBranchById = async (req, res, next) => {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
      include: {
        users: { select: { id: true, fullName: true, role: true } },
        _count: { select: { sales: true, inventory: true } }
      }
    });

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
};

exports.updateBranch = async (req, res, next) => {
  try {
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data: branch });
  } catch (error) {
    next(error);
  }
};

exports.deleteBranch = async (req, res, next) => {
  try {
    await prisma.branch.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    next(error);
  }
};
