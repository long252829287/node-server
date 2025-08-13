/**
 * 斗鱼直播平台服务层
 * 负责斗鱼直播房间信息的核心业务逻辑
 * 通过调用Python脚本获取直播流地址
 * 支持跨平台（Windows/Linux）运行
 */

const { spawn } = require('child_process');
const os = require('os');
const config = require('../config/app');

/**
 * 斗鱼服务类
 * 封装斗鱼相关的所有业务操作
 */
class DouyuService {
  constructor() {
    // 检测操作系统类型，选择对应的Python命令
    this.isLinux = os.type() === 'Linux';
    // Linux使用python3，Windows使用python
    this.pythonCmd = this.isLinux ? 'python3' : 'python';
    
    // 根据操作系统设置Python脚本路径
    // Linux: 绝对路径 /usr/local/server/script/douyu.py
    // Windows: 相对路径 script/douyu.py
    this.scriptPath = this.isLinux ? '/usr/local/server/script/douyu.py' : 'script/douyu.py';
    
    // 脚本执行超时时间：15秒
    this.timeout = 15000;
  }

  /**
   * 验证房间ID格式
   * 确保房间ID符合斗鱼平台的规范
   * 
   * @param {string} rid - 房间ID
   * @returns {boolean} - 是否有效
   * 
   * 验证规则：
   * - 必须是字符串类型
   * - 长度大于0且小于64
   * - 只能包含字母、数字、下划线和连字符
   */
  validateRoomId(rid) {
    return typeof rid === 'string' && 
           rid.length > 0 && 
           rid.length < 64 && 
           /^[\w-]+$/.test(rid);
  }

  /**
   * 执行Python脚本获取房间信息
   * 使用子进程调用Python脚本，支持超时和错误处理
   * 
   * @param {string} rid - 房间ID
   * @returns {Promise<Object>} - 房间信息
   * 
   * 执行流程：
   * 1. 创建子进程执行Python脚本
   * 2. 传递房间ID作为命令行参数
   * 3. 收集标准输出和错误输出
   * 4. 处理执行结果和错误情况
   * 5. 支持超时保护
   */
  async executeScript(rid) {
    return new Promise((resolve, reject) => {
      // 创建子进程，执行Python脚本
      const child = spawn(this.pythonCmd, [this.scriptPath, rid], {
        stdio: ['ignore', 'pipe', 'pipe'],  // 忽略标准输入，捕获标准输出和错误输出
        timeout: this.timeout               // 设置超时时间
      });

      let stdout = '';  // 标准输出内容
      let stderr = '';  // 错误输出内容

      // 监听标准输出数据
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // 监听错误输出数据
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // 监听子进程错误
      child.on('error', (err) => {
        reject(new Error(`Script execution error: ${err.message}`));
      });

      // 监听子进程关闭
      child.on('close', (code) => {
        if (code !== 0) {
          // 非零退出码表示脚本执行失败
          reject(new Error(`Script failed with exit code ${code}: ${stderr}`));
        } else {
          // 成功执行，返回输出内容
          resolve(stdout.trim());
        }
      });

      // 监听超时事件
      child.on('timeout', () => {
        child.kill('SIGKILL');  // 强制终止子进程
        reject(new Error('Script execution timeout'));
      });
    });
  }

  /**
   * 从脚本输出中解析M3U8直播流地址
   * 使用正则表达式提取JSON格式的m3u8字段
   * 
   * @param {string} output - Python脚本的输出内容
   * @returns {string|null} - M3U8地址或null
   * 
   * 输出格式示例：
   * {"m3u8": "https://example.com/stream.m3u8", "other": "data"}
   */
  parseM3u8Url(output) {
    const regex = /"m3u8":\s*"(.+?)"/;  // 匹配JSON中的m3u8字段
    const match = output.match(regex);
    return match ? match[1] : null;      // 返回匹配的URL或null
  }

  /**
   * 获取斗鱼直播房间信息
   * 主要的业务方法，整合验证、执行和解析流程
   * 
   * @param {string} rid - 房间ID
   * @returns {Promise<Object>} - 房间信息对象
   * 
   * 返回数据格式：
   * {
   *   rid: "房间ID",
   *   fileUrl: "直播流M3U8地址",
   *   timestamp: "获取时间ISO字符串"
   * }
   * 
   * 执行流程：
   * 1. 验证房间ID格式
   * 2. 执行Python脚本获取原始数据
   * 3. 解析M3U8地址
   * 4. 格式化返回结果
   */
  async getRoomInfo(rid) {
    try {
      // 第一步：验证输入参数
      if (!this.validateRoomId(rid)) {
        throw new Error('Invalid room ID format');
      }

      // 第二步：执行Python脚本获取房间信息
      const output = await this.executeScript(rid);
      
      // 第三步：从输出中解析M3U8地址
      const m3u8Url = this.parseM3u8Url(output);
      
      // 第四步：验证解析结果
      if (!m3u8Url) {
        throw new Error('Failed to extract M3U8 URL from script output');
      }

      // 第五步：格式化返回结果
      return {
        rid,                                    // 房间ID
        fileUrl: m3u8Url,                      // 直播流地址
        timestamp: new Date().toISOString()     // 获取时间
      };

    } catch (error) {
      // 记录错误日志
      console.error('Douyu service error:', error);
      // 向上层抛出错误，由控制器处理
      throw error;
    }
  }
}

// 导出服务实例（单例模式）
module.exports = new DouyuService(); 