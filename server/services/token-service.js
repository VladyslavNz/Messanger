const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

class TokenService {
  generateJwt(payload) {
    const accessToken = jwt.sign(payload, process.env.SECRET_ACCESS_KEY, {
      expiresIn: "30m",
    });
    const refreshToken = jwt.sign(payload, process.env.SECRET_REFRESH_KEY, {
      expiresIn: "30d",
    });
    return { accessToken, refreshToken };
  }

  async saveToken(userId, refreshToken) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const session = await prisma.session.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (session) {
      return await prisma.session.update({
        where: { id: session.id },
        data: {
          refreshTokenHash,
          expiresAt,
        },
      });
    }

    const createdSession = await prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
      },
    });
    return createdSession;
  }

  async removeToken(refreshToken) {
    const userData = this.validateRefreshToken(refreshToken);
    if (!userData?.id) {
      return null;
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: userData.id,
      },
      orderBy: { createdAt: "desc" },
    });

    for (const session of sessions) {
      const isSameToken = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );
      if (isSameToken) {
        return prisma.session.delete({ where: { id: session.id } });
      }
    }

    return null;
  }

  async findToken(refreshToken) {
    const userData = this.validateRefreshToken(refreshToken);
    if (!userData?.id) {
      return null;
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: userData.id,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const session of sessions) {
      const isSameToken = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );
      if (isSameToken) {
        return session;
      }
    }

    return null;
  }

  validateAccessToken(token) {
    try {
      const user = jwt.verify(token, process.env.SECRET_ACCESS_KEY);
      return user;
    } catch (e) {
      return null;
    }
  }

  validateRefreshToken(token) {
    try {
      const user = jwt.verify(token, process.env.SECRET_REFRESH_KEY);
      return user;
    } catch (e) {
      return null;
    }
  }
}

module.exports = new TokenService();
