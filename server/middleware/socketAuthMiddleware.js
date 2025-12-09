const ApiError = require("../error/ApiError");
const tokenService = require("../services/token-service");

module.exports = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(ApiError.NotAuth("User not authorized"));
    }

    const userData = tokenService.validateAccessToken(token);
    if (!userData) {
      return next(ApiError.NotAuth("Access token expired or invalid"));
    }
    socket.userData = userData;
    next();
  } catch (e) {
    return next(ApiError.ServerError(e.message));
  }
};
