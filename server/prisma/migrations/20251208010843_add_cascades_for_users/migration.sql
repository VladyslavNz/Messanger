-- DropForeignKey
ALTER TABLE "Messages" DROP CONSTRAINT "Messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "PrivateChats" DROP CONSTRAINT "PrivateChats_user1_id_fkey";

-- DropForeignKey
ALTER TABLE "PrivateChats" DROP CONSTRAINT "PrivateChats_user2_id_fkey";

-- AddForeignKey
ALTER TABLE "PrivateChats" ADD CONSTRAINT "PrivateChats_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateChats" ADD CONSTRAINT "PrivateChats_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
