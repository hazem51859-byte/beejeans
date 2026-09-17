-- AlterTable
ALTER TABLE "vault_transactions" ADD COLUMN     "vaultId" TEXT;

-- CreateTable
CREATE TABLE "vaults" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vaults_name_key" ON "vaults"("name");

-- CreateIndex
CREATE INDEX "vaults_type_idx" ON "vaults"("type");

-- CreateIndex
CREATE INDEX "vaults_isActive_idx" ON "vaults"("isActive");

-- CreateIndex
CREATE INDEX "vault_transactions_vaultId_idx" ON "vault_transactions"("vaultId");

-- AddForeignKey
ALTER TABLE "vault_transactions" ADD CONSTRAINT "vault_transactions_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;
