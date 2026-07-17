# Bee 🐝 JEANS - POS System | نظام نقاط البيع

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

**نظام نقاط بيع احترافي ومتكامل خاص بـ Bee 🐝 JEANS**  
إدارة شاملة لجميع فروع Bee 🐝 JEANS مع نظام POS متطور

## ✨ المميزات الرئيسية

✅ **إدارة مركزية** - راقب جميع فروعك من مكان واحد  
✅ **نظام POS كامل** - واجهة كاشير سريعة وسهلة الاستخدام  
✅ **إدارة المخزون** - تتبع المخزون لكل فرع بشكل منفصل  
✅ **نظام الشيفتات** - محاسبة دقيقة لكل كاشير  
✅ **تقارير تفصيلية** - إحصائيات وتحليلات شاملة  
✅ **عمل Offline** - استمر في البيع حتى بدون إنترنت  
✅ **تحديثات لحظية** - مزامنة فورية عبر WebSocket  
✅ **آمن ومشفر** - JWT Authentication + Role-based Access  

## 🎥 نظرة سريعة

```
┌─────────────────────────────────────────────────┐
│  🏢 Admin Dashboard  │  📱 POS Terminals       │
│  (من البيت/المكتب)   │  (في كل فرع)           │
└──────────┬──────────────────────┬───────────────┘
           │                      │
           ▼                      ▼
    ┌──────────────────────────────────┐
    │   🔄 Backend API + PostgreSQL    │
    │   (المزامنة المركزية)            │
    └──────────────────────────────────┘
```

## 📁 Project Structure

```
pos-system/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/         # Database & App Config
│   │   ├── controllers/    # Business Logic
│   │   ├── models/         # Database Models
│   │   ├── routes/         # API Routes
│   │   ├── middleware/     # Auth & Validation
│   │   ├── services/       # Business Services
│   │   └── utils/          # Helper Functions
│   ├── prisma/             # Database Schema
│   └── package.json
│
├── frontend-pos/           # React + Electron (للفروع)
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── pages/          # App Pages
│   │   ├── store/          # State Management
│   │   ├── services/       # API Calls
│   │   └── db/             # SQLite Local DB
│   └── package.json
│
├── admin-dashboard/        # React Admin Panel
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
│
└── shared/                 # Shared Types & Utils
    └── types/

```

## 🚀 Tech Stack

### Backend
- **Node.js** + **Express.js**
- **PostgreSQL** (قاعدة البيانات المركزية)
- **Prisma ORM** (إدارة قاعدة البيانات)
- **JWT** (المصادقة)
- **Socket.io** (التحديثات اللحظية)
- **Redis** (Caching)

### Frontend (POS)
- **React 18**
- **Electron** (Desktop App)
- **SQLite** (قاعدة بيانات محلية)
- **TailwindCSS**
- **Zustand** (State Management)
- **React Query**

### Admin Dashboard
- **React 18**
- **Vite**
- **TailwindCSS**
- **Recharts** (الرسوم البيانية)

## 🎯 Core Features

### POS (نقطة البيع)
- ✅ واجهة كاشير سريعة
- ✅ بحث المنتجات بالباركود
- ✅ إدارة سلة المشتريات
- ✅ طرق دفع متعددة (نقدي، بطاقة، آجل)
- ✅ طباعة الفواتير
- ✅ يعمل Offline
- ✅ مزامنة تلقائية

### إدارة الشيفتات
- ✅ فتح/إغلاق الشيفت
- ✅ تسجيل المبلغ الافتتاحي
- ✅ حساب المبيعات والخصومات
- ✅ تقرير نهاية الشيفت

### إدارة المخزون
- ✅ إضافة/تعديل المنتجات
- ✅ تتبع الكميات
- ✅ تنبيهات إعادة الطلب
- ✅ نقل البضاعة بين الفروع

### التقارير
- ✅ مبيعات يومية/أسبوعية/شهرية
- ✅ أداء الكاشيرات
- ✅ تقارير المخزون
- ✅ أكثر المنتجات مبيعاً
- ✅ الأرباح والخسائر

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npx prisma migrate dev
npm run dev
```

### Frontend POS Setup
```bash
cd frontend-pos
npm install
npm run dev
```

### Admin Dashboard Setup
```bash
cd admin-dashboard
npm install
npm run dev
```

## 🔐 Security Features
- JWT Authentication
- Role-based Access Control (Admin, Manager, Cashier)
- API Rate Limiting
- SQL Injection Protection
- XSS Protection

## 📱 Offline Support
- كل فرع يشتغل بشكل مستقل
- قاعدة بيانات SQLite محلية
- مزامنة تلقائية عند عودة الإنترنت
- Conflict Resolution Strategy

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

### Sales
- `POST /api/sales/create`
- `GET /api/sales/:id`
- `GET /api/sales/branch/:branchId`

### Products
- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### Shifts
- `POST /api/shifts/open`
- `POST /api/shifts/close`
- `GET /api/shifts/current`

### Reports
- `GET /api/reports/daily/:branchId`
- `GET /api/reports/cashier/:cashierId`
- `GET /api/reports/inventory/:branchId`

## 📊 Database Schema
انظر `backend/prisma/schema.prisma` للتفاصيل الكاملة

## 🤝 Contributing
هذا مشروع خاص. للأسئلة أو المساعدة، تواصل مع الإدارة.

## 📄 License
Proprietary - All Rights Reserved
