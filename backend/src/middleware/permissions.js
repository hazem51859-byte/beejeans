/**
 * Middleware للتحكم في صلاحيات العرض حسب الدور
 */

// الكاشير لا يقدر يشوف المخزون إلا لو في توريد
exports.checkInventoryAccess = async (req, res, next) => {
  const user = req.user;
  
  // Admin & Manager → دايماً مسموح
  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return next();
  }
  
  // Cashier → ممنوع
  if (user.role === 'CASHIER') {
    return res.status(403).json({
      success: false,
      error: 'الكاشير غير مسموح له بعرض المخزون'
    });
  }
  
  next();
};

// الكاشير لا يقدر يشوف المنتجات إلا لو في توريد
exports.checkProductsAccess = async (req, res, next) => {
  const user = req.user;
  
  // Admin & Manager → دايماً مسموح
  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return next();
  }
  
  // Cashier → ممنوع
  if (user.role === 'CASHIER') {
    return res.status(403).json({
      success: false,
      error: 'الكاشير غير مسموح له بعرض المنتجات'
    });
  }
  
  next();
};

// الكاشير يقدر يشوف فقط المنتجات في POS للبيع
exports.checkPOSAccess = (req, res, next) => {
  const user = req.user;
  
  // الكل مسموح (Admin, Manager, Cashier)
  if (['ADMIN', 'MANAGER', 'CASHIER'].includes(user.role)) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    error: 'غير مصرح'
  });
};

// فقط Manager يقدر يعدل المنتجات
exports.checkProductEditAccess = (req, res, next) => {
  const user = req.user;
  
  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    error: 'فقط المدير يمكنه تعديل المنتجات'
  });
};
