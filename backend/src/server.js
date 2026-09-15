require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth.routes');
const branchRoutes = require('./routes/branch.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const shiftRoutes = require('./routes/shift.routes');
const saleRoutes = require('./routes/sale.routes');
const reportRoutes = require('./routes/report.routes');
const userRoutes = require('./routes/user.routes');
const partnerRoutes = require('./routes/partner.routes');
const supplierRoutes = require('./routes/supplier.routes');
const expenseRoutes = require('./routes/expense.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const transferRoutes = require('./routes/transfer.routes');
const returnsRoutes = require('./routes/returns.routes');
const activityRoutes = require('./routes/activity.routes');
const adminRoutes = require('./routes/admin.routes');
const customerRoutes = require('./routes/customer.routes');
const cashierRoutes = require('./routes/cashier.routes');
const serialRoutes = require('./routes/serial.routes');
const vaultRoutes = require('./routes/vault.routes');
const fabricRoutes = require('./routes/fabric.routes');
const manufacturingRoutes = require('./routes/manufacturing.routes');
const officeInvoiceRoutes = require('./routes/officeInvoice.routes');
const officeCustomerRoutes = require('./routes/officeCustomer.routes');
const shipmentRoutes = require('./routes/shipment.routes');
const auditRoutes = require('./routes/audit.routes');
const wholesaleEmployeeRoutes = require('./routes/wholesaleEmployee.routes');
const errorHandler = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const initMainBranch = require('./utils/initMainBranch');

const app = express();
const server = http.createServer(app);

// Socket.io setup for real-time updates
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible in routes
app.set('io', io);

// Trust proxy for Railway deployment
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: true, // Allow all origins temporarily
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
app.use('/api/', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0'
  });
});

// API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/branches`, branchRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/shifts`, shiftRoutes);
app.use(`${API_PREFIX}/sales`, saleRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/partners`, partnerRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);
app.use(`${API_PREFIX}/purchases`, purchaseRoutes);
app.use(`${API_PREFIX}/transfers`, transferRoutes);
app.use(`${API_PREFIX}/returns`, returnsRoutes);
app.use(`${API_PREFIX}/activity`, activityRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/suppliers`, supplierRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/cashiers`, cashierRoutes);
app.use(`${API_PREFIX}/serials`, serialRoutes);
app.use(`${API_PREFIX}/vault`, vaultRoutes);
app.use(`${API_PREFIX}/fabric`, fabricRoutes);
app.use(`${API_PREFIX}/production`, manufacturingRoutes);
app.use(`${API_PREFIX}/office-invoices`, officeInvoiceRoutes);
app.use(`${API_PREFIX}/office-customers`, officeCustomerRoutes);
app.use(`${API_PREFIX}/shipments`, shipmentRoutes);
app.use(`${API_PREFIX}/audits`, auditRoutes);
app.use(`${API_PREFIX}/wholesale-employees`, wholesaleEmployeeRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Socket.io events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-branch', (branchId) => {
    socket.join(`branch-${branchId}`);
    console.log(`Socket ${socket.id} joined branch ${branchId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initMainBranch();
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}${API_PREFIX}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, io };
