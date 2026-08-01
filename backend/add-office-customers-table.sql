-- Migration: Add office_customers table for tracking regular and shipment customers

CREATE TABLE IF NOT EXISTS office_customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL, -- REGULAR or SHIPMENT
  
  -- Statistics
  "totalInvoices" INTEGER DEFAULT 0 NOT NULL,
  "totalSales" DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "totalPaid" DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "lastInvoiceDate" TIMESTAMP,
  
  -- Additional data
  "shipmentCompany" VARCHAR(255),
  address TEXT,
  notes TEXT,
  
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "office_customers_phone_idx" ON office_customers(phone);
CREATE INDEX IF NOT EXISTS "office_customers_type_idx" ON office_customers(type);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ office_customers table created successfully!';
END $$;
