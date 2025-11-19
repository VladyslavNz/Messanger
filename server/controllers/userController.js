const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ApiError = require("../error/ApiError");

const generateJwt = (id, username, email, role) => {
  return jwt.sign({ id, username, email, role }, process.env.SECRET_KEY, {
    expiresIn: "24h",
  });
};

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
      const token = generateJwt(user.id, user.username, user.email, user.role);
      return res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
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
      const token = generateJwt(user.id, user.username, user.email, user.role);
      return res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
      });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async checkAuth(req, res, next) {
    try {
      const token = generateJwt(
        req.user.id,
        req.user.username,
        req.user.email,
        req.user.role
      );

      return res.json({
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
        },
        token,
      });
    } catch (e) {
      return next(ApiError.ServerError(e.message));
    }
  }

  async getUser(req, res, next) {
    try {
      const { username, email } = req.query;
      if (!email && !username) {
        return next(ApiError.BadRequest("Provide email or username"));
      }

      const user = await prisma.users.findFirst({
        where: { OR: [email ? { email } : {}, username ? { username } : {}] },
      });

      if (!user) {
        return next(ApiError.NotFound("User not found"));
      }
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        },
      });
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
          email: true,
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
