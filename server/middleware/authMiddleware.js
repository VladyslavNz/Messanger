const jwt = require("jsonwebtoken");
const ApiError = require("../error/ApiError");
const tokenService = require("../services/token-service");

module.exports = function authMiddleware(req, res, next) {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return next(ApiError.NotAuth("Not authorized"));
    }

    const accessToken = authorizationHeader.split(" ")[1];
    if (!accessToken) {
      return next(ApiError.NotAuth("User not authorized"));
    }

    const userData = tokenService.validateAccessToken(accessToken);
    if (!userData) {
      return next(ApiError.NotAuth("Access token expired or invalid"));
    }

    req.user = userData;
    next();
  } catch (e) {
    return next(ApiError.NotAuth("Not authorized"));
  }
};
