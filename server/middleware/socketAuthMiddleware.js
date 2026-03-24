const ApiError = require("../error/ApiError");
const tokenService = require("../services/token-service");

module.exports = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(ApiError.NotAuth("User not authorized"));
    }

    const user = tokenService.validateAccessToken(token);
    if (!user) {
      return next(ApiError.NotAuth("Access token expired or invalid"));
    }
    socket.user = user;
    next();
  } catch (e) {
    return next(ApiError.ServerError(e.message));
  }
};
