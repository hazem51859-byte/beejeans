-- Add wallet balance to branches table
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
