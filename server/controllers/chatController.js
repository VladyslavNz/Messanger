const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");

class ChatController {
  async createChat(req, res, next) {
    try {
      const { partnerId } = req.body;
      const currentUserId = req.user.id;

      if (!partnerId) {
        return next(ApiError.BadRequest("Partner id is required"));
      }
      const partnerIdInt = parseInt(partnerId);

      if (currentUserId === partnerIdInt) {
        return next(
          ApiError.BadRequest("You cannot create chat with yourself")
        );
      }

      const partner = await prisma.users.findUnique({
        where: { id: partnerIdInt },
      });
      if (!partner) {
        return next(ApiError.NotFound("User not found"));
      }

      const existingChat = await prisma.privateChats.findFirst({
        where: {
          OR: [
            { user1_id: partnerIdInt, user2_id: currentUserId },
            { user1_id: currentUserId, user2_id: partnerIdInt },
          ],
        },
        include: {
          user1: { select: { id: true, username: true, email: true } },
          user2: { select: { id: true, username: true, email: true } },
        },
      });

      if (existingChat) {
        return res.json(existingChat);
      }

      const newChat = await prisma.privateChats.create({
        data: {
          user1_id: currentUserId,
          user2_id: partnerIdInt,
        },
        include: {
          user1: { select: { id: true, username: true } },
          user2: { select: { id: true, username: true } },
        },
      });

      return res.json(newChat);
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async deleteChat(req, res, next) {
    try {
      const { chatId } = req.body;
      const userId = req.user.id;

      const chat = await prisma.privateChats.findUnique({
        where: { id: Number(chatId) },
      });

      if (!chat) {
        return next(ApiError.NotFound("Chat not Found"));
      }

      if (chat.user1_id !== userId && chat.user2_id !== userId) {
        return next(ApiError.Forbidden("Access denied"));
      }

      let deletePermanently = false;
      let updatedData = {};

      if (chat.user1_id === userId) {
        if (chat.deleted_for_user2) {
          deletePermanently = true;
        } else {
          updatedData = { deleted_for_user1: true };
        }
      } else {
        if (chat.deleted_for_user1) {
          deletePermanently = true;
        } else {
          updatedData = { deleted_for_user2: true };
        }
      }

      if (deletePermanently) {
        await prisma.privateChats.delete({
          where: { id: chat.id },
        });
        return res.json({ message: "Chat was deleted permanently" });
      } else {
        await prisma.privateChats.update({
          where: { id: chat.id },
          data: updatedData,
        });
        return res.json({ message: "Chat was hidden for you" });
      }
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async getUserChats(req, res, next) {
    try {
      const userId = req.user.id;
      const chats = await prisma.privateChats.findMany({
        where: {
          OR: [
            { user1_id: userId, deleted_for_user1: false },
            { user2_id: userId, deleted_for_user2: false },
          ],
        },
        include: {
          user1: { select: { id: true, username: true } },
          user2: { select: { id: true, username: true } },
        },
      });
      return res.json(chats);
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }
}

module.exports = new ChatController();
