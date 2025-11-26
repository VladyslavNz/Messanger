const ApiError = require("../error/ApiError");

const authenticateRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return next(
        ApiError.Forbidden(
          "You do not have permission to access this resource."
        )
      );
    } else {
      next();
    }
  };
};

module.exports = authenticateRole;
