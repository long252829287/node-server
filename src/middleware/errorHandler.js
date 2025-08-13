const createError = require('http-errors');

// 404 handler
const notFound = (req, res, next) => {
  next(createError(404, `Route ${req.originalUrl} not found`));
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error
  console.error(`[${new Date().toISOString()}] Error ${status}: ${message}`);
  if (err.stack && process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  
  // Don't leak error details in production
  const error = process.env.NODE_ENV === 'development' ? {
    message,
    stack: err.stack,
    details: err.details
  } : { message };
  
  res.status(status).json({
    success: false,
    error: {
      status,
      message,
      ...(process.env.NODE_ENV === 'development' && { details: error })
    }
  });
};

module.exports = { notFound, errorHandler }; 