function notFoundMiddleware(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
}

module.exports = { notFoundMiddleware };
