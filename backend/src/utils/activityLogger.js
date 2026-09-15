const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * تسجيل نشاط المستخدم في قاعدة البيانات
 */
async function logActivity({
  userId,
  action,
  entity = null,
  entityId = null,
  description,
  metadata = null,
  ipAddress = null,
  userAgent = null,
  branchId = null
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent,
        branchId
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // لا نريد أن يفشل الطلب بسبب فشل التسجيل
  }
}

/**
 * Actions types
 */
const ActivityActions = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  
  // Shift Management
  SHIFT_OPEN: 'SHIFT_OPEN',
  SHIFT_CLOSE: 'SHIFT_CLOSE',
  
  // Sales
  SALE_CREATE: 'SALE_CREATE',
  SALE_RETURN: 'SALE_RETURN',
  
  // Products
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  PRODUCT_DELETE: 'PRODUCT_DELETE',
  
  // Inventory
  INVENTORY_ADJUST: 'INVENTORY_ADJUST',
  INVENTORY_RECEIVE: 'INVENTORY_RECEIVE',
  
  // Transfers
  TRANSFER_CREATE: 'TRANSFER_CREATE',
  TRANSFER_SEND: 'TRANSFER_SEND',
  TRANSFER_RECEIVE: 'TRANSFER_RECEIVE',
  TRANSFER_RECEIVE_WITH_DISCREPANCY: 'TRANSFER_RECEIVE_WITH_DISCREPANCY',
  TRANSFER_CANCEL: 'TRANSFER_CANCEL',
  
  // Purchases
  PURCHASE_CREATE: 'PURCHASE_CREATE',
  
  // Expenses
  EXPENSE_CREATE: 'EXPENSE_CREATE',
  
  // Branch Management
  BRANCH_CREATE: 'BRANCH_CREATE',
  BRANCH_UPDATE: 'BRANCH_UPDATE',
  BRANCH_DELETE: 'BRANCH_DELETE',
  
  // User Management
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  
  // Partners
  PARTNER_CREATE: 'PARTNER_CREATE',
  PARTNER_UPDATE: 'PARTNER_UPDATE',
  
  // Vault & Money Management
  DRAWER_CLEARED: 'DRAWER_CLEARED',
  MONEY_SENT: 'MONEY_SENT',
  MONEY_RECEIVED: 'MONEY_RECEIVED',
  MONEY_CANCELLED: 'MONEY_CANCELLED'
};

module.exports = {
  logActivity,
  ActivityActions
};
