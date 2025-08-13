const express = require('express');
const router = express.Router();
const { success } = require('../utils/response');

// Health check endpoint
router.get('/', (req, res) => {
  success(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  }, 'Service is healthy');
});

module.exports = router; 