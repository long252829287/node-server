/**
 * 数据库配置文件
 * 管理MongoDB连接配置和连接逻辑
 * 支持开发和生产环境不同配置
 */

const mongoose = require('mongoose');

// 数据库配置对象，根据环境选择不同配置
const dbConfig = {
  // 开发环境配置
  development: {
    // 数据库连接URI，默认连接本地MongoDB
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/lyl_dev',
    // 连接选项
    options: {
      maxPoolSize: 10,                    // 最大连接池大小
      serverSelectionTimeoutMS: 5000,     // 服务器选择超时时间
      socketTimeoutMS: 45000,             // Socket超时时间
    }
  },
  // 生产环境配置
  production: {
    // 生产环境数据库URI
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/lyl',
    // 生产环境连接选项
    options: {
      maxPoolSize: 50,                    // 生产环境更大的连接池
      serverSelectionTimeoutMS: 5000,     // 服务器选择超时时间
      socketTimeoutMS: 45000,             // Socket超时时间
      ssl: process.env.MONGODB_SSL === 'true',  // 是否启用SSL连接
    }
  }
};

// 获取当前运行环境
const env = process.env.NODE_ENV || 'development';
// 根据环境选择对应配置
const config = dbConfig[env];

/**
 * 连接数据库函数
 * 建立MongoDB连接并设置事件监听器
 */
const connectDB = async () => {
  try {
    // 使用mongoose连接MongoDB
    await mongoose.connect(config.uri, config.options);
    console.log(`✅ MongoDB connected to ${config.uri}`);
    
    // 监听数据库连接错误
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    // 监听数据库断开连接
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    // 数据库连接失败时退出进程
    process.exit(1);
  }
};

// 导出连接函数和配置对象
module.exports = { connectDB, config }; 