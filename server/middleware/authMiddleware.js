const jwt = require("jsonwebtoken");
const ApiError = require("../error/ApiError");

module.exports = function authMiddleware(req, res, next) {
  try {
    const authCookie = req.cookies["authcookie"];
    if (!authCookie) {
      return next(ApiError.NotAuth("Authentication cookie not found"));
    }
    const decoded = jwt.verify(authCookie, process.env.SECRET_KEY);
    req.user = decoded;
    next();
  } catch (e) {
    return next(ApiError.NotAuth("Invalid or expired token."));
  }
};
