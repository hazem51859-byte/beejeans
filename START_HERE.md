# 🎯 ابدأ من هنا - START HERE

## Bee 🐝 JEANS - نظام نقاط البيع

---

## 🚀 اختر طريقة التشغيل

### **الخيار 1: تشغيل محلي (للتجربة السريعة)** ⚡

**الأسرع - 5 دقائق**

✅ **متطلبات:**
- Node.js
- PostgreSQL

📝 **اتبع:**
→ افتح ملف `INSTALLATION.md`

---

### **الخيار 2: Cloud مجاني (للاستخدام الفعلي)** ☁️

**الأفضل - متاح من أي مكان - مجاني 100%**

✅ **متطلبات:**
- حساب GitHub
- حساب Render.com

📝 **اتبع:**
→ افتح ملف `QUICK_DEPLOY_AR.md`

**أو للدليل الكامل:**
→ افتح ملف `DEPLOY_GUIDE.md`

---

## 📚 الملفات المهمة

| الملف | الوصف |
|------|-------|
| `README.md` | نظرة عامة على المشروع |
| `INSTALLATION.md` | دليل التثبيت المحلي التفصيلي |
| `QUICK_START_AR.md` | البدء السريع بعد التثبيت |
| `QUICK_DEPLOY_AR.md` | النشر السريع على Cloud ⭐ |
| `DEPLOY_GUIDE.md` | دليل النشر الكامل |
| `API_DOCUMENTATION.md` | توثيق الـ API |
| `PROJECT_SUMMARY.md` | ملخص فني للمشروع |
| `FEATURES_CHECKLIST.md` | قائمة المميزات |

---

## 🎬 الخطوات السريعة

### **للتشغيل المحلي:**

```bash
# 1. Backend
cd backend
npm install
copy .env.example .env
# عدل .env
npx prisma migrate dev
npm run seed
npm run dev

# 2. Frontend (في terminal جديد)
cd frontend-pos
npm install
copy .env.example .env
npm run dev

# 3. افتح: http://localhost:3000
# Login: admin / admin123
```

---

### **للنشر على Cloud:**

```bash
# 1. ارفع على GitHub
git init
git add .
git commit -m "Initial commit"
git push

# 2. سجل في Render.com
https://render.com

# 3. أنشئ Database + Web Service
اتبع: QUICK_DEPLOY_AR.md

# 4. تم! 🎉
https://bee-jeans-backend.onrender.com
```

---

## 💡 نصيحة

**للمبتدئين:**
- ابدأ بالتشغيل المحلي أولاً
- جرب النظام
- ثم انشره على Cloud

**للمحترفين:**
- انشر مباشرة على Cloud
- استخدم CI/CD

---

## 🆘 محتاج مساعدة؟

### مشكلة في التثبيت؟
→ راجع `INSTALLATION.md` قسم "استكشاف الأخطاء"

### مشكلة في النشر؟
→ راجع `DEPLOY_GUIDE.md` قسم "حل المشاكل"

### عايز تفهم النظام؟
→ اقرأ `PROJECT_SUMMARY.md`

---

## 🎯 الأهداف

- [x] بناء نظام POS متكامل ✅
- [x] Support متعدد الفروع ✅
- [x] Real-time updates ✅
- [x] Cloud deployment ✅
- [x] توثيق شامل ✅

---

## 📞 الدعم

**التوثيق:**
- كل ملفات `.md` في المشروع

**الكود:**
- Backend: `backend/src/`
- Frontend: `frontend-pos/src/`
- Database: `backend/prisma/schema.prisma`

---

## 🎉 البداية

**جاهز؟ يلا ابدأ!**

1. اختر: محلي أو Cloud
2. اتبع الدليل المناسب
3. استمتع بالنظام!

---

**Bee 🐝 JEANS - صنع بـ ❤️ في مصر**

🚀 **Let's Go!**
