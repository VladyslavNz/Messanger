const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");

class MessageController {
  async sendMessage(req, res, next) {
    try {
      const { text } = req.body;
      const { roomId } = req.params;
      const senderId = req.user.id;
      const roomIdInt = Number(roomId);

      if (!text || text.trim() === "") {
        return next(ApiError.BadRequest("message cannot be empty"));
      }

      const room = await prisma.privateChats.findUnique({
        where: { id: roomIdInt },
      });

      if (!room) {
        return next(ApiError.NotFound("Room not found"));
      }

      if (room.user1_id !== senderId && room.user2_id !== senderId) {
        return next(ApiError.Forbidden("Access denied"));
      }

      const newMessage = await prisma.messages.create({
        data: {
          chat_id: roomIdInt,
          sender_id: senderId,
          message: text,
        },
        include: {
          sender: { select: { id: true, username: true } },
        },
      });

      await prisma.privateChats.update({
        where: { id: roomIdInt },
        data: {
          deleted_for_user1: false,
          deleted_for_user2: false,
          created_at: new Date(),
        },
      });

      const roomSocket = roomId.toString();
      req.io.to(roomSocket).emit("receive_message", newMessage);
      const receiveId =
        room.user1_id === senderId ? room.user2_id : room.user1_id;
      req.io.to(receiveId.toString()).emit("new_notification", {
        roomId: room.id,
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
      const { roomId } = req.params;
      const userId = req.user.id;
      const roomIdInt = Number(roomId);

      let { limit, page } = req.query;
      page = page || 1;
      limit = limit || 20;
      const offset = (page - 1) * limit;

      const room = await prisma.privateChats.findUnique({
        where: { id: roomIdInt },
      });

      if (!room) {
        return next(ApiError.NotFound("Room not found"));
      }

      if (room.user1_id !== userId && room.user2_id !== userId) {
        return next(ApiError.Forbidden("Access denied"));
      }

      const messages = await prisma.messages.findMany({
        where: { chat_id: roomIdInt },
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
          ApiError.Forbidden("You can only delete your own messages"),
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
