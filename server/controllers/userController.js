const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");
const tokenService = require("../services/token-service");
const recoveryService = require("../services/recovery-service");
class UserController {
  async registration(req, res, next) {
    try {
      const { username, password, publicKey } = req.body;
      if (!username || !password) {
        return next(ApiError.BadRequest("Must have username, and password."));
      }
      const existingUser = await prisma.user.findFirst({
        where: { username },
      });
      if (existingUser) {
        return next(
          ApiError.Conflict("A user with this username already exists."),
        );
      }

      if (!publicKey) {
        return next(
          ApiError.BadRequest("Public key is required for registration."),
        );
      }

      const hashPassword = await bcrypt.hash(password, 10);
      const { existingCode, hashRecoveryCode } =
        await recoveryService.generate();
      const user = await prisma.user.create({
        data: {
          username,
          passwordHash: hashPassword,
          recoveryKeyHash: hashRecoveryCode,
          publicKey,
        },
      });

      const tokens = tokenService.generateJwt({ id: user.id });
      await tokenService.saveToken(user.id, tokens.refreshToken);
      return res
        .cookie("refreshToken", tokens.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
        })
        .json({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            username: user.username,
          },
          recoveryKey: existingCode,
        });
    } catch (e) {
      console.error("registration error:", e);
      return next(ApiError.ServerError("Failed to register user"));
    }
  }

  async login(req, res, next) {
    try {
      const { username, password, publicKey } = req.body;
      if (!username || !password) {
        return next(
          ApiError.BadRequest("Invalid Username and password are required"),
        );
      }

      const user = await prisma.user.findUnique({
        where: { username },
      });
      if (!user) {
        return next(ApiError.NotAuth("Invalid credentials"));
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return next(ApiError.NotAuth("Invalid credentials"));
      }
      // if (user.isBanned) {
      //   return next(
      //     ApiError.Forbidden(
      //       `Your account is banned. Reason: ${
      //         user.banReason || "No reason provided"
      //       }`,
      //     ),
      //   );
      // }

      if (publicKey && publicKey !== user.publicKey) {
        await prisma.user.update({
          where: { id: user.id },
          data: { publicKey },
        });
      }

      const tokens = tokenService.generateJwt({ id: user.id });
      await tokenService.saveToken(user.id, tokens.refreshToken);
      return res
        .cookie("refreshToken", tokens.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
        })
        .json({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            username: user.username,
          },
        });
    } catch (e) {
      console.error("login error:", e);
      return next(ApiError.ServerError("Failed to login"));
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.cookies;
      await tokenService.removeToken(refreshToken);
      res.clearCookie("refreshToken");
      return res.json({ message: "Logout success" });
    } catch (e) {
      return next(ApiError.ServerError("Logout failed"));
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        throw ApiError.NotAuth("User not authorized");
      }
      const userData = tokenService.validateRefreshToken(refreshToken);
      const tokendb = await tokenService.findToken(refreshToken);

      if (!userData || !tokendb) {
        throw ApiError.NotAuth("User not authorized");
      }

      const user = await prisma.user.findUnique({
        where: { id: userData.id },
      });
      const tokens = tokenService.generateJwt({ id: user.id });

      await tokenService.saveToken(user.id, tokens.refreshToken);

      return res
        .cookie("refreshToken", tokens.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
        })
        .json({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            username: user.username,
          },
        });
    } catch (e) {
      console.error("refresh error:", e);
      return next(ApiError.ServerError("Failed to refresh session"));
    }
  }

  async checkAuth(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return next(ApiError.NotAuth("User not found"));
      }

      return res.json({
        user: {
          id: user.id,
          username: user.username,
        },
      });
    } catch (e) {
      console.error("checkAuth error:", e);
      return next(ApiError.ServerError("Failed to check auth"));
    }
  }

  async getUser(req, res, next) {
    try {
      const { username } = req.query;
      if (!username) {
        return next(ApiError.BadRequest("Username is required"));
      }

      const users = await prisma.user.findMany({
        where: {
          username: { contains: username, mode: "insensitive" },
          NOT: {
            id: req.user.id,
          },
        },
        select: {
          id: true,
          username: true,
        },
        take: 20,
      });
      return res.json(users);
    } catch (e) {
      console.error("getUser error:", e);
      return next(ApiError.ServerError("Failed to get users"));
    }
  }
  async findAllUsers(req, res, next) {
    try {
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          createdAt: true,
        },
      });
      return res.json(allUsers);
    } catch (e) {
      console.error("findAllUsers error:", e);
      return next(ApiError.ServerError("Failed to get all users"));
    }
  }
}

module.exports = new UserController();
