-- CreateEnum
CREATE TYPE "PrinterType" AS ENUM ('PRUSA', 'BAMBU');

-- CreateEnum
CREATE TYPE "GcodePrintJobStatus" AS ENUM ('STORED', 'DISPATCHED', 'DISPATCH_FAILED');

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PrinterType" NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "authToken" TEXT,
    "serialNumber" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GcodePrintJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "fileHashSha256" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "status" "GcodePrintJobStatus" NOT NULL DEFAULT 'STORED',
    "dispatchResponse" TEXT,
    "dispatchError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GcodePrintJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Printer_ipAddress_key" ON "Printer"("ipAddress");

-- CreateIndex
CREATE INDEX "Printer_ipAddress_idx" ON "Printer"("ipAddress");

-- CreateIndex
CREATE INDEX "Printer_createdByUserId_idx" ON "Printer"("createdByUserId");

-- CreateIndex
CREATE INDEX "GcodePrintJob_userId_idx" ON "GcodePrintJob"("userId");

-- CreateIndex
CREATE INDEX "GcodePrintJob_printerId_idx" ON "GcodePrintJob"("printerId");

-- CreateIndex
CREATE INDEX "GcodePrintJob_fileHashSha256_idx" ON "GcodePrintJob"("fileHashSha256");

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GcodePrintJob" ADD CONSTRAINT "GcodePrintJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GcodePrintJob" ADD CONSTRAINT "GcodePrintJob_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
