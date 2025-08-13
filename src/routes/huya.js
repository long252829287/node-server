const express = require('express');
const router = express.Router();
const huyaController = require('../controllers/huyaController');
const { validateHuyaRoom } = require('../validators/huyaValidator');
const asyncHandler = require('../utils/asyncHandler');

// Get room information
router.post('/room', 
  validateHuyaRoom,
  asyncHandler(huyaController.getRoomInfo)
);

module.exports = router; 