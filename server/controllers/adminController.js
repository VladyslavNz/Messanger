const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");

class adminController {
  async getAllUsers(req, res, next) {
    try {
      let { page, limit, search } = req.query;
      page = Number(page) || 1;
      limit = Number(limit) || 10;
      const offset = (page - 1) * limit;

      const whereCondition = search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const [users, totalCount] = await prisma.$transaction([
        prisma.users.findMany({
          where: whereCondition,
          take: limit,
          skip: offset,
          orderBy: {
            created_at: "desc",
          },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isBanned: true,
            banReason: true,
            created_at: true,
          },
        }),

        prisma.users.count({
          where: whereCondition,
        }),
      ]);

      return res.json({
        users,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async banUser(req, res, next) {
    try {
      const { userId } = req.params;
      const userIdInt = Number(userId);
      const { reason } = req.body;

      const userFind = await prisma.users.findUnique({
        where: { id: userIdInt },
      });

      if (!userFind) {
        return next(ApiError.NotFound("Not Found User"));
      }

      if (userIdInt === req.user.id) {
        return next(ApiError.Conflict("You can't ban yourself"));
      }

      if (userFind.isBanned) {
        return next(ApiError.BadRequest("User already banned"));
      }

      await prisma.$transaction([
        prisma.users.update({
          where: { id: userIdInt },
          data: {
            isBanned: true,
            banReason: reason,
          },
        }),
        prisma.refreshToken.deleteMany({
          where: { user_id: userIdInt },
        }),
      ]);
      return res.json({ message: `User ${userFind.username} was banned` });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async unBanUser(req, res, next) {
    try {
      const { userId } = req.params;
      const userIdInt = Number(userId);

      const userFind = await prisma.users.findUnique({
        where: { id: userIdInt },
      });

      if (!userFind) {
        return next(ApiError.NotFound("User not found"));
      }

      if (userFind.isBanned === false) {
        return next(ApiError.BadRequest("User not banned"));
      }

      await prisma.users.update({
        where: { id: userIdInt },
        data: {
          isBanned: false,
          banReason: null,
        },
      });
      return res.json({ message: `User ${userFind.username} was unbanned` });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;
      const userIdInt = Number(userId);

      const userFind = await prisma.users.findUnique({
        where: { id: userIdInt },
      });

      if (!userFind) {
        return next(ApiError.NotFound("User not found"));
      }

      if (userIdInt === req.user.id) {
        return next(ApiError.Forbidden("You can't delete your account"));
      }

      await prisma.users.delete({
        where: { id: userIdInt },
      });

      return res.json({ message: `User ${userFind.username} was deleted` });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async getSystemStats(req, res, next) {
    try {
      const twentyFourHoursAgo = new Date(
        new Date().getTime() - 24 * 60 * 60 * 1000
      );
      const [usersCount, messagesCount, chatsCount, newUsersCount] =
        await Promise.all([
          prisma.users.count(),
          prisma.messages.count(),
          prisma.privateChats.count(),
          prisma.users.count({
            where: {
              created_at: {
                gte: twentyFourHoursAgo,
              },
            },
          }),
        ]);
      return res.json({
        usersCount,
        messagesCount,
        chatsCount,
        newUsersCount,
      });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }
}

module.exports = new adminController();
