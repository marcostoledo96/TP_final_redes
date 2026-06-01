const { ApiError } = require("../utils/api-error");

function validateIngestQuery(req, _res, next) {
  const raw = req.query.id;
  const id = Number(raw);

  if (raw === undefined || raw === null || raw === "") {
    return next(new ApiError(400, "INVALID_QUERY", "Query param id is required"));
  }

  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
    return next(
      new ApiError(400, "INVALID_QUERY", "Query param id must be a positive integer")
    );
  }

  req.validatedId = id;
  next();
}

module.exports = { validateIngestQuery };
