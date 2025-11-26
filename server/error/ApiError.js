class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.message = message;
  }

  static BadRequest(message) {
    return new ApiError(400, message);
  }

  static NotAuth(message) {
    return new ApiError(401, message);
  }

  static Forbidden(message) {
    return new ApiError(403, message);
  }

  static NotFound(message) {
    return new ApiError(404, message);
  }

  static Conflict(message) {
    return new ApiError(409, message);
  }

  static ServerError(message) {
    return new ApiError(500, message);
  }

  static ValidationFailed(message) {
    return new ApiError(422, message);
  }

  static WebSocketDisconnected(message) {
    return new ApiError(440, message);
  }
}

module.exports = ApiError;
