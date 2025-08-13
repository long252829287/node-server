const huyaService = require('../services/huyaService');
const { success, badRequest, error } = require('../utils/response');

/**
 * Get room information from Huya
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRoomInfo = async (req, res) => {
  try {
    const { rid } = req.body;
    
    if (!rid) {
      return badRequest(res, 'Room ID is required');
    }
    
    const roomInfo = await huyaService.getRoomInfo(rid);
    
    if (!roomInfo) {
      return badRequest(res, 'Failed to get room information');
    }
    
    return success(res, roomInfo, 'Room information retrieved successfully');
    
  } catch (err) {
    console.error('Huya controller error:', err);
    return error(res, 'Failed to get room information', 500, err.message);
  }
};

module.exports = {
  getRoomInfo
}; 