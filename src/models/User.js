const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // 用户名必须是唯一的
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);