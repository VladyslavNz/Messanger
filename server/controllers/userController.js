const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");
const tokenService = require("../services/token-service");
class UserController {
  async registration(req, res, next) {
    try {
      const { username, email, password, role } = req.body;
      if (!username || !email || !password) {
        return next(
          ApiError.BadRequest("Must have username, email, and password.")
        );
      }
      const existingUser = await prisma.users.findFirst({
        where: { email },
      });
      if (existingUser) {
        return next(
          ApiError.Conflict("A user with this email already exists.")
        );
      }
      const hashPassword = await bcrypt.hash(password, 10);
      let userRole = "USER";
      if (role && ["USER", "ADMIN"].includes(role.toUpperCase())) {
        userRole = role.toUpperCase();
      }

      const user = await prisma.users.create({
        data: {
          username,
          email,
          password: hashPassword,
          role: userRole,
        },
      });
      const tokens = tokenService.generateJwt({ id: user.id, role: user.role });
      await tokenService.saveToken(user.id, tokens.refreshToken);
      return res
        .cookie("accessToken", tokens.accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 30 * 60 * 1000, // 30m
        })
        .cookie("refreshToken", tokens.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
        })
        .json({
          ...tokens,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(
          ApiError.BadRequest("Invalid Email and password are required")
        );
      }

      const user = await prisma.users.findUnique({
        where: { email },
      });
      if (!user) {
        return next(ApiError.NotAuth("Invalid credentials"));
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return next(ApiError.NotAuth("Invalid credentials"));
      }
      const tokens = tokenService.generateJwt({ id: user.id, role: user.role });
      await tokenService.saveToken(user.id, tokens.refreshToken);
      return res
        .cookie("accessToken", tokens.accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 30 * 60 * 1000, // 30m
        })
        .cookie("refreshToken", tokens.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
        })
        .json({
          ...tokens,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.cookies;
      await tokenService.removeToken(refreshToken);
      res.clearCookie("accessToken");
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

      const user = await prisma.users.findUnique({
        where: { id: userData.id },
      });
      const tokens = tokenService.generateJwt({ id: user.id, role: user.role });

      await tokenService.saveToken(user.id, tokens.refreshToken);

      return res
        .cookie("accessToken", tokens.accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 30 * 60 * 1000, // 30m
        })
        .cookie("refreshToken", tokens.refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
        })
        .json({
          ...tokens,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
        });
    } catch (e) {
      next(ApiError.ServerError(e.message));
    }
  }

  async checkAuth(req, res, next) {
    try {
      const user = await prisma.users.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return next(ApiError.NotAuth("User not found"));
      }

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async getUser(req, res, next) {
    try {
      const { username } = req.query;
      if (!username) {
        return next(ApiError.BadRequest("Username is required"));
      }

      const users = await prisma.users.findMany({
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
      return next(ApiError.ServerError(e.message));
    }
  }
  async findAllUsers(req, res, next) {
    try {
      const allUsers = await prisma.users.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          created_at: true,
        },
      });
      return res.json(allUsers);
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }
}

module.exports = new UserController();
