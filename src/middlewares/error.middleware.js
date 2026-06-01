const { ApiError } = require("../utils/api-error");

function errorMiddleware(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
}

module.exports = { errorMiddleware };
