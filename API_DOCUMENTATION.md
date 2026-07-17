# 📡 API Documentation - توثيق الـ API

Base URL: `http://localhost:5000/api/v1`

---

## 🔐 Authentication

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@pos.com",
      "fullName": "مدير النظام",
      "role": "ADMIN",
      "branchId": null,
      "branch": null
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer {token}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer {token}
```

### Change Password
```http
PUT /auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

---

## 🏢 Branches

### Get All Branches
```http
GET /branches
Authorization: Bearer {token}
```

### Get Branch by ID
```http
GET /branches/:id
Authorization: Bearer {token}
```

### Create Branch (Admin Only)
```http
POST /branches
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "فرع الإسكندرية",
  "code": "ALX",
  "address": "شارع فؤاد، الإسكندرية",
  "phone": "0333456789",
  "city": "الإسكندرية"
}
```

### Update Branch
```http
PUT /branches/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "فرع الإسكندرية المحدث",
  "phone": "0333456790"
}
```

### Delete Branch
```http
DELETE /branches/:id
Authorization: Bearer {token}
```

---

## 📦 Products

### Get All Products
```http
GET /products?page=1&limit=20&categoryId=uuid&status=ACTIVE
Authorization: Bearer {token}
```

### Search Products
```http
GET /products/search?q=قميص
Authorization: Bearer {token}
```

### Get Product by ID
```http
GET /products/:id
Authorization: Bearer {token}
```

### Create Product (Manager/Admin)
```http
POST /products
Authorization: Bearer {token}
Content-Type: application/json

{
  "sku": "MEN-SHIRT-002",
  "barcode": "1234567890010",
  "name": "قميص رجالي كاجوال",
  "description": "قميص قطن 100%",
  "categoryId": "category_uuid",
  "costPrice": 120,
  "sellingPrice": 200,
  "size": "XL",
  "color": "أزرق",
  "brand": "Brand Name",
  "taxRate": 14,
  "reorderLevel": 10
}
```

### Update Product
```http
PUT /products/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "sellingPrice": 220,
  "status": "ACTIVE"
}
```

### Delete Product
```http
DELETE /products/:id
Authorization: Bearer {token}
```

---

## 📊 Inventory

### Get Inventory by Branch
```http
GET /inventory/branch/:branchId?page=1&limit=50
Authorization: Bearer {token}
```

### Get Inventory by Product
```http
GET /inventory/product/:productId
Authorization: Bearer {token}
```

### Get Low Stock Items
```http
GET /inventory/low-stock/:branchId
Authorization: Bearer {token}
```

### Adjust Inventory
```http
PUT /inventory/:id/adjust
Authorization: Bearer {token}
Content-Type: application/json

{
  "adjustment": 10,  // positive for increase, negative for decrease
  "reason": "إعادة جرد"
}
```

---

## 💰 Sales

### Create Sale
```http
POST /sales
Authorization: Bearer {token}
Content-Type: application/json

{
  "branchId": "branch_uuid",
  "shiftId": "shift_uuid",
  "items": [
    {
      "productId": "product_uuid",
      "quantity": 2,
      "unitPrice": 250,
      "discount": 0
    }
  ],
  "paymentMethod": "CASH",
  "amountPaid": 500,
  "customerName": "أحمد محمد",
  "customerPhone": "01234567890",
  "discountAmount": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sale created successfully",
  "data": {
    "id": "sale_uuid",
    "invoiceNumber": "INV-20240116-MAD-00001",
    "subtotal": 500,
    "taxAmount": 70,
    "total": 570,
    "changeAmount": 0,
    "items": [...],
    "cashier": {...},
    "branch": {...}
  }
}
```

### Get Sale by ID
```http
GET /sales/:id
Authorization: Bearer {token}
```

### Get Sale by Invoice Number
```http
GET /sales/invoice/:invoiceNumber
Authorization: Bearer {token}
```

### Get Sales by Branch
```http
GET /sales/branch/:branchId?page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31&status=COMPLETED
Authorization: Bearer {token}
```

### Get Sales by Shift
```http
GET /sales/shift/:shiftId
Authorization: Bearer {token}
```

### Refund Sale (Manager/Admin)
```http
PUT /sales/:id/refund
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "عيب في المنتج"
}
```

---

## 🕐 Shifts

### Open Shift
```http
POST /shifts/open
Authorization: Bearer {token}
Content-Type: application/json

{
  "branchId": "branch_uuid",
  "openingBalance": 1000
}
```

### Close Shift
```http
POST /shifts/:id/close
Authorization: Bearer {token}
Content-Type: application/json

{
  "actualCash": 5420,
  "notes": "شيفت ممتاز"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Shift closed successfully",
  "data": {
    "id": "shift_uuid",
    "shiftNumber": "20240116-MAD-001",
    "openingBalance": 1000,
    "closingBalance": 5420,
    "expectedCash": 5450,
    "actualCash": 5420,
    "cashDifference": -30,
    "totalSales": 4520,
    "totalTransactions": 15,
    "status": "CLOSED"
  }
}
```

### Get Current Shift
```http
GET /shifts/current
Authorization: Bearer {token}
```

### Get Shift by ID
```http
GET /shifts/:id
Authorization: Bearer {token}
```

### Get Shifts by Branch
```http
GET /shifts/branch/:branchId?page=1&limit=20&status=CLOSED
Authorization: Bearer {token}
```

---

## 📈 Reports

### Daily Report
```http
GET /reports/daily/:branchId?date=2024-01-16
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-16",
    "totalSales": 15420,
    "totalTax": 2158.8,
    "totalDiscount": 200,
    "transactionCount": 42,
    "paymentBreakdown": [
      {
        "paymentMethod": "CASH",
        "_sum": { "total": 12000 },
        "_count": 35
      },
      {
        "paymentMethod": "CARD",
        "_sum": { "total": 3420 },
        "_count": 7
      }
    ]
  }
}
```

### Sales Summary
```http
GET /reports/sales-summary?branchId=uuid&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

### Cashier Performance
```http
GET /reports/cashier-performance/:cashierId?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

### Top Products
```http
GET /reports/top-products/:branchId?limit=10&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

### Inventory Status
```http
GET /reports/inventory-status/:branchId
Authorization: Bearer {token}
```

---

## 👥 Users

### Get All Users
```http
GET /users?branchId=uuid&role=CASHIER
Authorization: Bearer {token}
```

### Get User by ID
```http
GET /users/:id
Authorization: Bearer {token}
```

### Create User (Admin/Manager)
```http
POST /users
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "cashier3",
  "email": "cashier3@pos.com",
  "password": "cashier123",
  "fullName": "محمد أحمد",
  "phone": "01234567894",
  "role": "CASHIER",
  "branchId": "branch_uuid"
}
```

### Update User
```http
PUT /users/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "fullName": "محمد أحمد المحدث",
  "phone": "01234567895",
  "isActive": true
}
```

### Delete User
```http
DELETE /users/:id
Authorization: Bearer {token}
```

---

## 🔒 Authorization

### User Roles

| Role | Permissions |
|------|------------|
| **ADMIN** | كل الصلاحيات على كل الفروع |
| **MANAGER** | إدارة الفرع المخصص له فقط |
| **CASHIER** | نقطة البيع والاستعلام فقط |

### Permission Matrix

| Action | Admin | Manager | Cashier |
|--------|-------|---------|---------|
| Create Sale | ✅ | ✅ | ✅ |
| View Sales | ✅ All | ✅ Branch | ✅ Own |
| Refund Sale | ✅ | ✅ | ❌ |
| Manage Products | ✅ | ✅ | ❌ |
| Manage Inventory | ✅ | ✅ | ❌ |
| Open/Close Shift | ✅ | ✅ | ✅ |
| View Reports | ✅ All | ✅ Branch | ❌ |
| Manage Users | ✅ | ✅ Branch | ❌ |
| Manage Branches | ✅ | ❌ | ❌ |

---

## 🌐 WebSocket Events

The system uses Socket.io for real-time updates.

### Client Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

// Join branch room
socket.emit('join-branch', branchId);
```

### Server Events

#### New Sale
```javascript
socket.on('new-sale', (data) => {
  console.log('New sale:', data);
  // { saleId, invoiceNumber, total, timestamp }
});
```

#### Shift Opened
```javascript
socket.on('shift-opened', (shift) => {
  console.log('Shift opened:', shift);
});
```

#### Shift Closed
```javascript
socket.on('shift-closed', (shift) => {
  console.log('Shift closed:', shift);
});
```

#### Sale Refunded
```javascript
socket.on('sale-refunded', (data) => {
  console.log('Sale refunded:', data);
  // { saleId, invoiceNumber }
});
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "username",
      "message": "Username is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "A record with this value already exists",
  "field": ["username"]
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 🔄 Rate Limiting

- **General API:** 100 requests per 15 minutes
- **Auth Login:** 5 attempts per 15 minutes

---

## 📝 Notes

1. All dates should be in ISO 8601 format
2. All monetary values are in Egyptian Pounds (EGP)
3. Prices use 2 decimal places
4. Tax rates use 2 decimal places (e.g., 14.00 for 14%)
5. All responses include `success` boolean field

---

## 🧪 Testing with cURL

### Login Example
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Get Products Example
```bash
curl -X GET http://localhost:5000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Sale Example
```bash
curl -X POST http://localhost:5000/api/v1/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "branchId": "branch_uuid",
    "shiftId": "shift_uuid",
    "items": [{"productId": "product_uuid", "quantity": 1, "unitPrice": 250}],
    "paymentMethod": "CASH",
    "amountPaid": 300
  }'
```

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Socket.io Documentation](https://socket.io/docs/)

---

Made with ❤️ for Multi-Branch POS System
