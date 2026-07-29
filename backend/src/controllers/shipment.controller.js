const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// جلب كل الشحنات
exports.getAllShipments = async (req, res) => {
  try {
    const { status, startDate, endDate, shipmentCompany } = req.query;

    const where = {};
    
    if (status) where.status = status;
    if (shipmentCompany) where.shipmentCompany = { contains: shipmentCompany };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        invoice: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(shipments);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
};

// جلب شحنة واحدة
exports.getShipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            items: {
              include: {
                product: true
              }
            },
            customer: true
          }
        }
      }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    res.json(shipment);
  } catch (error) {
    console.error('Error fetching shipment:', error);
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
};

// تحديث حالة الشحنة
exports.updateShipmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      shippedAt,
      estimatedDelivery,
      deliveredAt,
      trackingNotes,
      shipmentCompany,
      shipmentBill
    } = req.body;
    
    const userId = req.user.id;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { invoice: true }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const updateData = {
      status,
      trackingNotes,
      updatedBy: userId
    };

    // تحديث بيانات الشحن إذا تم إرسالها
    if (shipmentCompany) updateData.shipmentCompany = shipmentCompany;
    if (shipmentBill) updateData.shipmentBill = shipmentBill;

    if (shippedAt) updateData.shippedAt = new Date(shippedAt);
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);
    if (deliveredAt) updateData.deliveredAt = new Date(deliveredAt);

    const updated = await prisma.shipment.update({
      where: { id },
      data: updateData,
      include: {
        invoice: true
      }
    });

    // تحديث حالة الفاتورة
    if (status === 'DELIVERED') {
      await prisma.officeInvoice.update({
        where: { id: shipment.invoiceId },
        data: { status: 'DELIVERED' }
      });
    } else if (status === 'SHIPPED' || status === 'IN_TRANSIT') {
      await prisma.officeInvoice.update({
        where: { id: shipment.invoiceId },
        data: { status: 'SHIPPED' }
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating shipment status:', error);
    res.status(500).json({ error: 'Failed to update shipment status' });
  }
};

// تأكيد استلام الدفع من شركة الشحن
exports.confirmPaymentCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const { collectedAmount, paymentCollectedAt } = req.body;
    const userId = req.user.id;

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { invoice: true }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const updated = await prisma.shipment.update({
      where: { id },
      data: {
        paymentCollected: true,
        collectedAmount: collectedAmount || shipment.invoice.total,
        paymentCollectedAt: paymentCollectedAt ? new Date(paymentCollectedAt) : new Date(),
        updatedBy: userId
      }
    });

    // تحديث دفعات الفاتورة وإضافة للخزينة
    const invoice = await prisma.officeInvoice.findUnique({
      where: { id: shipment.invoiceId }
    });

    const amountToAdd = collectedAmount || invoice.total - invoice.paidAmount;

    if (amountToAdd > 0) {
      const newPaidAmount = invoice.paidAmount + amountToAdd;
      const newRemaining = invoice.total - newPaidAmount;

      await prisma.officeInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? 'COMPLETED' : invoice.status
        }
      });

      // إضافة للخزينة الرئيسية
      const mainWarehouse = await prisma.branch.findFirst({
        where: { code: 'MAIN' }
      });

      if (mainWarehouse) {
        const paymentMethod = invoice.paymentMethod || 'CASH';
        const vaultField = paymentMethod === 'CASH' ? 'vaultBalance' : 'cardVaultBalance';
        
        await prisma.branch.update({
          where: { id: mainWarehouse.id },
          data: {
            [vaultField]: {
              increment: amountToAdd
            }
          }
        });

        await prisma.vaultTransaction.create({
          data: {
            branchId: mainWarehouse.id,
            type: paymentMethod === 'CASH' ? 'CASH_DEPOSIT' : 'CARD_PAYMENT',
            amount: amountToAdd,
            description: `تحصيل من شركة شحن - ${invoice.invoiceNumber}`,
            notes: `شحنة ${shipment.shipmentNumber} - ${shipment.shipmentCompany}`,
            createdBy: userId,
            balanceBefore: mainWarehouse[vaultField],
            balanceAfter: mainWarehouse[vaultField] + amountToAdd
          }
        });
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Error confirming payment collection:', error);
    res.status(500).json({ error: 'Failed to confirm payment collection' });
  }
};

// تحديث معلومات الشحنة
exports.updateShipmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      shipmentCompany,
      shipmentBill,
      customerAddress,
      estimatedDelivery,
      notes
    } = req.body;
    
    const userId = req.user.id;

    const updated = await prisma.shipment.update({
      where: { id },
      data: {
        shipmentCompany,
        shipmentBill,
        customerAddress,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        notes,
        updatedBy: userId
      },
      include: {
        invoice: true
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating shipment details:', error);
    res.status(500).json({ error: 'Failed to update shipment details' });
  }
};
