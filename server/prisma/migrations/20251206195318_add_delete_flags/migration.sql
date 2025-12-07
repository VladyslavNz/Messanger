-- AlterTable
ALTER TABLE "PrivateChats" ADD COLUMN     "deleted_for_user1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_for_user2" BOOLEAN NOT NULL DEFAULT false;
