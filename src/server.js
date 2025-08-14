#!/usr/bin/env node
/**
 * 服务器启动文件
 * 负责创建HTTP服务器、配置端口、错误处理和优雅关闭
 */

const app = require('./app');
const http = require('http');
const config = require('./config/app');

// 创建HTTP服务器实例
// 将Express应用作为请求处理器传入
const server = http.createServer(app);

/**
 * 端口标准化函数
 * 将字符串端口转换为数字，或返回false表示无效端口
 * @param {string|number} val - 端口值
 * @returns {number|string|false} - 标准化后的端口值
 */
const normalizePort = (val) => {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;        // 如果不是数字，返回原值
  if (port >= 0) return port;         // 如果是有效端口号，返回端口
  return false;                        // 无效端口返回false
};

// 获取并设置端口
const port = normalizePort(config.port);
app.set('port', port);

/**
 * 服务器错误处理函数
 * 处理服务器启动时的各种错误情况
 * @param {Error} error - 错误对象
 */
const onError = (error) => {
  if (error.syscall !== 'listen') {
    throw error;  // 如果不是监听错误，直接抛出
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // 根据错误代码处理不同情况
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);  // 权限不足
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);            // 端口被占用
      process.exit(1);
      break;
    default:
      throw error;  // 其他错误直接抛出
  }
};

/**
 * 服务器监听成功回调函数
 * 显示服务器启动成功信息和访问地址
 */
const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  console.log(`🚀 Server running on ${bind}`);
  console.log(`🌍 Environment: ${config.env}`);

};

/**
 * 优雅关闭函数
 * 处理进程信号，安全关闭服务器和数据库连接
 * @param {string} signal - 进程信号名称
 */
const gracefulShutdown = (signal) => {
  console.log(`\n📴 Received ${signal}. Gracefully shutting down...`);
  
  // 关闭HTTP服务器
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
    
    // 关闭数据库连接
    const mongoose = require('mongoose');
    mongoose.connection.close((err) => {
      if (err) {
        console.error('❌ Error closing database connection:', err);
        process.exit(1);
      }
      
      console.log('✅ Database connection closed');
      console.log('👋 Server shutdown complete');
      process.exit(0);
    });
  });
  
  // 强制关闭超时保护（10秒后强制退出）
  setTimeout(() => {
    console.error('⏰ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
};

// 启动服务器监听指定端口
server.listen(port);
server.on('error', onError);           // 监听服务器错误
server.on('listening', onListening);   // 监听服务器启动成功

// 注册进程信号处理器，实现优雅关闭
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));  // 终止信号
process.on('SIGINT', () => gracefulShutdown('SIGINT'));    // 中断信号（Ctrl+C）

// 全局异常处理，捕获未处理的错误
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
}); 