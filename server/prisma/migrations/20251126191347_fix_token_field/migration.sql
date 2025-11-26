/*
  Warnings:

  - You are about to drop the column `expires_at` on the `RefreshToken` table. All the data in the column will be lost.
  - Added the required column `expires_in` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RefreshToken_expires_at_idx";

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "expires_at",
ADD COLUMN     "expires_in" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "RefreshToken_expires_in_idx" ON "RefreshToken"("expires_in");
