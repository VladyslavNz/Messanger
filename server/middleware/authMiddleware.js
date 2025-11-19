const jwt = require("jsonwebtoken");
const ApiError = require("../error/ApiError");

module.exports = function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next(
        ApiError.NotAuth("Authorization header missing or malformed.")
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;
    next();
  } catch (e) {
    return next(ApiError.NotAuth("Invalid or expired token."));
  }
};
