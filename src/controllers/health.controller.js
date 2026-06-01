const { getHealth } = require("../services/health.service");

function healthController(req, res) {
  res.status(200).json(getHealth());
}

module.exports = { healthController };
