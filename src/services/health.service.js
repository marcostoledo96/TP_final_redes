function getHealth() {
  return { status: "ok", pid: process.pid };
}

module.exports = { getHealth };
