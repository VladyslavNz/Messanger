const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");
const CursorService = require("../services/cursor-service");

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
      const parsedLimit = parseInt(req.query.limit, 10);
      const limit =
        Number.isInteger(parsedLimit) && parsedLimit > 0
          ? Math.min(parsedLimit, 100)
          : 20;

      const cursor =
        typeof req.query.cursor === "string" && req.query.cursor.trim()
          ? req.query.cursor.trim()
          : null;

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

      let cursorFilter = {};
      if (cursor) {
        const decodedCursor = CursorService.decode(cursor);
        if (!decodedCursor) {
          return next(ApiError.BadRequest("Invalid cursor"));
        }

        cursorFilter = {
          OR: [
            {
              createdAt: {
                lt: decodedCursor.createdAt,
              },
            },
            {
              createdAt: decodedCursor.createdAt,
              id: {
                lt: decodedCursor.id,
              },
            },
          ],
        };
      }

      const messages = await prisma.messages.findMany({
        where: {
          roomId,
          ...cursorFilter,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      const hasMore = messages.length > limit;
      const items = hasMore ? messages.slice(0, limit) : messages;
      const nextCursor = hasMore ? CursorService.encode(items[items.length - 1]) : null;

      return res.json({
        items,
        pageInfo: {
          hasMore,
          nextCursor,
        },
      });
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
