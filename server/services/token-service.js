const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
    const tokenData = await prisma.refreshToken.findFirst({
      where: { user_id: userId },
    });

    if (tokenData) {
      tokenData.hash_token = refreshToken;
      return await prisma.refreshToken.update({
        where: { id: tokenData.id },
        data: {
          hash_token: refreshToken,
          expires_in: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const token = await prisma.refreshToken.create({
      data: {
        user_id: userId,
        hash_token: refreshToken,
        expires_in: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return token;
  }

  async removeToken(refreshToken) {
    const tokenData = await prisma.refreshToken.delete({
      where: { hash_token: refreshToken },
    });
    return tokenData;
  }

  async findToken(refreshToken) {
    const tokenData = await prisma.refreshToken.findFirst({
      where: { hash_token: refreshToken },
    });
    return tokenData;
  }

  validateAccessToken(token) {
    try {
      const userData = jwt.verify(token, process.env.SECRET_ACCESS_KEY);
      return userData;
    } catch (e) {
      return null;
    }
  }

  validateRefreshToken(token) {
    try {
      const userData = jwt.verify(token, process.env.SECRET_REFRESH_KEY);
      return userData;
    } catch (e) {
      return null;
    }
  }
}

module.exports = new TokenService();
