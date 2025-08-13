/**
 * 异步错误处理工具
 * 用于包装异步路由处理器，自动捕获和处理异步错误
 * 避免在每个路由中重复编写 try-catch 代码
 */

/**
 * 异步错误处理器包装器
 * 将异步函数包装为Express中间件，自动处理Promise拒绝
 * 
 * @param {Function} fn - 异步路由处理函数
 * @returns {Function} Express中间件函数
 * 
 * @example
 * // 使用前（需要手动处理错误）
 * router.get('/users', async (req, res, next) => {
 *   try {
 *     const users = await User.find();
 *     res.json(users);
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 * 
 * // 使用后（自动处理错误）
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json(users);
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    // 将异步函数包装在Promise中
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 带错误处理的异步处理器
 * 提供自定义错误处理逻辑
 * 
 * @param {Function} fn - 异步路由处理函数
 * @param {Function} errorHandler - 自定义错误处理函数
 * @returns {Function} Express中间件函数
 * 
 * @example
 * router.get('/users', asyncHandlerWithError(
 *   async (req, res) => {
 *     const users = await User.find();
 *     res.json(users);
 *   },
 *   (error, req, res, next) => {
 *     console.error('用户查询错误:', error);
 *     res.status(500).json({ error: '用户查询失败' });
 *   }
 * ));
 */
const asyncHandlerWithError = (fn, errorHandler) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      if (errorHandler) {
        errorHandler(error, req, res, next);
      } else {
        next(error);
      }
    });
  };
};

/**
 * 带超时的异步处理器
 * 为异步操作添加超时保护
 * 
 * @param {Function} fn - 异步路由处理函数
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Function} Express中间件函数
 * 
 * @example
 * router.get('/users', asyncHandlerWithTimeout(
 *   async (req, res) => {
 *     const users = await User.find();
 *     res.json(users);
 *   },
 *   5000 // 5秒超时
 * ));
 */
const asyncHandlerWithTimeout = (fn, timeout = 10000) => {
  return (req, res, next) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`请求超时 (${timeout}ms)`));
      }, timeout);
    });

    const executionPromise = Promise.resolve(fn(req, res, next));

    Promise.race([executionPromise, timeoutPromise]).catch(next);
  };
};

/**
 * 带重试的异步处理器
 * 为失败的异步操作提供重试机制
 * 
 * @param {Function} fn - 异步路由处理函数
 * @param {Object} options - 重试选项
 * @param {number} options.maxRetries - 最大重试次数
 * @param {number} options.delay - 重试延迟（毫秒）
 * @param {Function} options.shouldRetry - 判断是否应该重试的函数
 * @returns {Function} Express中间件函数
 * 
 * @example
 * router.get('/users', asyncHandlerWithRetry(
 *   async (req, res) => {
 *     const users = await User.find();
 *     res.json(users);
 *   },
 *   {
 *     maxRetries: 3,
 *     delay: 1000,
 *     shouldRetry: (error) => error.code === 'ECONNRESET'
 *   }
 * ));
 */
const asyncHandlerWithRetry = (fn, options = {}) => {
  const { maxRetries = 3, delay = 1000, shouldRetry = () => true } = options;

  return (req, res, next) => {
    let retryCount = 0;

    const attempt = async () => {
      try {
        return await Promise.resolve(fn(req, res, next));
      } catch (error) {
        if (retryCount < maxRetries && shouldRetry(error)) {
          retryCount++;
          console.log(`重试第 ${retryCount} 次，错误:`, error.message);
          
          // 等待延迟时间后重试
          await new Promise(resolve => setTimeout(resolve, delay));
          return attempt();
        }
        throw error;
      }
    };

    attempt().catch(next);
  };
};

/**
 * 带缓存的异步处理器
 * 为异步操作提供简单的内存缓存
 * 
 * @param {Function} fn - 异步路由处理函数
 * @param {Object} options - 缓存选项
 * @param {number} options.ttl - 缓存生存时间（毫秒）
 * @param {Function} options.keyGenerator - 缓存键生成函数
 * @returns {Function} Express中间件函数
 * 
 * @example
 * router.get('/users', asyncHandlerWithCache(
 *   async (req, res) => {
 *     const users = await User.find();
 *     res.json(users);
 *   },
 *   {
 *     ttl: 60000, // 1分钟缓存
 *     keyGenerator: (req) => `users:${req.query.page || 1}`
 *   }
 * ));
 */
const asyncHandlerWithCache = (fn, options = {}) => {
  const { ttl = 60000, keyGenerator = (req) => req.originalUrl } = options;
  const cache = new Map();

  return (req, res, next) => {
    const cacheKey = keyGenerator(req);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ttl) {
      // 返回缓存的结果
      return res.json(cached.data);
    }

    // 执行原始函数并缓存结果
    Promise.resolve(fn(req, res, next)).then((result) => {
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }).catch(next);
  };
};

/**
 * 带日志的异步处理器
 * 为异步操作添加详细的日志记录
 * 
 * @param {Function} fn - 异步路由处理函数
 * @param {Object} options - 日志选项
 * @param {boolean} options.logRequest - 是否记录请求信息
 * @param {boolean} options.logResponse - 是否记录响应信息
 * @param {boolean} options.logError - 是否记录错误信息
 * @returns {Function} Express中间件函数
 * 
 * @example
 * router.get('/users', asyncHandlerWithLogging(
 *   async (req, res) => {
 *     const users = await User.find();
 *     res.json(users);
 *   },
 *   {
 *     logRequest: true,
 *     logResponse: true,
 *     logError: true
 *   }
 * ));
 */
const asyncHandlerWithLogging = (fn, options = {}) => {
  const { logRequest = true, logResponse = true, logError = true } = options;

  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);

    // 记录请求信息
    if (logRequest) {
      console.log(`[${requestId}] 请求开始:`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }

    // 包装响应对象以记录响应信息
    const originalJson = res.json;
    res.json = function(data) {
      if (logResponse) {
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] 请求完成:`, {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
      }
      return originalJson.call(this, data);
    };

    // 执行原始函数
    Promise.resolve(fn(req, res, next)).catch((error) => {
      if (logError) {
        const duration = Date.now() - startTime;
        console.error(`[${requestId}] 请求错误:`, {
          method: req.method,
          url: req.originalUrl,
          error: error.message,
          stack: error.stack,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
      }
      next(error);
    });
  };
};

// 导出所有异步处理器
module.exports = {
  asyncHandler,              // 基础异步处理器
  asyncHandlerWithError,     // 带错误处理的异步处理器
  asyncHandlerWithTimeout,   // 带超时的异步处理器
  asyncHandlerWithRetry,     // 带重试的异步处理器
  asyncHandlerWithCache,     // 带缓存的异步处理器
  asyncHandlerWithLogging    // 带日志的异步处理器
}; 