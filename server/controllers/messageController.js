const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");

class MessageController {
  async sendMessage(req, res, next) {
    try {
      const { text } = req.body;
      const { chatId } = req.params;
      const senderId = req.user.id;
      const chatIdInt = Number(chatId);

      if (!text || text.trim() === "") {
        return next(ApiError.BadRequest("message cannot be empty"));
      }

      const chat = await prisma.privateChats.findUnique({
        where: { id: chatIdInt },
      });

      if (!chat) {
        return next(ApiError.NotFound("Chat not found"));
      }

      if (chat.user1_id !== senderId && chat.user2_id !== senderId) {
        return next(ApiError.Forbidden("Access denied"));
      }

      const newMessage = await prisma.messages.create({
        data: {
          chat_id: chatIdInt,
          sender_id: senderId,
          message: text,
        },
        include: {
          sender: { select: { id: true, username: true } },
        },
      });

      await prisma.privateChats.update({
        where: { id: chatIdInt },
        data: {
          deleted_for_user1: false,
          deleted_for_user2: false,
          created_at: new Date(),
        },
      });

      const room = chatId.toString();
      req.io.to(room).emit("receive_message", newMessage);
      const receiveId =
        chat.user1_id === senderId ? chat.user2_id : chat.user1_id;
      req.io.to(receiveId.toString()).emit("new_notification", {
        chatId: chat.id,
        sender: {
          username: req.user.username,
        },
        text: text,
        created_at: newMessage.created_at,
      });
      return res.json(newMessage);
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async getMessages(req, res, next) {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      const chatIdInt = Number(chatId);

      let { limit, page } = req.query;
      page = page || 1;
      limit = limit || 20;
      const offset = (page - 1) * limit;

      const chat = await prisma.privateChats.findUnique({
        where: { id: chatIdInt },
      });

      if (!chat) {
        return next(ApiError.NotFound("Chat not found"));
      }

      if (chat.user1_id !== userId && chat.user2_id !== userId) {
        return next(ApiError.Forbidden("Access denied"));
      }

      const messages = await prisma.messages.findMany({
        where: { chat_id: chatIdInt },
        orderBy: {
          created_at: "desc",
        },
        take: Number(limit),
        skip: Number(offset),
        include: {
          sender: { select: { id: true, username: true } },
        },
      });
      return res.json(messages);
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;
      const id = Number(messageId);

      const message = await prisma.messages.findUnique({
        where: { id: id },
      });

      if (!message) {
        return next(ApiError.NotFound("Message not found"));
      }

      if (message.sender_id !== userId) {
        return next(
          ApiError.Forbidden("You can only delete your own messages")
        );
      }

      await prisma.messages.delete({
        where: { id: id },
      });

      return res.json({ message: "message was deleted" });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }
}

module.exports = new MessageController();
