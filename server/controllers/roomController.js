const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");

class RoomController {
  async createRoom(req, res, next) {
    try {
      const { partnerId, type, name } = req.body;
      const currentUserId = req.user.id;

      if (!partnerId) {
        return next(ApiError.BadRequest("Partner id is required"));
      }
      // const partnerIdStr = String(partnerId);

      if (currentUserId === partnerId) {
        return next(
          ApiError.BadRequest("You cannot create room with yourself"),
        );
      }

      if (!name) {
        return next(ApiError.BadRequest("Room name is required"));
      }

      if (!["permanent", "ephemeral"].includes(type)) {
        return next(ApiError.BadRequest("Invalid room type"));
      }

      const partner = await prisma.users.findUnique({
        where: { id: partnerId },
      });
      if (!partner) {
        return next(ApiError.NotFound("User not found"));
      }

      // const existingRoom = await prisma.rooms.findFirst({
      //   where: {
      //     type: "permanent",
      //     roomMembers: {
      //       every: {
      //         userId: {
      //           in: [currentUserId, partnerIdStr],
      //         },
      //       },
      //     },
      //   },
      // });

      // const exisitingTempRoom = await prisma.rooms.findFirst({
      //   where: {
      //     type: "temporary",
      //     roomMembers: {
      //       every: {
      //         userId: {
      //           in: [currentUserId, partnerIdStr],
      //         },
      //       },
      //     },
      //   },
      // });

      // if (existingRoom) {
      //   return res.json(existingRoom);
      // }

      // if (exisitingTempRoom) {
      //   return res.json(exisitingTempRoom);
      // }

      const room = await prisma.rooms.create({
        data: {
          name,
          type,
          creatorId: currentUserId,
          lastActivity: new Date(),
          roomMembers: {
            create: [
              {
                userId: currentUserId,
                role: "admin",
              },
              {
                userId: partnerId,
                role: "user",
              },
            ],
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
      return next(ApiError.ServerError(e.message));
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
      return next(ApiError.ServerError(e.message));
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
      return next(ApiError.ServerError(e.message));
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
      return next(ApiError.ServerError(e.message));
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
      return next(ApiError.ServerError(e.message));
    }
  }
}

module.exports = new RoomController();
