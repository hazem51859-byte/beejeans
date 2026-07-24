-- ============================================
-- Add Transfer Item to امبابة الصغير Transfer
-- ============================================

-- أولاً: نشوف المنتج اللي موجود في فرع امبابة الصغير
-- (شغل الـ query ده الأول عشان تاخد الـ productId)

SELECT 
    p.id as product_id,
    p.name as product_name,
    p.barcode,
    p."costPrice" as cost_price,
    i.quantity as current_quantity,
    b.name as branch_name
FROM inventory i
JOIN products p ON i."productId" = p.id
JOIN branches b ON i."branchId" = b.id
WHERE b.code = 'IMBABA_SMALL'
ORDER BY i.quantity DESC;

-- ============================================
-- بعد ما تاخد الـ product_id من فوق، استخدمه هنا:
-- ============================================

-- نضيف الـ TransferItem
INSERT INTO transfer_items (
    id,
    "transferId",
    "productId",
    "quantityRequested",
    "quantityReceived",
    "createdAt",
    "updatedAt"
)
VALUES (
    gen_random_uuid(),  -- Generate new UUID
    'a86406ff-2434-4951-8bef-731e657a32c0',  -- Transfer ID
    'PASTE_PRODUCT_ID_HERE',  -- 👈 حط الـ Product ID من الـ query فوق
    500,  -- Quantity Requested
    500,  -- Quantity Received
    NOW(),
    NOW()
);

-- ============================================
-- للتأكد إن الـ item اتضاف:
-- ============================================

SELECT 
    t.id as transfer_id,
    fb.name as from_branch,
    tb.name as to_branch,
    t.status,
    ti.id as item_id,
    p.name as product_name,
    ti."quantityRequested",
    ti."quantityReceived",
    p."costPrice",
    (ti."quantityReceived" * p."costPrice") as total_value
FROM transfers t
JOIN branches fb ON t."fromBranchId" = fb.id
JOIN branches tb ON t."toBranchId" = tb.id
LEFT JOIN transfer_items ti ON ti."transferId" = t.id
LEFT JOIN products p ON ti."productId" = p.id
WHERE t.id = 'a86406ff-2434-4951-8bef-731e657a32c0';
