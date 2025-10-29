function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const details = err.details || undefined;

  res.status(status).json({ error: message, ...(details && { details }) });
}

module.exports = { errorHandler };
