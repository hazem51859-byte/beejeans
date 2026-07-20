const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');
const prisma = require('../config/database');

const router = express.Router();
router.use(authenticate);

// GET all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id }
    });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create supplier
router.post('/',
  authorize('ADMIN', 'MANAGER'),
  [
    body('name').notEmpty().withMessage('Name is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const supplier = await prisma.supplier.create({ data: req.body });
      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT update supplier
router.put('/:id', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE supplier
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST record payment
router.post('/:id/payment', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { amount, paymentMethod = 'CASH', referenceNumber, notes, purchaseId } = req.body;
    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    
    const result = await prisma.$transaction(async (tx) => {
      // إنشاء الدفعة
      const payment = await tx.supplierPayment.create({
        data: {
          supplierId: req.params.id,
          purchaseId: purchaseId || null, // ربط بفاتورة محددة (اختياري)
          amount: parseFloat(amount),
          paymentMethod,
          referenceNumber,
          notes,
          createdBy: req.user.id
        }
      });
      
      // تحديث المورد
      const updated = await tx.supplier.update({
        where: { id: req.params.id },
        data: {
          totalPaid: (supplier.totalPaid || 0) + parseFloat(amount),
          balance: (supplier.balance || 0) - parseFloat(amount),
          notes: notes || supplier.notes
        }
      });
      
      // إذا كانت الدفعة مرتبطة بفاتورة محددة، حدث paidAmount في الفاتورة
      if (purchaseId) {
        const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } });
        if (purchase) {
          const newPaidAmount = purchase.paidAmount + parseFloat(amount);
          const newRemainingAmount = purchase.totalAmount - newPaidAmount;
          const newPaymentStatus = newRemainingAmount <= 0 ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'PENDING');
          
          await tx.purchase.update({
            where: { id: purchaseId },
            data: {
              paidAmount: newPaidAmount,
              remainingAmount: newRemainingAmount,
              paymentStatus: newPaymentStatus
            }
          });
        }
      } else {
        // إذا لم تُحدد فاتورة، وزع الدفعة على أقدم الفواتير غير المدفوعة
        const unpaidPurchases = await tx.purchase.findMany({
          where: {
            supplierId: req.params.id,
            remainingAmount: { gt: 0 }
          },
          orderBy: { purchaseDate: 'asc' }
        });
        
        let remainingPayment = parseFloat(amount);
        for (const purchase of unpaidPurchases) {
          if (remainingPayment <= 0) break;
          
          const paymentForThisPurchase = Math.min(remainingPayment, purchase.remainingAmount);
          const newPaidAmount = purchase.paidAmount + paymentForThisPurchase;
          const newRemainingAmount = purchase.totalAmount - newPaidAmount;
          const newPaymentStatus = newRemainingAmount <= 0 ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'PENDING');
          
          await tx.purchase.update({
            where: { id: purchase.id },
            data: {
              paidAmount: newPaidAmount,
              remainingAmount: newRemainingAmount,
              paymentStatus: newPaymentStatus
            }
          });
          
          remainingPayment -= paymentForThisPurchase;
        }
      }
      
      return { payment, supplier: updated };
    });
    
    res.json({ success: true, data: result.supplier, payment: result.payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
