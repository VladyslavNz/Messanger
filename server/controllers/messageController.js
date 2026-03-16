const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");

class MessageController {
  async sendMessage(req, res, next) {
    try {
      const { encryptedPayload } = req.body;
      const userId = req.user.id;
      const { roomId } = req.params;
      const member = await prisma.roomMembers.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      });
      if (!member) {
        return next(ApiError.Forbidden("You are not a member of this room"));
      }

      if (!encryptedPayload || typeof encryptedPayload !== "string") {
        return next(ApiError.BadRequest("Message cannot be empty"));
      }

      if (encryptedPayload.trim() === "") {
        return next(ApiError.BadRequest("Message cannot be empty"));
      }

      if (!encryptedPayload) {
        return next(ApiError.BadRequest("Message cannot be empty"));
      }

      if (encryptedPayload.length > 10000) {
        return next(ApiError.BadRequest("Message is too long"));
      }

      const participantIds = await prisma.roomMembers
        .findMany({
          where: { roomId },
          select: {
            userId: true,
          },
        })
        .then((members) => members.map((m) => m.userId));

      const message = await prisma.$transaction([
        prisma.messages.create({
          data: {
            roomId,
            senderId: userId,
            encryptedPayload,
          },
        }),
        prisma.rooms.update({
          where: { id: roomId },
          data: {
            lastActivity: new Date(),
          },
        }),
      ]);

      const messageId = message[0].id;
      const roomSocket = roomId.toString();
      req.io.to(roomSocket).emit("receive_message", message[0]);
      participantIds.forEach((id) => {
        if (id !== userId) {
          req.io.to(id.toString()).emit("new_notification", {
            roomId,
            message: messageId,
          });
        }
      });

      return res.json(message[0]);
    } catch (e) {
      console.error("sendMessage error:", e);
      return next(ApiError.ServerError("Failed to send message"));
    }
  }

  async getMessages(req, res, next) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;
      let { limit, page } = req.query;
      page = page || 1;
      limit = limit || 20;
      const offset = (page - 1) * limit;

      const room = await prisma.rooms.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        return next(ApiError.NotFound("Room not found"));
      }
      const member = await prisma.roomMembers.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      });

      if (!member) {
        return next(ApiError.Forbidden("You are not a member of this room"));
      }

      const messages = await prisma.messages.findMany({
        where: { roomId },
        orderBy: {
          createdAt: "desc",
        },
        take: Number(limit),
        skip: Number(offset),
        include: {
          sender: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
      return res.json(messages);
    } catch (e) {
      console.error("getMessages error:", e);
      return next(ApiError.ServerError("Failed to get messages"));
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      const message = await prisma.messages.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        return next(ApiError.NotFound("Message not found"));
      }

      if (message.senderId !== userId) {
        return next(
          ApiError.Forbidden("You can only delete your own messages"),
        );
      }

      await prisma.messages.delete({
        where: { id: messageId },
      });

      return res.json({ message: "message was deleted" });
    } catch (e) {
      console.error("deleteMessage error:", e);
      return next(ApiError.ServerError("Failed to delete message"));
    }
  }
}

module.exports = new MessageController();
