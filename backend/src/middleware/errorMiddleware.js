function notFound(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || (error.code === "P2002" ? 409 : error.code === "P2025" ? 404 : 500);
  const message = error.code === "P2002"
    ? "A record with that value already exists"
    : error.code === "P2025"
      ? "Record not found"
      : error.message;

  if (status >= 500) {
    console.error(error);
  }

  return res.status(status).json({ error: message || "Internal server error" });
}

module.exports = { errorHandler, notFound };