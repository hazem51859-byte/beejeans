-- استعادة الفروع والمستخدمين
-- تشغيل هذا السكريبت في pgAdmin

-- إيقاف التحقق من المفاتيح الخارجية مؤقتاً
SET session_replication_role = 'replica';

-- حذف البيانات الموجودة
TRUNCATE TABLE "users" CASCADE;
TRUNCATE TABLE "branches" CASCADE;

-- استعادة الفروع (6 فروع)
INSERT INTO "branches" (id, name, code, url, address, phone, city, "isActive", "vaultBalance", "cardVaultBalance", "createdAt", "updatedAt") VALUES
('550e8400-e29b-41d4-a716-446655440000', 'المخزن الرئيسي', 'MAIN', 'http://localhost:3000/branch/MAIN', NULL, NULL, NULL, true, 0, 0, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440001', 'شبرا 1', 'SHOBRA1', 'http://localhost:3000/branch/SHOBRA1', NULL, NULL, NULL, true, 0, 0, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'شبرا الكبير', 'SHOBRA_KABIR', 'http://localhost:3000/branch/SHOBRA_KABIR', NULL, NULL, NULL, true, 0, 0, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'امبابه الكبير', 'IMBABA_KABIR', 'http://localhost:3000/branch/IMBABA_KABIR', NULL, NULL, NULL, true, 0, 0, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'امبابه الصغير', 'IMBABA_SAGHIR', 'http://localhost:3000/branch/IMBABA_SAGHIR', NULL, NULL, NULL, true, 0, 0, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'شبرا النص', 'SHOBRA_NOSS', 'http://localhost:3000/branch/SHOBRA_NOSS', NULL, NULL, NULL, true, 0, 0, NOW(), NOW());

-- استعادة المستخدمين (5 مستخدمين)
-- password hash لـ "admin123" هو: $2b$10$rJ5pV.QZ0JZK5Z5Z5Z5Z5uJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5
INSERT INTO "users" (id, username, email, password, "fullName", role, "branchId", "isActive", "createdAt", "updatedAt") VALUES
('660e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@beejeans.com', '$2b$10$rJ5pV.QZ0JZK5Z5Z5Z5Z5uJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'عبدالرحمن', 'ADMIN', '550e8400-e29b-41d4-a716-446655440000', true, NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440001', 'hema', 'hema@beejeans.com', '$2b$10$rJ5pV.QZ0JZK5Z5Z5Z5Z5uJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'ابراهيم', 'MANAGER', '550e8400-e29b-41d4-a716-446655440001', true, NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440002', 'mahmoud', 'mahmoud@beejeans.com', '$2b$10$rJ5pV.QZ0JZK5Z5Z5Z5Z5uJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'محمود كمال', 'CASHIER', '550e8400-e29b-41d4-a716-446655440002', true, NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440003', 'hassan', 'hassan@beejeans.com', '$2b$10$rJ5pV.QZ0JZK5Z5Z5Z5Z5uJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'حسن محمود', 'CASHIER', '550e8400-e29b-41d4-a716-446655440003', true, NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440004', 'mervat', 'mervat@beejeans.com', '$2b$10$rJ5pV.QZ0JZK5Z5Z5Z5Z5uJ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5', 'ميرفت', 'CASHIER', '550e8400-e29b-41d4-a716-446655440004', true, NOW(), NOW());

-- إعادة تفعيل التحقق من المفاتيح الخارجية
SET session_replication_role = 'origin';

-- التحقق من النتائج
SELECT 'Branches:' as info, COUNT(*) as count FROM branches
UNION ALL
SELECT 'Users:' as info, COUNT(*) as count FROM users;

SELECT 
  b.name as branch_name,
  b.code as branch_code,
  COUNT(u.id) as user_count
FROM branches b
LEFT JOIN users u ON u."branchId" = b.id
GROUP BY b.id, b.name, b.code
ORDER BY b.name;
