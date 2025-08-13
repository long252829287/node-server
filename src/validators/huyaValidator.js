const { rules, validate } = require('./common');
const { badRequest } = require('../utils/response');

/**
 * Validation schema for huya room requests
 */
const huyaRoomSchema = {
  rid: [
    rules.required,
    rules.minLength(1),
    rules.maxLength(64),
    rules.pattern(/^[\w-]+$/)
  ]
};

/**
 * Validate huya room request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateHuyaRoom = (req, res, next) => {
  const validation = validate(req.body, huyaRoomSchema);
  
  if (!validation.isValid) {
    return badRequest(res, 'Validation failed', validation.errors);
  }
  
  next();
};

module.exports = {
  validateHuyaRoom,
  huyaRoomSchema
}; 