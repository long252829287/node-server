const { spawn } = require('child_process');
const os = require('os');
const config = require('../config/app');

/**
 * Huya service for handling room information retrieval
 */
class HuyaService {
  constructor() {
    this.isLinux = os.type() === 'Linux';
    this.pythonCmd = this.isLinux ? 'python3' : 'python';
    this.scriptPath = this.isLinux ? '/usr/local/server/script/huya.py' : 'script/huya.py';
    this.timeout = 15000; // 15 seconds
  }

  /**
   * Validate room ID
   * @param {string} rid - Room ID
   * @returns {boolean} - Is valid
   */
  validateRoomId(rid) {
    return typeof rid === 'string' && 
           rid.length > 0 && 
           rid.length < 64 && 
           /^[\w-]+$/.test(rid);
  }

  /**
   * Execute Python script with timeout and error handling
   * @param {string} rid - Room ID
   * @returns {Promise<Object>} - Room information
   */
  async executeScript(rid) {
    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonCmd, [this.scriptPath, rid], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: this.timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        reject(new Error(`Script execution error: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Script failed with exit code ${code}: ${stderr}`));
        } else {
          resolve(stdout.trim());
        }
      });

      child.on('timeout', () => {
        child.kill('SIGKILL');
        reject(new Error('Script execution timeout'));
      });
    });
  }

  /**
   * Get room information
   * @param {string} rid - Room ID
   * @returns {Promise<Object>} - Room information
   */
  async getRoomInfo(rid) {
    try {
      // Validate input
      if (!this.validateRoomId(rid)) {
        throw new Error('Invalid room ID format');
      }

      // Execute script
      const output = await this.executeScript(rid);
      
      if (!output) {
        throw new Error('Script returned empty output');
      }

      return {
        rid,
        fileUrl: output,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Huya service error:', error);
      throw error;
    }
  }
}

module.exports = new HuyaService(); 