// Centralized error handler. Any controller that calls next(error) lands here.
// Keeps error shape consistent across the API and avoids leaking stack
// traces to clients in production.
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Mongoose duplicate key error (e.g. unique email race condition)
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value for a unique field' });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    return res.status(400).json({ message });
  }

  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;

  return res.status(statusCode).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

export default errorHandler;
