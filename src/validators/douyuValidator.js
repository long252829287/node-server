const { rules, validate } = require('./common');
const { badRequest } = require('../utils/response');

/**
 * Validation schema for douyu room requests
 */
const douyuRoomSchema = {
  rid: [
    rules.required,
    rules.minLength(1),
    rules.maxLength(64),
    rules.pattern(/^[\w-]+$/)
  ]
};

/**
 * Validate douyu room request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateDouyuRoom = (req, res, next) => {
  const validation = validate(req.body, douyuRoomSchema);
  
  if (!validation.isValid) {
    return badRequest(res, 'Validation failed', validation.errors);
  }
  
  next();
};

module.exports = {
  validateDouyuRoom,
  douyuRoomSchema
}; 