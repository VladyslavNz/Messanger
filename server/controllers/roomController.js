const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");

class RoomController {
  async createRoom(req, res, next) {
    try {
      const { participantIds, type, name } = req.body;
      const currentUserId = req.user.id;

      if (!name) {
        return next(ApiError.BadRequest("Room name is required"));
      }

      if (!["permanent", "ephemeral"].includes(type)) {
        return next(ApiError.BadRequest("Invalid room type"));
      }

      const roomName = name.trim();
      if (!roomName) {
        return next(ApiError.BadRequest("Room name cannot be empty"));
      }

      const inputParticipantIds = Array.isArray(participantIds)
        ? participantIds
        : [];

      const normalizedParticipantIds = [
        ...new Set(
          inputParticipantIds
            .map((id) => String(id).trim())
            .filter((id) => id && id !== currentUserId),
        ),
      ];

      if (normalizedParticipantIds.length > 0) {
        const usersCount = await prisma.users.count({
          where: {
            id: {
              in: normalizedParticipantIds,
            },
          },
        });

        if (usersCount !== normalizedParticipantIds.length) {
          return next(ApiError.NotFound("One or more users were not found"));
        }
      }

      const membersToCreate = [
        {
          userId: currentUserId,
          role: "admin",
        },
        ...normalizedParticipantIds.map((userId) => ({
          userId,
          role: "user",
        })),
      ];

      const room = await prisma.rooms.create({
        data: {
          name: roomName,
          type,
          creatorId: currentUserId,
          lastActivity: new Date(),
          roomMembers: {
            create: membersToCreate,
          },
        },
        include: {
          roomMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      return res.json(room);
    } catch (e) {
      console.error("createRoom error:", e);
      return next(ApiError.ServerError("Failed to create room"));
    }
  }

  async deleteRoom(req, res, next) {
    try {
      const { roomId } = req.body;
      const userId = req.user.id;

      const room = await prisma.rooms.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        return next(ApiError.NotFound("Room not found"));
      }

      const member = await prisma.roomMembers.findUnique({
        where: {
          roomId_userId: {
            roomId: roomId,
            userId: userId,
          },
        },
      });

      if (!member) {
        return next(ApiError.Forbidden("You are not a member of this room"));
      }

      if (member.role !== "admin") {
        return next(ApiError.Forbidden("Only admin can delete the room"));
      }

      await prisma.rooms.delete({
        where: { id: roomId },
      });

      return res.json({
        message: "Room deleted successfully",
      });
    } catch (e) {
      console.error("deleteRoom error:", e);
      return next(ApiError.ServerError("Failed to delete room"));
    }
  }

  async deleteTemporaryRoom(req, res, next) {
    try {
      const { roomId } = req.body;
      const userId = req.user.id;

      if (!roomId) {
        return next(ApiError.BadRequest("roomId is required"));
      }

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
      if (room.type !== "ephemeral") {
        return next(ApiError.BadRequest("Only ephemeral rooms can be deleted"));
      }
      await prisma.rooms.delete({
        where: { id: roomId },
      });

      return res.json({
        message: "Room deleted successfully",
      });
    } catch (e) {
      console.error("deleteTemporaryRoom error:", e);
      return next(ApiError.ServerError("Failed to delete temporary room"));
    }
  }

  async leaveRoom(req, res, next) {
    try {
      const { roomId } = req.body;
      const userId = req.user.id;
      if (!roomId) {
        return next(ApiError.BadRequest("roomId is required"));
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
      await prisma.roomMembers.delete({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      });
      return res.json({
        message: "You have left the room",
      });
    } catch (e) {
      console.error("leaveRoom error:", e);
      return next(ApiError.ServerError("Failed to leave room"));
    }
  }

  async getUserRooms(req, res, next) {
    try {
      const userId = req.user.id;
      const rooms = await prisma.rooms.findMany({
        where: {
          roomMembers: {
            some: {
              userId: userId,
            },
          },
        },
        orderBy: {
          lastActivity: "desc",
        },
        include: {
          roomMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });
      return res.json(rooms);
    } catch (e) {
      console.error("getUserRooms error:", e);
      return next(ApiError.ServerError("Failed to get user rooms"));
    }
  }
}

module.exports = new RoomController();
